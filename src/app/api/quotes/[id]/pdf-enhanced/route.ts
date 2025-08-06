import { NextRequest, NextResponse } from 'next/server';
import { withAuth, createApiError } from '@/lib/api/base';

// GET /api/quotes/[id]/pdf-enhanced - 향상된 한글 PDF 생성 및 다운로드 (임시 비활성화)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withAuth(request, async ({ user, supabase }) => {
    // PDF 생성 기능이 임시로 비활성화됨
    // jspdf 패키지 설치 후 다시 활성화
    return NextResponse.json(
      { 
        success: false,
        error: 'PDF generation temporarily disabled. Please install jspdf packages first.',
        message: 'PDF 생성 기능이 일시적으로 비활성화되었습니다. jspdf 패키지를 설치한 후 다시 시도해주세요.'
      },
      { status: 503 }
    );
  });
}