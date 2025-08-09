import {
  createDirectApi,
  DirectQueryBuilder,
  parsePagination,
  parseSort,
  createPaginatedResponse,
} from '@/lib/api/direct-integration';
import { MOCK_CLIENTS } from '@/data/mock-quotes';
import { NextRequest, NextResponse } from 'next/server';

interface Client {
  id: string;
  name: string;
  business_registration_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
  tax_invoice_email?: string;
  industry_type?: string;
  company_size?: 'startup' | 'small' | 'medium' | 'large';
  credit_rating?: number;
  payment_terms_days?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// GET /api/clients - StaticAuth Mock 클라이언트 목록 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 필터링 - 빈 데이터로 초기화
    let clients = [];
    
    const isActive = searchParams.get('is_active');
    if (isActive !== null) {
      clients = clients.filter(c => c.is_active === (isActive === 'true'));
    }
    
    const companySize = searchParams.get('company_size');
    if (companySize && ['startup', 'small', 'medium', 'large'].includes(companySize)) {
      clients = clients.filter(c => c.company_size === companySize);
    }
    
    const search = searchParams.get('search');
    if (search) {
      const searchTerm = search.toLowerCase();
      clients = clients.filter(c => 
        c.name.toLowerCase().includes(searchTerm) ||
        c.contact_person?.toLowerCase().includes(searchTerm) ||
        c.email?.toLowerCase().includes(searchTerm) ||
        c.business_registration_number?.includes(searchTerm) ||
        c.industry_type?.toLowerCase().includes(searchTerm)
      );
    }
    
    // 정렬 (이름순)
    clients.sort((a, b) => a.name.localeCompare(b.name));
    
    // 생성자 정보 추가
    const clientsWithProfile = clients.map(client => ({
      ...client,
      created_by_profile: { id: 'user_001', full_name: '관리자', email: 'admin@motionsense.co.kr' },
      updated_by_profile: { id: 'user_001', full_name: '관리자', email: 'admin@motionsense.co.kr' }
    }));

    return NextResponse.json({
      success: true,
      data: clientsWithProfile,
      meta: {
        total: clientsWithProfile.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '클라이언트 목록 조회에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}

// POST /api/clients - 최적화된 클라이언트 생성
export const POST = createDirectApi(
  async ({ supabase, user, body }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'clients');
    
    // 입력 검증
    if (!body?.name?.trim()) {
      throw new Error('회사명은 필수 항목입니다.');
    }
    
    if (!body?.contact_person?.trim()) {
      throw new Error('담당자명은 필수 항목입니다.');
    }

    // 이메일 형식 검증 (제공된 경우)
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new Error('올바른 이메일 형식이 아닙니다.');
    }

    // 사업자번호 중복 검사 (제공된 경우만)
    if (body.business_registration_number?.trim()) {
      const cleanBusinessNumber = body.business_registration_number.trim().replace(/[^0-9]/g, '');
      if (cleanBusinessNumber.length !== 10) {
        throw new Error('사업자등록번호는 10자리 숫자여야 합니다.');
      }

      const existing = await queryBuilder.findMany<Client>({
        select: 'id',
        where: {
          business_registration_number: cleanBusinessNumber
        },
        pagination: { page: 1, limit: 1 }
      });
      
      if (existing.count > 0) {
        throw new Error('이미 등록된 사업자등록번호입니다.');
      }
    }

    // 데이터 정리 및 검증
    const clientData = {
      name: body.name.trim(),
      business_registration_number: body.business_registration_number?.trim().replace(/[^0-9]/g, '') || null,
      contact_person: body.contact_person.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      address: body.address?.trim() || null,
      postal_code: body.postal_code?.trim() || null,
      website: body.website?.trim() || null,
      notes: body.notes?.trim() || null,
      tax_invoice_email: body.tax_invoice_email?.trim() || null,
      industry_type: body.industry_type?.trim() || null,
      company_size: body.company_size && ['startup', 'small', 'medium', 'large'].includes(body.company_size) 
        ? body.company_size : null,
      credit_rating: body.credit_rating ? Math.max(0, Math.min(100, Number(body.credit_rating))) : null,
      payment_terms_days: body.payment_terms_days ? Math.max(0, Number(body.payment_terms_days)) : null,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
    };

    // 생성
    const client = await queryBuilder.create<Client>(clientData, `
      *,
      created_by_profile:profiles!clients_created_by_fkey(id, full_name, email)
    `);

    return {
      message: '고객사가 성공적으로 생성되었습니다.',
      client,
    };
  },
  {
    requireAuth: true,
    requiredRole: 'member', // 최소 member 권한
    enableLogging: true,
  }
);
