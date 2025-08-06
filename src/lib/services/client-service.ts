import { BaseService, ServiceResponse, PaginationParams, PaginationResponse } from './base-service';

export interface Client {
  id: string;
  name: string;
  business_registration_number?: string;
  contact_person: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
  created_by_profile?: any;
  updated_by_profile?: any;
}

export interface ClientFormData {
  name: string;
  business_registration_number?: string;
  contact_person: string;
  email?: string;
  phone?: string;
  address?: string;
  postal_code?: string;
  website?: string;
  notes?: string;
  is_active?: boolean;
}

export class ClientService extends BaseService {
  // 클라이언트 목록 조회
  async getClients(params: PaginationParams & { 
    search?: string; 
    isActive?: boolean;
  }): Promise<ServiceResponse<PaginationResponse<Client>>> {
    try {
      const user = await this.getUser();
      await this.getUserProfile(user.id);

      let query = this.supabase.from('clients').select(
        `
          *,
          created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
          updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
        `,
        { count: 'exact' }
      );

      // 활성 상태 필터
      if (params.isActive !== undefined) {
        query = query.eq('is_active', params.isActive);
      }

      // 검색 필터
      if (params.search) {
        query = query.or(`
          name.ilike.%${params.search}%,
          email.ilike.%${params.search}%,
          contact_person.ilike.%${params.search}%,
          business_registration_number.ilike.%${params.search}%
        `);
      }

      // 페이지네이션 적용
      const page = params.page || 1;
      const limit = Math.min(params.limit || 10, 100);
      query = this.createPaginationQuery(query, params);

      const { data: clients, error, count } = await query;

      if (error) {
        return this.handleError(error);
      }

      return {
        data: {
          data: clients || [],
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          }
        }
      };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 클라이언트 상세 조회
  async getClient(id: string): Promise<ServiceResponse<Client>> {
    try {
      const user = await this.getUser();

      const { data: client, error } = await this.supabase
        .from('clients')
        .select(`
          *,
          created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
          updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
        `)
        .eq('id', id)
        .single();

      if (error) {
        return this.handleError(error);
      }

      return { data: client };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 클라이언트 생성
  async createClient(formData: ClientFormData): Promise<ServiceResponse<Client>> {
    try {
      const user = await this.getUser();
      await this.getUserProfile(user.id);

      // 필수 필드 검증
      if (!formData.name || !formData.contact_person) {
        return {
          error: 'Missing required fields: name, contact_person',
          status: 400
        };
      }

      // 사업자번호 중복 검사
      if (formData.business_registration_number) {
        const { data: existingClient } = await this.supabase
          .from('clients')
          .select('id')
          .eq('business_registration_number', formData.business_registration_number)
          .single();

        if (existingClient) {
          return {
            error: 'Client with this business registration number already exists',
            status: 400
          };
        }
      }

      // 새 클라이언트 생성
      const { data: client, error } = await this.supabase
        .from('clients')
        .insert({
          ...formData,
          business_registration_number: formData.business_registration_number || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          postal_code: formData.postal_code || null,
          website: formData.website || null,
          notes: formData.notes || null,
          is_active: true,
          created_by: user.id,
          updated_by: user.id,
        })
        .select(`
          *,
          created_by_profile:profiles!clients_created_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) {
        return this.handleError(error);
      }

      return { data: client };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 클라이언트 수정
  async updateClient(id: string, formData: ClientFormData): Promise<ServiceResponse<Client>> {
    try {
      const user = await this.getUser();

      // 필수 필드 검증
      if (!formData.name || !formData.contact_person) {
        return {
          error: 'Missing required fields: name, contact_person',
          status: 400
        };
      }

      // 사업자번호 중복 검사
      if (formData.business_registration_number) {
        const { data: existingClient } = await this.supabase
          .from('clients')
          .select('id')
          .eq('business_registration_number', formData.business_registration_number)
          .neq('id', id)
          .single();

        if (existingClient) {
          return {
            error: 'Another client with this business registration number already exists',
            status: 400
          };
        }
      }

      // 클라이언트 수정
      const { data: client, error } = await this.supabase
        .from('clients')
        .update({
          ...formData,
          business_registration_number: formData.business_registration_number || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          postal_code: formData.postal_code || null,
          website: formData.website || null,
          notes: formData.notes || null,
          is_active: formData.is_active !== undefined ? formData.is_active : true,
          updated_by: user.id,
        })
        .eq('id', id)
        .select(`
          *,
          created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
          updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
        `)
        .single();

      if (error) {
        return this.handleError(error);
      }

      return { data: client };
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 클라이언트 삭제
  async deleteClient(id: string): Promise<ServiceResponse<any>> {
    try {
      const user = await this.getUser();
      const profile = await this.getUserProfile(user.id);

      // 권한 확인
      if (!['super_admin', 'admin'].includes(profile.role)) {
        return {
          error: 'Insufficient permissions',
          status: 403
        };
      }

      // 관련 견적서 확인
      const { data: quotes } = await this.supabase
        .from('quotes')
        .select('id')
        .eq('client_id', id)
        .limit(1);

      if (quotes && quotes.length > 0) {
        // 논리 삭제
        const { data: client, error } = await this.supabase
          .from('clients')
          .update({
            is_active: false,
            updated_by: user.id,
          })
          .eq('id', id)
          .select(`
            *,
            created_by_profile:profiles!clients_created_by_fkey(id, full_name, email),
            updated_by_profile:profiles!clients_updated_by_fkey(id, full_name, email)
          `)
          .single();

        if (error) {
          return this.handleError(error);
        }

        return {
          data: {
            client,
            message: 'Client has been deactivated because it is referenced by existing quotes.'
          }
        };
      } else {
        // 물리 삭제
        const { error } = await this.supabase
          .from('clients')
          .delete()
          .eq('id', id);

        if (error) {
          return this.handleError(error);
        }

        return {
          data: {
            message: 'Client has been permanently deleted.'
          }
        };
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  // 모든 클라이언트 조회 (페이지네이션 없이)
  async getAllClients(): Promise<ServiceResponse<Client[]>> {
    try {
      const user = await this.getUser();

      const { data: clients, error } = await this.supabase
        .from('clients')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        return this.handleError(error);
      }

      return { data: clients || [] };
    } catch (error) {
      return this.handleError(error);
    }
  }
}

// 싱글톤 인스턴스
export const clientService = new ClientService();