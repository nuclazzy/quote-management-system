import { NextRequest, NextResponse } from 'next/server';

interface CompanySettings {
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  default_terms?: string;
  default_payment_terms: number;
}

// 기본 회사 설정
const DEFAULT_SETTINGS: CompanySettings = {
  name: '회사명',
  logo_url: '',
  address: '서울시 강남구',
  phone: '02-1234-5678',
  email: 'contact@company.com',
  website: 'https://company.com',
  tax_number: '123-45-67890',
  default_terms: '본 견적서는 30일간 유효합니다.\n부가가치세가 별도 부과됩니다.\n견적 내용은 협의에 의해 변경 가능합니다.',
  default_payment_terms: 30,
};

// GET /api/admin/settings - StaticAuth 회사 설정 조회
export async function GET(request: NextRequest) {
  try {
    // StaticAuth에서는 관리자 권한 체크를 클라이언트에서 처리하므로
    // 여기서는 단순히 기본 설정을 반환하거나 localStorage에서 읽은 설정을 반환
    
    // 클라이언트에서 localStorage의 설정을 가져오도록 기본값 반환
    return NextResponse.json({
      success: true,
      data: DEFAULT_SETTINGS,
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching company settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '설정 조회에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// PUT /api/admin/settings - StaticAuth 회사 설정 수정
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      logo_url,
      address,
      phone,
      email,
      website,
      tax_number,
      default_terms,
      default_payment_terms,
    } = body;

    // 필수 필드 검증
    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '회사명은 필수입니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // StaticAuth에서는 실제 DB 업데이트 대신 성공 응답만 반환
    // 실제 데이터는 클라이언트 localStorage에서 관리
    const updatedSettings: CompanySettings = {
      name,
      logo_url: logo_url || '',
      address: address || '',
      phone: phone || '',
      email: email || '',
      website: website || '',
      tax_number: tax_number || '',
      default_terms: default_terms || '',
      default_payment_terms: Number(default_payment_terms) || 30,
    };

    return NextResponse.json({
      success: true,
      data: {
        message: '회사 설정이 성공적으로 수정되었습니다.',
        company: updatedSettings,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error updating company settings:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '설정 수정에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
