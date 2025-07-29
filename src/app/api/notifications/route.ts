import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

// GET - Fetch notifications for the current user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unread_only') === 'true'
    const type = searchParams.get('type')

    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }
    
    if (type) {
      query = query.eq('type', type)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false)

    return NextResponse.json({
      notifications,
      unreadCount: unreadCount || 0,
      hasMore: notifications?.length === limit
    })

  } catch (error) {
    console.error('Error in notifications GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create a new notification
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { title, message, type, link_url, entity_type, entity_id, priority = 'normal', user_id } = body

    if (!title || !message || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user for authorization check
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use provided user_id or default to current user
    const targetUserId = user_id || session.user.id

    // Only allow creating notifications for other users if current user is admin
    if (targetUserId !== session.user.id) {
      const { data: currentUser } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (currentUser?.role !== 'admin') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        title,
        message,
        type,
        link_url,
        entity_type,
        entity_id,
        priority
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json(notification, { status: 201 })

  } catch (error) {
    console.error('Error in notifications POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Mark notifications as read/unread
export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { notification_ids, is_read = true } = body

    if (!notification_ids || !Array.isArray(notification_ids)) {
      return NextResponse.json({ error: 'notification_ids array is required' }, { status: 400 })
    }

    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Get current user
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: updatedNotifications, error } = await supabase
      .from('notifications')
      .update({ is_read })
      .eq('user_id', session.user.id)
      .in('id', notification_ids)
      .select()

    if (error) {
      console.error('Error updating notifications:', error)
      return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 })
    }

    return NextResponse.json(updatedNotifications)

  } catch (error) {
    console.error('Error in notifications PATCH:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}