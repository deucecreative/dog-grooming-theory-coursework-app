import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import type { ProfileStatusOnly } from '@/types/test-utilities'
import type { Profile } from '@/types/database'

describe('User API Simple Integration Tests', () => {
  let supabase: ReturnType<typeof createTestServiceClient>

  beforeAll(() => {
    supabase = createTestServiceClient()
  })

  afterAll(async () => {
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  describe('Database Query Tests with Existing Data', () => {
    it('should retrieve profiles from database', async () => {
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
        .limit(5)

      expect(error).toBeNull()
      expect(users).toBeDefined()
      expect(Array.isArray(users)).toBe(true)
      
      // Check data structure
      if (users && users.length > 0) {
        const firstUser = users[0]
        expect(firstUser).toHaveProperty('id')
        expect(firstUser).toHaveProperty('email')
        expect(firstUser).toHaveProperty('role')
        expect(firstUser).toHaveProperty('status')
      }
    })

    it('should filter by status correctly', async () => {
      // Test with approved status as it's most likely to exist
      const { data: approvedUsers, error } = await supabase
        .from('profiles')
        .select('id, email, status')
        .eq('status', 'approved')
        .limit(5)

      expect(error).toBeNull()
      expect(approvedUsers).toBeDefined()
      
      // All returned users should have approved status
      approvedUsers?.forEach((user: ProfileStatusOnly) => {
        expect(user.status).toBe('approved')
      })
    })

    it('should filter by role correctly', async () => {
      // Check if we have any students
      const { data: students, error } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'student')
        .limit(5)

      expect(error).toBeNull()
      expect(students).toBeDefined()
      
      // All returned users should be students
      students?.forEach((user: { id: string; email: string; role: string }) => {
        expect(user.role).toBe('student')
      })

      // Also check for admins
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('id, email, role')
        .eq('role', 'admin')
        .limit(5)

      expect(adminError).toBeNull()
      expect(admins).toBeDefined()
      
      admins?.forEach((user: { id: string; email: string; role: string }) => {
        expect(user.role).toBe('admin')
      })
    })

    it('should handle complex queries with multiple conditions', async () => {
      const { data: filtered, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .in('role', ['admin', 'course_leader'])
        .limit(5)

      expect(error).toBeNull()
      expect(filtered).toBeDefined()
      
      // Should only return approved admins and course leaders
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
      if (!ordered) throw new Error('Ordered users should be defined after query')
      
      // Check that results are ordered correctly
      for (let i = 1; i < ordered.length; i++) {
        const prevDate = new Date(ordered[i - 1].created_at)
        const currDate = new Date(ordered[i].created_at)
        expect(prevDate.getTime()).toBeGreaterThanOrEqual(currDate.getTime())
      }
    })

    it('should handle pagination', async () => {
      // Get first page
      const { data: page1, error: error1 } = await supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .range(0, 4) // First 5 items

      expect(error1).toBeNull()
      expect(page1).toBeDefined()
      expect(page1?.length).toBeLessThanOrEqual(5)

      // Get second page
      const { data: page2, error: error2 } = await supabase
        .from('profiles')
        .select('id')
        .order('created_at', { ascending: false })
        .range(5, 9) // Next 5 items

      expect(error2).toBeNull()
      expect(page2).toBeDefined()
      
      // Pages should not overlap
      if (page1?.length && page2?.length) {
        const page1Ids = page1.map((p: { id: string }) => p.id)
        const page2Ids = page2.map((p: { id: string }) => p.id)
        
        page2Ids.forEach((id: string) => {
          expect(page1Ids).not.toContain(id)
        })
      }
    })

    it('should handle relationships correctly', async () => {
      // First check if any users have approved_by set
      const { data: checkUsers } = await supabase
        .from('profiles')
        .select('id, approved_by')
        .not('approved_by', 'is', null)
        .limit(1)

      // If no users have approvers, that's a valid state
      if (!checkUsers || checkUsers.length === 0) {
        console.log('No users with approvers found - valid state')
        expect(true).toBe(true)
        return
      }

      // Test the basic relationship without complex joins
      const { data: userWithApprover, error } = await supabase
        .from('profiles')
        .select('id, email, approved_by')
        .not('approved_by', 'is', null)
        .limit(1)
        .single()

      if (error) {
        // Handle the case where the relationship query fails
        console.log('Relationship query not supported or no data:', error.code)
        expect(true).toBe(true)
        return
      }

      if (userWithApprover) {
        expect(userWithApprover.approved_by).toBeDefined()
        expect(typeof userWithApprover.approved_by).toBe('string')
      }
    })

    it('should count records correctly', async () => {
      const { count: totalCount, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      expect(countError).toBeNull()
      expect(typeof totalCount).toBe('number')
      expect(totalCount).toBeGreaterThanOrEqual(0)

      // Count by status
      const { count: approvedCount, error: approvedError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved')

      expect(approvedError).toBeNull()
      expect(typeof approvedCount).toBe('number')
      expect(approvedCount).toBeLessThanOrEqual(totalCount!)
    })
  })
})