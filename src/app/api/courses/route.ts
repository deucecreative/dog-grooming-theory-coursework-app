import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { CourseStatus } from '@/types/database'

// Validation schema for creating courses
const createCourseSchema = z.object({
  title: z.string().min(1, 'Course title is required'),
  description: z.string().optional(),
  short_description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived'] as const).default('draft'),
  duration_weeks: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
  start_date: z.string().optional(), // ISO date string
  end_date: z.string().optional(), // ISO date string
})

// GET /api/courses - List courses with filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Approved account required' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') as CourseStatus | null
    const instructorOnly = searchParams.get('instructor_only') === 'true'

    // Build query based on user role
    let query = supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        short_description,
        status,
        duration_weeks,
        max_students,
        start_date,
        end_date,
        created_by,
        created_at,
        updated_at,
        profiles!courses_created_by_fkey(full_name, email),
        course_instructors(
          instructor_id,
          role,
          profiles!course_instructors_instructor_id_fkey(full_name, email)
        ),
        course_enrollments(
          id,
          enrollment_status
        )
      `)
      .order('created_at', { ascending: false })

    // Apply role-based filtering
    if (profile.role === 'student') {
      // Students can only see active courses they're enrolled in or all active courses
      if (instructorOnly) {
        // Only courses the student is enrolled in - get enrolled course IDs first
        const { data: enrollments } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('student_id', user.id)
          .eq('enrollment_status', 'active')

        const enrolledCourseIds = enrollments?.map(e => e.course_id) || []
        query = query
          .eq('status', 'active')
          .in('id', enrolledCourseIds)
      } else {
        // All active courses
        query = query.eq('status', 'active')
      }
    } else if (profile.role === 'course_leader') {
      if (instructorOnly) {
        // Only courses they teach
        const { data: instructorCourses } = await supabase
          .from('course_instructors')
          .select('course_id')
          .eq('instructor_id', user.id)

        if (instructorCourses && instructorCourses.length > 0) {
          const courseIds = instructorCourses.map(ic => ic.course_id)
          query = query.in('id', courseIds)
        } else {
          // No courses assigned - return empty
          return NextResponse.json({ courses: [] })
        }
      } else {
        // All active courses or courses they teach
        const { data: instructorCourses } = await supabase
          .from('course_instructors')
          .select('course_id')
          .eq('instructor_id', user.id)

        const courseIds = instructorCourses?.map(ic => ic.course_id) || []
        
        if (courseIds.length > 0) {
          query = query.or(`status.eq.active,id.in.(${courseIds.join(',')})`)
        } else {
          query = query.eq('status', 'active')
        }
      }
    }
    // Admins see all courses (no additional filtering)

    // Apply status filter
    if (statusFilter && profile.role !== 'student') {
      query = query.eq('status', statusFilter)
    }

    const { data: courses, error } = await query

    if (error) {
      console.error('Error fetching courses:', error)
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
    }

    // Add enrollment counts to courses
    const coursesWithStats = courses?.map(course => ({
      ...course,
      enrollment_count: course.course_enrollments?.filter(e => e.enrollment_status === 'active').length || 0,
      instructor_count: course.course_instructors?.length || 0,
      is_enrolled: profile.role === 'student' ? 
        course.course_enrollments?.some(e => e.enrollment_status === 'active') || false : 
        undefined,
      is_instructor: ['course_leader', 'admin'].includes(profile.role) ?
        course.course_instructors?.some(i => i.instructor_id === user.id) || false :
        undefined
    })) || []

    return NextResponse.json({ courses: coursesWithStats })
  } catch (error) {
    console.error('Courses GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/courses - Create new course
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile to check permissions
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Approved account required' }, { status: 403 })
    }

    // Only course leaders and admins can create courses
    if (!['course_leader', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = createCourseSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const courseData = validation.data

    // Create course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        ...courseData,
        created_by: user.id
      })
      .select()
      .single()

    if (courseError) {
      console.error('Error creating course:', courseError)
      return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
    }

    // Automatically assign the creator as an instructor
    const { error: instructorError } = await supabase
      .from('course_instructors')
      .insert({
        course_id: course.id,
        instructor_id: user.id,
        role: 'instructor'
      })

    if (instructorError) {
      console.error('Error assigning instructor:', instructorError)
      // Course was created, but instructor assignment failed - not critical
    }

    return NextResponse.json({ course }, { status: 201 })
  } catch (error) {
    console.error('Courses POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}