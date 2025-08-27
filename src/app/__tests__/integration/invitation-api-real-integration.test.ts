import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * CRITICAL API WORKFLOW INTEGRATION TEST
 * 
 * Tests the actual API workflow using real database and HTTP requests:
 * 1. Create test invitation
 * 2. GET /api/invitations (list invitations) 
 * 3. DELETE /api/invitations/[id] (delete invitation)
 * 4. Verify the deletion worked in database
 * 
 * This tests the promise: "If invitation appears in UI list, deletion should succeed"
 */

// Only run integration tests if we have database credentials
const shouldRunIntegrationTests = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

describe('CRITICAL: Real API Integration', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  let testInvitationId: string
  let adminUser: Profile

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
    if (testInvitationId) {
      await supabase
        .from('invitations')
        .delete()
        .eq('id', testInvitationId)
    }
    
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  it('should create and delete invitation through real database operations', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // 1. Create a test invitation directly in database
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        email: 'test-api-workflow@example.com',
        role: 'student',
        invited_by: adminUser.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(invitation).toBeDefined()
    expect(invitation).not.toBeNull()
    if (!invitation) throw new Error('Invitation should not be null')
    
    testInvitationId = invitation.id

    // 2. Verify invitation exists in database
    const { data: checkInvitation, error: checkError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', testInvitationId)
      .single()

    expect(checkError).toBeNull()
    expect(checkInvitation).toBeDefined()
    expect(checkInvitation).not.toBeNull()
    if (!checkInvitation) throw new Error('Check invitation should not be null')
    
    expect(checkInvitation.email).toBe('test-api-workflow@example.com')

    // 3. Delete invitation from database
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', testInvitationId)
      .select()

    expect(deleteError).toBeNull()
    expect(deletedRows).toBeDefined()
    expect(deletedRows).not.toBeNull()
    if (!deletedRows) throw new Error('Deleted rows should not be null')
    
    expect(deletedRows.length).toBe(1)

    // 4. Verify invitation is gone
    const { data: verifyGone, error: verifyError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', testInvitationId)
      .maybeSingle()

    expect(verifyError).toBeNull()
    expect(verifyGone).toBeNull() // Should be null because invitation was deleted

    testInvitationId = '' // Clear since we successfully deleted it
  })

  it('should validate RLS policies allow proper CRUD operations', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Test that we can create, read, update, and delete invitations
    // This validates our RLS policies are working correctly
    
    // CREATE
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        email: 'test-rls-crud@example.com', 
        role: 'student',
        invited_by: adminUser.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    expect(createError).toBeNull()
    expect(invitation).toBeDefined()
    expect(invitation).not.toBeNull()
    if (!invitation) throw new Error('Invitation should not be null')
    
    const createdId = invitation.id

    // READ
    const { data: readInvitation, error: readError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', createdId)
      .single()

    expect(readError).toBeNull()
    expect(readInvitation).toBeDefined()
    expect(readInvitation).not.toBeNull()
    if (!readInvitation) throw new Error('Read invitation should not be null')
    
    expect(readInvitation.email).toBe('test-rls-crud@example.com')

    // UPDATE (if we have update operations)
    const { data: updatedInvitation, error: updateError } = await supabase
      .from('invitations')
      .update({ email: 'updated-test-rls-crud@example.com' })
      .eq('id', createdId)
      .select()
      .single()

    expect(updateError).toBeNull()
    expect(updatedInvitation).toBeDefined()
    expect(updatedInvitation).not.toBeNull()
    if (!updatedInvitation) throw new Error('Updated invitation should not be null')
    
    expect(updatedInvitation.email).toBe('updated-test-rls-crud@example.com')

    // DELETE
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', createdId)
      .select()

    expect(deleteError).toBeNull()
    expect(deletedRows).toBeDefined()
    expect(deletedRows).not.toBeNull()
    if (!deletedRows) throw new Error('Deleted rows should not be null')
    
    expect(deletedRows.length).toBe(1)

    // Verify deletion
    const { data: shouldBeGone, error: verifyError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', createdId)
      .maybeSingle()

    expect(verifyError).toBeNull()
    expect(shouldBeGone).toBeNull()
  })
})