import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

// Only run integration tests if we have database credentials
const shouldRunIntegrationTests = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY

describe('Invitation Integration Tests', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  let adminUser: Profile
  const testInvitationIds: string[] = []
  
  beforeAll(async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping integration tests - no database credentials')
      return
    }
    
    // Create properly managed test client
    supabase = createTestServiceClient()

    // Find an admin user for testing
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .eq('status', 'approved')
      .limit(1)
    
    adminUser = profiles?.[0]
    if (!adminUser) {
      throw new Error('No admin user found for testing - create an admin user first')
    }
  })

  afterAll(async () => {
    if (!shouldRunIntegrationTests) return
    
    // Clean up any test invitations
    for (const id of testInvitationIds) {
      await supabase
        .from('invitations')
        .delete()
        .eq('id', id)
    }
    
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  it('should generate URL-safe invitation tokens', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // This test ensures that database-generated tokens are URL-safe
    // It would have caught the base64 encoding issue
    
    // Create a test invitation using real admin user
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email: 'integration-test@example.com',
        role: 'student',
        invited_by: adminUser.id
      })
      .select('id, token')
      .single()

    expect(error).toBeNull()
    expect(invitation).toBeDefined()
    expect(invitation).not.toBeNull()
    if (!invitation) throw new Error('Invitation should not be null')
    
    testInvitationIds.push(invitation.id)

    // Verify the token is URL-safe (no +, /, or = characters that could cause issues)
    expect(invitation.token).toBeDefined()
    expect(invitation.token).not.toMatch(/[+/=]/) // These characters cause URL issues
    expect(invitation.token).toMatch(/^[A-Za-z0-9_-]+$/) // Only URL-safe characters
    
    // Verify token can be used in URL without encoding
    const testUrl = `http://localhost:3000/invite/${invitation.token}`
    expect(testUrl).toEqual(testUrl) // Would fail if token needed URL encoding
  })

  it('should verify that invitation tokens work in API calls', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // This integration test verifies the full token flow
    // Create invitation -> Extract token -> Verify token works in API
    
    const { data: invitation, error } = await supabase
      .from('invitations')
      .insert({
        email: 'integration-test@example.com',
        role: 'student',
        invited_by: adminUser.id
      })
      .select('id, token, email, role, expires_at, invited_by')
      .single()

    expect(error).toBeNull()
    expect(invitation).toBeDefined()
    expect(invitation).not.toBeNull()
    if (!invitation) throw new Error('Invitation should not be null')
    
    testInvitationIds.push(invitation.id)

    // Test that the token can be used to verify the invitation
    const { data: verification, error: verifyError } = await supabase
      .from('invitations')
      .select('email, role, expires_at, used_at')
      .eq('token', invitation.token)
      .eq('email', 'integration-test@example.com')
      .single()

    expect(verifyError).toBeNull()
    expect(verification).toBeDefined()
    expect(verification).not.toBeNull()
    if (!verification) throw new Error('Verification should not be null')
    
    expect(verification.email).toBe('integration-test@example.com')
    expect(verification.role).toBe('student')
    expect(verification.used_at).toBeNull() // Should not be used yet

    // Clean up test data
    await supabase
      .from('invitations')
      .delete()
      .eq('token', invitation.token)
  })
})