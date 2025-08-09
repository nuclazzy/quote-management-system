import { NextRequest, NextResponse } from 'next/server';
import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';
import { parseAndValidateItemCSV, parseItemsFromCSV } from '@/lib/csv-item-template';
import { MOCK_ITEMS } from '@/data/mock-quotes';

interface Item {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  sku: string;
  unit: string;
  unit_price: number;
  stock_quantity: number;
  minimum_stock_level: number;
  item_type: 'product' | 'service';
  barcode?: string;
  is_active: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// GET /api/items - StaticAuth Mock 품목 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 필터링
    let items = [...MOCK_ITEMS];
    
    const categoryId = searchParams.get('category_id');
    if (categoryId) {
      items = items.filter(i => i.category_id === categoryId);
    }
    
    const itemType = searchParams.get('item_type');
    if (itemType && ['product', 'service'].includes(itemType)) {
      items = items.filter(i => i.item_type === itemType);
    }
    
    const search = searchParams.get('search');
    if (search) {
      const searchTerm = search.toLowerCase();
      items = items.filter(i => 
        i.name.toLowerCase().includes(searchTerm) ||
        i.description?.toLowerCase().includes(searchTerm) ||
        i.sku.toLowerCase().includes(searchTerm)
      );
    }
    
    // 활성 품목만 필터링
    items = items.filter(i => i.is_active);
    
    // 정렬 (이름순)
    items.sort((a, b) => a.name.localeCompare(b.name));
    
    // 카테고리 정보 추가
    const formattedItems = items.map(item => ({
      ...item,
      category: {
        id: item.category_id,
        name: item.category_name || '기본 카테고리'
      },
      is_favorite: false,
      usage_count: Math.floor(Math.random() * 10),
      last_used_at: item.created_at
    }));

