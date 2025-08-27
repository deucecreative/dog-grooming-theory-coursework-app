import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Submissions API Route
 * 
 * TDD Implementation - Following RED-GREEN-REFACTOR cycle
 * Implements the submissions endpoints per PROJECT.md requirements
 */

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const assignment_id = searchParams.get('assignment_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query based on user role
    let query = supabase.from('submissions').select('*')

    // Students can only see their own submissions
    if (profile.role === 'student') {
      query = query.eq('student_id', user.id)
    }
    // Course leaders and admins can see all submissions (for grading)

    // Apply filters
    if (assignment_id) {
      query = query.eq('assignment_id', assignment_id)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: submissions, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      submissions: submissions || [],
      total: submissions?.length || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Submissions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Get user profile to check permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only students can create submissions
    if (profile.role !== 'student') {
      return NextResponse.json({ error: 'Only students can create submissions' }, { status: 403 })
    }

    const { assignment_id, answers, status } = body

    // Validate required fields
    if (!assignment_id || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields: assignment_id, answers' },
        { status: 400 }
      )
    }

    // Validate assignment exists
    const { data: assignment, error: assignmentError } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', assignment_id)
      .single()

    if (assignmentError || !assignment) {
      return NextResponse.json(
        { error: 'Invalid assignment_id. Assignment does not exist.' },
        { status: 400 }
      )
    }

    // Prepare submission data
    const submissionData = {
      assignment_id,
      student_id: user.id,
      answers,
      status: status || 'draft',
      submitted_at: status === 'submitted' ? new Date().toISOString() : null,
    }

    // Use upsert to handle both create and update cases
    // This allows students to save drafts and then submit
    const { data: submission, error } = await supabase
      .from('submissions')
      .upsert(submissionData, {
        onConflict: 'assignment_id,student_id',
        ignoreDuplicates: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      )
    }

    return NextResponse.json({ submission }, { status: 201 })

  } catch (error) {
    console.error('Submissions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}