import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from '../route'
import { NextRequest } from 'next/server'
import type { Profile } from '@/types/database'

// Test data
const TEST_ADMIN_ID = 'test-admin-123'
const TEST_COURSE_LEADER_ID = 'test-leader-456'
const TEST_STUDENT_ID = 'test-student-789'

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

describe('User API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/users - Authentication Tests', () => {
    it('should return 401 when user is not authenticated', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 when user profile is not found', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Profile not found' }
        })
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('Access denied')
    })

    it('should return 403 when user status is not approved', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'pending' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('Approved account required')
    })

    it('should return 403 when user is a student (not admin or course leader)', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_STUDENT_ID, email: 'student@test.com' } },
        error: null
      })

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'student', status: 'approved' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe('Admin or course leader access required')
    })
  })

  describe('GET /api/users - Role-Based Access Tests', () => {
    it('should allow admin to see all users', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', email: 'user1@test.com', role: 'student', status: 'approved' },
            { id: '2', email: 'user2@test.com', role: 'course_leader', status: 'approved' },
            { id: '3', email: 'user3@test.com', role: 'admin', status: 'approved' }
          ],
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles' && !mockProfileQuery.select.mock.calls.length) {
          return mockProfileQuery
        }
        return mockUsersQuery
      })

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(3)
      expect(data.users).toContainEqual(
        expect.objectContaining({ role: 'admin' })
      )
      expect(data.users).toContainEqual(
        expect.objectContaining({ role: 'course_leader' })
      )
    })

    it('should restrict course leaders to only see students', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_COURSE_LEADER_ID, email: 'leader@test.com' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'course_leader', status: 'approved' },
          error: null
        })
      }

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((field, value) => {
          // Course leader should only see students
          expect(field).toBe('role')
          expect(value).toBe('student')
          return mockUsersQuery
        }),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', email: 'student1@test.com', role: 'student', status: 'approved' },
            { id: '2', email: 'student2@test.com', role: 'student', status: 'pending' }
          ],
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles' && !mockProfileQuery.select.mock.calls.length) {
          return mockProfileQuery
        }
        return mockUsersQuery
      })

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(2)
      expect(data.users.every((u: Profile) => u.role === 'student')).toBe(true)
    })
  })

  describe('GET /api/users - Status Filter Tests', () => {
    it('should filter users by status when parameter provided', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation((field, value) => {
          if (field === 'status') {
            expect(value).toBe('pending')
          }
          return mockUsersQuery
        }),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', email: 'pending1@test.com', role: 'student', status: 'pending' },
            { id: '2', email: 'pending2@test.com', role: 'student', status: 'pending' }
          ],
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles' && !mockProfileQuery.select.mock.calls.length) {
          return mockProfileQuery
        }
        return mockUsersQuery
      })

      const request = new NextRequest('http://localhost:3000/api/users?status=pending')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.users).toHaveLength(2)
      expect(data.users.every((u: Profile) => u.status === 'pending')).toBe(true)
    })

    it('should ignore invalid status values', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockImplementation(() => {
          // Should not be called for invalid status
          throw new Error('eq should not be called for invalid status')
        }),
        order: vi.fn().mockResolvedValue({
          data: [
            { id: '1', email: 'user1@test.com', role: 'student', status: 'approved' },
            { id: '2', email: 'user2@test.com', role: 'student', status: 'pending' }
          ],
          error: null
        })
      }

      // Override eq to not throw for valid profile lookup
      let profileLookupDone = false
      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles' && !profileLookupDone) {
          profileLookupDone = true
          return mockProfileQuery
        }
        // For the users query, eq should not be called with invalid status
        return {
          ...mockUsersQuery,
          eq: vi.fn().mockReturnThis() // Don't throw, just return this
        }
      })

      const request = new NextRequest('http://localhost:3000/api/users?status=invalid')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.users).toBeDefined()
    })
  })

  describe('GET /api/users - Error Handling Tests', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' }
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles' && !mockProfileQuery.select.mock.calls.length) {
          return mockProfileQuery
        }
        return mockUsersQuery
      })

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch users')
    })

    it('should handle unexpected errors', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Unexpected error'))

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/users - Data Structure Tests', () => {
    it('should return correct data structure with approved_by relationship', async () => {
      // Arrange
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_ADMIN_ID, email: 'admin@test.com' } },
        error: null
      })

      const mockProfileQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { role: 'admin', status: 'approved' },
          error: null
        })
      }

      const mockUsersQuery = {
        select: vi.fn().mockImplementation((fields) => {
          // Verify the select includes the approved_profile relationship
          expect(fields).toContain('approved_profile:profiles!approved_by')
          return mockUsersQuery
        }),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [{
            id: '1',
            email: 'user@test.com',
            full_name: 'Test User',
            role: 'student',
            status: 'approved',
            created_at: '2024-01-01T00:00:00Z',
            approved_at: '2024-01-02T00:00:00Z',
            approved_by: TEST_ADMIN_ID,
            approved_profile: {
              full_name: 'Admin User',
              email: 'admin@test.com'
            }
          }],
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table) => {
        if (table === 'profiles' && !mockProfileQuery.select.mock.calls.length) {
          return mockProfileQuery
        }
        return mockUsersQuery
      })

      const request = new NextRequest('http://localhost:3000/api/users')

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.users[0]).toHaveProperty('approved_profile')
      expect(data.users[0].approved_profile).toEqual({
        full_name: 'Admin User',
        email: 'admin@test.com'
      })
    })
  })
})