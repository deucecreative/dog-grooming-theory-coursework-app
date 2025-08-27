/**
 * Integration tests for Users API against real database schema
 * These tests validate actual database queries and relationships
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestServiceClient } from '@/test/supabase-test-client'
import type { Profile } from '@/types/database'

// Only run integration tests if we have database credentials
const shouldRunIntegrationTests = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY

describe('Users API Integration Tests', () => {
  let supabase: ReturnType<typeof createTestServiceClient>
  const testUserIds: string[] = []
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
    
    // Clean up test users
    for (const id of testUserIds) {
      await supabase
        .from('profiles')
        .delete()
        .eq('id', id)
    }
    
    // Clean up the test client
    if (supabase?.auth) {
      await supabase.auth.signOut()
    }
  })

  describe('Database Schema Validation', () => {
    it('should validate profiles table exists with correct columns', async () => {
      if (!shouldRunIntegrationTests) return

      // Test that we can query the profiles table structure
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, status, approved_by, approved_at, created_at')
        .limit(0) // Don't return any rows, just validate the query structure

      // Should not error on column selection
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should validate approved_by foreign key relationship exists', async () => {
      if (!shouldRunIntegrationTests) return

      // Test the specific query that was failing in production
      const { data, error } = await supabase
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
        .limit(1) // Only get one row for validation

      // This should work without PGRST200 foreign key relationship errors
      expect(error).toBeNull()
      expect(data).toBeDefined()
    })

    it('should validate UserStatus enum values match database', async () => {
      if (!shouldRunIntegrationTests) return

      // Test that all expected status values work
      const statusValues = ['pending', 'approved', 'rejected']
      
      for (const status of statusValues) {
        const { error } = await supabase
          .from('profiles')
          .select('id')
          .eq('status', status)
          .limit(0) // Just validate the query, don't return data

        // Should not error on any valid status value
        expect(error).toBeNull()
      }
    })

    it('should validate profiles self-referencing foreign key works', async () => {
      if (!shouldRunIntegrationTests) return

      // Test joining profiles to itself via approved_by
      const { data: _data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          approved_by,
          approver:profiles!approved_by(id, full_name)
        `)
        .not('approved_by', 'is', null)
        .limit(1)

      // Should work without relationship errors
      expect(error).toBeNull()
    })
  })

  describe('Real API Query Testing', () => {
    it('should validate user listing with actual database data', async () => {
      if (!shouldRunIntegrationTests) return

      // Test the exact query used by the API for listing users
      const { data: users, error: usersError } = await supabase
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

      expect(usersError).toBeNull()
      if (!users) throw new Error('Users should be defined after query')
      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBeGreaterThan(0)

      // Verify each user has expected structure
      users?.forEach(user => {
        expect(user.id).toBeDefined()
        expect(user.email).toBeDefined()
        expect(user.role).toMatch(/^(admin|course_leader|student)$/)
        expect(user.status).toMatch(/^(pending|approved|rejected)$/)
      })
    })

    it('should validate user status update operations', async () => {
      if (!shouldRunIntegrationTests) return

      // Find a user we can safely test updates on (preferably test data)
      const { data: existingUsers, error: findError } = await supabase
        .from('profiles')
        .select('id, status, role')
        .limit(1)

      expect(findError).toBeNull()
      expect(existingUsers).toBeDefined()
      
      if (existingUsers && existingUsers.length > 0) {
        const testUser = existingUsers[0]
        
        // Test the update query structure that the API uses
        // We'll update but immediately revert to avoid changing real data
        const originalStatus = testUser.status
        
        // First update
        const { data: updatedUser, error: updateError } = await supabase
          .from('profiles')
          .update({
            status: originalStatus === 'approved' ? 'pending' : 'approved',
            approved_by: originalStatus === 'approved' ? null : adminUser.id,
            approved_at: originalStatus === 'approved' ? null : new Date().toISOString()
          })
          .eq('id', testUser.id)
          .select('id, status, approved_by, approved_at')
          .single()

        expect(updateError).toBeNull()
        expect(updatedUser).toBeDefined()

        // Revert back to original state
        await supabase
          .from('profiles')
          .update({
            status: originalStatus,
            approved_by: originalStatus === 'approved' ? adminUser.id : null,
            approved_at: originalStatus === 'approved' ? new Date().toISOString() : null
          })
          .eq('id', testUser.id)
      }
    })
  })

  describe('API Query Validation', () => {
    it('should validate GET users query works against real schema', async () => {
      if (!shouldRunIntegrationTests) return

      // This is the exact query from the API
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(5)

      // Should execute without foreign key errors
      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
    })

    it('should validate status filtering works', async () => {
      if (!shouldRunIntegrationTests) return

      const { data, error } = await supabase
        .from('profiles')
        .select('id, status')
        .eq('status', 'pending')
        .limit(5)

      expect(error).toBeNull()
      expect(Array.isArray(data)).toBe(true)
      
      // All returned users should have pending status
      data?.forEach(user => {
        expect(user.status).toBe('pending')
      })
    })
  })

  describe('Update Operations', () => {
    it('should validate user status update query structure', async () => {
      if (!shouldRunIntegrationTests) return

      // Test the update query structure without actually updating
      // We'll create a dummy update that won't match any rows
      const { error } = await supabase
        .from('profiles')
        .update({
          status: 'approved',
          approved_by: '00000000-0000-0000-0000-000000000000', // Non-existent ID
          approved_at: new Date().toISOString()
        })
        .eq('id', '00000000-0000-0000-0000-000000000000') // Non-existent ID
        .select('id, email, full_name, role, status, approved_by, approved_at')

      // Should not error on the query structure itself
      // (will return empty data since ID doesn't exist, but that's expected)
      expect(error).toBeNull()
    })
  })
})

// Export a utility function to manually run integration tests
export async function runManualIntegrationTest() {
  if (!shouldRunIntegrationTests) {
    console.log('Cannot run integration tests - missing database credentials')
    return false
  }

  try {
    const supabase = createTestServiceClient()
    
    // Test the failing query from production
    const { data: _data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        status,
        approved_profile:profiles!approved_by(full_name, email)
      `)
      .limit(1)

    if (error) {
      console.error('Integration test failed:', error)
      return false
    }

    console.log('Integration test passed ✅')
    return true
  } catch (error) {
    console.error('Integration test error:', error)
    return false
  }
}