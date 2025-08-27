import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { setupE2EAdminUser, authenticateAsAdmin, makeAuthenticatedRequest, type E2EAuthSession } from '@/test/helpers/auth-helper'
import { createTestServiceClient } from '@/test/supabase-test-client'

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3002'
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000' // Frontend URL for invitations

/**
 * End-to-End API tests for invitation system
 * These tests validate the full API flow without direct database access
 * They would have caught the URL encoding issue we discovered
 * 
 * NOTE: These tests require a running Next.js server
 * Run `npm run test:e2e` to execute these tests (server must be running)
 */

describe('Invitation API End-to-End Tests', () => {
  let adminSession: E2EAuthSession
  let supabase: ReturnType<typeof createTestServiceClient>

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
  })

  afterAll(async () => {
    // Note: Don't call cleanupE2ESession() here as it would sign out the shared session
    // that other test files might still be using. Let the final test file handle cleanup.
  })

  // Note: These tests require a running server and database
  // They simulate the actual user journey through the invitation system

  it('should create invitation with URL-safe token via API', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    // Clean up any existing test invitation first
    await supabase
      .from('invitations')
      .delete()
      .eq('email', 'url-safety-test@example.com')

    // This test would catch the base64 encoding issue by testing real API responses
    const response = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'url-safety-test@example.com',
          role: 'student'
        })
      },
      adminSession
    )

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Create invitation failed:', response.status, errorData)
    }
    expect(response.ok).toBe(true)

    const data = await response.json()
    
    // Verify token exists and is URL-safe
    expect(data.invitation.token).toBeDefined()
    expect(typeof data.invitation.token).toBe('string')
    
    // This is the critical test that would have caught our bug:
    // Tokens must not contain +, /, or = characters that break URLs
    expect(data.invitation.token).not.toMatch(/[+/=]/)
    expect(data.invitation.token).toMatch(/^[A-Za-z0-9_-]+$/)
    
    // Verify token works in URL construction without encoding
    expect(encodeURIComponent(data.invitation.token)).toBe(data.invitation.token)
  })

  it('should verify invitation tokens work in URLs', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    // Clean up any existing test invitation first
    await supabase
      .from('invitations')
      .delete()
      .eq('email', 'url-verification-test@example.com')

    // Create invitation first with authentication
    const createResponse = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'url-verification-test@example.com',
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
    const token = createData.invitation.token

    // Test that token can be used in verification API
    const verifyResponse = await fetch(`${API_BASE_URL}/api/invitations/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: token
      })
    })

    expect(verifyResponse.ok).toBe(true)
    const verifyData = await verifyResponse.json()
    expect(verifyData.valid).toBe(true)
    expect(verifyData.invitation.email).toBe('url-verification-test@example.com')
  })

  it('should handle malformed tokens gracefully', async () => {
    // Test various problematic token formats that could occur with bad encoding
    const problemTokens = [
      'token+with+plus+signs',    // Would break if we used standard base64
      'token/with/forward/slashes', // Would break URLs
      'token=with=equals=signs',    // Would break URL parsing
      'token%20with%20spaces',     // URL encoded spaces
      'token\nwith\nnewlines',     // Control characters
    ]

    for (const badToken of problemTokens) {
      const response = await fetch(`${API_BASE_URL}/api/invitations/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: badToken
        })
      })

      expect(response.ok).toBe(false)
      const data = await response.json()
      expect(data.error).toBeDefined()
      expect(typeof data.error).toBe('string')
    }
  })
})

/**
 * Integration tests that validate token generation patterns
 * These tests check the actual database token generation behavior
 */
describe('Token Generation Validation', () => {
  let adminSession: E2EAuthSession
  let supabase: ReturnType<typeof createTestServiceClient>

  beforeAll(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return
    }
    await setupE2EAdminUser()
    adminSession = await authenticateAsAdmin()
    supabase = createTestServiceClient()
  })

  it('should generate consistently URL-safe tokens', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    // Clean up any existing test invitations first
    await supabase
      .from('invitations')
      .delete()
      .like('email', 'token-test-%@example.com')

    const tokens: string[] = []
    
    // Generate multiple tokens to check consistency
    for (let i = 0; i < 5; i++) {
      const response = await makeAuthenticatedRequest(
        `${API_BASE_URL}/api/invitations`,
        {
          method: 'POST',
          body: JSON.stringify({
            email: `token-test-${i}@example.com`,
            role: 'student'
          })
        },
        adminSession
      )

      expect(response.ok).toBe(true)

      const data = await response.json()
      tokens.push(data.invitation.token)
    }

    // All tokens should be unique
    const uniqueTokens = new Set(tokens)
    expect(uniqueTokens.size).toBe(tokens.length)

    // All tokens should be URL-safe
    for (const token of tokens) {
      expect(token).not.toMatch(/[+/=]/)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
      expect(token.length).toBeGreaterThan(0)
    }
  })
})

/**
 * Regression tests specifically for the base64 URL encoding bug
 */
describe('Base64 URL Encoding Regression Tests', () => {
  let adminSession: E2EAuthSession
  let supabase: ReturnType<typeof createTestServiceClient>

  beforeAll(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return
    }
    await setupE2EAdminUser()
    adminSession = await authenticateAsAdmin()
    supabase = createTestServiceClient()
  })

  it('should not generate tokens with problematic base64 characters', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    // Clean up any existing test invitation first
    await supabase
      .from('invitations')
      .delete()
      .eq('email', 'regression-test@example.com')

    // This test specifically checks for the bug we found
    // Standard base64 can contain +, /, and = which break URLs
    
    const response = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'regression-test@example.com',
          role: 'student'
        })
      },
      adminSession
    )

    expect(response.ok).toBe(true)

    const data = await response.json()
    const token = data.invitation.token

    // These are the specific character checks that would have failed before the fix
    expect(token).not.toContain('+') // Plus signs break URLs
    expect(token).not.toContain('/') // Forward slashes break URL paths  
    expect(token).not.toContain('=') // Equals signs (padding) can break URL parsing and routing

    // Verify we're using URL-safe base64 characters only
    const urlSafeBase64Pattern = /^[A-Za-z0-9_-]+$/
    expect(token).toMatch(urlSafeBase64Pattern)
  })

  it('should create working invitation URLs', async () => {
    if (!adminSession) {
      console.log('Skipping test - no admin session available')
      return
    }

    // Clean up any existing test invitation first
    await supabase
      .from('invitations')
      .delete()
      .eq('email', 'url-construction-test@example.com')

    const response = await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/invitations`,
      {
        method: 'POST',
        body: JSON.stringify({
          email: 'url-construction-test@example.com',
          role: 'student'
        })
      },
      adminSession
    )

    expect(response.ok).toBe(true)

    const data = await response.json()
    const token = data.invitation.token

    // Test URL construction (this would have failed with problematic tokens)
    const inviteUrl = `${FRONTEND_URL}/invite/${token}`
    const parsedUrl = new URL(inviteUrl)
    
    expect(parsedUrl.pathname).toBe(`/invite/${token}`)
    expect(parsedUrl.pathname).not.toContain('%') // No URL encoding should be needed
  })
})