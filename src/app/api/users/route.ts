import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { UserStatus } from '@/types/database'

// GET /api/users - List users with optional status filter
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (admins can see all, course leaders can see students)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (profile.status !== 'approved') {
      return NextResponse.json({ error: 'Approved account required' }, { status: 403 })
    }

    if (profile.role !== 'admin' && profile.role !== 'course_leader') {
      return NextResponse.json({ error: 'Admin or course leader access required' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') as UserStatus | null

    // Build query with role-based filtering
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        approved_at,
        approved_by,
        approved_profile:profiles!approved_by(full_name, email)
      `)

    // Course leaders can only see students, admins can see all
    if (profile.role === 'course_leader') {
      query = query.eq('role', 'student')
    }

    // Apply status filter if provided and valid
    if (statusFilter && ['pending', 'approved', 'rejected'].includes(statusFilter)) {
      query = query.eq('status', statusFilter)
    }

    // Order by created_at desc to show newest first
    query = query.order('created_at', { ascending: false })

    const { data: users, error: fetchError } = await query

    if (fetchError) {
      console.error('Error fetching users:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
  } catch (error) {
    console.error('Unexpected error in GET /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/users - Update user approval status
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check permissions (admins can approve all, course leaders can approve students)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    if (profile.status !== 'approved') {
      return NextResponse.json({ error: 'Approved account required' }, { status: 403 })
    }

    if (profile.role !== 'admin' && profile.role !== 'course_leader') {
      return NextResponse.json({ error: 'Admin or course leader access required' }, { status: 403 })
    }

    // Parse request body
    let requestBody
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { userId, status } = requestBody

    // Validation
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Prevent users from modifying their own status
    if (userId === user.id) {
      return NextResponse.json({ error: 'Cannot modify your own status' }, { status: 400 })
    }

    // Get the target user to check if course leader can approve them
    const { data: targetUser, error: targetError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    if (targetError || !targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Course leaders can only approve students
    if (profile.role === 'course_leader' && targetUser.role !== 'student') {
      return NextResponse.json({ error: 'Course leaders can only approve students' }, { status: 403 })
    }

    // Prepare update data based on status
    const updateData: {
      status: UserStatus
      approved_by?: string | null
      approved_at?: string | null
    } = { status }

    if (status === 'approved' || status === 'rejected') {
      updateData.approved_by = user.id
      updateData.approved_at = new Date().toISOString()
    } else if (status === 'pending') {
      updateData.approved_by = null
      updateData.approved_at = null
    }

    // Update user status
    const { data: updatedUser, error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, full_name, role, status, approved_by, approved_at')
      .single()

    if (updateError) {
      if (updateError.message?.includes('not found')) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      console.error('Error updating user status:', updateError)
      return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 })
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Unexpected error in PATCH /api/users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}