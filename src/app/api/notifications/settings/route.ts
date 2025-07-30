import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// GET - Get notification settings for current user
export async function GET() {
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

    const { data: settings, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No settings found, create default settings
        const { data: newSettings, error: createError } = await supabase
          .from('notification_settings')
          .insert({ user_id: session.user.id })
          .select()
          .single();

        if (createError) {
          console.error('Error creating default settings:', createError);
          return NextResponse.json(
            { error: 'Failed to create default settings' },
            { status: 500 }
          );
        }

        return NextResponse.json(newSettings);
      }
      console.error('Error fetching notification settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in notification settings GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update notification settings
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      quote_created,
      quote_approved,
      quote_rejected,
      quote_expiring,
      project_created,
      project_status_changed,
      project_deadline_approaching,
      settlement_due,
      settlement_completed,
      settlement_overdue,
      system_user_joined,
      system_permission_changed,
      email_notifications,
      browser_notifications,
    } = body;

    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get current user
    const {
      data: { session },
      error: authError,
    } = await supabase.auth.getSession();
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Prepare update data (only include provided fields)
    const updateData: any = {};
    if (typeof quote_created === 'boolean')
      updateData.quote_created = quote_created;
    if (typeof quote_approved === 'boolean')
      updateData.quote_approved = quote_approved;
    if (typeof quote_rejected === 'boolean')
      updateData.quote_rejected = quote_rejected;
    if (typeof quote_expiring === 'boolean')
      updateData.quote_expiring = quote_expiring;
    if (typeof project_created === 'boolean')
      updateData.project_created = project_created;
    if (typeof project_status_changed === 'boolean')
      updateData.project_status_changed = project_status_changed;
    if (typeof project_deadline_approaching === 'boolean')
      updateData.project_deadline_approaching = project_deadline_approaching;
    if (typeof settlement_due === 'boolean')
      updateData.settlement_due = settlement_due;
    if (typeof settlement_completed === 'boolean')
      updateData.settlement_completed = settlement_completed;
    if (typeof settlement_overdue === 'boolean')
      updateData.settlement_overdue = settlement_overdue;
    if (typeof system_user_joined === 'boolean')
      updateData.system_user_joined = system_user_joined;
    if (typeof system_permission_changed === 'boolean')
      updateData.system_permission_changed = system_permission_changed;
    if (typeof email_notifications === 'boolean')
      updateData.email_notifications = email_notifications;
    if (typeof browser_notifications === 'boolean')
      updateData.browser_notifications = browser_notifications;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data: settings, error } = await supabase
      .from('notification_settings')
      .upsert({
        user_id: session.user.id,
        ...updateData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating notification settings:', error);
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error in notification settings PATCH:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
