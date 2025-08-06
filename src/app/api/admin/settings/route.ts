import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get company settings
    const { data: company, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userProfile.company_id)
      .single();

    if (error) {
      console.error('Error fetching company settings:', error);
      return NextResponse.json(
        { error: 'Failed to fetch company settings' },
        { status: 500 }
      );
    }

    // Ensure settings object exists with defaults
    const defaultSettings = {
      currency: 'KRW',
      date_format: 'YYYY-MM-DD',
      number_format: 'ko-KR',
      timezone: 'Asia/Seoul',
      auto_backup: true,
      email_notifications: true,
      quote_expiry_days: 30,
      max_file_size_mb: 10,
    };

    const formattedCompany = {
      ...company,
      bank_info: company.bank_info || {},
      settings: { ...defaultSettings, ...(company.settings || {}) },
    };

    return NextResponse.json(formattedCompany);
  } catch (error) {
    console.error('Error in admin settings GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      logo_url,
      address,
      phone,
      email,
      website,
      tax_number,
      bank_info,
      default_terms,
      default_payment_terms,
      settings,
    } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Company name is required' },
        { status: 400 }
      );
    }

    // Update company settings
    const { data: updatedCompany, error: updateError } = await supabase
      .from('companies')
      .update({
        name,
        logo_url: logo_url || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        website: website || null,
        tax_number: tax_number || null,
        bank_info: bank_info || {},
        default_terms: default_terms || null,
        default_payment_terms: Number(default_payment_terms) || 30,
        settings: settings || {},
        updated_at: new Date().toISOString(),
      })
      .eq('id', userProfile.company_id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating company settings:', updateError);
      return NextResponse.json(
        { error: 'Failed to update company settings' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedCompany);
  } catch (error) {
    console.error('Error in admin settings PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
