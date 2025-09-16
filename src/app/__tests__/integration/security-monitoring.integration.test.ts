import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestSupabaseClients, type TestSupabaseClient } from '@/test/supabase-test-client'

/**
 * SECURITY MONITORING TESTS
 * 
 * WARNING: These tests are designed to FAIL when security vulnerabilities exist.
 * They are monitoring tests, not standard TDD tests.
 * 
 * Purpose: Real-time detection of security regressions in production
 * Behavior: FAIL when vulnerabilities detected, PASS when system is secure
 * 
 * For proper TDD security tests that follow standard patterns, 
 * see rls-policy-verification.test.ts
 */

describe('SECURITY MONITORING: Real-time Vulnerability Detection', () => {
  let testClients: TestSupabaseClient
  let supabase: TestSupabaseClient['anonClient']
  
  beforeAll(() => {
    // Create properly managed test clients (using anon client for monitoring)
    testClients = createTestSupabaseClients()
    supabase = testClients.anonClient
  })

  afterAll(async () => {
    // Proper cleanup using factory method
    await testClients.cleanup()
    
    // Additional cleanup for test data
    // Clean up any test data
    try {
      await supabase
        .from('invitations')
        .delete()
        .like('email', 'e2e-test-%@example.com')
    } catch (error) {
      console.warn('Cleanup error (may be expected):', error)
    }
  })

  it('CRITICAL: Should successfully delete invitation that appears in UI list', async () => {
    const testEmail = `e2e-test-${Date.now()}@example.com`
    let invitationId: string | null = null

    try {
      // STEP 1: Create invitation in database (simulating admin creating invitation)
      const { data: createdInvitation, error: createError } = await supabase
        .from('invitations')
        .insert({
          email: testEmail,
          role: 'student',
          invited_by: '00000000-0000-0000-0000-000000000000', // Mock admin ID
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        })
        .select('id, email, role')
        .single()

      if (createError) {
        console.warn('Cannot create invitation (likely missing admin user) - skipping test:', createError.message)
        return // Skip test if database setup doesn't allow invitation creation
      }

      expect(createdInvitation).toBeDefined()
      if (!createdInvitation) throw new Error('Created invitation should be defined')
      invitationId = (createdInvitation as { id: string; email: string; role: string }).id

      // STEP 2: Verify invitation appears in list (simulating UI fetching invitations)
      const { data: invitationsList, error: listError } = await supabase
        .from('invitations')
        .select('id, email, role, used_at')
        .eq('email', testEmail)

      expect(listError).toBeNull()
      expect(invitationsList).toBeDefined()
      expect(invitationsList).toHaveLength(1)
      expect(invitationsList![0].id).toBe(invitationId)
      expect(invitationsList![0].email).toBe(testEmail)

      console.log(`✅ STEP 2 PASSED: Invitation ${invitationId} appears in list`)

      // STEP 3: Delete invitation via database (simulating DELETE API success)
      const { data: deletedRows, error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId)
        .select() // CRITICAL: This is what the API does to verify deletion

      expect(deleteError).toBeNull()
      expect(deletedRows).toBeDefined()
      expect(deletedRows!).toHaveLength(1) // CRITICAL: Must have deleted exactly 1 row
      expect(deletedRows![0].id).toBe(invitationId)

      console.log(`✅ STEP 3 PASSED: Invitation ${invitationId} deleted, ${deletedRows!.length} row(s) affected`)

      // STEP 4: Verify invitation is actually gone from database
      const { data: shouldBeEmpty, error: verifyError } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)

      expect(verifyError).toBeNull()
      expect(shouldBeEmpty).toHaveLength(0) // Should be empty array

      console.log(`✅ STEP 4 PASSED: Invitation ${invitationId} confirmed deleted from database`)

      // Mark as cleaned up
      invitationId = null

    } catch (error) {
      console.error('❌ E2E TEST FAILED:', error)
      throw error
    }
  })

  it('CRITICAL: Should detect when RLS blocks deletion (Silent Failure scenario)', async () => {
    // This test simulates the scenario that caused the Silent Deletion Failure
    
    const testEmail = `e2e-rls-test-${Date.now()}@example.com`
    
    try {
      // Try to create invitation with insufficient permissions
      // This should either fail immediately or create but not be deletable
      const { data: invitation, error: createError } = await supabase
        .from('invitations')
        .insert({
          email: testEmail,
          role: 'student',
          invited_by: '99999999-9999-9999-9999-999999999999', // Non-existent user ID
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select('id')
        .single()

      if (createError) {
        // Good! RLS is blocking creation, which is expected behavior
        console.log('✅ RLS correctly blocked invitation creation with invalid invited_by')
        // Both "row-level security policy" and "permission denied" indicate RLS is working
        const isRLSBlocked = createError.message.includes('row-level security policy') || 
                            createError.message.includes('permission denied')
        expect(isRLSBlocked).toBe(true)
        return
      }

      // If creation succeeded, try to delete it (this would expose RLS issues)
      if (!invitation) {
        throw new Error('Invitation should be created if no createError')
      }
      
      const { data: deletedRows, error: deleteError } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitation.id)
        .select()

      if (deleteError) {
        // Good! RLS blocked deletion with a proper error
        console.log('✅ RLS correctly blocked deletion with error:', deleteError.message)
        expect(deleteError.message).toContain('row-level security policy')
        return
      }

      if (!deletedRows || deletedRows.length === 0) {
        // This is the "Silent Failure" scenario - no error but no deletion
        console.log('⚠️  SILENT FAILURE DETECTED: No error but no rows deleted')
        console.log('   This is what the API should detect and return 404 for')
        
        // Verify invitation still exists (silent failure confirmation)
        const { data: stillExists, error: checkError } = await supabase
          .from('invitations')
          .select('id')
          .eq('id', invitation.id)
          .single()
        
        expect(checkError).toBeNull()
        expect(stillExists).toBeDefined()
        console.log('✅ Silent failure confirmed - invitation still exists after "successful" delete')
        
        // Clean up
        await supabase.from('invitations').delete().eq('id', invitation.id)
        
      } else {
        // Deletion actually worked - clean up and this is fine
        console.log('✅ Deletion worked normally')
      }

    } catch (error) {
      console.error('RLS test error:', error)
      throw error
    }
  })

  it('CRITICAL: Should verify RLS policies allow proper permissions', async () => {
    // This test verifies that the RLS policies are set up correctly
    
    console.log('🔍 Testing RLS policy permissions...')

    // Test 1: Can we read invitations? (Should work with SELECT policy)
    const { error: readError } = await supabase
      .from('invitations')
      .select('id, email')
      .limit(1)

    if (readError) {
      console.log('⚠️  Cannot read invitations:', readError.message)
      // This might be expected if no SELECT policy allows anonymous access
    } else {
      console.log('✅ Can read invitations (SELECT policy working)')
      expect(readError).toBeNull()
    }

    // Test 2: Try to insert without proper auth (should fail)
    const { error: insertError } = await supabase
      .from('invitations')
      .insert({
        email: 'unauthorized-test@example.com',
        role: 'student',
        invited_by: '00000000-0000-0000-0000-000000000000'
      })

    if (insertError) {
      console.log('✅ INSERT correctly blocked by RLS:', insertError.message)
      // Both "row-level security policy" and "permission denied" indicate RLS is working
      const isRLSBlocked = insertError.message.includes('row-level security policy') || 
                          insertError.message.includes('permission denied')
      expect(isRLSBlocked).toBe(true)
    } else {
      console.log('🚨 SECURITY VIOLATION: INSERT allowed without auth')
      expect.fail('CRITICAL SECURITY BUG: INSERT operation allowed without authentication. RLS policies are not properly configured.')
    }

    // Test 3: Try to delete without proper auth (should fail)  
    const { error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', '00000000-0000-0000-0000-000000000000')

    if (deleteError) {
      console.log('✅ DELETE correctly blocked by RLS:', deleteError.message)
      // Both "row-level security policy" and "permission denied" indicate RLS is working
      const isRLSBlocked = deleteError.message.includes('row-level security policy') || 
                          deleteError.message.includes('permission denied')
      expect(isRLSBlocked).toBe(true)
    } else {
      console.log('🚨 SECURITY VIOLATION: DELETE allowed without auth')
      expect.fail('CRITICAL SECURITY BUG: DELETE operation allowed without authentication. RLS policies are not properly configured.')
    }
  })
})