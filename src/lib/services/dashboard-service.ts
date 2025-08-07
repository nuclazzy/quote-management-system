export interface DashboardStats {
  totalQuotes: number;
  totalAmount: number;
  acceptedQuotes: number;
  activeCustomers: number;
  pendingApproval: number; // 승인 대기 견적서
  activeProjects: number; // 진행 중인 프로젝트
  newCustomers: number; // 이번 달 신규 고객
  unreadNotifications: number; // 읽지 않은 알림
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
  private static baseUrl = '/api/dashboard';

  /**
   * 대시보드 통계 조회
   */
  static async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorBody = await response.json();
        console.error('대시보드 통계 조회 오류:', errorBody);
        throw new Error(errorBody.error || errorBody.message || '대시보드 데이터를 불러오는데 실패했습니다.');
      }

      const responseData = await response.json();
      
      // 직접 연동 API 응답 형식 처리
      if (responseData.success && responseData.data) {
        return responseData.data;
      }
      
      return responseData;
    } catch (error) {
      console.error('대시보드 서비스 오류:', error);
      
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
  }
}