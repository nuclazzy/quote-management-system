import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';
import { NextRequest } from 'next/server';

// POST /api/admin/settings/logo - 최적화된 로고 업로드
export const POST = createDirectApi(
  async ({ supabase, user, request }: { supabase: any; user: any; request: NextRequest }) => {
    // 사용자 프로필과 회사 ID 조회
    const profileQuery = new DirectQueryBuilder(supabase, 'profiles');
    const userProfile = await profileQuery.findOne(user.id, 'role, company_id');
    
    if (!userProfile?.company_id) {
      throw new Error('회사 정보를 찾을 수 없습니다.');
    }

    const formData = await request.formData();
    const file = formData.get('logo') as File;

    if (!file) {
      throw new Error('파일이 제공되지 않았습니다.');
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      throw new Error('이미지 파일만 업로드 가능합니다.');
    }

    // 파일 크기 검증 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('파일 크기는 5MB 이하여야 합니다.');
    }

    // 고유한 파일명 생성
    const fileExt = file.name.split('.').pop();
    const fileName = `${userProfile.company_id}/logo-${Date.now()}.${fileExt}`;

    // 파일을 버퍼로 변환
    const buffer = Buffer.from(await file.arrayBuffer());

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('company-assets')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('로고 업로드 오류:', uploadError);
      throw new Error('로고 업로드에 실패했습니다.');
    }

    // 공개 URL 생성
    const {
      data: { publicUrl },
    } = supabase.storage.from('company-assets').getPublicUrl(fileName);

    return {
      message: '로고가 성공적으로 업로드되었습니다.',
      url: publicUrl,
      path: fileName,
    };
  },
  { requireAuth: true, requiredRole: 'admin', enableLogging: true }
);
