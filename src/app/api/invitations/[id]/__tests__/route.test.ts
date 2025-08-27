import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, PUT } from '../route'

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

// Mock crypto
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'mock-token-123'),
    })),
  },
}))

// Mock data
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
}

const mockAdminProfile = {
  role: 'admin',
}

const mockCourseLeaderProfile = {
  role: 'course_leader',
}

const mockStudentProfile = {
  role: 'student',
}

const mockInvitation = {
  id: 'invitation-123',
  invited_by: 'user-123',
  used_at: null,
  email: 'invitee@example.com',
  role: 'student',
}

describe('Invitation [id] API Routes', () => {
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
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }
    
    mockSupabaseClient.from.mockReturnValue(mockQuery)
  })

  describe('DELETE /api/invitations/[id]', () => {
    it('should delete invitation for authenticated admin', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockInvitation, error: null }), // invitation query
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: [mockInvitation], error: null }),
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Invitation deleted successfully')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for users without admin or course_leader role', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStudentProfile, error: null }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 for non-existent invitation', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: null, error: { message: 'Invitation not found' } }), // invitation query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invitation not found')
    })

    it('should prevent course leaders from deleting invitations they did not create', async () => {
      const otherUserInvitation = { ...mockInvitation, invited_by: 'other-user' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockCourseLeaderProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: otherUserInvitation, error: null }), // invitation query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not authorized to delete this invitation')
    })

    it('should prevent deletion of used invitations', async () => {
      const usedInvitation = { ...mockInvitation, used_at: '2023-01-01T00:00:00.000Z' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: usedInvitation, error: null }), // invitation query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot delete used invitation')
    })

    it('should handle RLS policy restriction when no rows are deleted', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockInvitation, error: null }), // invitation query
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: [], error: null }), // No rows deleted
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Unable to delete invitation - insufficient permissions or RLS policy restriction')
    })

    it('should handle database errors during deletion', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockInvitation, error: null }), // invitation query
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to delete invitation')
    })

    it('should handle server errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Database connection failed'))

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await DELETE(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('PUT /api/invitations/[id] - Resend', () => {
    it('should resend invitation for authenticated admin', async () => {
      const updatedInvitation = { ...mockInvitation, token: 'mock-token-123' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockInvitation, error: null }), // invitation query
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: updatedInvitation, error: null }),
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'PUT',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.invitation).toBeDefined()
      expect(data.inviteUrl).toBe('http://localhost:3000/invite/mock-token-123')
    })

    it('should return 401 for unauthenticated requests', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'PUT',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return 403 for users without admin or course_leader role', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: mockStudentProfile, error: null }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'PUT',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Forbidden')
    })

    it('should return 404 for non-existent invitation', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: null, error: { message: 'Invitation not found' } }), // invitation query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'PUT',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invitation not found')
    })

    it('should prevent course leaders from resending invitations they did not create', async () => {
      const otherUserInvitation = { ...mockInvitation, invited_by: 'other-user' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockCourseLeaderProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: otherUserInvitation, error: null }), // invitation query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'PUT',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Not authorized to resend this invitation')
    })

    it('should prevent resending of used invitations', async () => {
      const usedInvitation = { ...mockInvitation, used_at: '2023-01-01T00:00:00.000Z' }
      
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: usedInvitation, error: null }), // invitation query
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'PUT',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Cannot resend used invitation')
    })

    it('should handle database errors during update', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
          .mockResolvedValueOnce({ data: mockAdminProfile, error: null }) // profile query
          .mockResolvedValueOnce({ data: mockInvitation, error: null }), // invitation query
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Database error' } }),
        }),
      }
      
      mockSupabaseClient.from.mockReturnValue(mockQuery)

      const request = new NextRequest('http://localhost:3000/api/invitations/invitation-123', {
        method: 'PUT',
      })
      const params = Promise.resolve({ id: 'invitation-123' })

      const response = await PUT(request, { params })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to resend invitation')
    })
  })
})