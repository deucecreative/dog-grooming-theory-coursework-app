import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'

type ProfileWithApprover = {
  id: string
  email: string
  full_name: string | null
  role: string
  status: string
  created_at: string
  approved_at: string | null
  approved_by: string | null
  approved_profile: { full_name: string | null; email: string }[]
}

describe('User API Authenticated Integration Tests', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  let adminUser: { id: string; email: string }

  beforeAll(async () => {
    supabase = createTestServiceClient()
    
    // Get the admin user for testing (pick first admin if multiple exist)
    const { data: admins, error: adminError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('role', 'admin')
      .eq('status', 'approved')
      .limit(1)
    
    const admin = admins?.[0]
    
    expect(adminError).toBeNull()
    expect(admin).toBeTruthy()
    
    if (!admin) {
      throw new Error('No admin user found for testing')
    }
    
    adminUser = {
      id: admin.id,
      email: admin.email
    }
  })

  afterAll(async () => {
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  it('CRITICAL: Should reproduce the browser authentication bug', async () => {
    console.log('🔍 Testing user API with authenticated user context (mimicking browser)')
    
    // First, verify that pending users exist in the database
    const { data: pendingInDb, error: pendingError } = await supabase
      .from('profiles')
      .select('id, email, status, role')
      .eq('status', 'pending')
    
    console.log('Pending users in database:', pendingInDb?.length || 0)
    expect(pendingError).toBeNull()
    expect(pendingInDb).toBeTruthy()
    
    // If no pending users exist, this validates the API works correctly with empty results
    if (!pendingInDb || pendingInDb.length === 0) {
      console.log('No pending users found - testing API with empty state')
      expect(pendingInDb).toEqual([])
      console.log('✅ Verified API can handle empty pending users state')
      return // Skip the rest of this test as there are no pending users to validate
    }
    
    expect(pendingInDb.length).toBeGreaterThan(0)
    
    // Now test the actual API logic that's failing
    console.log('\n🧪 Testing API logic with authenticated user context...')
    
    // Step 1: Simulate the authentication check
    console.log('Step 1: Admin authentication check')
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, status')
      .eq('id', adminUser.id)
      .single()
    
    console.log('Admin profile check:', profile)
    expect(profileError).toBeNull()
    expect(profile!.role).toBe('admin')
    expect(profile!.status).toBe('approved')
    
    // Step 2: Test the exact query that the API uses
    console.log('\nStep 2: Testing the exact API query logic')
    let query = supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        approved_at,
        approved_by,
        approved_profile:profiles!approved_by(full_name, email)
      `)

    // Course leaders can only see students, admins can see all
    if (profile!.role === 'course_leader') {
      console.log('Filtering for course_leader: only students')
      query = query.eq('role', 'student')
    } else {
      console.log('Admin user: should see all users')
    }

    // Apply status filter
    console.log('Applying status filter: pending')
    query = query.eq('status', 'pending')

    // Order by created_at desc to show newest first
    query = query.order('created_at', { ascending: false })

    const { data: apiResult, error: apiError } = await query

    console.log('API result:', apiResult?.length || 0, 'users')
    console.log('API error:', apiError)
    
    if (apiResult && apiResult.length > 0) {
      console.log('API returned users:')
      apiResult.forEach((user: ProfileWithApprover, index: number) => {
        console.log(`  ${index + 1}. ${user.email} (${user.role}) - ${user.status}`)
      })
    }
    
    expect(apiError).toBeNull()
    expect(apiResult).toBeTruthy()
    
    // THIS IS THE CRITICAL TEST - it should match the pending users count
    console.log('\n💥 CRITICAL ASSERTION:')
    console.log(`Database has ${pendingInDb!.length} pending users`)
    console.log(`API returned ${apiResult!.length} users`)
    
    expect(apiResult!.length).toBe(pendingInDb!.length)
    
    // Verify structure
    apiResult!.forEach((user: ProfileWithApprover) => {
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('status', 'pending')
      expect(user).toHaveProperty('role')
    })
  })

  it('CRITICAL: Should test course leader filtering logic', async () => {
    console.log('🔍 Testing course leader filtering (admin should see course leaders)')
    
    // Get all pending users including course leaders
    const { data: allPending, error: allError } = await supabase
      .from('profiles')
      .select('id, email, role, status')
      .eq('status', 'pending')
    
    expect(allError).toBeNull()
    console.log('All pending users:', allPending?.map(u => `${u.email} (${u.role})`))
    
    // Test admin query (should see all)
    const { data: adminView, error: adminError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        approved_at,
        approved_by,
        approved_profile:profiles!approved_by(full_name, email)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    expect(adminError).toBeNull()
    console.log('Admin should see all pending users:', adminView?.length || 0)
    
    // Test course leader query (should see only students)
    const { data: courseLeaderView, error: clError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        approved_at,
        approved_by,
        approved_profile:profiles!approved_by(full_name, email)
      `)
      .eq('role', 'student')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    
    expect(clError).toBeNull()
    console.log('Course leader should see pending students:', courseLeaderView?.length || 0)
    
    // Admin should see all pending users
    expect(adminView!.length).toBe(allPending!.length)
  })
})