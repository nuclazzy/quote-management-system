/**
 * 견적서 데이터 마이그레이션 스크립트
 * 기존 견적서 데이터에 스냅샷 정보를 생성하여 저장
 * 
 * 실행 방법: node scripts/migrate-quotes-to-snapshot.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // 서비스 키 필요

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 메인 마이그레이션 함수
 */
async function migrateQuotesToSnapshot() {
  console.log('🚀 견적서 스냅샷 마이그레이션 시작...');
  
  try {
    // 1. 스냅샷이 없는 견적서 조회
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        id,
        title,
        created_at,
        quote_groups(
          id,
          title,
          sort_order,
          quote_items(
            id,
            item_name,
            item_id,
            supplier_id,
            quantity,
            unit_price,
            sort_order,
            quote_item_details(
              id,
              detail_name,
              quantity,
              unit_price,
              sort_order
            )
          )
        )
      `)
      .is('quote_snapshot', null); // 스냅샷이 없는 것만

    if (quotesError) {
      throw new Error(`견적서 조회 실패: ${quotesError.message}`);
    }

    if (!quotes || quotes.length === 0) {
      console.log('✅ 마이그레이션할 견적서가 없습니다.');
      return;
    }

    console.log(`📊 마이그레이션 대상 견적서: ${quotes.length}건`);

    // 2. 각 견적서별로 스냅샷 생성 및 저장
    let successCount = 0;
    let errorCount = 0;

    for (const quote of quotes) {
      try {
        console.log(`🔄 견적서 ${quote.id} 처리 중...`);
        
        // 스냅샷 생성
        const snapshot = await createQuoteSnapshotForMigration(quote);
        
        // 데이터베이스 업데이트
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            // 새로운 구조로 변환
            name: quote.title,
            items: transformQuoteGroupsToItems(quote.quote_groups),
            include_in_fee: true, // 기본값
            quote_snapshot: snapshot
          })
          .eq('id', quote.id);

        if (updateError) {
          throw new Error(`업데이트 실패: ${updateError.message}`);
        }

        successCount++;
        console.log(`✅ 견적서 ${quote.id} 완료`);
        
        // 부하 분산을 위한 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ 견적서 ${quote.id} 처리 실패:`, error.message);
        errorCount++;
        
        // 에러가 너무 많으면 중단
        if (errorCount > 10) {
          console.error('❌ 에러가 너무 많아 마이그레이션을 중단합니다.');
          break;
        }
      }
    }

    console.log('\n📊 마이그레이션 완료 결과:');
    console.log(`✅ 성공: ${successCount}건`);
    console.log(`❌ 실패: ${errorCount}건`);

  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    process.exit(1);
  }
}

/**
 * 마이그레이션용 스냅샷 생성
 */
async function createQuoteSnapshotForMigration(quote) {
  try {
    // 마스터 데이터 ID 수집
    const masterItemIds = new Set();
    const supplierIds = new Set();

    quote.quote_groups?.forEach(group => {
      group.quote_items?.forEach(item => {
        if (item.item_id) masterItemIds.add(item.item_id);
        if (item.supplier_id) supplierIds.add(item.supplier_id);
      });
    });

    // 마스터 데이터 조회
    const [masterItems, suppliers] = await Promise.all([
      masterItemIds.size > 0 
        ? supabase.from('items').select('*').in('id', Array.from(masterItemIds))
        : { data: [], error: null },
      supplierIds.size > 0
        ? supabase.from('suppliers').select('*').in('id', Array.from(supplierIds))
        : { data: [], error: null }
    ]);

    if (masterItems.error || suppliers.error) {
      throw new Error('마스터 데이터 조회 실패');
    }

    // 조회 결과를 Map으로 변환
    const itemLookup = new Map(masterItems.data?.map(item => [item.id, item]) || []);
    const supplierLookup = new Map(suppliers.data?.map(supplier => [supplier.id, supplier]) || []);

    // 스냅샷 생성
    const snapshotGroups = quote.quote_groups?.map(group => ({
      id: group.id,
      name: group.title, // title -> name 변환
      sort_order: group.sort_order,
      include_in_fee: true, // 기본값
      items: group.quote_items?.map(item => ({
        id: item.id,
        name: item.item_name,
        sort_order: item.sort_order,
        include_in_fee: true, // 기본값
        details: item.quote_item_details?.map(detail => {
          const masterItem = itemLookup.get(item.item_id);
          const supplier = supplierLookup.get(item.supplier_id);

          return {
            id: detail.id,
            name: detail.detail_name,
            quantity: detail.quantity,
            days: 1, // 기본값
            unit: masterItem?.default_unit || '개',
            unit_price: detail.unit_price,
            cost_price: masterItem?.cost_price || detail.unit_price * 0.7, // 추정값
            is_service: masterItem?.is_service || false,
            supplier_id: item.supplier_id,
            
            // 🔑 스냅샷 필드들
            name_snapshot: masterItem?.name || detail.detail_name,
            description_snapshot: masterItem?.description,
            unit_price_snapshot: masterItem?.default_unit_price || detail.unit_price,
            cost_price_snapshot: masterItem?.cost_price || detail.unit_price * 0.7,
            supplier_name_snapshot: supplier?.name,
            snapshot_created_at: new Date().toISOString(),
          };
        }) || []
      })) || []
    })) || [];

    return {
      groups: snapshotGroups,
      snapshot_metadata: {
        created_at: new Date().toISOString(),
        migration_source: 'legacy_quote_groups',
        master_items_count: masterItemIds.size,
        suppliers_count: supplierIds.size,
        version: '1.0'
      }
    };

  } catch (error) {
    console.error('스냅샷 생성 중 오류:', error);
    throw error;
  }
}

/**
 * quote_groups를 items 구조로 변환
 */
function transformQuoteGroupsToItems(quoteGroups) {
  return quoteGroups?.map(group => ({
    name: group.title,
    sort_order: group.sort_order,
    include_in_fee: true,
    items: group.quote_items?.map(item => ({
      name: item.item_name,
      sort_order: item.sort_order,
      include_in_fee: true,
      details: item.quote_item_details?.map(detail => ({
        name: detail.detail_name,
        quantity: detail.quantity,
        days: 1,
        unit_price: detail.unit_price,
        sort_order: detail.sort_order
      })) || []
    })) || []
  })) || [];
}

/**
 * 마이그레이션 실행 확인
 */
async function confirmMigration() {
  return new Promise((resolve) => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log('\n⚠️  경고: 이 작업은 데이터베이스를 수정합니다.');
    console.log('⚠️  반드시 백업을 먼저 수행했는지 확인하세요.');
    console.log();
    
    readline.question('계속 진행하시겠습니까? (yes/no): ', (answer) => {
      readline.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

// 메인 실행
async function main() {
  const confirmed = await confirmMigration();
  
  if (!confirmed) {
    console.log('❌ 마이그레이션이 취소되었습니다.');
    process.exit(0);
  }
  
  await migrateQuotesToSnapshot();
  console.log('🎉 마이그레이션 완료!');
}

// 스크립트가 직접 실행될 때만 main 함수 호출
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { migrateQuotesToSnapshot, createQuoteSnapshotForMigration };