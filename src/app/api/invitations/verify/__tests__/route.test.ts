import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'

// Create a mock query result factory
const createMockQueryChain = (mockResult: { data: unknown; error: unknown }) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue(mockResult),
})

// Mock Supabase service client
const mockSupabaseClient = {
  from: vi.fn(),
}

// Mock the direct Supabase client creation (service client)
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}))

// Test data
const validToken = 'valid-secure-token-123'
const expiredToken = 'expired-token-456'
const usedToken = 'used-token-789'

const validInvitation = {
  id: 'invitation-123',
  email: 'newuser@test.com',
  role: 'student',
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  used_at: null,
  invited_by: 'admin-123',
  profiles: {
    full_name: 'Admin User',
  },
}

const expiredInvitation = {
  ...validInvitation,
  expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
}

const usedInvitation = {
  ...validInvitation,
  used_at: new Date().toISOString(),
}

describe('Invitation Verification API - POST /api/invitations/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Suppress console.error during tests to prevent cleanup errors
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore console.error after each test
    vi.restoreAllMocks()
  })

  it('should verify valid invitation token', async () => {
    // Mock invitation lookup - return valid invitation
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: validInvitation,
        error: null,
      }))
      // Mock user lookup - return no existing user
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: null,
      }))

    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.valid).toBe(true)
    expect(data.invitation.email).toBe('newuser@test.com')
    expect(data.invitation.role).toBe('student')
    expect(data.invitation.invited_by).toBe('an administrator')
  })

  it('should reject invalid token format', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: '' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid token format')
  })

  it('should reject non-existent token', async () => {
    // Mock invitation lookup - return not found
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: null,
      error: { message: 'Not found' },
    }))

    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: 'non-existent-token' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invalid invitation token')
  })

  it('should reject already used invitation', async () => {
    // Mock invitation lookup - return used invitation
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: usedInvitation,
      error: null,
    }))

    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: usedToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('This invitation has already been used')
  })

  it('should reject expired invitation', async () => {
    // Mock invitation lookup - return expired invitation
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: expiredInvitation,
      error: null,
    }))

    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: expiredToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('This invitation has expired')
  })

  it('should reject invitation when user already exists', async () => {
    // Mock invitation lookup - return valid invitation
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: validInvitation,
        error: null,
      }))
      // Mock user lookup - return existing user
      .mockReturnValueOnce(createMockQueryChain({
        data: { id: 'existing-user-123' },
        error: null,
      }))

    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('An account with this email already exists')
  })

  it('should handle database errors gracefully', async () => {
    // Mock database error
    mockSupabaseClient.from.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockRejectedValue(new Error('Database connection error')),
    })

    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should validate required token field', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid token format')
  })

  it('should return correct invitation details format', async () => {
    // Mock invitation lookup - return valid invitation
    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: validInvitation,
        error: null,
      }))
      // Mock user lookup - return no existing user
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: null,
      }))

    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('valid', true)
    expect(data).toHaveProperty('invitation')
    expect(data.invitation).toHaveProperty('email')
    expect(data.invitation).toHaveProperty('role')
    expect(data.invitation).toHaveProperty('invited_by')
    expect(data.invitation).toHaveProperty('expires_at')
    expect(data.invitation).not.toHaveProperty('id')
    expect(data.invitation).not.toHaveProperty('used_at')
  })

  it('should handle malformed JSON gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/verify', {
      method: 'POST',
      body: 'invalid-json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})