import {
  createDirectApi,
  DirectQueryBuilder,
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

// GET /api/clients/[id] - 최적화된 고객사 상세 조회
export const GET = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'clients');
    
    const client = await queryBuilder.findOne<Client>(params.id, `
      *,
      created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
    `);
    
    if (!client) {
      throw new Error('고객사를 찾을 수 없습니다.');
    }

    return client;
  },
  { requireAuth: true, enableLogging: true }
);

// PUT /api/clients/[id] - 최적화된 고객사 수정
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
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

    // 기존 고객사 확인
    const existingClient = await queryBuilder.findOne<Client>(params.id);
    if (!existingClient) {
      throw new Error('고객사를 찾을 수 없습니다.');
    }

    // 사업자번호 중복 검사 (변경된 경우만)
    if (body.business_registration_number?.trim()) {
      const cleanBusinessNumber = body.business_registration_number.trim().replace(/[^0-9]/g, '');
      if (cleanBusinessNumber.length !== 10) {
        throw new Error('사업자등록번호는 10자리 숫자여야 합니다.');
      }

      if (cleanBusinessNumber !== existingClient.business_registration_number) {
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
      is_active: body.is_active !== undefined ? body.is_active : true,
      updated_by: user.id,
    };

    // 고객사 수정
    const client = await queryBuilder.update<Client>(params.id, clientData, `
      *,
      created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
    `);

    return {
      message: '고객사 정보가 성공적으로 수정되었습니다.',
      client,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/clients/[id] - 최적화된 고객사 삭제 (논리/물리 삭제)
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'clients');
    
    // 기존 고객사 확인
    const existingClient = await queryBuilder.findOne<Client>(params.id);
    if (!existingClient) {
      throw new Error('고객사를 찾을 수 없습니다.');
    }

    // 해당 고객사를 사용하는 견적서가 있는지 확인
    const quotesQuery = new DirectQueryBuilder(supabase, 'quotes');
    const { count: quotesCount } = await quotesQuery.findMany({
      select: 'id',
      where: { client_id: params.id },
      pagination: { page: 1, limit: 1 }
    });

    if (quotesCount > 0) {
      // 사용 중인 고객사는 비활성화만 가능 (논리 삭제)
      const client = await queryBuilder.update<Client>(params.id, {
        is_active: false,
        updated_by: user.id,
      }, `
        *,
        created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
      `);

      return {
        client,
        message: '견적서에서 참조되고 있어 고객사를 비활성화했습니다. 완전 삭제는 불가능합니다.',
      };
    } else {
      // 사용하지 않는 고객사는 완전 삭제 (물리 삭제)
      await queryBuilder.delete(params.id);

      return {
        message: '고객사가 완전히 삭제되었습니다.',
      };
    }
  },
  { requireAuth: true, requiredRole: 'admin', enableLogging: true }
);
