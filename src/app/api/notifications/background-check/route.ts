import { NextResponse } from 'next/server';
import { NotificationService } from '@/lib/services/notification-service';

/**
 * 백그라운드 알림 체크 엔드포인트
 * 견적서 만료, 프로젝트 마감일, 매출 정산 등을 확인하고 알림 생성
 * 
 * Cron job 또는 정기적으로 호출되어야 함
 * 예: Vercel Cron, GitHub Actions, 외부 서비스
 */
export async function POST(request: Request) {
  try {
    // 보안을 위한 간단한 토큰 체크 (선택사항)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Background Check] Starting notification checks...');

    // 병렬로 실행하여 성능 향상
    const checks = await Promise.allSettled([
      NotificationService.notifyQuoteExpiring(),
      NotificationService.notifyProjectDeadlineApproaching(),
      NotificationService.notifySettlementDue(),
      NotificationService.notifySettlementOverdue(),
    ]);

    const results = {
      quoteExpiring: checks[0].status === 'fulfilled' ? 'success' : 'failed',
      projectDeadlines: checks[1].status === 'fulfilled' ? 'success' : 'failed',
      settlementDue: checks[2].status === 'fulfilled' ? 'success' : 'failed',
      settlementOverdue: checks[3].status === 'fulfilled' ? 'success' : 'failed',
    };

    // 실패한 작업이 있으면 로그에 기록
    checks.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.error(`[Background Check] Check ${index} failed:`, result.reason);
      }
    });

    console.log('[Background Check] Completed:', results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error('[Background Check] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * GET 엔드포인트로 간단한 상태 체크 제공
 */
export async function GET() {
  return NextResponse.json({
    service: 'notification-background-check',
    status: 'active',
    timestamp: new Date().toISOString(),
    description: 'Background notification checker for quotes, projects, and settlements'
  });
}