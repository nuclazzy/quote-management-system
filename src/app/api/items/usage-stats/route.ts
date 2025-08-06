import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/items/usage-stats - 품목 사용 통계 조회
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
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const sortBy = searchParams.get('sort') || 'quote_count';
    const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // 사용자의 품목에 대한 사용 통계만 조회
    const { data: usageStats, error: statsError } = await supabase
      .from('item_usage_stats')
      .select(`
        *,
        items!inner(user_id, name, sku, unit_price, item_type, category_id),
        item_categories!items_category_id_fkey(name)
      `)
      .eq('items.user_id', user.id)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .limit(limit);

    if (statsError) {
      console.error('Error fetching usage stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch usage stats' },
        { status: 500 }
      );
    }

    // 통계 요약 계산
    const summary = {
      total_items: usageStats?.length || 0,
      most_used_item: usageStats?.[0] || null,
      total_quotes: usageStats?.reduce((sum, stat) => sum + (stat.quote_count || 0), 0) || 0,
      total_quantity_used: usageStats?.reduce((sum, stat) => sum + (stat.total_quantity_used || 0), 0) || 0,
      avg_selling_price: usageStats?.length > 0 
        ? usageStats.reduce((sum, stat) => sum + (stat.avg_selling_price || 0), 0) / usageStats.length 
        : 0,
      items_never_used: usageStats?.filter(stat => (stat.quote_count || 0) === 0).length || 0
    };

    return NextResponse.json({
      usage_stats: usageStats || [],
      summary
    });

  } catch (error) {
    console.error('GET /api/items/usage-stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}