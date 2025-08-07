// 직접 연동 최적화된 클라이언트 API
import {
  createDirectApi,
  DirectQueryBuilder,
  parsePagination,
  parseSort,
  parseSearch,
  createPaginatedResponse,
  createErrorResponse,
} from '@/lib/api/direct-integration';

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

interface ClientCreateInput {
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
}

// GET /api/clients - 최적화된 클라이언트 목록 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'clients');
    
    // 파라미터 파싱 (한 번만)
    const pagination = parsePagination(searchParams);
    const sort = parseSort(searchParams, [
      'name', 'created_at', 'updated_at', 'contact_person'
    ]);
    
    // 필터링
    const filters: Record<string, any> = {};
    const isActive = searchParams.get('is_active');
    if (isActive !== null) {
      filters.is_active = isActive === 'true';
    }
    
    // 검색 조건
    const searchTerm = searchParams.get('search');
    const search = searchTerm ? {
      fields: ['name', 'email', 'contact_person', 'business_registration_number'],
      term: searchTerm.trim().slice(0, 100) // 보안: 길이 제한
    } : undefined;

    // 단일 쿼리로 데이터와 카운트 동시 조회
    const { data: clients, count } = await queryBuilder.findMany<Client>({
      select: `
        id,
        name,
        business_registration_number,
        contact_person,
        email,
        phone,
        address,
        postal_code,
        website,
        notes,
        tax_invoice_email,
        industry_type,
        company_size,
        credit_rating,
        payment_terms_days,
        is_active,
        created_at,
        updated_at,
        created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
      `,
      where: filters,
      search,
      sort,
      pagination,
    });

    return createPaginatedResponse(
      clients,
      count,
      pagination.page,
      pagination.limit
    );
  },
  {
    requireAuth: true,
    enableLogging: true,
    enableCaching: true,
  }
);

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

    // 사업자번호 중복 검사 (제공된 경우만)
    if (body.business_registration_number?.trim()) {
      const existing = await queryBuilder.findMany<Client>({
        select: 'id',
        where: {
          business_registration_number: body.business_registration_number.trim()
        },
        pagination: { page: 1, limit: 1 }
      });
      
      if (existing.count > 0) {
        throw new Error('이미 등록된 사업자등록번호입니다.');
      }
    }

    // 데이터 정리 및 생성
    const clientData: ClientCreateInput = {
      name: body.name.trim(),
      business_registration_number: body.business_registration_number?.trim() || null,
      contact_person: body.contact_person.trim(),
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      address: body.address?.trim() || null,
      postal_code: body.postal_code?.trim() || null,
      website: body.website?.trim() || null,
      notes: body.notes?.trim() || null,
      tax_invoice_email: body.tax_invoice_email?.trim() || null,
      industry_type: body.industry_type?.trim() || null,
      company_size: body.company_size || null,
      credit_rating: body.credit_rating ? Math.max(0, Math.min(100, Number(body.credit_rating))) : null,
      payment_terms_days: body.payment_terms_days ? Math.max(0, Number(body.payment_terms_days)) : null,
    };

    // 생성 (created_by, updated_by, is_active는 자동 설정)
    const client = await queryBuilder.create<Client>({
      ...clientData,
      is_active: true,
      created_by: user.id,
      updated_by: user.id,
    }, `
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

// 에러 처리를 위한 래퍼 함수들
const wrapHandler = (handler: any) => async (request: any) => {
  try {
    return await handler(request);
  } catch (error: any) {
    console.error('API Error:', error);
    
    // 비즈니스 로직 에러
    if (error.message) {
      return createErrorResponse(error.message, 'BUSINESS_ERROR', 400);
    }
    
    // Supabase 에러
    if (error.code) {
      return createErrorResponse(
        '데이터베이스 오류가 발생했습니다.',
        error.code,
        500
      );
    }
    
    // 기타 에러
    return createErrorResponse(
      '서버 내부 오류가 발생했습니다.',
      'INTERNAL_ERROR',
      500
    );
  }
};

// 최종 export (에러 처리 포함)
export { GET as _GET, POST as _POST };
export const GET_WITH_ERROR_HANDLING = wrapHandler(GET);
export const POST_WITH_ERROR_HANDLING = wrapHandler(POST);