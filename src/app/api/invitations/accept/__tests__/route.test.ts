import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../route'
import type { PostgrestError } from '@supabase/supabase-js'
import { createMockPostgrestError } from '@/types/test-utilities'

// Create a mock query result factory
const createMockQueryChain = (mockResult: { data: unknown; error: PostgrestError | null }) => ({
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
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
const validToken = 'valid-token-123'
const invalidToken = 'invalid-token'

const acceptedInvitation = {
  id: 'invitation-123',
  email: 'newuser@test.com',
}

describe('Invitation Accept API - POST /api/invitations/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should accept valid unused invitation', async () => {
    // Mock successful invitation acceptance
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: acceptedInvitation,
      error: null,
    }))

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.message).toBe('Invitation accepted successfully')
    expect(data.invitation_id).toBe('invitation-123')
  })

  it('should reject invalid token format', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: '' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid token format')
  })

  it('should handle non-existent or already used invitation', async () => {
    // Mock no invitation found (already used or doesn't exist)
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: null,
      error: null,
    }))

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: invalidToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Invitation not found or already used')
  })

  it('should handle database errors gracefully', async () => {
    // Mock database error
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: null,
      error: createMockPostgrestError('Database error'),
    }))

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to accept invitation')
  })

  it('should require token in request body', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({}),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid token format')
  })

  it('should validate token is not empty string', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: '' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid token format')
  })

  it('should set used_at timestamp correctly', async () => {
    const mockQueryChain = createMockQueryChain({
      data: acceptedInvitation,
      error: null,
    })
    
    mockSupabaseClient.from.mockReturnValueOnce(mockQueryChain)

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    await POST(request)

    // Verify that update was called with used_at timestamp
    expect(mockQueryChain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        used_at: expect.any(String)
      })
    )
  })

  it('should handle malformed JSON request', async () => {
    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: 'invalid-json',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })

  it('should only update unused invitations', async () => {
    const mockQueryChain = createMockQueryChain({
      data: acceptedInvitation,
      error: null,
    })
    
    mockSupabaseClient.from.mockReturnValueOnce(mockQueryChain)

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    await POST(request)

    // Verify that the query checks for unused invitations
    expect(mockQueryChain.is).toHaveBeenCalledWith('used_at', null)
  })

  it('should return invitation ID on successful acceptance', async () => {
    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: acceptedInvitation,
      error: null,
    }))

    const request = new NextRequest('http://localhost:3000/api/invitations/accept', {
      method: 'POST',
      body: JSON.stringify({ token: validToken }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('message', 'Invitation accepted successfully')
    expect(data).toHaveProperty('invitation_id', 'invitation-123')
  })
})