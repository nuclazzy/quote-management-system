import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { parseAndValidateItemCSV, parseItemsFromCSV } from '@/lib/csv-item-template';

// GET /api/items - 품목 목록 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('category_id');
    const itemType = searchParams.get('item_type');
    const favorites = searchParams.get('favorites') === 'true';

    let query = supabase
      .from('items')
      .select(
        `
        *,
        category:item_categories(*),
        ${favorites ? 'favorites:item_favorites!inner(id),' : ''}
        usage_stats:item_usage_stats(quote_count, unique_quotes, total_quantity_used, last_used_at)
      `
      )
      .eq('is_active', true)
      .eq('user_id', user.id);

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    if (favorites) {
      query = query.eq('favorites.user_id', user.id);
    }

    const { data: items, error } = await query.order('name');

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    // 데이터 포맷 정리
    const formattedItems = (items || []).map(item => ({
      ...item,
      is_favorite: favorites || (item.favorites && item.favorites.length > 0),
      usage_count: item.usage_stats?.[0]?.quote_count || 0,
      last_used_at: item.usage_stats?.[0]?.last_used_at
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error in items GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // 일반 JSON 요청 처리 (단일 품목 생성)
    const body = await request.json();
    const {
      name,
      description,
      category_id,
      sku,
      unit,
      unit_price,
      stock_quantity,
      minimum_stock_level,
      item_type,
      barcode,
    } = body;

    // 필수 필드 검증
    if (!name || !category_id || !sku || !unit || unit_price === undefined || !item_type) {
      return NextResponse.json(
        {
          error: 'Missing required fields: name, category_id, sku, unit, unit_price, item_type',
        },
        { status: 400 }
      );
    }

    // SKU 중복 검사
    const { data: existingSku } = await supabase
      .from('items')
      .select('id')
      .eq('sku', sku)
      .eq('user_id', user.id)
      .single();

    if (existingSku) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    // 품목 생성
    const { data: item, error } = await supabase
      .from('items')
      .insert({
        name,
        description: description || null,
        category_id,
        sku,
        unit,
        unit_price: Number(unit_price),
        stock_quantity: Number(stock_quantity) || 0,
        minimum_stock_level: Number(minimum_stock_level) || 0,
        item_type,
        barcode: barcode || null,
        is_active: true,
        user_id: user.id,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(`
        *,
        category:item_categories(*)
      `)
      .single();

    if (error) {
      console.error('Error creating item:', error);
      return NextResponse.json(
        { error: 'Failed to create item' },
        { status: 500 }
      );
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error in items POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
