import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

// GET /api/clients/[id] - 고객사 상세 조회
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

    const clientId = params.id;

    const { data: client, error } = await supabase
      .from('clients')
      .select(
        `
        *,
        created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
      `
      )
      .eq('id', clientId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
      }
      console.error('Error fetching client:', error);
      return NextResponse.json(
        { error: 'Failed to fetch client' },
        { status: 500 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('GET /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/clients/[id] - 고객사 수정
export async function PUT(
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

    const clientId = params.id;
    const body = await request.json();
    const {
      name,
      business_registration_number,
      contact_person,
      email,
      phone,
      address,
      postal_code,
      website,
      notes,
      is_active,
    } = body;

    // 필수 필드 검증
    if (!name || !contact_person) {
      return NextResponse.json(
        { error: 'Missing required fields: name, contact_person' },
        { status: 400 }
      );
    }

    // 사업자번호 중복 검사 (사업자번호가 변경된 경우)
    if (business_registration_number) {
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .eq('business_registration_number', business_registration_number)
        .neq('id', clientId)
        .single();

      if (existingClient) {
        return NextResponse.json(
          {
            error:
              'Another client with this business registration number already exists',
          },
          { status: 400 }
        );
      }
    }

    // 고객사 수정
    const { data: client, error } = await supabase
      .from('clients')
      .update({
        name,
        business_registration_number: business_registration_number || null,
        contact_person,
        email: email || null,
        phone: phone || null,
        address: address || null,
        postal_code: postal_code || null,
        website: website || null,
        notes: notes || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_by: user.id,
      })
      .eq('id', clientId)
      .select(
        `
        *,
        created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
      `
      )
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Client not found' },
          { status: 404 }
        );
      }
      console.error('Error updating client:', error);
      return NextResponse.json(
        { error: 'Failed to update client' },
        { status: 500 }
      );
    }

    return NextResponse.json(client);
  } catch (error) {
    console.error('PUT /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/clients/[id] - 고객사 삭제 (논리/물리 삭제)
export async function DELETE(
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

    // 사용자 권한 확인 (삭제는 관리자만 가능하다고 가정)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    if (!['super_admin', 'admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const clientId = params.id;

    // 해당 고객사를 사용하는 견적서가 있는지 확인
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('id')
      .eq('client_id', clientId)
      .limit(1);

    if (quotesError) {
      console.error('Error checking client usage:', quotesError);
      return NextResponse.json(
        { error: 'Failed to check client usage' },
        { status: 500 }
      );
    }

    if (quotes && quotes.length > 0) {
      // 사용 중인 고객사는 비활성화만 가능 (논리 삭제)
      const { data: client, error } = await supabase
        .from('clients')
        .update({
          is_active: false,
          updated_by: user.id,
        })
        .eq('id', clientId)
        .select(
          `
          *,
          created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
          updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
        `
        )
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Client not found' },
            { status: 404 }
          );
        }
        console.error('Error deactivating client:', error);
        return NextResponse.json(
          { error: 'Failed to deactivate client' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        client,
        message:
          'Client has been deactivated because it is referenced by existing quotes. It cannot be permanently deleted.',
      });
    } else {
      // 사용하지 않는 고객사는 완전 삭제 (물리 삭제)
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'Client not found' },
            { status: 404 }
          );
        }
        console.error('Error deleting client:', error);
        return NextResponse.json(
          { error: 'Failed to delete client' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: 'Client has been permanently deleted.',
      });
    }
  } catch (error) {
    console.error('DELETE /api/clients/[id] error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
