import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT, DELETE } from '../route'

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockSupabaseClient,
}))

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

const mockAdminProfile = {
  role: 'admin',
  status: 'approved',
}

const mockCourseLeaderProfile = {
  role: 'course_leader',
  status: 'approved',
}

const mockStudentProfile = {
  role: 'student',
  status: 'approved',
}

const mockCourse = {
  id: 'course-123',
  title: 'Test Course',
  description: 'A test course',
  status: 'active',
  created_by: 'user-123',
  course_instructors: [{
    id: 'instructor-1',
    profiles: { id: 'user-123', full_name: 'Test Instructor' },
  }],
  course_enrollments: [{
    id: 'enrollment-1',
    student_id: 'student-456',
    enrollment_status: 'active',
  }],
  assignments: [],
}

describe('Course [id] API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    
    // Setup default from() chain
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: mockAdminProfile, error: null }),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    }
    
    mockSupabaseClient.from.mockReturnValue(mockQuery)
  })

  describe('GET /api/courses/[id]', () => {
    it('should return course details for authenticated admin', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockCourse, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123')
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.course).toBeDefined()
      expect(data.course.id).toBe('course-123')
      expect(data.course.can_edit).toBe(true)
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/courses/course-123')
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for unapproved users', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { ...mockAdminProfile, status: 'pending' }, 
          error: null 
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123')
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Approved account required')
    })

    it('should return 404 for non-existent course', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: null, error: { message: 'Course not found' } }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123')
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Course not found')
    })

    it('should restrict student access to active courses only', async () => {
      const inactiveCourse = { ...mockCourse, status: 'draft' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockStudentProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: inactiveCourse, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123')
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Course not accessible')
    })

    it('should allow students to access courses they are enrolled in', async () => {
      const courseWithEnrollment = {
        ...mockCourse,
        status: 'draft',
        course_enrollments: [{
          student_id: 'user-123',
          enrollment_status: 'active',
        }],
      }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockStudentProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: courseWithEnrollment, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123')
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.course.is_enrolled).toBe(true)
    })

    it('should handle server errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/courses/course-123')
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await GET(request, params)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PUT /api/courses/[id]', () => {
    it('should update course for authorized admin', async () => {
      const updatedCourse = { ...mockCourse, title: 'Updated Course' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockCourse, error: null }), // course query
        update: vi.fn().mockReturnThis(),
      }
      
      mockQuery.update.mockReturnValue({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedCourse, error: null }),
      })
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Course' }),
        headers: { 'Content-Type': 'application/json' },
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await PUT(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.course.title).toBe('Updated Course')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Course' }),
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await PUT(request, params)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent course', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: null, error: { message: 'Course not found' } }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Course' }),
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await PUT(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Course not found')
    })

    it('should return 403 for insufficient permissions', async () => {
      const courseWithoutUserAsInstructor = {
        ...mockCourse,
        course_instructors: [{
          instructor_id: 'other-user',
        }],
      }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockStudentProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: courseWithoutUserAsInstructor, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated Course' }),
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await PUT(request, params)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should validate request body and return 400 for invalid data', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockCourse, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'PUT',
        body: JSON.stringify({ title: '', duration_weeks: -5 }), // Invalid data
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await PUT(request, params)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid input')
      expect(data.details).toBeDefined()
    })

    it('should prevent course leaders from changing course status', async () => {
      const courseWithInstructor = {
        ...mockCourse,
        course_instructors: [{ instructor_id: 'user-123' }], // Make user an instructor
      }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockCourseLeaderProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: courseWithInstructor, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'PUT',
        body: JSON.stringify({ status: 'archived' }),
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await PUT(request, params)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only admins can change course status')
    })
  })

  describe('DELETE /api/courses/[id]', () => {
    it('should delete course for authorized admin', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: { ...mockCourse, course_enrollments: [], assignments: [] }, error: null }), // course query
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'DELETE',
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await DELETE(request, params)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Course deleted successfully')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'DELETE',
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await DELETE(request, params)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 404 for non-existent course', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: null, error: { message: 'Course not found' } }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'DELETE',
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await DELETE(request, params)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Course not found')
    })

    it('should return 403 for insufficient permissions', async () => {
      const courseNotCreatedByUser = {
        ...mockCourse,
        created_by: 'other-user',
        course_instructors: [{ instructor_id: 'other-user' }],
      }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockCourseLeaderProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: courseNotCreatedByUser, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'DELETE',
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await DELETE(request, params)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Only admins or course creators can delete courses')
    })

    it('should prevent deletion of course with active enrollments for non-admin', async () => {
      const courseWithEnrollments = {
        ...mockCourse,
        created_by: 'user-123', // Make user the creator
        course_enrollments: [{ id: 'enrollment-1' }],
        assignments: [],
        course_instructors: [{ instructor_id: 'user-123' }], // Make user an instructor
      }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockCourseLeaderProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: courseWithEnrollments, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'DELETE',
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await DELETE(request, params)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete course with active enrollments. Archive instead.')
    })

    it('should prevent deletion of course with assignments for non-admin', async () => {
      const courseWithAssignments = {
        ...mockCourse,
        created_by: 'user-123', // Make user the creator
        course_enrollments: [],
        assignments: [{ id: 'assignment-1' }],
        course_instructors: [{ instructor_id: 'user-123' }], // Make user an instructor
      }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockCourseLeaderProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: courseWithAssignments, error: null }), // course query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'DELETE',
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await DELETE(request, params)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete course with existing assignments. Archive instead.')
    })

    it('should handle database errors during deletion', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: { ...mockCourse, course_enrollments: [], assignments: [] }, error: null }), // course query
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Database error' } }),
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/courses/course-123', {
        method: 'DELETE',
      })
      const params = { params: Promise.resolve({ id: 'course-123' }) }

      const response = await DELETE(request, params)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete course')
    })
  })
})