import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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

    // All authenticated users can read assignments
    const { searchParams } = new URL(request.url)
    const expand = searchParams.get('expand')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Apply pagination
    const offset = (page - 1) * limit

    // Fetch assignments
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch assignments' },
        { status: 500 }
      )
    }

    // If expand=questions is requested, fetch question details
    if (expand === 'questions' && assignments && assignments.length > 0) {
      const allQuestionIds = assignments.flatMap(assignment => assignment.question_ids)
      const uniqueQuestionIds = [...new Set(allQuestionIds)]

      if (uniqueQuestionIds.length > 0) {
        const { data: questions } = await supabase
          .from('questions')
          .select('*')
          .in('id', uniqueQuestionIds)

        const questionsMap = new Map(questions?.map(q => [q.id, q]) || [])

        // Add questions to each assignment
        assignments.forEach(assignment => {
          assignment.questions = assignment.question_ids.map((id: string) => questionsMap.get(id)).filter(Boolean)
        })
      }
    }

    return NextResponse.json({
      assignments: assignments || [],
      total: assignments?.length || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Assignments API error:', error)
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

    // Parse request body first to avoid crashing
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

    // Only admins and course leaders can create assignments
    if (profile.role !== 'admin' && profile.role !== 'course_leader') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { title, description, question_ids, due_date } = body

    // Validate required fields
    if (!title || !description || !question_ids || !due_date) {
      return NextResponse.json(
        { error: 'Missing required fields: title, description, question_ids, due_date' },
        { status: 400 }
      )
    }

    // Validate question_ids is array and not empty
    if (!Array.isArray(question_ids) || question_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one question is required' },
        { status: 400 }
      )
    }

    // Validate due_date format
    const dueDateObj = new Date(due_date)
    if (isNaN(dueDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid due_date format. Please use ISO 8601 format.' },
        { status: 400 }
      )
    }

    // Verify all question IDs exist
    const { data: existingQuestions, error: questionsError } = await supabase
      .from('questions')
      .select('id')
      .in('id', question_ids)

    if (questionsError) {
      console.error('Database error:', questionsError)
      return NextResponse.json(
        { error: 'Failed to validate questions' },
        { status: 500 }
      )
    }

    const existingQuestionIds = existingQuestions?.map(q => q.id) || []
    const invalidQuestionIds = question_ids.filter(id => !existingQuestionIds.includes(id))
    
    if (invalidQuestionIds.length > 0) {
      return NextResponse.json(
        { error: `One or more question IDs are invalid: ${invalidQuestionIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Create assignment
    const assignmentData = {
      title: title.trim(),
      description: description.trim(),
      question_ids,
      due_date,
      created_by: user.id
    }

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert(assignmentData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ assignment }, { status: 201 })

  } catch (error) {
    console.error('Assignments API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}