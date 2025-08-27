import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for updating courses
const updateCourseSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  status: z.enum(['draft', 'active', 'archived'] as const).optional(),
  duration_weeks: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
  start_date: z.string().optional(), // ISO date string
  end_date: z.string().optional(), // ISO date string
})

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/courses/[id] - Get single course with detailed information
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const courseId = resolvedParams.id

    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Approved account required' }, { status: 403 })
    }

    // Get course with detailed information
    const { data: course, error } = await supabase
      .from('courses')
      .select(`
        *,
        profiles!courses_created_by_fkey(full_name, email),
        course_instructors(
          id,
          role,
          assigned_at,
          profiles!course_instructors_instructor_id_fkey(id, full_name, email, role)
        ),
        course_enrollments(
          id,
          student_id,
          enrollment_status,
          enrolled_at,
          completion_percentage,
          profiles!course_enrollments_student_id_fkey(id, full_name, email)
        )
      `)
      .eq('id', courseId)
      .single()

    if (error || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check access permissions
    const isAdmin = profile.role === 'admin'
    const isInstructor = course.course_instructors?.some((i: { profiles: { id: string } }) => i.profiles.id === user.id) || false
    const isEnrolled = course.course_enrollments?.some((e: { student_id: string; enrollment_status: string }) => e.student_id === user.id && e.enrollment_status === 'active') || false

    if (profile.role === 'student') {
      // Students can only view active courses they're enrolled in or all active courses
      if (course.status !== 'active' && !isEnrolled) {
        return NextResponse.json({ error: 'Course not accessible' }, { status: 403 })
      }
    } else if (profile.role === 'course_leader') {
      // Course leaders can view courses they teach or active courses
      if (course.status !== 'active' && !isInstructor) {
        return NextResponse.json({ error: 'Course not accessible' }, { status: 403 })
      }
    }

    // Add computed fields
    const courseWithStats = {
      ...course,
      enrollment_count: course.course_enrollments?.filter((e: { enrollment_status: string }) => e.enrollment_status === 'active').length || 0,
      instructor_count: course.course_instructors?.length || 0,
      is_enrolled: profile.role === 'student' ? isEnrolled : undefined,
      is_instructor: ['course_leader', 'admin'].includes(profile.role) ? isInstructor : undefined,
      can_edit: isAdmin || isInstructor,
      can_delete: isAdmin || (isInstructor && course.created_by === user.id)
    }

    return NextResponse.json({ course: courseWithStats })
  } catch (error) {
    console.error('Course GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/courses/[id] - Update course
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const courseId = resolvedParams.id

    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Approved account required' }, { status: 403 })
    }

    // Check if course exists and user has permission to edit
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        course_instructors!inner(instructor_id)
      `)
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check permissions
    const isAdmin = profile.role === 'admin'
    const isInstructor = course.course_instructors?.some((i: { instructor_id: string }) => i.instructor_id === user.id) || false

    if (!isAdmin && !isInstructor) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validation = updateCourseSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid input', 
        details: validation.error.errors 
      }, { status: 400 })
    }

    const updateData = validation.data

    // Course leaders can't change status unless they're admin
    if (profile.role === 'course_leader' && updateData.status && !isAdmin) {
      return NextResponse.json({ 
        error: 'Only admins can change course status' 
      }, { status: 403 })
    }

    // Update course
    const { data: updatedCourse, error: updateError } = await supabase
      .from('courses')
      .update(updateData)
      .eq('id', courseId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating course:', updateError)
      return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
    }

    return NextResponse.json({ course: updatedCourse })
  } catch (error) {
    console.error('Course PUT error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/courses/[id] - Delete course
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const resolvedParams = await params
    const courseId = resolvedParams.id

    const supabase = await createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.status !== 'approved') {
      return NextResponse.json({ error: 'Approved account required' }, { status: 403 })
    }

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(`
        *,
        course_instructors!inner(instructor_id),
        course_enrollments(id),
        assignments(id)
      `)
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check permissions - only admins or course creators can delete
    const isAdmin = profile.role === 'admin'
    const isCreator = course.created_by === user.id
    const isInstructor = course.course_instructors?.some((i: { instructor_id: string }) => i.instructor_id === user.id) || false

    if (!isAdmin && !(isCreator && isInstructor)) {
      return NextResponse.json({ error: 'Only admins or course creators can delete courses' }, { status: 403 })
    }

    // Check if course has active enrollments
    const hasActiveEnrollments = course.course_enrollments && course.course_enrollments.length > 0
    if (hasActiveEnrollments && !isAdmin) {
      return NextResponse.json({ 
        error: 'Cannot delete course with active enrollments. Archive instead.' 
      }, { status: 400 })
    }

    // Check if course has assignments
    const hasAssignments = course.assignments && course.assignments.length > 0
    if (hasAssignments && !isAdmin) {
      return NextResponse.json({ 
        error: 'Cannot delete course with existing assignments. Archive instead.' 
      }, { status: 400 })
    }

    // Delete course (CASCADE will handle related records)
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId)

    if (deleteError) {
      console.error('Error deleting course:', deleteError)
      return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Course deleted successfully' })
  } catch (error) {
    console.error('Course DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}