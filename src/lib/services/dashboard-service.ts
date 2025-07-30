import { supabase } from '../supabase/client';

export interface DashboardStats {
  totalQuotes: number;
  totalAmount: number;
  acceptedQuotes: number;
  activeCustomers: number;
  recentQuotes: Array<{
    id: string;
    project_title: string;
    customer_name_snapshot: string;
    total_amount: number;
    status: string;
    created_at: string;
  }>;
}

export class DashboardService {
  /**
   * 대시보드 통계 조회
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      // 이번 달 견적서 수와 총 금액
      const thisMonth = new Date();
      const firstDay = new Date(
        thisMonth.getFullYear(),
        thisMonth.getMonth(),
        1
      );
      const lastDay = new Date(
        thisMonth.getFullYear(),
        thisMonth.getMonth() + 1,
        0
      );

      const { data: monthlyQuotes, error: monthlyError } = await supabase
        .from('quotes')
        .select('total_amount, status')
        .gte('created_at', firstDay.toISOString())
        .lte('created_at', lastDay.toISOString());

      if (monthlyError) {
        console.error('Monthly quotes error:', monthlyError);
      }

      // 수주확정된 견적서 수
      const { count: acceptedCount, error: acceptedError } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted');

      if (acceptedError) {
        console.error('Accepted quotes error:', acceptedError);
      }

      // 활성 고객사 수
      const { count: activeCustomersCount, error: customersError } =
        await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

      if (customersError) {
        console.error('Active customers error:', customersError);
      }

      // 최근 견적서 목록 (최근 5개)
      const { data: recentQuotes, error: recentError } = await supabase
        .from('quotes')
        .select(
          `
          id,
          project_title,
          customer_name_snapshot,
          total_amount,
          status,
          created_at
        `
        )
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentError) {
        console.error('Recent quotes error:', recentError);
      }

      // 데이터 집계
      const totalQuotes = monthlyQuotes?.length || 0;
      const totalAmount =
        monthlyQuotes?.reduce(
          (sum, quote) => sum + (quote.total_amount || 0),
          0
        ) || 0;

      return {
        totalQuotes,
        totalAmount,
        acceptedQuotes: acceptedCount || 0,
        activeCustomers: activeCustomersCount || 0,
        recentQuotes: recentQuotes || [],
      };
    } catch (error) {
      console.error('Dashboard stats error:', error);
      // 기본값 반환
      return {
        totalQuotes: 0,
        totalAmount: 0,
        acceptedQuotes: 0,
        activeCustomers: 0,
        recentQuotes: [],
      };
    }
  }

  /**
   * 월별 견적서 통계
   */
  static async getMonthlyStats(year?: number, month?: number) {
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || new Date().getMonth() + 1;

    const firstDay = new Date(targetYear, targetMonth - 1, 1);
    const lastDay = new Date(targetYear, targetMonth, 0);

    const { data, error } = await supabase
      .from('quotes')
      .select(
        `
        status,
        total_amount,
        created_at,
        customer_name_snapshot
      `
      )
      .gte('created_at', firstDay.toISOString())
      .lte('created_at', lastDay.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`월별 통계 조회 실패: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 상태별 견적서 통계
   */
  static async getStatusStats() {
    const { data, error } = await supabase
      .from('quotes')
      .select('status, total_amount');

    if (error) {
      throw new Error(`상태별 통계 조회 실패: ${error.message}`);
    }

    // 상태별로 그룹화
    const statusStats = (data || []).reduce(
      (acc, quote) => {
        const status = quote.status || 'draft';
        if (!acc[status]) {
          acc[status] = { count: 0, amount: 0 };
        }
        acc[status].count += 1;
        acc[status].amount += quote.total_amount || 0;
        return acc;
      },
      {} as Record<string, { count: number; amount: number }>
    );

    return statusStats;
  }
}
