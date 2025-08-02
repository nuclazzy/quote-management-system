import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { quoteTemplateUpdateSchema } from '@/lib/validations/quote-templates';
import { Database } from '@/types/supabase';

// GET /api/quote-templates/[id] - 특정 견적서 템플릿 조회
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('quote_templates')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quote template not found' }, { status: 404 });
      }
      console.error('견적서 템플릿 조회 중 오류:', error);
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('견적서 템플릿 조회 중 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/quote-templates/[id] - 견적서 템플릿 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 요청 본문 파싱 및 검증
    const body = await request.json();
    const validatedData = quoteTemplateUpdateSchema.parse(body);

    // 빈 객체인 경우 처리
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: 'No data to update' }, { status: 400 });
    }

    // 견적서 템플릿 수정
    const { data, error } = await supabase
      .from('quote_templates')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quote template not found' }, { status: 404 });
      }
      console.error('견적서 템플릿 수정 중 오류:', error);
      return NextResponse.json({ error: 'Failed to update quote template' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data', details: error }, { status: 400 });
    }
    
    console.error('견적서 템플릿 수정 중 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/quote-templates/[id] - 견적서 템플릿 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerComponentClient<Database>({ cookies });
    
    // 사용자 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 물리적 삭제 (템플릿은 하드 삭제)
    const { data, error } = await supabase
      .from('quote_templates')
      .delete()
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Quote template not found' }, { status: 404 });
      }
      console.error('견적서 템플릿 삭제 중 오류:', error);
      return NextResponse.json({ error: 'Failed to delete quote template' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'Quote template deleted successfully',
      data 
    });
  } catch (error) {
    console.error('견적서 템플릿 삭제 중 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}