import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/items/[id]/price-history - 품목 가격 변경 이력 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const itemId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

    // 품목 소유권 확인
    const { data: item, error: itemError } = await supabase
      .from('items')
      .select('id, name, user_id')
      .eq('id', itemId)
      .eq('user_id', user.id)
      .single();

    if (itemError || !item) {
      return NextResponse.json(
        { error: 'Item not found or access denied' },
        { status: 404 }
      );
    }

    // 가격 이력 조회
    const { data: priceHistory, error: historyError } = await supabase
      .from('item_price_history')
      .select(`
        *,
        profiles!item_price_history_changed_by_fkey(id, full_name)
      `)
      .eq('item_id', itemId)
      .order('changed_at', { ascending: false })
      .limit(limit);

    if (historyError) {
      console.error('Error fetching price history:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch price history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      item,
      price_history: priceHistory || []
    });

  } catch (error) {
    console.error('GET /api/items/[id]/price-history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}