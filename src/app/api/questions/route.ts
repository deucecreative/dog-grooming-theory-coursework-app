import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { QuestionType, DifficultyLevel } from '@/types/database'

const VALID_QUESTION_TYPES: QuestionType[] = ['multiple_choice', 'short_text', 'long_text']
const VALID_DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced']

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

    // All authenticated users can read questions
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const difficulty = searchParams.get('difficulty') 
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Build query
    let query = supabase.from('questions').select('*')

    // Apply filters
    if (category) {
      query = query.eq('category', category)
    }
    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }
    if (type) {
      query = query.eq('type', type)
    }

    // Apply pagination
    const offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)

    // Order by creation date
    query = query.order('created_at', { ascending: false })

    const { data: questions, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      questions: questions || [],
      total: questions?.length || 0,
      page,
      limit
    })

  } catch (error) {
    console.error('Questions API error:', error)
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

    // Only admins and course leaders can create questions
    if (profile.role !== 'admin' && profile.role !== 'course_leader') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { title, content, type, category, difficulty, options, rubric } = body

    // Validate required fields
    if (!title || !content || !type || !category || !difficulty || !rubric) {
      return NextResponse.json(
        { error: 'Missing required fields: title, content, type, category, difficulty, rubric' },
        { status: 400 }
      )
    }

    // Validate question type
    if (!VALID_QUESTION_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid question type. Must be one of: ${VALID_QUESTION_TYPES.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate difficulty level
    if (!VALID_DIFFICULTY_LEVELS.includes(difficulty)) {
      return NextResponse.json(
        { error: `Invalid difficulty level. Must be one of: ${VALID_DIFFICULTY_LEVELS.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate multiple choice options
    if (type === 'multiple_choice') {
      if (!options || !options.choices || !Array.isArray(options.choices) || typeof options.correct !== 'number') {
        return NextResponse.json(
          { error: 'Multiple choice questions require options with choices array and correct index' },
          { status: 400 }
        )
      }
    }

    // Create question
    const questionData = {
      title: title.trim(),
      content: content.trim(),
      type,
      category: category.trim(),
      difficulty,
      options: type === 'multiple_choice' ? options : null,
      rubric: rubric.trim(),
      created_by: user.id
    }

    const { data: question, error } = await supabase
      .from('questions')
      .insert(questionData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create question' },
        { status: 500 }
      )
    }

    return NextResponse.json({ question }, { status: 201 })

  } catch (error) {
    console.error('Questions API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}