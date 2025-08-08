import {
  createDirectApi,
  DirectQueryBuilder,
  parsePagination,
  parseSort,
  createPaginatedResponse,
} from '@/lib/api/direct-integration';

interface Supplier {
  id: string;
  name: string;
  business_registration_number?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  website?: string;
  payment_terms?: string;
  lead_time_days?: number;
  quality_rating?: number;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
}

// GET /api/suppliers - 최적화된 공급업체 목록 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'suppliers');
    
    // 파라미터 파싱
    const pagination = parsePagination(searchParams);
    const sort = parseSort(searchParams, [
      'name', 'contact_person', 'quality_rating', 'lead_time_days', 'created_at'
    ]);
    
    // 필터링
    const filters: Record<string, any> = {};
    const isActive = searchParams.get('isActive');
    if (isActive !== null && isActive !== '') {
      filters.is_active = isActive === 'true';
    }
    
    // 검색 조건
    const searchTerm = searchParams.get('search');
    const search = searchTerm ? {
      fields: ['name', 'contact_person', 'email', 'business_registration_number'],
      term: searchTerm.trim().slice(0, 100)
    } : undefined;

    // 최적화된 단일 쿼리
    const { data: suppliers, count } = await queryBuilder.findMany<Supplier>({
      select: `*`,
      where: filters,
      search,
      sort,
      pagination,
    });

    return createPaginatedResponse(
      suppliers,
      count,
      pagination.page,
      pagination.limit
    );
  },
  {
    requireAuth: false,
    enableLogging: true,
    enableCaching: true,
  }
);

// POST /api/suppliers - 최적화된 공급업체 생성
export const POST = createDirectApi(
  async ({ supabase, body }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'suppliers');
    
    // 입력 검증
    if (!body?.name?.trim()) {
      throw new Error('공급업체명은 필수입니다.');
    }

    // 이메일 형식 검증 (제공된 경우)
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      throw new Error('올바른 이메일 형식이 아닙니다.');
    }

    // 품질 평가 검증
    if (body.quality_rating && (body.quality_rating < 1 || body.quality_rating > 5)) {
      throw new Error('품질 평가는 1-5 사이의 값이어야 합니다.');
    }

    // 납기일수 검증
    if (body.lead_time_days && body.lead_time_days < 0) {
      throw new Error('납기일수는 0 이상이어야 합니다.');
    }

    // 사업자번호 중복 검사 (제공된 경우만)
    if (body.business_registration_number?.trim()) {
      const cleanBusinessNumber = body.business_registration_number.trim().replace(/[^0-9]/g, '');
      if (cleanBusinessNumber.length !== 10) {
        throw new Error('사업자등록번호는 10자리 숫자여야 합니다.');
      }

      const existing = await queryBuilder.findMany<Supplier>({
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
    const supplierData = {
      name: body.name.trim(),
      business_registration_number: body.business_registration_number?.trim().replace(/[^0-9]/g, '') || null,
      contact_person: body.contact_person?.trim() || null,
      email: body.email?.trim() || null,
      phone: body.phone?.trim() || null,
      address: body.address?.trim() || null,
      postal_code: body.postal_code?.trim() || null,
      website: body.website?.trim() || null,
      payment_terms: body.payment_terms?.trim() || null,
      lead_time_days: body.lead_time_days ? Math.max(0, Number(body.lead_time_days)) : 0,
      quality_rating: body.quality_rating ? Math.max(1, Math.min(5, Number(body.quality_rating))) : null,
      notes: body.notes?.trim() || null,
      is_active: body.is_active !== false,
      created_by: 'anonymous',
      updated_by: 'anonymous',
    };

    // 생성
    const supplier = await queryBuilder.create<Supplier>(supplierData, `*`);

    return {
      message: '공급업체가 성공적으로 생성되었습니다.',
      supplier,
    };
  },
  {
    requireAuth: false,
    enableLogging: true,
  }
);