    return NextResponse.json({
      success: true,
      data: formattedItems,
      meta: {
        total: formattedItems.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '품목 목록 조회에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// CSV 업로드 처리 함수
async function handleCSVUpload(request: NextRequest, supabase: any, user: any) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  
  if (!file) {
    return NextResponse.json(
      { error: 'No file uploaded' },
      { status: 400 }
    );
  }

  const csvContent = await file.text();
  const parseResult = parseAndValidateItemCSV(csvContent);

  if (!parseResult.success) {
    return NextResponse.json({
      success: false,
      errors: parseResult.errors,
      warnings: parseResult.warnings,
      summary: parseResult.summary
    });
  }

  // CSV에서 품목 데이터 파싱
  const items = parseItemsFromCSV(csvContent);
  
  const results = {
    success: true,
    errors: [] as string[],
    warnings: [] as string[],
    summary: {
      totalRows: items.length,
      validRows: 0,
      imported: 0
    }
  };

  // 카테고리 매핑 테이블 생성
  const { data: categories } = await supabase
    .from('item_categories')
    .select('id, name')
    .eq('created_by', user.id);

  const categoryMap = new Map(categories?.map((cat: any) => [cat.name, cat.id]) || []);

  // 각 품목 처리
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNumber = i + 2; // Header row + 1-based indexing

    try {
      // 카테고리 ID 찾기 또는 생성
      let categoryId = categoryMap.get(item.category_name);
      
      if (!categoryId) {
        // 카테고리 생성
        const { data: newCategory, error: categoryError } = await supabase
          .from('item_categories')
          .insert({
            name: item.category_name,
            description: `${item.category_name} 카테고리`,
            created_by: user.id,
            updated_by: user.id
          })
          .select()
          .single();

        if (categoryError) {
          results.errors.push(`${rowNumber}행: 카테고리 생성 실패 (${item.category_name})`);
          continue;
        }

        categoryId = newCategory.id;
        categoryMap.set(item.category_name, categoryId);
      }

      // SKU 중복 검사
      const { data: existingSku } = await supabase
        .from('items')
        .select('id')
        .eq('sku', item.sku)
        .eq('user_id', user.id)
        .single();

      if (existingSku) {
        results.warnings.push(`${rowNumber}행: SKU 중복으로 건너뜀 (${item.sku})`);
        continue;
      }

      // 품목 생성
      const { error: itemError } = await supabase
        .from('items')
        .insert({
          name: item.name,
          description: item.description || null,
          category_id: categoryId,
          sku: item.sku,
          unit: item.unit,
          unit_price: item.unit_price,
          stock_quantity: item.stock_quantity,
          minimum_stock_level: item.minimum_stock_level,
          item_type: item.item_type,
          barcode: item.barcode || null,
          is_active: true,
          user_id: user.id,
          created_by: user.id,
          updated_by: user.id
        });

      if (itemError) {
        results.errors.push(`${rowNumber}행: 품목 생성 실패 (${itemError.message})`);
      } else {
        results.summary.imported++;
      }

      results.summary.validRows++;

    } catch (error) {
      results.errors.push(`${rowNumber}행: 처리 중 오류 발생 (${error instanceof Error ? error.message : '알 수 없는 오류'})`);
    }
  }

  results.success = results.errors.length === 0;

  return NextResponse.json(results);
}

// POST /api/items - 품목 생성 또는 CSV 업로드
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';

    // CSV 업로드 처리
    if (contentType.includes('multipart/form-data')) {
      return handleCSVUpload(request, supabase, user);
    }

    // 일반 JSON 요청 처리 (단일 품목 생성) - 직접 연동 적용
    return createDirectItemHandler(request);
  } catch (error) {
    console.error('Error in items POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// 최적화된 단일 품목 생성 핸들러
const createDirectItemHandler = createDirectApi(
  async ({ supabase, user, body }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'items');
    
    // 입력 검증
    if (!body?.name?.trim()) {
      throw new Error('품목명은 필수 항목입니다.');
    }
    
    if (!body?.category_id) {
      throw new Error('카테고리 선택은 필수입니다.');
    }
    
    if (!body?.sku?.trim()) {
      throw new Error('SKU는 필수 항목입니다.');
    }
    
    if (!body?.unit?.trim()) {
      throw new Error('단위는 필수 항목입니다.');
    }
    
    if (body?.unit_price === undefined || body.unit_price < 0) {
      throw new Error('단가는 필수이며 0 이상이어야 합니다.');
    }
    
    if (!body?.item_type || !['product', 'service'].includes(body.item_type)) {
      throw new Error('유효한 품목 유형을 선택해주세요.');
    }

    // SKU 중복 검사
    const existing = await queryBuilder.findMany<Item>({
      select: 'id',
      where: {
        sku: body.sku.trim(),
        user_id: user.id
      },
      pagination: { page: 1, limit: 1 }
    });
    
    if (existing.count > 0) {
      throw new Error('이미 사용 중인 SKU입니다.');
    }

    // 카테고리 존재 확인
    const categoryQuery = new DirectQueryBuilder(supabase, 'item_categories');
    const category = await categoryQuery.findOne(body.category_id);
    if (!category) {
      throw new Error('존재하지 않는 카테고리입니다.');
    }

    // 데이터 정리 및 검증
    const itemData = {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      category_id: body.category_id,
      sku: body.sku.trim(),
      unit: body.unit.trim(),
      unit_price: Math.max(0, Number(body.unit_price)),
      stock_quantity: Math.max(0, Number(body.stock_quantity) || 0),
      minimum_stock_level: Math.max(0, Number(body.minimum_stock_level) || 0),
      item_type: body.item_type,
      barcode: body.barcode?.trim() || null,
      is_active: true,
      user_id: user.id,
      created_by: user.id,
      updated_by: user.id,
    };

    // 생성
    const item = await queryBuilder.create<Item>(itemData, `
      *,
      category:item_categories(*)
    `);

    return {
      message: '품목이 성공적으로 생성되었습니다.',
      item,
    };
  },
  { requireAuth: false, enableLogging: true }
);
