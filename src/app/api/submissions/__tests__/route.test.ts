import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

/**
 * TDD Tests for Submissions API
 * 
 * Following TDD methodology: Tests first for submissions CRUD operations
 * Requirements from PROJECT.md:
 * - GET /api/submissions - List submissions for user
 * - POST /api/submissions - Create/update submission (students)
 * - GET /api/submissions/[id] - Get submission details
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
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    single: vi.fn(() => mockPromise),
    then: mockPromise.then.bind(mockPromise),
    catch: mockPromise.catch.bind(mockPromise),
    finally: mockPromise.finally.bind(mockPromise),
  }
  return Object.assign(mockPromise, chain)
}

const mockStudentUser = {
  id: 'student-123',
  email: 'student@test.com',
}

const mockStudentProfile = {
  id: 'student-123',
  role: 'student',
  status: 'approved',
}

const mockCourseLeaderProfile = {
  id: 'course-leader-123',
  role: 'course_leader',
  status: 'approved',
}

describe('Submissions API - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default auth success
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockStudentUser },
      error: null,
    })
  })

  describe('RED Phase: GET /api/submissions', () => {
    it('should_list_submissions_for_authenticated_user', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockStudentProfile,
          error: null,
        })
      )

      // Arrange: Mock submissions fetch
      const mockSubmissions = [
        {
          id: 'submission-1',
          assignment_id: 'assignment-1',
          student_id: 'student-123',
          answers: { 'question-1': 'Test answer' },
          status: 'draft',
          submitted_at: null,
          created_at: '2025-08-27T10:00:00Z',
          updated_at: '2025-08-27T10:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockSubmissions,
          error: null,
        })
      )

      // Act: Get submissions
      const request = new NextRequest('http://localhost:3000/api/submissions')
      const response = await GET(request)

      // Assert: Should return user's submissions
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.submissions).toEqual(mockSubmissions)
      expect(responseData.total).toBe(1)
    })

    it('should_require_authentication_for_submissions_list', async () => {
      // Arrange: Mock authentication failure
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      // Act: Try to get submissions without auth
      const request = new NextRequest('http://localhost:3000/api/submissions')
      const response = await GET(request)

      // Assert: Should require authentication
      expect(response.status).toBe(401)
      const responseData = await response.json()
      expect(responseData.error).toBe('Unauthorized')
    })

    it('should_filter_submissions_by_assignment_id', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockStudentProfile,
          error: null,
        })
      )

      // Arrange: Mock filtered submissions fetch
      const mockFilteredSubmissions = [
        {
          id: 'submission-1',
          assignment_id: 'assignment-123',
          student_id: 'student-123',
          answers: {},
          status: 'draft',
        },
      ]

      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockFilteredSubmissions,
          error: null,
        })
      )

      // Act: Get submissions with assignment filter
      const request = new NextRequest('http://localhost:3000/api/submissions?assignment_id=assignment-123')
      const response = await GET(request)

      // Assert: Should return filtered submissions
      expect(response.status).toBe(200)
      const responseData = await response.json()
      expect(responseData.submissions).toEqual(mockFilteredSubmissions)
    })
  })

  describe('RED Phase: POST /api/submissions', () => {
    it('should_create_submission_for_student', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockStudentProfile,
          error: null,
        })
      )

      // Arrange: Mock assignment validation
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: { id: 'assignment-123' },
          error: null,
        })
      )

      // Arrange: Mock submission creation
      const expectedSubmission = {
        id: 'submission-123',
        assignment_id: 'assignment-123',
        student_id: 'student-123',
        answers: { 'question-1': 'Test answer' },
        status: 'draft',
        submitted_at: null,
        created_at: '2025-08-27T10:00:00Z',
        updated_at: '2025-08-27T10:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: expectedSubmission,
          error: null,
        })
      )

      // Act: Create submission
      const request = new NextRequest('http://localhost:3000/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          assignment_id: 'assignment-123',
          answers: { 'question-1': 'Test answer' },
          status: 'draft',
        }),
      })

      const response = await POST(request)

      // Assert: Should create submission successfully
      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData.submission).toEqual(expectedSubmission)
    })

    it('should_require_assignment_id_for_submission_creation', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockStudentProfile,
          error: null,
        })
      )

      // Act: Try to create submission without assignment_id
      const request = new NextRequest('http://localhost:3000/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          answers: { 'question-1': 'Test answer' },
          status: 'draft',
        }),
      })

      const response = await POST(request)

      // Assert: Should require assignment_id
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Missing required fields')
      expect(responseData.error).toContain('assignment_id')
    })

    it('should_only_allow_students_to_create_submissions', async () => {
      // Arrange: Mock course leader profile (should not be allowed)
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockCourseLeaderProfile,
          error: null,
        })
      )

      // Act: Try to create submission as course leader
      const request = new NextRequest('http://localhost:3000/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          assignment_id: 'assignment-123',
          answers: { 'question-1': 'Test answer' },
          status: 'draft',
        }),
      })

      const response = await POST(request)

      // Assert: Should restrict to students only
      expect(response.status).toBe(403)
      const responseData = await response.json()
      expect(responseData.error).toContain('Only students can create submissions')
    })

    it('should_validate_assignment_exists', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockStudentProfile,
          error: null,
        })
      )

      // Arrange: Mock assignment validation failure (assignment doesn't exist)
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: null,
          error: { message: 'Assignment not found' },
        })
      )

      // Act: Try to create submission for non-existent assignment
      const request = new NextRequest('http://localhost:3000/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          assignment_id: 'invalid-assignment',
          answers: { 'question-1': 'Test answer' },
          status: 'draft',
        }),
      })

      const response = await POST(request)

      // Assert: Should validate assignment exists
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Invalid assignment_id')
    })

    it('should_support_submission_status_transitions', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockStudentProfile,
          error: null,
        })
      )

      // Arrange: Mock assignment validation
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: { id: 'assignment-123' },
          error: null,
        })
      )

      // Arrange: Mock submission update (draft → submitted)
      const expectedSubmission = {
        id: 'submission-123',
        assignment_id: 'assignment-123',
        student_id: 'student-123',
        answers: { 'question-1': 'Final answer' },
        status: 'submitted',
        submitted_at: '2025-08-27T10:30:00Z',
        created_at: '2025-08-27T10:00:00Z',
        updated_at: '2025-08-27T10:30:00Z',
      }

      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: expectedSubmission,
          error: null,
        })
      )

      // Act: Submit final answers
      const request = new NextRequest('http://localhost:3000/api/submissions', {
        method: 'POST',
        body: JSON.stringify({
          assignment_id: 'assignment-123',
          answers: { 'question-1': 'Final answer' },
          status: 'submitted',
        }),
      })

      const response = await POST(request)

      // Assert: Should handle status transition and set submitted_at
      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData.submission.status).toBe('submitted')
      expect(responseData.submission.submitted_at).toBeDefined()
    })
  })
})