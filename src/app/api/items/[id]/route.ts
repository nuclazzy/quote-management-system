import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: item, error } = await supabase
      .from('items')
      .select(
        `
        *,
        suppliers (
          id,
          name
        )
      `
      )
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('Error fetching item:', error);
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Flatten supplier data
    const formattedItem = {
      ...item,
      supplier_name: item.suppliers?.name || null,
    };

    return NextResponse.json(formattedItem);
  } catch (error) {
    console.error('Error in item GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

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

    // Check if SKU already exists for other items
    const { data: existingSku } = await supabase
      .from('items')
      .select('id')
      .eq('sku', sku)
      .neq('id', params.id)
      .single();

    if (existingSku) {
      return NextResponse.json(
        { error: 'SKU already exists' },
        { status: 400 }
      );
    }

    const { data: item, error } = await supabase
      .from('items')
      .update({
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
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating item:', error);
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error in item PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if item is used in any quotes
    const { data: quoteItems } = await supabase
      .from('quote_items')
      .select('id')
      .eq('item_id', params.id)
      .limit(1);

    if (quoteItems && quoteItems.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete item that is used in quotes' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('items').delete().eq('id', params.id);

    if (error) {
      console.error('Error deleting item:', error);
      return NextResponse.json(
        { error: 'Failed to delete item' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error in item DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
