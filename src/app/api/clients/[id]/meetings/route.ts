import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/clients/[id]/meetings - 고객사 미팅 기록 조회
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

    const customerId = params.id;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    // 고객사 소유권 확인
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or access denied' },
        { status: 404 }
      );
    }

    // 미팅 기록 조회
    const { data: meetings, error: meetingsError } = await supabase
      .from('customer_meetings')
      .select(`
        *,
        profiles!customer_meetings_created_by_fkey(id, full_name)
      `)
      .eq('customer_id', customerId)
      .order('meeting_date', { ascending: false })
      .limit(limit);

    if (meetingsError) {
      console.error('Error fetching customer meetings:', meetingsError);
      return NextResponse.json(
        { error: 'Failed to fetch meetings' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customer,
      meetings: meetings || []
    });

  } catch (error) {
    console.error('GET /api/clients/[id]/meetings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/clients/[id]/meetings - 새 미팅 기록 생성
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

    const customerId = params.id;
    const body = await request.json();
    const {
      title,
      meeting_date,
      duration_minutes,
      meeting_type,
      participants,
      agenda,
      notes,
      follow_up_actions,
      next_meeting_date,
    } = body;

    // 필수 필드 검증
    if (!title || !meeting_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title, meeting_date' },
        { status: 400 }
      );
    }

    // 고객사 소유권 확인
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('id', customerId)
      .eq('user_id', user.id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Customer not found or access denied' },
        { status: 404 }
      );
    }

    // 미팅 기록 생성
    const { data: meeting, error } = await supabase
      .from('customer_meetings')
      .insert({
        customer_id: customerId,
        title,
        meeting_date,
        duration_minutes: duration_minutes || 60,
        meeting_type: meeting_type || 'meeting',
        participants: participants || [],
        agenda: agenda || null,
        notes: notes || null,
        follow_up_actions: follow_up_actions || null,
        next_meeting_date: next_meeting_date || null,
        created_by: user.id,
      })
      .select(`
        *,
        profiles!customer_meetings_created_by_fkey(id, full_name)
      `)
      .single();

    if (error) {
      console.error('Error creating meeting:', error);
      return NextResponse.json(
        { error: 'Failed to create meeting' },
        { status: 500 }
      );
    }

    return NextResponse.json(meeting, { status: 201 });

  } catch (error) {
    console.error('POST /api/clients/[id]/meetings error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}