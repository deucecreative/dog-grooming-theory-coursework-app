import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

/**
 * TDD Tests for Assignments API course_id Field
 * 
 * Following TDD methodology: Tests first for required course_id field
 */

// Mock Supabase server client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

const createMockQueryChain = (mockResult: { data: unknown; error: unknown }) => {
  const mockPromise = Promise.resolve(mockResult)
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(() => mockPromise),
    then: mockPromise.then.bind(mockPromise),
    catch: mockPromise.catch.bind(mockPromise),
    finally: mockPromise.finally.bind(mockPromise),
  }
  return Object.assign(mockPromise, chain)
}

const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@test.com',
}

const mockAdminProfile = {
  id: 'admin-123',
  role: 'admin',
  status: 'approved',
}

describe('Assignments API - course_id Field Validation (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default auth success
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null,
    })
    
    // Setup default profile fetch
    mockSupabaseClient.from.mockReturnValueOnce(
      createMockQueryChain({
        data: mockAdminProfile,
        error: null,
      })
    )
  })

  describe('RED Phase: Failing Tests for course_id Requirement', () => {
    it('should_require_course_id_field_when_creating_assignment', async () => {
      // Act: Try to create assignment without course_id
      const request = new NextRequest('http://localhost:3000/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Assignment',
          description: 'Test description',
          question_ids: ['question-123'],
          due_date: '2025-09-01T00:00:00Z',
          // course_id: missing - should fail
        }),
      })

      const response = await POST(request)

      // Assert: Should require course_id field
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Missing required fields')
      expect(responseData.error).toContain('course_id')
    })

    it('should_validate_course_id_exists_when_creating_assignment', async () => {
      // Arrange: Mock question validation success
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: [{ id: 'question-123' }], // Valid question exists
          error: null,
        })
      )

      // Arrange: Mock course validation failure
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: [], // No course found
          error: null,
        })
      )

      // Act: Try to create assignment with invalid course_id
      const request = new NextRequest('http://localhost:3000/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Assignment',
          description: 'Test description',
          question_ids: ['question-123'],
          due_date: '2025-09-01T00:00:00Z',
          course_id: 'invalid-course-id',
        }),
      })

      const response = await POST(request)

      // Assert: Should validate course_id exists
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('One or more course_id are invalid')
    })

    it('should_create_assignment_successfully_with_valid_course_id', async () => {
      // Arrange: Mock question validation success
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: [{ id: 'question-123' }],
          error: null,
        })
      )

      // Arrange: Mock course validation success
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: [{ id: 'course-123' }],
          error: null,
        })
      )

      // Arrange: Mock assignment creation success
      const expectedAssignment = {
        id: 'assignment-123',
        title: 'Test Assignment',
        description: 'Test description',
        question_ids: ['question-123'],
        due_date: '2025-09-01T00:00:00Z',
        course_id: 'course-123',
        created_by: 'admin-123',
      }

      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: expectedAssignment,
          error: null,
        })
      )

      // Act: Create assignment with valid course_id
      const request = new NextRequest('http://localhost:3000/api/assignments', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Assignment',
          description: 'Test description',
          question_ids: ['question-123'],
          due_date: '2025-09-01T00:00:00Z',
          course_id: 'course-123',
        }),
      })

      const response = await POST(request)

      // Assert: Should succeed
      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData.assignment.course_id).toBe('course-123')
    })
  })
})