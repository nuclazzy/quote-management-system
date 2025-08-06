import { supabase } from '../supabase/client';
import type { Client, ClientInsert, ClientUpdate } from '@/types';

/**
 * CustomerService - 클라이언트(고객사) 관리 서비스
 * customers 테이블이 clients로 변경됨에 따른 어댑터 서비스
 */
export class CustomerService {
  /**
   * 고객사 목록 조회
   */
  static async getCustomers(filter?: {
    search?: string;
    is_active?: boolean;
  }) {
    let query = supabase
      .from('clients')
      .select('*')
      .order('name');

    if (filter) {
      if (filter.search) {
        query = query.or(
          `name.ilike.%${filter.search}%,contact_person.ilike.%${filter.search}%,email.ilike.%${filter.search}%`
        );
      }
      if (filter.is_active !== undefined) {
        query = query.eq('is_active', filter.is_active);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`고객사 목록 조회 실패: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
    };
  }

  /**
   * 고객사 상세 조회
   */
  static async getCustomerById(id: string): Promise<Client> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`고객사 조회 실패: ${error.message}`);
    }

    if (!data) {
      throw new Error('고객사를 찾을 수 없습니다.');
    }

    return data;
  }

  /**
   * 고객사 생성
   */
  static async createCustomer(customerData: Omit<ClientInsert, 'id' | 'created_at' | 'updated_at'>): Promise<Client> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('clients')
      .insert({
        ...customerData,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`고객사 생성 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 고객사 수정
   */
  static async updateCustomer(
    id: string,
    updates: Omit<ClientUpdate, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Client> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('로그인이 필요합니다.');
    }

    const { data, error } = await supabase
      .from('clients')
      .update({
        ...updates,
        updated_by: user.user.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`고객사 수정 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 고객사 삭제 (soft delete)
   */
  static async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('clients')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`고객사 삭제 실패: ${error.message}`);
    }
  }

  /**
   * 고객사 통계 조회
   */
  static async getCustomerStats(customerId: string) {
    // 고객사별 견적서 통계
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select('status, total_amount')
      .eq('client_id', customerId);

    if (quotesError) {
      console.error('견적서 통계 조회 실패:', quotesError);
    }

    // 고객사별 프로젝트 통계
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('status, contract_amount')
      .eq('client_id', customerId);

    if (projectsError) {
      console.error('프로젝트 통계 조회 실패:', projectsError);
    }

    const totalQuotes = quotes?.length || 0;
    const totalQuoteAmount = quotes?.reduce((sum, q) => sum + (q.total_amount || 0), 0) || 0;
    const approvedQuotes = quotes?.filter(q => q.status === 'approved').length || 0;
    
    const totalProjects = projects?.length || 0;
    const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
    const totalContractAmount = projects?.reduce((sum, p) => sum + (p.contract_amount || 0), 0) || 0;

    return {
      totalQuotes,
      totalQuoteAmount,
      approvedQuotes,
      totalProjects,
      activeProjects,
      totalContractAmount,
    };
  }

  /**
   * 활성 고객사 수 조회
   */
  static async getActiveCustomersCount(): Promise<number> {
    const { count, error } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (error) {
      console.error('활성 고객사 수 조회 실패:', error);
      return 0;
    }

    return count || 0;
  }

  /**
   * 최근 추가된 고객사 조회
   */
  static async getRecentCustomers(limit = 5): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('최근 고객사 조회 실패:', error);
      return [];
    }

    return data || [];
  }
}