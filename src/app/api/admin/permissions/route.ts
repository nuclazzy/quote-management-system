import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

// GET /api/admin/permissions - 모든 권한 조회
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 최고 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'super_admin') {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')

    let query = supabase
      .from('permissions')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    const { data: permissions, error } = await query

    if (error) {
      console.error('Error fetching permissions:', error)
      return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
    }

    // 카테고리별로 그룹화
    const groupedPermissions = permissions?.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = []
      }
      acc[permission.category].push(permission)
      return acc
    }, {} as Record<string, any[]>) || {}

    return NextResponse.json({
      permissions: permissions || [],
      grouped: groupedPermissions
    })
  } catch (error) {
    console.error('Error in permissions GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}