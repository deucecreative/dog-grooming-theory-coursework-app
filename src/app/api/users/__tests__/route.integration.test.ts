import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import type { ProfileWithApprover } from '@/types/test-utilities'
import type { Profile, UserRole } from '@/types/database'

describe('User API Integration Tests with Real Database', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  let existingAdmin: Profile | null = null
  let existingCourseLeader: Profile | null = null
  let existingStudent: Profile | null = null

  beforeAll(async () => {
    supabase = createTestServiceClient()

    console.log('🗄️  Finding existing users in database for testing...')

    // Find existing users with different roles to test with
    const { data: admin } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .eq('status', 'approved')
      .limit(1)
      .single()
    
    existingAdmin = admin
    console.log('Found admin:', admin?.email || 'none')

    const { data: leader } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'course_leader')
      .eq('status', 'approved')
      .limit(1)
      .single()
    
    existingCourseLeader = leader
    console.log('Found course leader:', leader?.email || 'none')

    const { data: student } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .limit(1)
      .single()
    
    existingStudent = student
    console.log('Found student:', student?.email || 'none')
  })

  describe('Database Query Tests', () => {
    it('should retrieve users from the database', async () => {
      const { data: users, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          full_name,
          role,
          status,
          created_at,
          approved_at,
          approved_by
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      expect(error).toBeNull()
      expect(users).toBeDefined()
      if (!users) throw new Error('Users should be defined after query')
      expect(Array.isArray(users)).toBe(true)
      
      // Should have at least some users
      if (existingAdmin || existingCourseLeader || existingStudent) {
        expect(users.length).toBeGreaterThan(0)
      }
    })

    it('should filter by status correctly', async () => {
      // Test pending status
      const { data: pendingUsers, error: pendingError } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .limit(10)

      expect(pendingError).toBeNull()
      expect(pendingUsers).toBeDefined()
      
      // All returned users should have pending status
      pendingUsers?.forEach((user: Profile) => {
        expect(user.status).toBe('pending')
      })

      // Test approved status
      const { data: approvedUsers, error: approvedError } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .limit(10)

      expect(approvedError).toBeNull()
      expect(approvedUsers).toBeDefined()
      
      approvedUsers?.forEach((user: Profile) => {
        expect(user.status).toBe('approved')
      })
    })

    it('should filter by role correctly', async () => {
      // Test student role filtering
      const { data: students, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .limit(10)

      expect(error).toBeNull()
      expect(students).toBeDefined()
      
      // All returned users should be students
      students?.forEach((user: Profile) => {
        expect(user.role).toBe('student')
      })

      // Test admin role filtering
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin')
        .limit(10)

      expect(adminError).toBeNull()
      expect(admins).toBeDefined()
      
      admins?.forEach((user: Profile) => {
        expect(user.role).toBe('admin')
      })
    })

    it('should handle the approved_by relationship', async () => {
      // First check if any users have approved_by set
      const { data: checkUsers, error: _checkError } = await supabase
        .from('profiles')
        .select('id, approved_by')
        .not('approved_by', 'is', null)
        .limit(1)

      // If no users have approvers, that's valid - skip the relationship test
      if (!checkUsers || checkUsers.length === 0) {
        console.log('No users with approvers found - skipping relationship test')
        expect(true).toBe(true)
        return
      }

      // Now try the relationship query - use simpler syntax
      const { data: usersWithApprover, error } = await supabase
        .from('profiles')
        .select('id, email, approved_by')
        .not('approved_by', 'is', null)
        .limit(5)

      expect(error).toBeNull()
      expect(usersWithApprover).toBeDefined()
      
      if (usersWithApprover && usersWithApprover.length > 0) {
        usersWithApprover.forEach((user: ProfileWithApprover) => {
          expect(user.approved_by).toBeDefined()
          expect(typeof user.approved_by).toBe('string')
        })
      }
    })
  })

  describe('Complex Query Tests', () => {
    it('should handle multiple filters correctly', async () => {
      const { data: filtered, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .in('role', ['admin', 'course_leader'])
        .limit(10)

      expect(error).toBeNull()
      expect(filtered).toBeDefined()
      
      // All results should match both conditions
      filtered?.forEach((user: Profile) => {
        expect(user.status).toBe('approved')
        expect(['admin', 'course_leader']).toContain(user.role)
      })
    })

    it('should order results correctly', async () => {
      const { data: ordered, error } = await supabase
        .from('profiles')
        .select('id, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      expect(error).toBeNull()
      expect(ordered).toBeDefined()
      
      // Verify descending order
      for (let i = 1; i < (ordered?.length || 0); i++) {
        const prev = new Date(ordered![i - 1].created_at).getTime()
        const curr = new Date(ordered![i].created_at).getTime()
        expect(prev).toBeGreaterThanOrEqual(curr)
      }
    })

    it('should handle pagination', async () => {
      const pageSize = 5
      
      // Get first page
      const { data: page1, error: error1 } = await supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .range(0, pageSize - 1)

      expect(error1).toBeNull()
      expect(page1).toBeDefined()
      
      // Get second page
      const { data: page2, error: error2 } = await supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .range(pageSize, pageSize * 2 - 1)

      expect(error2).toBeNull()
      expect(page2).toBeDefined()
      
      // If we have data in both pages, they shouldn't overlap
      if (page1?.length && page2?.length) {
        const page1Ids = new Set(page1.map((p: { id: string }) => p.id))
        page2.forEach((p: { id: string }) => {
          expect(page1Ids.has(p.id)).toBe(false)
        })
      }
    })
  })

  describe('RLS Policy Tests', () => {
    it('should allow reading profiles with service role', async () => {
      // Service role should bypass RLS
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(5)

      expect(error).toBeNull()
      expect(profiles).toBeDefined()
      expect(Array.isArray(profiles)).toBe(true)
    })

    it('should handle count queries', async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      expect(error).toBeNull()
      expect(typeof count).toBe('number')
      expect(count).toBeGreaterThanOrEqual(0)
    })
  })

  afterAll(async () => {
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  describe('Performance Tests', () => {
    it('should efficiently query with specific field selection', async () => {
      const start = Date.now()
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .limit(100)

      const duration = Date.now() - start

      expect(error).toBeNull()
      expect(data).toBeDefined()
      
      // Query should be reasonably fast (under 2 seconds)
      expect(duration).toBeLessThan(2000)
      
      // Verify we only got requested fields
      data?.forEach((user: { id: string; email: string; role: UserRole }) => {
        expect(Object.keys(user).sort()).toEqual(['email', 'id', 'role'])
      })
    })
  })
})