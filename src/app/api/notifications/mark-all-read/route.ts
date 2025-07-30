import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// POST - Mark all notifications as read for current user
export async function POST() {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: updatedNotifications, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)
      .select('id');

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'All notifications marked as read',
      count: updatedNotifications?.length || 0,
    });
  } catch (error) {
    console.error('Error in mark-all-read POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
