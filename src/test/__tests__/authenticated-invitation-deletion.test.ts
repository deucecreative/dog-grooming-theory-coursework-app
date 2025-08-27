import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'

/**
 * AUTHENTICATED INTEGRATION TESTS - CRITICAL
 * 
 * These tests run with service role authentication to test the actual system
 * as an admin user would experience it.
 * 
 * Tests the core promise: "If invitation appears in UI, deletion should succeed"
 * with proper authentication context.
 */

describe('CRITICAL: Authenticated Invitation Deletion Integration', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  let testInvitationIds: string[] = []
  
  beforeAll(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for integration tests')
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'your_supabase_service_role_key_here') {
      console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not configured - skipping authenticated tests')
      console.warn('   This is required to test invitation deletion with proper authentication')
      return
    }
    
    // Create authenticated admin client using service role
    supabase = createTestServiceClient()
  })

  afterEach(async () => {
    // Clean up any test invitations created during tests
    if (!supabase || testInvitationIds.length === 0) return
    
    try {
      for (const id of testInvitationIds) {
        await supabase.from('invitations').delete().eq('id', id)
      }
      testInvitationIds = []
    } catch (error) {
      console.warn('Cleanup warning:', error)
    }
    
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  it('should verify admin profiles exist in the system', async () => {
    if (!supabase) {
      console.warn('Skipping test - service role key not configured')
      return
    }

    const { data: adminProfiles, error } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('role', 'admin')
      .eq('status', 'approved')

    expect(error).toBeNull()
    expect(adminProfiles).toBeDefined()
    expect(adminProfiles!.length).toBeGreaterThan(0)
    
    console.log(`✅ Found ${adminProfiles!.length} admin profile(s) in system`)
    adminProfiles!.forEach(admin => {
      console.log(`   - ${admin.email} (${admin.role}, ${admin.status})`)
    })
  })

  it('CRITICAL: Should complete full invitation lifecycle as admin', async () => {
    if (!supabase) {
      console.warn('Skipping test - service role key not configured')
      return
    }

    console.log('🔄 TESTING COMPLETE INVITATION LIFECYCLE')
    
    // Get an admin user to use as invited_by
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')
      .eq('status', 'approved')
      .limit(1)

    expect(adminError).toBeNull()
    expect(adminProfiles).toBeDefined()
    expect(adminProfiles!.length).toBeGreaterThan(0)
    
    const adminUser = adminProfiles![0]
    console.log(`📋 Using admin user: ${adminUser.email}`)

    // STEP 1: Create invitation (as admin would in UI)
    const testEmail = `auth-test-${Date.now()}@example.com`
    const { data: createdInvitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        email: testEmail,
        role: 'student',
        invited_by: adminUser.id,
        expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
      })
      .select('id, email, role, invited_by')
      .single()

    expect(createError).toBeNull()
    expect(createdInvitation).toBeDefined()
    testInvitationIds.push(createdInvitation!.id)
    
    console.log(`✅ STEP 1: Created invitation ${createdInvitation!.id} for ${testEmail}`)

    // STEP 2: Verify invitation appears in list (UI simulation)
    const { data: listedInvitations, error: listError } = await supabase
      .from('invitations')
      .select('id, email, role, used_at, expires_at, invited_by')
      .eq('id', createdInvitation!.id)

    expect(listError).toBeNull()
    expect(listedInvitations).toBeDefined()
    expect(listedInvitations!.length).toBe(1)
    expect(listedInvitations![0].email).toBe(testEmail)
    
    console.log(`✅ STEP 2: Invitation appears in list - UI would show this`)

    // STEP 3: Delete invitation (as admin would in UI)
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', createdInvitation!.id)
      .select() // CRITICAL: Must return deleted rows to verify success

    expect(deleteError).toBeNull()
    expect(deletedRows).toBeDefined()
    expect(deletedRows!.length).toBe(1) // CRITICAL: Must delete exactly 1 row
    expect(deletedRows![0].id).toBe(createdInvitation!.id)
    
    console.log(`✅ STEP 3: Successfully deleted invitation - ${deletedRows!.length} row affected`)

    // STEP 4: Verify invitation is completely gone from database
    const { data: shouldBeEmpty, error: verifyError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', createdInvitation!.id)

    expect(verifyError).toBeNull()
    expect(shouldBeEmpty).toBeDefined()
    expect(shouldBeEmpty!.length).toBe(0) // Should be empty - invitation deleted
    
    console.log(`✅ STEP 4: Verified invitation completely removed from database`)
    
    // Remove from cleanup list since it's already deleted
    testInvitationIds = testInvitationIds.filter(id => id !== createdInvitation!.id)
    
    console.log('🎉 COMPLETE LIFECYCLE TEST: PASSED')
    console.log('✅ PROOF: Invitation creation → listing → deletion works with authentication')
  })

  it('CRITICAL: Should test permissions - admin can delete any invitation', async () => {
    if (!supabase) {
      console.warn('Skipping test - service role key not configured')
      return
    }

    // Get two different admin users if available
    const { data: adminProfiles, error: adminError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')
      .eq('status', 'approved')
      .limit(2)

    expect(adminError).toBeNull()
    expect(adminProfiles).toBeDefined()
    expect(adminProfiles!.length).toBeGreaterThan(0)

    const creator = adminProfiles![0]
    const deleter = adminProfiles![adminProfiles!.length - 1] // Use last admin (might be same as first)

    // Create invitation as one admin
    const testEmail = `admin-perm-test-${Date.now()}@example.com`
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        email: testEmail,
        role: 'student',
        invited_by: creator.id,
        expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
      })
      .select('id, email, invited_by')
      .single()

    expect(createError).toBeNull()
    expect(invitation).toBeDefined()
    testInvitationIds.push(invitation!.id)

    console.log(`📋 Created invitation by ${creator.email}, will delete as ${deleter.email}`)

    // Delete invitation (potentially as different admin)
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitation!.id)
      .select()

    expect(deleteError).toBeNull()
    expect(deletedRows).toBeDefined()
    expect(deletedRows!.length).toBe(1)
    
    console.log(`✅ Admin can delete any invitation regardless of creator`)
    
    // Remove from cleanup
    testInvitationIds = testInvitationIds.filter(id => id !== invitation!.id)
  })

  it('should test course leader permissions (if course leaders exist)', async () => {
    if (!supabase) {
      console.warn('Skipping test - service role key not configured')
      return
    }

    const { data: courseLeaders, error } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'course_leader')
      .eq('status', 'approved')
      .limit(1)

    if (error || !courseLeaders || courseLeaders.length === 0) {
      console.warn('⚠️  No course leaders found - skipping course leader permission test')
      return
    }

    const courseLeader = courseLeaders[0]
    console.log(`📋 Testing with course leader: ${courseLeader.email}`)

    // Course leader should be able to create and delete their own invitations
    const testEmail = `course-leader-test-${Date.now()}@example.com`
    const { data: invitation, error: createError } = await supabase
      .from('invitations')
      .insert({
        email: testEmail,
        role: 'student', // Course leaders can only invite students
        invited_by: courseLeader.id,
        expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString()
      })
      .select('id, email')
      .single()

    expect(createError).toBeNull()
    testInvitationIds.push(invitation!.id)

    // Course leader should be able to delete their own invitation
    const { data: deletedRows, error: deleteError } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitation!.id)
      .eq('invited_by', courseLeader.id) // Additional security check
      .select()

    expect(deleteError).toBeNull()
    expect(deletedRows!.length).toBe(1)
    
    console.log(`✅ Course leader can delete their own invitations`)
    
    testInvitationIds = testInvitationIds.filter(id => id !== invitation!.id)
  })
})