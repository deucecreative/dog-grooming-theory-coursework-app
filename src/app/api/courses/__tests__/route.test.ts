import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

// Mock the createClient function
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => mockSupabase)
}))

describe('Course API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/courses', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost:3000/api/courses')
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should require approved account status', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'student', status: 'pending' },
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(mockProfiles)

      const request = new NextRequest('http://localhost:3000/api/courses')
      const response = await GET(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Approved account required')
    })

    it('should return active courses for students', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'student-1', email: 'student@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'student', status: 'approved' },
          error: null
        })
      }

      const mockCourses = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'course-1',
              title: 'Basic Grooming',
              status: 'active',
              course_instructors: [],
              course_enrollments: []
            }
          ],
          error: null
        }),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis()
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'courses') return mockCourses
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.courses).toHaveLength(1)
      expect(data.courses[0].title).toBe('Basic Grooming')
      expect(mockCourses.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('should filter courses by status for admins', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockCourses = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'course-1',
              title: 'Draft Course',
              status: 'draft',
              course_instructors: [],
              course_enrollments: []
            }
          ],
          error: null
        }),
        or: vi.fn().mockReturnThis()
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'courses') return mockCourses
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses?status=draft')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.courses).toHaveLength(1)
      expect(data.courses[0].status).toBe('draft')
      expect(mockCourses.eq).toHaveBeenCalledWith('status', 'draft')
    })

    it('should return instructor courses for course leaders', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'leader-1', email: 'leader@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'course_leader', status: 'approved' },
          error: null
        })
      }

      const mockInstructorCourses = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: [{ course_id: 'course-1' }],
          error: null
        })
      }

      const mockCourses = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'course-1',
              title: 'My Course',
              status: 'active',
              course_instructors: [{ instructor_id: 'leader-1', role: 'instructor' }],
              course_enrollments: []
            }
          ],
          error: null
        }),
        or: vi.fn().mockReturnThis()
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'course_instructors') return mockInstructorCourses
        if (table === 'courses') return mockCourses
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses?instructor_only=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.courses).toHaveLength(1)
      expect(data.courses[0].is_instructor).toBe(true)
    })

    it('should include enrollment statistics', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockCourses = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'course-1',
              title: 'Popular Course',
              status: 'active',
              course_instructors: [
                { instructor_id: 'inst-1', role: 'instructor' },
                { instructor_id: 'inst-2', role: 'assistant' }
              ],
              course_enrollments: [
                { id: 'enroll-1', enrollment_status: 'active' },
                { id: 'enroll-2', enrollment_status: 'active' },
                { id: 'enroll-3', enrollment_status: 'dropped' }
              ]
            }
          ],
          error: null
        }),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis()
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'courses') return mockCourses
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.courses[0].enrollment_count).toBe(2) // Only active enrollments
      expect(data.courses[0].instructor_count).toBe(2)
    })

    it('should handle database errors gracefully', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1', email: 'test@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'student', status: 'approved' },
          error: null
        })
      }

      const mockCourses = {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed')
        }),
        or: vi.fn().mockReturnThis()
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'courses') return mockCourses
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses')
      const response = await GET(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to fetch courses')
    })
  })

  describe('POST /api/courses', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      })

      const request = new NextRequest('http://localhost:3000/api/courses', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Course' })
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('should prevent students from creating courses', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'student-1', email: 'student@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'student', status: 'approved' },
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(mockProfiles)

      const request = new NextRequest('http://localhost:3000/api/courses', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Course' })
      })
      const response = await POST(request)

      expect(response.status).toBe(403)
      const data = await response.json()
      expect(data.error).toBe('Insufficient permissions')
    })

    it('should validate required fields', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      mockSupabase.from.mockReturnValue(mockProfiles)

      const request = new NextRequest('http://localhost:3000/api/courses', {
        method: 'POST',
        body: JSON.stringify({ description: 'Missing title' })
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toBe('Invalid input')
      expect(data.details).toBeDefined()
    })

    it('should create course and assign creator as instructor', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'leader-1', email: 'leader@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'course_leader', status: 'approved' },
          error: null
        })
      }

      const mockCourses = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'new-course-1',
            title: 'Advanced Grooming',
            created_by: 'leader-1'
          },
          error: null
        })
      }

      const mockInstructors = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'courses') return mockCourses
        if (table === 'course_instructors') return mockInstructors
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Advanced Grooming',
          description: 'Learn advanced techniques',
          status: 'draft',
          duration_weeks: 8
        })
      })
      const response = await POST(request)

      expect(response.status).toBe(201)
      const data = await response.json()
      expect(data.course.title).toBe('Advanced Grooming')
      expect(mockCourses.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Advanced Grooming',
          created_by: 'leader-1'
        })
      )
      expect(mockInstructors.insert).toHaveBeenCalledWith({
        course_id: 'new-course-1',
        instructor_id: 'leader-1',
        role: 'instructor'
      })
    })

    it('should handle course creation errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockCourses = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Database error')
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'courses') return mockCourses
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses', {
        method: 'POST',
        body: JSON.stringify({ title: 'Failed Course' })
      })
      const response = await POST(request)

      expect(response.status).toBe(500)
      const data = await response.json()
      expect(data.error).toBe('Failed to create course')
    })

    it('should continue even if instructor assignment fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'admin-1', email: 'admin@example.com' } },
        error: null
      })

      const mockProfiles = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockCourses = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'course-1',
            title: 'New Course',
            created_by: 'admin-1'
          },
          error: null
        })
      }

      const mockInstructors = {
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: new Error('Constraint violation')
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles') return mockProfiles
        if (table === 'courses') return mockCourses
        if (table === 'course_instructors') return mockInstructors
        return { select: vi.fn().mockReturnThis() }
      })

      const request = new NextRequest('http://localhost:3000/api/courses', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Course' })
      })
      const response = await POST(request)

      expect(response.status).toBe(201) // Still succeeds
      const data = await response.json()
      expect(data.course.title).toBe('New Course')
    })
  })
})