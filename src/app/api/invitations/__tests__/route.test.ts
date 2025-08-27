import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
// Types imported on-demand when needed
import type { PostgrestError } from '@supabase/supabase-js'

// Create a mock query result factory
const createMockQueryChain = (mockResult: { data: unknown; error: PostgrestError | null }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(mockResult),
  insert: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  gt: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
})

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

// Test data
const mockAdmin = {
  id: 'admin-123',
  email: 'admin@test.com',
  role: 'admin'
}

const mockCourseLeader = {
  id: 'leader-123',
  email: 'leader@test.com',
  role: 'course_leader'
}

const mockStudent = {
  id: 'student-123',
  email: 'student@test.com',
  role: 'student'
}

const mockInvitations = [
  {
    id: 'invitation-1',
    email: 'newuser@test.com',
    role: 'student',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    used_at: null,
    created_at: '2024-01-01T00:00:00Z',
    invited_by: 'admin-123',
    profiles: {
      full_name: 'Admin User',
      email: 'admin@test.com'
    }
  },
  {
    id: 'invitation-2',
    email: 'student2@test.com',
    role: 'student',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    used_at: null,
    created_at: '2024-01-02T00:00:00Z',
    invited_by: 'leader-123',
    profiles: {
      full_name: 'Course Leader',
      email: 'leader@test.com'
    }
  }
]

describe('Invitations API - GET /api/invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject unauthenticated requests', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    // GET endpoint takes no parameters
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should reject non-admin/course_leader users', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockStudent },
      error: null
    })
    
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockStudent,
      error: null
    }))

    // GET endpoint takes no parameters
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should return invitations for admin users', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })
    
    // Mock profile lookup
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdmin,
        error: null
      }))
      // Mock invitations fetch
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockInvitations,
          error: null
        })
      })

    // GET endpoint takes no parameters
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitations).toHaveLength(2)
    expect(data.invitations[0].email).toBe('newuser@test.com')
  })

  it('should filter invitations for course leaders', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockCourseLeader },
      error: null
    })
    
    // Mock profile lookup
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockCourseLeader,
        error: null
      }))
      // Mock filtered invitations fetch
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        or: vi.fn().mockResolvedValue({
          data: [mockInvitations[1]], // Only student invitations for course leaders
          error: null
        })
      })

    // GET endpoint takes no parameters
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.invitations).toHaveLength(1)
    expect(data.invitations[0].email).toBe('student2@test.com')
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })
    
    // Mock profile lookup success
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdmin,
        error: null
      }))
      // Mock database error on invitations fetch
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection error' }
        })
      })

    // GET endpoint takes no parameters
    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch invitations')
  })
})

describe('Invitations API - POST /api/invitations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const newInvitation = {
    email: 'newuser@test.com',
    role: 'student' as const
  }

  it('should create invitation for admin with valid data', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })
    
    mockSupabaseClient.from
      // Mock profile lookup
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdmin,
        error: null
      }))
      // Mock existing user check - no existing user
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: null
      }))
      // Mock existing invitation check - no existing invitation
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: null
      }))
      // Mock invitation creation success
      .mockReturnValueOnce(createMockQueryChain({
        data: {
          id: 'new-invitation-123',
          token: 'secure-token-123',
          email: 'newuser@test.com',
          role: 'student',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/invitations', {
      method: 'POST',
      body: JSON.stringify(newInvitation)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.message).toBe('Invitation created successfully')
    expect(data.invitation.email).toBe('newuser@test.com')
  })

  it('should prevent course leaders from creating admin invitations', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockCourseLeader },
      error: null
    })
    
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockCourseLeader,
      error: null
    }))

    const adminInvitation = {
      email: 'newadmin@test.com',
      role: 'admin' as const
    }

    const request = new NextRequest('http://localhost:3000/api/invitations', {
      method: 'POST',
      body: JSON.stringify(adminInvitation)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Course leaders can only invite students')
  })

  it('should prevent duplicate user invitations', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })
    
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdmin,
        error: null
      }))
      // Mock existing user found
      .mockReturnValueOnce(createMockQueryChain({
        data: { id: 'existing-user-123', email: 'newuser@test.com' },
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/invitations', {
      method: 'POST',
      body: JSON.stringify(newInvitation)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('User with this email already exists')
  })

  it('should prevent duplicate pending invitations', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })
    
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdmin,
        error: null
      }))
      // Mock no existing user
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: null
      }))
      // Mock existing pending invitation
      .mockReturnValueOnce(createMockQueryChain({
        data: { id: 'existing-invitation-123' },
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/invitations', {
      method: 'POST',
      body: JSON.stringify(newInvitation)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Pending invitation already exists for this email')
  })

  it('should validate request body', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })
    
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockAdmin,
      error: null
    }))

    const invalidInvitation = {
      email: 'invalid-email', // Invalid email format
      role: 'student' as const
    }

    const request = new NextRequest('http://localhost:3000/api/invitations', {
      method: 'POST',
      body: JSON.stringify(invalidInvitation)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid input')
  })

  it('should require authentication', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/invitations', {
      method: 'POST',
      body: JSON.stringify(newInvitation)
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle missing required fields', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations', {
      method: 'POST',
      body: JSON.stringify({})
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })
})