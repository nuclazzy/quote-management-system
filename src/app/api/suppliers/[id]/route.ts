import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/lib/auth/get-user';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select(
        `
        *,
        created_by_profile:profiles!suppliers_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!suppliers_updated_by_fkey(id, full_name, email)
      `
      )
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '공급업체를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Supplier fetch error:', error);
      return NextResponse.json(
        { error: '공급업체 조회에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Supplier GET API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

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
      payment_terms,
      lead_time_days,
      quality_rating,
      notes,
      is_active,
    } = body;

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        { error: '공급업체명은 필수입니다.' },
        { status: 400 }
      );
    }

    // 이메일 형식 검증
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 형식이 아닙니다.' },
        { status: 400 }
      );
    }

    // 품질 평가 검증
    if (quality_rating && (quality_rating < 1 || quality_rating > 5)) {
      return NextResponse.json(
        { error: '품질 평가는 1-5 사이의 값이어야 합니다.' },
        { status: 400 }
      );
    }

    // 납기일수 검증
    if (lead_time_days && lead_time_days < 0) {
      return NextResponse.json(
        { error: '납기일수는 0 이상이어야 합니다.' },
        { status: 400 }
      );
    }

    // 사업자번호 중복 체크 (자신 제외)
    if (business_registration_number) {
      const { data: existingSupplier } = await supabase
        .from('suppliers')
        .select('id')
        .eq('business_registration_number', business_registration_number)
        .neq('id', params.id)
        .single();

      if (existingSupplier) {
        return NextResponse.json(
          { error: '이미 등록된 사업자번호입니다.' },
          { status: 400 }
        );
      }
    }

    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update({
        name,
        business_registration_number: business_registration_number || null,
        contact_person: contact_person || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        postal_code: postal_code || null,
        website: website || null,
        payment_terms: payment_terms || null,
        lead_time_days: lead_time_days || 0,
        quality_rating: quality_rating || null,
        notes: notes || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_by: user.id,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: '공급업체를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      console.error('Supplier update error:', error);
      return NextResponse.json(
        { error: '공급업체 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error('Supplier PUT API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const user = await getUser();

    if (!user) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401 }
      );
    }

    // 해당 공급업체를 사용하는 견적서 세부내용이 있는지 확인
    const { data: quoteDetails, error: detailsError } = await supabase
      .from('quote_details')
      .select('id')
      .eq('supplier_id', params.id)
      .limit(1);

    if (detailsError) {
      console.error('Quote details check error:', detailsError);
      return NextResponse.json(
        { error: '공급업체 사용 여부 확인에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (quoteDetails && quoteDetails.length > 0) {
      // 사용 중인 공급업체는 비활성화만 가능
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .update({
          is_active: false,
          updated_by: user.id,
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: '공급업체를 찾을 수 없습니다.' },
            { status: 404 }
          );
        }
        console.error('Supplier deactivation error:', error);
        return NextResponse.json(
          { error: '공급업체 비활성화에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        supplier,
        message:
          '견적서에서 사용 중인 공급업체는 삭제할 수 없어 비활성화되었습니다.',
      });
    } else {
      // 사용하지 않는 공급업체는 완전 삭제
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', params.id);

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: '공급업체를 찾을 수 없습니다.' },
            { status: 404 }
          );
        }
        console.error('Supplier deletion error:', error);
        return NextResponse.json(
          { error: '공급업체 삭제에 실패했습니다.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: '공급업체가 성공적으로 삭제되었습니다.',
      });
    }
  } catch (error) {
    console.error('Supplier DELETE API error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
