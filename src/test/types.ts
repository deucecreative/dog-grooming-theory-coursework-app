/**
 * Test-specific type definitions for mocking
 */

import { vi } from 'vitest'
import type { User } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Mock Supabase client types
export type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
    getSession: ReturnType<typeof vi.fn>
    onAuthStateChange: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
    signInWithPassword: ReturnType<typeof vi.fn>
    signUp: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
}

// Mock query chain builder
export type MockQueryChain = {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>
  in: ReturnType<typeof vi.fn>
  order: ReturnType<typeof vi.fn>
  range: ReturnType<typeof vi.fn>
  single: ReturnType<typeof vi.fn>
  maybeSingle: ReturnType<typeof vi.fn>
  insert: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

// Mock query result
export type MockQueryResult<T = unknown> = {
  data: T | null
  error: Error | null
}

// Mock useSupabase hook return type
export type MockUseSupabaseReturn = {
  user: User | null
  profile: Database['public']['Tables']['profiles']['Row'] | null
  loading: boolean
  supabase: MockSupabaseClient
  signOut: ReturnType<typeof vi.fn>
}

// Factory function for creating mock query chains
export const createMockQueryChain = <T>(mockResult: MockQueryResult<T>): MockQueryChain => {
  const mockPromise = Promise.resolve(mockResult)
  const chain: MockQueryChain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    single: vi.fn(() => mockPromise),
    maybeSingle: vi.fn(() => mockPromise),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    delete: vi.fn(() => chain),
  }
  return chain
}