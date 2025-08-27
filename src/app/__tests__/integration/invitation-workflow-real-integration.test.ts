import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import type { Database } from '@/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']

/**
 * CRITICAL API WORKFLOW INTEGRATION TEST
 * 
 * Tests the actual invitation workflow using real database operations:
 * 1. Create test invitation
 * 2. Verify invitation exists and can be retrieved
 * 3. Delete invitation
 * 4. Verify deletion worked
 * 
 * This tests the promise: "If invitation appears in UI list, deletion should succeed"
 */

// Only run integration tests if we have database credentials
const shouldRunIntegrationTests = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY

describe('CRITICAL: Invitation Workflow Integration', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  let testInvitationIds: string[] = []
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

  it('should successfully complete the invitation CRUD workflow', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // STEP 1: Create a test invitation
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        email: 'workflow-test@example.com',
        role: 'student',
        invited_by: adminUser.id
      })
      .select('id, token, email, role')
      .single()

    expect(createError).toBeNull()
    expect(invitation).toBeDefined()
    expect(invitation).not.toBeNull()
    if (!invitation) throw new Error('Invitation should not be null')
    
    expect(invitation.email).toBe('workflow-test@example.com')
    expect(invitation.token).toBeDefined()
    testInvitationIds.push(invitation.id)

    // STEP 2: Verify invitation can be retrieved (simulates UI list)
    const { data: foundInvitation, error: findError } = await supabase
      .from('invitations')
      .select('id, email, role, token')
      .eq('id', invitation.id)
      .single()

    expect(findError).toBeNull()
    expect(foundInvitation).toBeDefined()
    expect(foundInvitation).not.toBeNull()
    if (!foundInvitation) throw new Error('Found invitation should not be null')
    
    expect(foundInvitation.email).toBe('workflow-test@example.com')
    expect(foundInvitation.id).toBe(invitation.id)

    // STEP 3: Delete the invitation (simulates deletion from UI)
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitation.id)
      .select()

    expect(deleteError).toBeNull()
    expect(deletedRows).toBeDefined()
    expect(deletedRows).not.toBeNull()
    if (!deletedRows) throw new Error('Deleted rows should not be null')
    
    expect(deletedRows.length).toBe(1)

    // STEP 4: Verify deletion worked
    const { data: shouldBeGone, error: verifyError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitation.id)
      .maybeSingle()

    expect(verifyError).toBeNull()
    expect(shouldBeGone).toBeNull() // Should be null because invitation was deleted

    // Remove from cleanup array since we successfully deleted it
    testInvitationIds = testInvitationIds.filter(id => id !== invitation.id)
  })

  it('should handle invitation not found scenarios gracefully', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Test deletion of non-existent invitation
    const nonExistentId = '00000000-0000-0000-0000-000000000000'
    
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', nonExistentId)
      .select()

    expect(deleteError).toBeNull()
    expect(deletedRows).toBeDefined()
    expect(deletedRows).not.toBeNull()
    if (!deletedRows) throw new Error('Deleted rows should not be null')
    
    expect(deletedRows.length).toBe(0) // No rows deleted because invitation doesn't exist
  })

  it('should maintain data consistency in invitation operations', async () => {
    if (!shouldRunIntegrationTests) {
      console.log('Skipping - no database credentials')
      return
    }

    // Create multiple invitations to test batch operations
    const invitations = await Promise.all([
      supabase
        .from('invitations')
        .insert({
          email: 'consistency-test-1@example.com',
          role: 'student',
          invited_by: adminUser.id
        })
        .select('id')
        .single(),
      supabase
        .from('invitations')
        .insert({
          email: 'consistency-test-2@example.com',
          role: 'course_leader',
          invited_by: adminUser.id
        })
        .select('id')
        .single()
    ])

    // Verify both invitations were created successfully
    expect(invitations[0].error).toBeNull()
    expect(invitations[1].error).toBeNull()
    expect(invitations[0].data).toBeDefined()
    expect(invitations[1].data).toBeDefined()
    expect(invitations[0].data).not.toBeNull()
    expect(invitations[1].data).not.toBeNull()
    
    if (!invitations[0].data || !invitations[1].data) {
      throw new Error('Invitations should not be null')
    }

    testInvitationIds.push(invitations[0].data.id)
    testInvitationIds.push(invitations[1].data.id)

    // Verify both can be found
    const { data: allTestInvitations, error: findAllError } = await supabase
      .from('invitations')
      .select('id, email')
      .in('id', [invitations[0].data.id, invitations[1].data.id])

    expect(findAllError).toBeNull()
    expect(allTestInvitations).toBeDefined()
    expect(allTestInvitations).not.toBeNull()
    if (!allTestInvitations) throw new Error('All test invitations should not be null')
    
    expect(allTestInvitations.length).toBe(2)

    // Clean up both invitations
    const { data: deletedAll, error: deleteAllError } = await supabase
      .from('invitations')
      .delete()
      .in('id', [invitations[0].data.id, invitations[1].data.id])
      .select()

    expect(deleteAllError).toBeNull()
    expect(deletedAll).toBeDefined()
    expect(deletedAll).not.toBeNull()
    if (!deletedAll) throw new Error('Deleted all should not be null')
    
    expect(deletedAll.length).toBe(2)

    // Remove from cleanup array since we successfully deleted them
    testInvitationIds = testInvitationIds.filter(id => 
      id !== invitations[0].data?.id && id !== invitations[1].data?.id
    )
  })
})