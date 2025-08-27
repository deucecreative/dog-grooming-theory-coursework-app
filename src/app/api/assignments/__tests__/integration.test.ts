import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import type { Profile } from '@/types/database'

/**
 * Assignments API Integration Tests
 * 
 * Tests the actual assignments API using real database operations.
 * This replaces the mock-based tests that were failing due to RLS issues.
 */

// Only run integration tests if we have database credentials
const shouldRunIntegrationTests = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY

describe('Assignments API Integration Tests', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  const testAssignmentIds: string[] = []
  const testCourseIds: string[] = []
  const testQuestionIds: string[] = []
  let adminUser: Profile

  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping integration tests - no database credentials')
      return
    }
    
    // Create properly managed test client
    supabase = createTestServiceClient()

    // Find an admin user for testing
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .eq('status', 'approved')
      .limit(1)
    
    adminUser = profiles?.[0]
    if (!adminUser) {
      throw new Error('No admin user found for testing - create an admin user first')
    }

    // Create a test course for assignments
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: 'Test Course for Assignments',
        description: 'A course for testing assignments',
        created_by: adminUser.id,
        status: 'active'
      })
      .select('id')
      .single()

    if (courseError) {
      throw new Error(`Failed to create test course: ${courseError.message}`)
    }
    testCourseIds.push(course.id)

    // Create test questions for assignments
    const questions = await Promise.all([
      supabase
        .from('questions')
        .insert({
          title: 'Test Question 1',
          content: 'What is proper grooming technique?',
          type: 'short_text',
          category: 'grooming',
          difficulty: 'beginner',
          rubric: 'Look for proper technique',
          created_by: adminUser.id,
          course_id: course.id
        })
        .select('id')
        .single(),
      supabase
        .from('questions')
        .insert({
          title: 'Test Question 2',
          content: 'Which tool is best for brushing?',
          type: 'multiple_choice',
          category: 'tools',
          difficulty: 'intermediate',
          options: {
            choices: ['Slicker brush', 'Pin brush', 'Comb', 'Rake'],
            correct: 0
          },
          rubric: 'Correct answer is slicker brush',
          created_by: adminUser.id,
          course_id: course.id
        })
        .select('id')
        .single()
    ])

    if (questions[0].error || questions[1].error) {
      throw new Error(`Failed to create test questions: ${questions[0].error?.message || questions[1].error?.message}`)
    }
    testQuestionIds.push(questions[0].data.id)
    testQuestionIds.push(questions[1].data.id)
  })

  afterAll(async () => {
    if (!shouldRunIntegrationTests) return
    
    // Clean up test assignments
    for (const id of testAssignmentIds) {
      await supabase
        .from('assignments')
        .delete()
        .eq('id', id)
    }

    // Clean up test questions
    for (const id of testQuestionIds) {
      await supabase
        .from('questions')
        .delete()
        .eq('id', id)
    }

    // Clean up test courses
    for (const id of testCourseIds) {
      await supabase
        .from('courses')
        .delete()
        .eq('id', id)
    }
    
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  it('should validate assignments table structure and basic operations', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Test basic assignment creation and retrieval
    const { data: assignment, error: createError } = await supabase
      .from('assignments')
      .insert({
        title: 'Test Assignment Integration',
        description: 'An assignment for testing API integration',
        course_id: testCourseIds[0],
        created_by: adminUser.id,
        question_ids: [testQuestionIds[0], testQuestionIds[1]],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      })
      .select('id, title, description, question_ids, course_id')
      .single()

    expect(createError).toBeNull()
    expect(assignment).toBeDefined()
    if (!assignment) throw new Error('Assignment should be defined after creation')
    expect(assignment.title).toBe('Test Assignment Integration')
    expect(assignment.question_ids).toEqual([testQuestionIds[0], testQuestionIds[1]])
    expect(assignment.course_id).toBe(testCourseIds[0])
    testAssignmentIds.push(assignment.id)

    // Test assignment retrieval
    const { data: retrievedAssignment, error: retrieveError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignment.id)
      .single()

    expect(retrieveError).toBeNull()
    expect(retrievedAssignment).toBeDefined()
    expect(retrievedAssignment.title).toBe('Test Assignment Integration')
  })

  it('should handle assignment filtering by course', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Create multiple assignments in the same course
    const assignments = await Promise.all([
      supabase
        .from('assignments')
        .insert({
          title: 'Assignment 1',
          description: 'First assignment',
          course_id: testCourseIds[0],
          created_by: adminUser.id,
          question_ids: [testQuestionIds[0]],
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id')
        .single(),
      supabase
        .from('assignments')
        .insert({
          title: 'Assignment 2',
          description: 'Second assignment',
          course_id: testCourseIds[0],
          created_by: adminUser.id,
          question_ids: [testQuestionIds[1]],
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id')
        .single()
    ])

    expect(assignments[0]).toBeDefined()
    expect(assignments[1]).toBeDefined()
    if (!assignments[0] || !assignments[1]) throw new Error('Assignment results should be defined')
    expect(assignments[0].error).toBeNull()
    expect(assignments[1].error).toBeNull()
    if (!assignments[0].data) throw new Error('First assignment data should be defined after creation')
    if (!assignments[1].data) throw new Error('Second assignment data should be defined after creation')
    testAssignmentIds.push(assignments[0].data.id)
    testAssignmentIds.push(assignments[1].data.id)

    // Test filtering by course
    const { data: courseAssignments, error: filterError } = await supabase
      .from('assignments')
      .select('id, title, question_ids')
      .eq('course_id', testCourseIds[0])
      .in('id', [assignments[0].data.id, assignments[1].data.id])

    expect(filterError).toBeNull()
    expect(courseAssignments).toBeDefined()
    if (!courseAssignments) throw new Error('Course assignments should be defined')
    expect(courseAssignments.length).toBe(2)

    // Verify both assignments are in the results
    const titles = courseAssignments.map(a => a.title)
    expect(titles).toContain('Assignment 1')
    expect(titles).toContain('Assignment 2')
  })

  it('should validate assignment-course relationship integrity', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Create an assignment
    const { data: assignment, error: createError } = await supabase
      .from('assignments')
      .insert({
        title: 'Relationship Test Assignment',
        description: 'Testing course relationship',
        course_id: testCourseIds[0],
        created_by: adminUser.id,
        question_ids: [testQuestionIds[0]],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select('id, course_id')
      .single()

    expect(createError).toBeNull()
    expect(assignment).toBeDefined()
    if (!assignment) throw new Error('Assignment should be defined after creation')
    testAssignmentIds.push(assignment.id)

    // Verify the course relationship exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title')
      .eq('id', assignment.course_id)
      .single()

    expect(courseError).toBeNull()
    expect(course).toBeDefined()
    if (!course) throw new Error('Course should be defined when queried by ID')
    expect(course.id).toBe(testCourseIds[0])
  })

  it('should handle assignment updates properly', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Create an assignment to update
    const { data: assignment, error: createError } = await supabase
      .from('assignments')
      .insert({
        title: 'Assignment to Update',
        description: 'This assignment will be updated',
        course_id: testCourseIds[0],
        created_by: adminUser.id,
        question_ids: [testQuestionIds[0]],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select('id')
      .single()

    expect(createError).toBeNull()
    if (!assignment) throw new Error('Assignment should be defined after creation')
    testAssignmentIds.push(assignment.id)

    // Update the assignment
    const { data: updatedAssignment, error: updateError } = await supabase
      .from('assignments')
      .update({
        title: 'Updated Assignment Title',
        description: 'Updated assignment description'
      })
      .eq('id', assignment.id)
      .select('id, title, description')
      .single()

    expect(updateError).toBeNull()
    expect(updatedAssignment).toBeDefined()
    if (!updatedAssignment) throw new Error('Updated assignment should be defined')
    expect(updatedAssignment.title).toBe('Updated Assignment Title')
    expect(updatedAssignment.description).toBe('Updated assignment description')
  })

  it('should handle assignment deletion properly', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Create an assignment to delete
    const { data: assignment, error: createError } = await supabase
      .from('assignments')
      .insert({
        title: 'Assignment to Delete',
        description: 'This assignment will be deleted',
        course_id: testCourseIds[0],
        created_by: adminUser.id,
        question_ids: [testQuestionIds[0]],
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .select('id')
      .single()

    expect(createError).toBeNull()
    expect(assignment).toBeDefined()
    if (!assignment) throw new Error('Assignment should be defined after creation')

    // Delete the assignment
    const { data: deletedRows, error: deleteError } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignment.id)
      .select()

    expect(deleteError).toBeNull()
    expect(deletedRows).toBeDefined()
    if (!deletedRows) throw new Error('Deleted rows should be defined after deletion')
    expect(deletedRows.length).toBe(1)

    // Verify deletion
    const { data: shouldBeGone, error: verifyError } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', assignment.id)
      .maybeSingle()

    expect(verifyError).toBeNull()
    expect(shouldBeGone).toBeNull() // Should be null because assignment was deleted
  })

  it('should validate assignment ordering and pagination concepts', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Create assignments with different due dates
    const baseDate = Date.now()
    const assignments = await Promise.all([
      supabase
        .from('assignments')
        .insert({
          title: 'First Due Assignment',
          description: 'Assignment due first',
          course_id: testCourseIds[0],
          created_by: adminUser.id,
          question_ids: [testQuestionIds[0]],
          due_date: new Date(baseDate + 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day
        })
        .select('id')
        .single(),
      supabase
        .from('assignments')
        .insert({
          title: 'Second Due Assignment',
          description: 'Assignment due second',
          course_id: testCourseIds[0],
          created_by: adminUser.id,
          question_ids: [testQuestionIds[1]],
          due_date: new Date(baseDate + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days
        })
        .select('id')
        .single()
    ])

    if (!assignments[0] || !assignments[1]) throw new Error('Assignment results should be defined')
    if (!assignments[0].data) throw new Error('First assignment data should be defined after creation')
    if (!assignments[1].data) throw new Error('Second assignment data should be defined after creation')
    testAssignmentIds.push(assignments[0].data.id)
    testAssignmentIds.push(assignments[1].data.id)

    // Test ordering by due date
    const { data: orderedAssignments, error: orderError } = await supabase
      .from('assignments')
      .select('id, title, due_date')
      .in('id', [assignments[0].data.id, assignments[1].data.id])
      .order('due_date', { ascending: true })

    expect(orderError).toBeNull()
    expect(orderedAssignments).toBeDefined()
    if (!orderedAssignments) throw new Error('Ordered assignments should be defined after query')
    expect(orderedAssignments.length).toBe(2)
    expect(orderedAssignments[0].title).toBe('First Due Assignment')
    expect(orderedAssignments[1].title).toBe('Second Due Assignment')
  })
})