import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// POST /api/items/[id]/favorite - 즐겨찾기 토글
export async function POST(
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

    // 현재 즐겨찾기 상태 확인
    const { data: existing } = await supabase
      .from('item_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .single();

    if (existing) {
      // 즐겨찾기 제거
      const { error } = await supabase
        .from('item_favorites')
        .delete()
        .eq('id', existing.id);

      if (error) {
        console.error('Remove favorite error:', error);
        return NextResponse.json(
          { error: 'Failed to remove favorite' },
          { status: 500 }
        );
      }

      return NextResponse.json({ is_favorite: false });
    } else {
      // 즐겨찾기 추가
      const { error } = await supabase
        .from('item_favorites')
        .insert({
          user_id: user.id,
          item_id: itemId
        });

      if (error) {
        console.error('Add favorite error:', error);
        return NextResponse.json(
          { error: 'Failed to add favorite' },
          { status: 500 }
        );
      }

      return NextResponse.json({ is_favorite: true });
    }

  } catch (error) {
    console.error('POST /api/items/[id]/favorite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}