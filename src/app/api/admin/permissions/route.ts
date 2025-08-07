import {
  createDirectApi,
  DirectQueryBuilder,
} from '@/lib/api/direct-integration';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  created_at: string;
  updated_at: string;
}

// GET /api/admin/permissions - 최적화된 모든 권한 조회
export const GET = createDirectApi(
  async ({ supabase, searchParams }) => {
    const queryBuilder = new DirectQueryBuilder(supabase, 'permissions');
    const category = searchParams.get('category');

    // WHERE 조건
    const where: Record<string, any> = {};
    if (category) where.category = category;

    const { data: permissions } = await queryBuilder.findMany<Permission>({
      select: '*',
      where,
      sort: [
        { by: 'category', order: 'asc' },
        { by: 'name', order: 'asc' }
      ]
    });

    // 카테고리별로 그룹화
    const groupedPermissions =
      permissions?.reduce(
        (acc, permission) => {
          if (!acc[permission.category]) {
            acc[permission.category] = [];
          }
          acc[permission.category].push(permission);
          return acc;
        },
        {} as Record<string, any[]>
      ) || {};

    return {
      permissions: permissions || [],
      grouped: groupedPermissions,
    };
  },
  { requireAuth: true, requiredRole: 'super_admin', enableLogging: true }
);
