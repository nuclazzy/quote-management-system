import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const supplier_id = searchParams.get('supplier_id');

    let query = supabase
      .from('items')
      .select(
        `
        *,
        suppliers (
          name
        )
      `
      )
      .order('name');

    if (category) {
      query = query.eq('category', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (supplier_id) {
      query = query.eq('supplier_id', supplier_id);
    }

    const { data: items, error } = await query;

    if (error) {
      console.error('Error fetching items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch items' },
        { status: 500 }
      );
    }

    // Flatten supplier data
    const formattedItems =
      items?.map((item) => ({
        ...item,
        supplier_name: item.suppliers?.name || null,
      })) || [];

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error in items GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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

    const body = await request.json();
    const {
      name,
      description,
      category,
      unit,
      unit_price,
      cost_price,
      supplier_id,
      min_quantity,
      max_quantity,
      stock_quantity,
      barcode,
      sku,
      status,
    } = body;

    // Validate required fields
    if (!name || !category || !unit || unit_price === undefined || !sku) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: name, category, unit, unit_price, sku',
        },
        { status: 400 }
      );
    }

    // Check if SKU already exists
    const { data: existingSku } = await supabase
      .from('items')
      .select('id')
      .eq('sku', sku)
      .single();

    if (existingSku) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from('items')
      .insert({
        name,
        description: description || null,
        category,
        unit,
        unit_price: Number(unit_price),
        cost_price: Number(cost_price) || 0,
        supplier_id: supplier_id || null,
        min_quantity: Number(min_quantity) || 0,
        max_quantity: Number(max_quantity) || 0,
        stock_quantity: Number(stock_quantity) || 0,
        barcode: barcode || null,
        sku,
        status: status || 'active',
        created_by: user.id,
        updated_by: user.id,
      })
      .select()
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
