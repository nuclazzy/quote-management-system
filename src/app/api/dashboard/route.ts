import { createDirectApi, DirectQueryBuilder } from '@/lib/api/direct-integration';

// GET /api/dashboard - 대시보드 통계 조회
export const GET = createDirectApi(
  async ({ supabase, user }) => {
    // 이번 달 날짜 범위 계산
    const thisMonth = new Date();
    const firstDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1);
    const lastDay = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0);

    try {
      // 병렬로 모든 통계 조회
      const [
        monthlyQuotes,
        acceptedCount,
        pendingCount,
        activeCustomersCount,
        activeProjectsCount,
        newCustomersCount,
        recentQuotes,
      ] = await Promise.all([
        // 이번 달 견적서
        supabase
          .from('quotes')
          .select('total_amount, status')
          .gte('created_at', firstDay.toISOString())
          .lte('created_at', lastDay.toISOString()),

        // 수주확정 견적서
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'accepted'),

        // 승인 대기 견적서
        supabase
          .from('quotes')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'submitted'),

        // 활성 고객사
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),

        // 진행 중인 프로젝트
        supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active'),

        // 이번 달 신규 고객
        supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', firstDay.toISOString())
          .lte('created_at', lastDay.toISOString()),

        // 최근 견적서 5개
        supabase
          .from('quotes')
          .select('id, project_title, customer_name_snapshot, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      // 이번 달 총 금액 계산
      const totalAmount = monthlyQuotes.data?.reduce(
        (sum, quote) => sum + (quote.total_amount || 0),
        0
      ) || 0;

      return {
        totalQuotes: monthlyQuotes.data?.length || 0,
        totalAmount,
        acceptedQuotes: acceptedCount.count || 0,
        activeCustomers: activeCustomersCount.count || 0,
        pendingApproval: pendingCount.count || 0,
        activeProjects: activeProjectsCount.count || 0,
        newCustomers: newCustomersCount.count || 0,
        unreadNotifications: 0, // 알림 시스템 미구현
        recentQuotes: recentQuotes.data || [],
      };
    } catch (error) {
      console.error('대시보드 통계 조회 오류:', error);
      
      // 오류 발생 시 기본값 반환
      return {
        totalQuotes: 0,
        totalAmount: 0,
        acceptedQuotes: 0,
        activeCustomers: 0,
        pendingApproval: 0,
        activeProjects: 0,
        newCustomers: 0,
        unreadNotifications: 0,
        recentQuotes: [],
      };
    }
  },
  { requireAuth: true, enableLogging: true }
);