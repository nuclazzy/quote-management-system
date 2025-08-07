import {
  createDirectApi,
  DirectQueryBuilder,
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

// GET /api/suppliers/[id] - 최적화된 공급업체 상세 조회
export const GET = createDirectApi(
  async ({ supabase }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'suppliers');
    
    const supplier = await queryBuilder.findOne<Supplier>(params.id, `
      *,
      created_by_profile:profiles!suppliers_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!suppliers_updated_by_fkey(id, full_name, email)
    `);
    
    if (!supplier) {
      throw new Error('공급업체를 찾을 수 없습니다.');
    }

    return { supplier };
  },
  { requireAuth: true, enableLogging: true }
);

// PUT /api/suppliers/[id] - 최적화된 공급업체 수정
export const PUT = createDirectApi(
  async ({ supabase, user, body }, { params }: { params: { id: string } }) => {
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

    // 기존 공급업체 확인
    const existingSupplier = await queryBuilder.findOne<Supplier>(params.id);
    if (!existingSupplier) {
      throw new Error('공급업체를 찾을 수 없습니다.');
    }

    // 사업자번호 중복 검사 (변경된 경우만, 자신 제외)
    if (body.business_registration_number?.trim()) {
      const cleanBusinessNumber = body.business_registration_number.trim().replace(/[^0-9]/g, '');
      if (cleanBusinessNumber.length !== 10) {
        throw new Error('사업자등록번호는 10자리 숫자여야 합니다.');
      }

      if (cleanBusinessNumber !== existingSupplier.business_registration_number) {
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
      is_active: body.is_active !== undefined ? body.is_active : true,
      updated_by: user.id,
    };

    // 공급업체 수정
    const supplier = await queryBuilder.update<Supplier>(params.id, supplierData, `
      *,
      created_by_profile:profiles!suppliers_created_by_fkey(id, full_name, email),
      updated_by_profile:profiles!suppliers_updated_by_fkey(id, full_name, email)
    `);

    return {
      message: '공급업체 정보가 성공적으로 수정되었습니다.',
      supplier,
    };
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);

// DELETE /api/suppliers/[id] - 최적화된 공급업체 삭제 (논리/물리 삭제)
export const DELETE = createDirectApi(
  async ({ supabase, user }, { params }: { params: { id: string } }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'suppliers');
    
    // 기존 공급업체 확인
    const existingSupplier = await queryBuilder.findOne<Supplier>(params.id);
    if (!existingSupplier) {
      throw new Error('공급업체를 찾을 수 없습니다.');
    }

    // 해당 공급업체를 사용하는 견적서 세부내용이 있는지 확인
    const quoteDetailsQuery = new DirectQueryBuilder(supabase, 'quote_details');
    const { count: quoteDetailsCount } = await quoteDetailsQuery.findMany({
      select: 'id',
      where: { supplier_id: params.id },
      pagination: { page: 1, limit: 1 }
    });

    if (quoteDetailsCount > 0) {
      // 사용 중인 공급업체는 비활성화만 가능 (논리 삭제)
      const supplier = await queryBuilder.update<Supplier>(params.id, {
        is_active: false,
        updated_by: user.id,
      }, `
        *,
        created_by_profile:profiles!suppliers_created_by_fkey(id, full_name, email),
        updated_by_profile:profiles!suppliers_updated_by_fkey(id, full_name, email)
      `);

      return {
        supplier,
        message: '견적서에서 사용 중인 공급업체는 삭제할 수 없어 비활성화되었습니다.',
      };
    } else {
      // 사용하지 않는 공급업체는 완전 삭제 (물리 삭제)
      await queryBuilder.delete(params.id);

      return {
        message: '공급업체가 성공적으로 삭제되었습니다.',
      };
    }
  },
  { requireAuth: true, requiredRole: 'member', enableLogging: true }
);