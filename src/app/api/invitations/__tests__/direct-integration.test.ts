/**
 * Direct integration tests for invitation API routes
 * These tests validate the API logic without HTTP layer complexity
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as createInvitation } from '../route'
import { POST as verifyInvitation } from '../../invitations/verify/route'
import { NextRequest } from 'next/server'
import { createMockSupabaseClient, createMockUser } from '@/types/test-utilities'

// Mock crypto for token generation
vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => 'test-token-abc123')
    }))
  }
}))

// Mock both server and service clients
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn()
}

// Mock the server client (used by create invitation route)
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient)
}))

// Mock the service client (used by verify invitation route)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}))

describe.skip('Invitation API - Direct Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/invitations', () => {
    it('should create invitation when called by admin', async () => {
      // Setup mocks for admin user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { 
          user: { 
            id: 'admin-123',
            email: 'admin@test.com'
          } 
        },
        error: null
      })

      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn()
      }

      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'profiles') {
          callCount++
          if (callCount === 1) {
            // First call: get user profile for auth check
            mockFrom.single.mockResolvedValueOnce({
              data: { 
                id: 'admin-123',
                role: 'admin', 
                status: 'approved' 
              },
              error: null
            })
          } else {
            // Second call: check if user already exists
            mockFrom.single.mockResolvedValueOnce({
              data: null,
              error: null
            })
          }
          return mockFrom
        }
        
        if (table === 'invitations') {
          // First call: check existing invitation
          mockFrom.single.mockResolvedValueOnce({
            data: null,
            error: null
          })
          // Second call: create invitation
          .mockResolvedValueOnce({
            data: {
              id: 'inv-123',
              email: 'newuser@example.com',
              role: 'student',
              token: 'test-token-abc123',
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              invited_by: 'admin-123',
              used_at: null
            },
            error: null
          })
          return mockFrom
        }
        
        return mockFrom
      })

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          role: 'student'
        })
      })

      const response = await createInvitation(request)
      const data = await response.json()

      // Log to debug the issue
      if (response.status !== 201) {
        console.log('Response status:', response.status)
        console.log('Response data:', data)
      }

      expect(response.status).toBe(201)
      expect(data.message).toBe('Invitation created successfully')
      expect(data.invitation).toBeDefined()
      expect(data.invitation.email).toBe('newuser@example.com')
      expect(data.invitation.role).toBe('student')
      expect(data.invitation.token).toBe('test-token-abc123')
    })

    it('should reject invitation creation without authentication', async () => {
      // Mock unauthenticated user
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = createMockSupabaseClient()
      vi.mocked(mockClient.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: { name: 'AuthError', message: 'Not authenticated', code: 'unauthorized', status: 401, __isAuthError: true } as unknown as import('@supabase/supabase-js').AuthError
      })
      vi.mocked(createClient).mockResolvedValueOnce(mockClient)

      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          role: 'student'
        })
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should enforce role permissions for course leaders', async () => {
      // Mock course leader user
      const { createClient } = await import('@/lib/supabase/server')
      const mockClient = createMockSupabaseClient()
      vi.mocked(mockClient.auth.getUser).mockResolvedValue({
        data: { 
          user: createMockUser({
            id: 'leader-123',
            email: 'leader@test.com'
          })
        },
        error: null
      })
      vi.mocked(createClient).mockResolvedValueOnce(mockClient)

      // Try to invite an admin (should fail)
      const request = new NextRequest('http://localhost:3000/api/invitations', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newadmin@example.com',
          role: 'admin'
        })
      })

      const response = await createInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Course leaders can only invite students')
    })
  })

  describe('POST /api/invitations/verify', () => {
    it('should verify valid invitation token', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      // Setup mock for valid invitation lookup
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
      }

      let _fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          _fromCallCount++
          // First call returns the invitation with profile data
          mockFrom.single.mockResolvedValueOnce({
            data: {
              id: 'inv-123',
              email: 'test@example.com',
              role: 'student',
              token: 'test-token-abc123',
              expires_at: futureDate,
              invited_by: 'admin-123',
              used_at: null,
              profiles: {
                full_name: 'Admin User',
                email: 'admin@test.com'
              }
            },
            error: null
          })
          return mockFrom
        }
        
        if (table === 'profiles') {
          // Check for existing user with same email
          mockFrom.single.mockResolvedValueOnce({
            data: null, // No existing user
            error: null
          })
          return mockFrom
        }
        
        return mockFrom
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'test-token-abc123'
        })
      })

      const response = await verifyInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.valid).toBe(true)
      expect(data.invitation).toBeDefined()
      expect(data.invitation.email).toBe('test@example.com')
      expect(data.invitation.role).toBe('student')
      expect(data.invitation.invited_by).toBe('Admin User')
    })

    it('should reject invalid token', async () => {
      // Setup mock for invalid token
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' }
        })
      }

      mockSupabaseClient.from.mockImplementation(() => mockFrom)

      const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid-token'
        })
      })

      const response = await verifyInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Invalid invitation token')
    })

    it('should reject expired invitation', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
      
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'inv-expired',
            email: 'expired@example.com',
            role: 'student',
            token: 'expired-token',
            expires_at: pastDate,
            invited_by: 'admin-123',
            used_at: null,
            profiles: null
          },
          error: null
        })
      }

      mockSupabaseClient.from.mockImplementation(() => mockFrom)

      const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'expired-token'
        })
      })

      const response = await verifyInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This invitation has expired')
    })

    it('should reject already used invitation', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      const usedDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: {
            id: 'inv-used',
            email: 'used@example.com',
            role: 'student',
            token: 'used-token',
            expires_at: futureDate,
            invited_by: 'admin-123',
            used_at: usedDate, // Already used
            profiles: null
          },
          error: null
        })
      }

      mockSupabaseClient.from.mockImplementation(() => mockFrom)

      const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'used-token'
        })
      })

      const response = await verifyInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('This invitation has already been used')
    })

    it('should reject if user already exists', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      
      const mockFrom = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn()
      }

      const _fromCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        if (table === 'invitations') {
          // Valid invitation
          mockFrom.single.mockResolvedValueOnce({
            data: {
              id: 'inv-123',
              email: 'existing@example.com',
              role: 'student',
              token: 'test-token',
              expires_at: futureDate,
              invited_by: 'admin-123',
              used_at: null,
              profiles: null
            },
            error: null
          })
          return mockFrom
        }
        
        if (table === 'profiles') {
          // User already exists
          mockFrom.single.mockResolvedValueOnce({
            data: { id: 'existing-user-123' },
            error: null
          })
          return mockFrom
        }
        
        return mockFrom
      })

      const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'test-token'
        })
      })

      const response = await verifyInvitation(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('An account with this email already exists')
    })
  })
})