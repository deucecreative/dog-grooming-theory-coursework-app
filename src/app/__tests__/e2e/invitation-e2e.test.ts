import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import { setupE2EAdminUser, authenticateAsAdmin, makeAuthenticatedRequest, cleanupE2ESession, type E2EAuthSession } from '@/test/helpers/auth-helper'
import crypto from 'crypto'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000' // Frontend URL for invitations

describe('Invitation End-to-End Flow', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  let adminSession: E2EAuthSession
  let testInvitationId: string
  let testToken: string

  beforeAll(async () => {
    // Skip if no credentials available
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('Skipping E2E tests - no database credentials')
      return
    }
    
    // Setup E2E admin user and authenticate
    await setupE2EAdminUser()
    adminSession = await authenticateAsAdmin()
    
    // Use service role for cleanup operations
    supabase = createTestServiceClient()
    
    console.log(`E2E admin authenticated: ${adminSession.email}`)
  })

  afterAll(async () => {
    if (!supabase) return
    
    // Clean up test data
    if (testInvitationId) {
      await supabase
        .from('invitations')
        .delete()
        .eq('id', testInvitationId)
    }
    
    // Clean up authentication session
    if (adminSession) {
      await cleanupE2ESession()
    }
  })

  it('should complete full invitation flow: create → verify → accept', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }
    
    const testEmail = 'e2e-test@example.com'
    
    // Step 1: Create invitation via authenticated API call
    const createResponse = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          role: 'student'
        })
      },
      adminSession
    )

    if (!createResponse.ok) {
      const errorData = await createResponse.json()
      console.error('Create invitation failed:', createResponse.status, errorData)
    }
    expect(createResponse.ok).toBe(true)
    const createData = await createResponse.json()
    
    expect(createData.message).toBe('Invitation created successfully')
    expect(createData.invitation).toBeDefined()
    expect(createData.invitation.email).toBe(testEmail)
    expect(createData.invitation.role).toBe('student')
    expect(createData.invitation.token).toBeDefined()

    testToken = createData.invitation.token
    testInvitationId = createData.invitation.id

    // Validate token is URL-safe
    expect(testToken).not.toMatch(/[+/=]/)
    expect(testToken).toMatch(/^[A-Za-z0-9_-]+$/)

    // Step 2: Verify invitation via API (simulates user clicking invitation link)
    const verifyResponse = await fetch(`${API_BASE_URL}/api/invitations/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: testToken
      })
    })

    if (!verifyResponse.ok) {
      const errorData = await verifyResponse.json()
      console.error('Verify invitation failed:', verifyResponse.status, errorData)
    }
    expect(verifyResponse.ok).toBe(true)
    const verifyData = await verifyResponse.json()
    
    expect(verifyData.valid).toBe(true)
    expect(verifyData.invitation.email).toBe(testEmail)
    expect(verifyData.invitation.role).toBe('student')
    expect(verifyData.invitation.invited_by).toBeDefined()

    // Step 3: Test that URL construction works properly
    const invitationUrl = `${FRONTEND_URL}/invite/${testToken}`
    
    // Verify URL doesn't need additional encoding
    expect(encodeURIComponent(testToken)).toBe(testToken)
    
    // Verify URL can be parsed correctly
    const url = new URL(invitationUrl)
    expect(url.pathname).toBe(`/invite/${testToken}`)

    // Step 4: Accept invitation via API (simulates user completing signup with auth)
    const acceptResponse = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations/accept`,
      {
        method: 'POST',
        body: JSON.stringify({
          token: testToken
        })
      },
      adminSession
    )

    if (!acceptResponse.ok) {
      const errorData = await acceptResponse.json()
      console.error('Accept invitation failed:', acceptResponse.status, errorData)
    }
    expect(acceptResponse.ok).toBe(true)
    const acceptData = await acceptResponse.json()
    expect(acceptData.message).toBe('Invitation accepted successfully')

    // Step 5: Verify invitation is now marked as used
    const usedCheckResponse = await fetch(`${API_BASE_URL}/api/invitations/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: testToken
      })
    })

    expect(usedCheckResponse.ok).toBe(false)
    const usedCheckData = await usedCheckResponse.json()
    expect(usedCheckData.error).toContain('already been used')
  })

  it('should handle invalid tokens gracefully', async () => {
    const invalidTokens = [
      'invalid-token',
      'token+with+plus',
      'token/with/slash',
      'token=with=equals',
      '', // empty token
      'a'.repeat(100), // very long token
    ]

    for (const invalidToken of invalidTokens) {
      const response = await fetch(`${API_BASE_URL}/api/invitations/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: invalidToken
        })
      })

      expect(response.ok).toBe(false)
      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(typeof data.error).toBe('string')
    }
  })

  it('should prevent double-acceptance of invitations', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    const testEmail = 'double-accept-test@example.com'
    
    // Create invitation via authenticated API
    const createResponse = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: testEmail,
          role: 'student'
        })
      },
      adminSession
    )

    expect(createResponse.ok).toBe(true)
    const createData = await createResponse.json()
    
    const token = createData.invitation.token
    const invitationId = createData.invitation.id

    // Accept once with authentication
    const firstAccept = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations/accept`,
      {
        method: 'POST',
        body: JSON.stringify({ token })
      },
      adminSession
    )

    expect(firstAccept.ok).toBe(true)

    // Try to accept again (should fail)
    const secondAccept = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations/accept`,
      {
        method: 'POST',
        body: JSON.stringify({ token })
      },
      adminSession
    )

    expect(secondAccept.ok).toBe(false)
    const secondData = await secondAccept.json()
    expect(secondData.error).toMatch(/already.*used|Failed to accept invitation/)

    // Clean up
    await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
  })

  it('should handle expired invitations correctly', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    // For expired invitations, we need to create one directly in database since API creates with future expiry
    const { data: expiredInvitation, error } = await supabase
      .from('invitations')
      .insert({
        email: 'expired-test@example.com',
        role: 'student',
        invited_by: adminSession.userId,
        token: crypto.randomBytes(32).toString('base64url'),
        expires_at: new Date(Date.now() - 1000).toISOString() // 1 second ago
      })
      .select('token, id')
      .single()

    expect(error).toBeNull()
    expect(expiredInvitation).toBeDefined()

    // Try to verify expired invitation
    const verifyResponse = await fetch(`${API_BASE_URL}/api/invitations/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: expiredInvitation!.token
      })
    })

    expect(verifyResponse.ok).toBe(false)
    const data = await verifyResponse.json()
    expect(data.error).toContain('expired')

    // Clean up
    await supabase
      .from('invitations')
      .delete()
      .eq('id', expiredInvitation!.id)
  })

  it('should generate unique tokens for each invitation', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    const tokens = new Set<string>()
    const invitationIds: string[] = []

    // Clean up any existing test invitations first
    await supabase
      .from('invitations')
      .delete()
      .like('email', 'unique-test-%@example.com')

    // Create multiple invitations via authenticated API
    for (let i = 0; i < 10; i++) {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/invitations`,
        {
          method: 'POST',
          body: JSON.stringify({
            email: `unique-test-${i}@example.com`,
            role: 'student'
          })
        },
        adminSession
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.error(`Create invitation ${i} failed:`, response.status, errorData)
      }
      expect(response.ok).toBe(true)
      const data = await response.json()
      
      tokens.add(data.invitation.token)
      invitationIds.push(data.invitation.id)

      // Verify each token is URL-safe
      expect(data.invitation.token).not.toMatch(/[+/=]/)
      expect(data.invitation.token).toMatch(/^[A-Za-z0-9_-]+$/)
    }

    // All tokens should be unique
    expect(tokens.size).toBe(10)

    // Clean up all test invitations
    for (const id of invitationIds) {
      await supabase
        .from('invitations')
        .delete()
        .eq('id', id)
    }
  })
})