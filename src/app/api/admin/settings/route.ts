import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface Company {
  id: string;
  name: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  tax_number?: string;
  default_terms?: string;
  default_payment_terms: number;
  created_at: string;
  updated_at: string;
}

// GET /api/admin/settings - 최적화된 회사 설정 조회
export const GET = createDirectApi(
  async ({ supabase, user }) => {
    // 사용자 프로필과 회사 ID 조회
    const profileQuery = new DirectQueryBuilder(supabase, 'profiles');
    const userProfile = await profileQuery.findOne(user.id, 'role, company_id');
    
    if (!userProfile?.company_id) {
      throw new Error('회사 정보를 찾을 수 없습니다.');
    }

    // 회사 설정 조회
    const companyQuery = new DirectQueryBuilder(supabase, 'companies');
    const company = await companyQuery.findOne<Company>(userProfile.company_id);
    
    if (!company) {
      throw new Error('회사 설정을 찾을 수 없습니다.');
    }

    return company;
  },
  { requireAuth: true, requiredRole: 'admin', enableLogging: true }
);

// PUT /api/admin/settings - 최적화된 회사 설정 수정
export const PUT = createDirectApi(
  async ({ supabase, user, body }) => {
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
      throw new Error('회사명은 필수입니다.');
    }

    // 사용자 프로필과 회사 ID 조회
    const profileQuery = new DirectQueryBuilder(supabase, 'profiles');
    const userProfile = await profileQuery.findOne(user.id, 'role, company_id');
    
    if (!userProfile?.company_id) {
      throw new Error('회사 정보를 찾을 수 없습니다.');
    }

    // 회사 설정 업데이트
    const companyQuery = new DirectQueryBuilder(supabase, 'companies');
    const updatedCompany = await companyQuery.update<Company>(userProfile.company_id, {
      name,
      logo_url: logo_url || null,
      address: address || null,
      phone: phone || null,
      email: email || null,
      website: website || null,
      tax_number: tax_number || null,
      default_terms: default_terms || null,
      default_payment_terms: Number(default_payment_terms) || 30,
    });

    return {
      message: '회사 설정이 성공적으로 수정되었습니다.',
      company: updatedCompany,
    };
  },
  { requireAuth: true, requiredRole: 'admin', enableLogging: true }
);
