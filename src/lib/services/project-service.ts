import { createBrowserClient } from '../supabase/client';

const supabase = createBrowserClient();
import type { Project, ProjectInsert, ProjectUpdate } from '@/types';

export interface ProjectFilter {
  status?: Project['status'][];
  client_id?: string[];
  priority?: Project['priority'][];
  search?: string;
  project_manager_id?: string[];
}

export class ProjectService {
  /**
   * 프로젝트 목록 조회
   */
  static async getProjects(filter?: ProjectFilter) {
    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name),
        manager:profiles(id, full_name)
      `)
      .order('created_at', { ascending: false });

    if (filter) {
      if (filter.status?.length) {
        query = query.in('status', filter.status);
      }
      if (filter.client_id?.length) {
        query = query.in('client_id', filter.client_id);
      }
      if (filter.priority?.length) {
        query = query.in('priority', filter.priority);
      }
      if (filter.project_manager_id?.length) {
        query = query.in('project_manager_id', filter.project_manager_id);
      }
      if (filter.search) {
        query = query.or(
          `name.ilike.%${filter.search}%,project_number.ilike.%${filter.search}%`
        );
      }
    }

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`프로젝트 목록 조회 실패: ${error.message}`);
    }

    return {
      data: data || [],
      count: count || 0,
    };
  }

  /**
   * 프로젝트 상세 조회
   */
  static async getProjectById(id: string) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(*),
        quote:quotes(*),
        manager:profiles(id, full_name),
        transactions(*),
        expenses:project_expenses(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(`프로젝트 조회 실패: ${error.message}`);
    }

    return data;
  }

  /**
   * 프로젝트 생성
   */
  static async createProject(projectData: Omit<ProjectInsert, 'id' | 'created_at' | 'updated_at' | 'project_number'>): Promise<Project> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('로그인이 필요합니다.');
    }

    // Map contract_amount to actual_amount for DB compatibility
    const dbData: any = {
      ...projectData,
      created_by: user.user.id,
    };
    
    // If contract_amount is provided, store it as actual_amount
    if ('contract_amount' in projectData) {
      dbData.actual_amount = projectData.contract_amount;
    }

    const { data, error } = await supabase
      .from('projects')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      throw new Error(`프로젝트 생성 실패: ${error.message}`);
    }

    // Map actual_amount back to contract_amount for consistency
    if (data && data.actual_amount !== undefined) {
      data.contract_amount = data.actual_amount;
    }

    return data;
  }

  /**
   * 프로젝트 수정
   */
  static async updateProject(
    id: string,
    updates: Omit<ProjectUpdate, 'id' | 'created_at' | 'updated_at' | 'project_number'>
  ): Promise<Project> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('로그인이 필요합니다.');
    }

    // Map contract_amount to actual_amount for DB compatibility
    const dbUpdates: any = {
      ...updates,
      updated_by: user.user.id,
      updated_at: new Date().toISOString(),
    };
    
    // If contract_amount is provided, store it as actual_amount
    if ('contract_amount' in updates) {
      dbUpdates.actual_amount = updates.contract_amount;
      delete dbUpdates.contract_amount;
    }

    const { data, error } = await supabase
      .from('projects')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`프로젝트 수정 실패: ${error.message}`);
    }

    // Map actual_amount back to contract_amount for consistency
    if (data && data.actual_amount !== undefined) {
      data.contract_amount = data.actual_amount;
    }

    return data;
  }

  /**
   * 프로젝트 삭제
   */
  static async deleteProject(id: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      throw new Error(`프로젝트 삭제 실패: ${error.message}`);
    }
  }

  /**
   * 프로젝트 진행률 업데이트
   */
  static async updateProjectProgress(id: string, progress: number): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .update({ 
        progress_percentage: progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      throw new Error(`진행률 업데이트 실패: ${error.message}`);
    }
  }

  /**
   * 프로젝트 상태 변경
   */
  static async updateProjectStatus(id: string, status: Project['status']): Promise<void> {
    const updates: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    // 상태에 따른 추가 필드 업데이트
    if (status === 'active' && !updates.actual_start_date) {
      updates.actual_start_date = new Date().toISOString();
    } else if (status === 'completed') {
      updates.actual_end_date = new Date().toISOString();
      updates.progress_percentage = 100;
    }

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(`상태 변경 실패: ${error.message}`);
    }
  }

  /**
   * 칸반 보드용 프로젝트 상태별 그룹화
   */
  static async getProjectsByStatus() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        client:clients(id, name)
      `)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      throw new Error(`프로젝트 조회 실패: ${error.message}`);
    }

    // 상태별로 그룹화
    const grouped = {
      planning: [] as any[],
      active: [] as any[],
      on_hold: [] as any[],
      completed: [] as any[],
      cancelled: [] as any[],
    };

    (data || []).forEach(project => {
      if (grouped[project.status]) {
        grouped[project.status].push(project);
      }
    });

    return grouped;
  }

  /**
   * 프로젝트 통계
   */
  static async getProjectStats() {
    const { data, error } = await supabase
      .from('projects')
      .select('status, actual_amount, contract_amount, actual_cost, progress_percentage');

    if (error) {
      console.error('프로젝트 통계 조회 실패:', error);
      return null;
    }

    const stats = {
      total: data?.length || 0,
      active: data?.filter(p => p.status === 'active').length || 0,
      completed: data?.filter(p => p.status === 'completed').length || 0,
      // Use actual_amount if available, fall back to contract_amount
      totalContractAmount: data?.reduce((sum, p) => sum + ((p as any).actual_amount || p.contract_amount || 0), 0) || 0,
      totalActualCost: data?.reduce((sum, p) => sum + (p.actual_cost || 0), 0) || 0,
      averageProgress: data?.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / (data?.length || 1) || 0,
    };

    return stats;
  }
}