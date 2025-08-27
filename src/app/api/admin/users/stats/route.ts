import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/users/stats
 * 
 * Returns user statistics for admin dashboard
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Verify user is authenticated and is an admin
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check admin role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin' || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get total user count
    const { count: totalUsers, error: totalError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('Error fetching total users:', totalError)
      return NextResponse.json({ error: 'Failed to fetch total users' }, { status: 500 })
    }

    // Get course leaders count
    const { count: courseLeaders, error: leadersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'course_leader')

    if (leadersError) {
      console.error('Error fetching course leaders:', leadersError)
      return NextResponse.json({ error: 'Failed to fetch course leaders' }, { status: 500 })
    }

    // Get students count
    const { count: students, error: studentsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'student')

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
    }

    // Get users created in the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { count: newThisMonth, error: newUsersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (newUsersError) {
      console.error('Error fetching new users:', newUsersError)
      return NextResponse.json({ error: 'Failed to fetch new users' }, { status: 500 })
    }

    return NextResponse.json({
      total_users: totalUsers || 0,
      course_leaders: courseLeaders || 0,
      students: students || 0,
      new_this_month: newThisMonth || 0
    })

  } catch (error) {
    console.error('Server error in admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}