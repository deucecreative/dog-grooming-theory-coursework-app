/**
 * Type utilities for test files to maintain type safety without code duplication
 */

import { vi } from 'vitest'
import type { Profile, Invitation, UserRole, UserStatus } from './database'
import type { User, PostgrestError } from '@supabase/supabase-js'

// Common partial Profile types used in tests
export type ProfileBasic = Pick<Profile, 'id' | 'email' | 'role' | 'status'>
export type ProfileWithApprover = Pick<Profile, 'id' | 'email' | 'approved_by'>
export type ProfileStatusOnly = Pick<Profile, 'id' | 'email' | 'status'>
export type InvitationBasic = Pick<Invitation, 'id' | 'email'>

// Common partial types for test mocks
export type UserBasic = Pick<User, 'id' | 'email'>
export type UserMock = Pick<User, 'id' | 'email' | 'app_metadata' | 'user_metadata' | 'aud' | 'created_at'>
export type MockSupabaseAuth = {
  getUser: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}
export type MockSupabaseQuery = {
  select: ReturnType<typeof vi.fn>
  eq: ReturnType<typeof vi.fn>  
  single: ReturnType<typeof vi.fn>
}
export type MockRouter = {
  push: ReturnType<typeof vi.fn>
  replace: ReturnType<typeof vi.fn>
  refresh: ReturnType<typeof vi.fn>
  back: ReturnType<typeof vi.fn>
  forward: ReturnType<typeof vi.fn>
  prefetch: ReturnType<typeof vi.fn>
}

// Legacy alias for compatibility
export type BasicProfile = ProfileBasic

export type ProfileWithApproverRelation = Profile & {
  approved_profile: { full_name: string | null; email: string }[]
}

// Test-specific mock types - only what we actually mock
export type MockSupabaseClient = {
  auth: {
    getUser: ReturnType<typeof vi.fn>
    signOut: ReturnType<typeof vi.fn>
    onAuthStateChange: ReturnType<typeof vi.fn>
    getSession: ReturnType<typeof vi.fn>
  }
  from: ReturnType<typeof vi.fn>
  supabaseUrl: string
  supabaseKey: string
  realtimeUrl: string
  authUrl: string
}

// Simple test mock that focuses only on what our tests actually use
// This is a pragmatic approach - we only mock what we need for tests
// The type assertion is handled internally to avoid repetition in test files
export const createMockSupabaseClient = () => ({
  auth: {
    getUser: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn(),
    getSession: vi.fn()
  },
  from: vi.fn(),
} as unknown as ReturnType<typeof import('@/lib/supabase/client').createClient>)

// Common test data factories
export const createBasicProfile = (overrides: Partial<BasicProfile> = {}): BasicProfile => ({
  id: 'test-id',
  email: 'test@example.com', 
  role: 'student' as UserRole,
  status: 'pending' as UserStatus,
  ...overrides
})

export const createFullProfile = (overrides: Partial<Profile> = {}): Profile => ({
  id: 'test-id',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'student' as UserRole,
  status: 'pending' as UserStatus,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
})

export const createMockUser = (overrides: Partial<UserMock> = {}): UserMock => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  ...overrides
})

// Session mock type for test consistency
export type SessionMock = {
  user: UserMock
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}

export const createMockSession = (overrides: Partial<SessionMock> = {}): SessionMock => ({
  user: createMockUser(),
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  ...overrides
})

// Test assertion utilities for null safety
export const assertDefined = <T>(value: T | null | undefined, message: string): asserts value is T => {
  if (value == null) {
    throw new Error(message)
  }
}

export const assertNonNull = <T>(value: T | null, message: string): asserts value is T => {
  if (value === null) {
    throw new Error(message)
  }
}

// Mock utilities for fetch - proper typing without 'any'
export const createMockFetch = (mockResponse: Record<string, unknown>): typeof fetch => {
  const mockFn = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(mockResponse),
    text: () => Promise.resolve(JSON.stringify(mockResponse)),
    status: 200,
    statusText: 'OK',
    headers: new Headers(),
  } as Response)
  
  return mockFn as unknown as typeof fetch
}

// Helper to create proper Response objects for mocks
export const createMockResponse = (data: Record<string, unknown>): Response => ({
  ok: true,
  json: () => Promise.resolve(data),
  text: () => Promise.resolve(JSON.stringify(data)),
  status: 200,
  statusText: 'OK',
  headers: new Headers()
} as Response)

// Helper to create proper PostgrestError objects for mocks
export const createMockPostgrestError = (message: string): PostgrestError => ({
  message,
  details: '',
  hint: '',
  code: 'PGRST000'
} as PostgrestError)