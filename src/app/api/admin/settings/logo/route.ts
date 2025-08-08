import { NextRequest, NextResponse } from 'next/server';

// POST /api/admin/settings/logo - StaticAuth 로고 업로드 (Base64 변환)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '파일이 제공되지 않았습니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '이미지 파일만 업로드 가능합니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // 파일 크기 검증 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '파일 크기는 5MB 이하여야 합니다.' },
          meta: { timestamp: new Date().toISOString() },
        },
        { status: 400 }
      );
    }

    // 파일을 Base64로 변환 (localStorage에 저장하기 위해)
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      success: true,
      data: {
        message: '로고가 성공적으로 업로드되었습니다.',
        url: dataUrl, // Base64 데이터 URL 반환
        path: `logo-${Date.now()}.${file.name.split('.').pop()}`,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      {
        success: false,
        error: { 
          message: error instanceof Error ? error.message : '로고 업로드에 실패했습니다.' 
        },
        meta: { timestamp: new Date().toISOString() },
      },
      { status: 500 }
    );
  }
}
