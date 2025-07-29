import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all users with profile information
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Get auth metadata for last sign in
    const { data: authUsers, error: authError2 } = await supabase.auth.admin.listUsers()
    
    let usersWithAuth = users
    if (!authError2 && authUsers) {
      usersWithAuth = users.map(user => {
        const authUser = authUsers.users.find(au => au.id === user.id)
        return {
          ...user,
          last_sign_in_at: authUser?.last_sign_in_at || null
        }
      })
    }

    return NextResponse.json(usersWithAuth)
  } catch (error) {
    console.error('Error in admin users GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}