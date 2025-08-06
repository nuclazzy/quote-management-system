import { NextRequest, NextResponse } from 'next/server';
import { generateItemCSVTemplate } from '@/lib/csv-item-template';

// GET /api/items/template - 품목 CSV 템플릿 다운로드
export async function GET(request: NextRequest) {
  try {
    // CSV 템플릿 생성
    const csvContent = generateItemCSVTemplate();
    
    // UTF-8 BOM 추가 (엑셀에서 한글 깨짐 방지)
    const csvWithBOM = '\uFEFF' + csvContent;
    
    // Response 생성
    const response = new NextResponse(csvWithBOM, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="품목_업로드_템플릿_${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

    return response;

  } catch (error) {
    console.error('Item CSV template download error:', error);
    return NextResponse.json(
      { error: 'Failed to generate item CSV template' },
      { status: 500 }
    );
  }
}