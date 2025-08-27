/**
 * Standardized Test Helpers
 * 
 * Provides common utilities and patterns for maintaining test quality
 * and consistency across the test suite.
 */

import { expect } from 'vitest'

// Type definitions for test helpers
export interface TestUser {
  id: string
  email: string
  role: 'admin' | 'course_leader' | 'student'
  status: 'pending' | 'approved' | 'rejected'
}

export interface TestInvitation {
  id: string
  email: string
  role: 'admin' | 'course_leader' | 'student'
  token: string
  invited_by: string
  used_at?: string | null
  expires_at: string
}

// Authentication response types
export interface AuthResponse {
  data: TestUser | null
  error: { message: string } | null
}

// Generic API response type
export interface ApiResponse<T = unknown> {
  data: T | null
  error: { message: string } | null
}

// Database operation response type
export interface DatabaseResponse<T = unknown> {
  data: T
  error: { message: string } | null
}

/**
 * Standardized assertion helpers for common test patterns
 */
export const TestAssertions = {
  /**
   * Assert that a response indicates successful authentication
   */
  expectAuthSuccess: (response: AuthResponse) => {
    expect(response).toBeDefined()
    expect(response.error).toBeNull()
    expect(response.data).toBeDefined()
  },

  /**
   * Assert that a response indicates authentication failure
   */
  expectAuthFailure: (response: AuthResponse, expectedErrorMessage?: string) => {
    expect(response.error).toBeDefined()
    expect(response.data).toBeNull()
    if (expectedErrorMessage && response.error) {
      expect(response.error.message).toContain(expectedErrorMessage)
    }
  },

  /**
   * Assert that an invitation has valid structure
   */
  expectValidInvitation: (invitation: TestInvitation) => {
    expect(invitation).toBeDefined()
    expect(invitation.id).toBeDefined()
    expect(invitation.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    expect(['admin', 'course_leader', 'student']).toContain(invitation.role)
    expect(invitation.token).toBeDefined()
    expect(invitation.token).toMatch(/^[A-Za-z0-9_-]+$/) // URL-safe token
  },

  /**
   * Assert that a user profile has valid structure
   */
  expectValidUserProfile: (profile: TestUser) => {
    expect(profile).toBeDefined()
    expect(profile.id).toBeDefined()
    expect(profile.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    expect(['admin', 'course_leader', 'student']).toContain(profile.role)
    expect(['pending', 'approved', 'rejected']).toContain(profile.status)
  },

  /**
   * Assert that RLS (Row Level Security) is properly blocking access
   */
  expectRLSBlocked: (response: ApiResponse) => {
    expect(response.error).toBeDefined()
    if (response.error) {
      const errorMessage = response.error.message.toLowerCase()
      const isBlocked = errorMessage.includes('row-level security') || 
                       errorMessage.includes('insufficient privilege') ||
                       errorMessage.includes('permission denied')
      expect(isBlocked).toBe(true)
    }
  },

  /**
   * Assert that a database operation was successful
   */
  expectDatabaseSuccess: <T>(response: DatabaseResponse<T>, expectedRowCount?: number) => {
    expect(response.error).toBeNull()
    expect(response.data).toBeDefined()
    if (expectedRowCount !== undefined) {
      if (Array.isArray(response.data)) {
        expect(response.data.length).toBe(expectedRowCount)
      } else {
        expect(expectedRowCount).toBe(1) // Single row operations
      }
    }
  }
}

/**
 * Test data generators for consistent test data
 */
export const TestDataGenerators = {
  /**
   * Generate a unique test email
   */
  generateTestEmail: (prefix: string = 'test'): string => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(7)
    return `${prefix}-${timestamp}-${random}@example.com`
  },

  /**
   * Generate test user data
   */
  generateTestUser: (overrides: Partial<TestUser> = {}): Omit<TestUser, 'id'> => ({
    email: TestDataGenerators.generateTestEmail(),
    role: 'student',
    status: 'pending',
    ...overrides
  }),

  /**
   * Generate test invitation data
   */
  generateTestInvitation: (invitedBy: string, overrides: Partial<TestInvitation> = {}): Omit<TestInvitation, 'id' | 'token'> => ({
    email: TestDataGenerators.generateTestEmail(),
    role: 'student',
    invited_by: invitedBy,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    ...overrides
  })
}

/**
 * Common test patterns and utilities
 */
export const TestPatterns = {
  /**
   * Standard timeout for async operations in tests
   */
  TIMEOUTS: {
    UNIT: 5000,      // 5 seconds for unit tests
    INTEGRATION: 10000,  // 10 seconds for integration tests
    E2E: 30000       // 30 seconds for e2e tests
  },

  /**
   * Wait for a condition to be true with timeout
   */
  waitFor: async (condition: () => boolean | Promise<boolean>, timeoutMs: number = 5000): Promise<void> => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      if (await condition()) {
        return
      }
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    throw new Error(`Condition not met within ${timeoutMs}ms`)
  },

  /**
   * Retry an operation with exponential backoff
   */
  retry: async <T>(
    operation: () => Promise<T>, 
    maxAttempts: number = 3, 
    baseDelayMs: number = 100
  ): Promise<T> => {
    let lastError: Error
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        if (attempt === maxAttempts) break
        
        const delay = baseDelayMs * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    throw lastError!
  }
}

/**
 * Test environment utilities
 */
export const TestEnvironment = {
  /**
   * Check if integration tests should run
   */
  shouldRunIntegrationTests: (): boolean => {
    return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
  },

  /**
   * Check if E2E tests should run
   */
  shouldRunE2ETests: (): boolean => {
    return process.env.RUN_E2E_TESTS === 'true'
  },

  /**
   * Skip test if conditions not met
   */
  skipIfNoDatabase: () => {
    if (!TestEnvironment.shouldRunIntegrationTests()) {
      console.log('Skipping integration test - no database credentials')
      return true
    }
    return false
  }
}

/**
 * Mock helpers for consistent mocking patterns
 */
export const MockHelpers = {
  /**
   * Create a mock Supabase response
   */
  createMockSupabaseResponse: <T>(data: T, error: { message: string } | null = null) => ({
    data,
    error
  }),

  /**
   * Create a mock authentication user
   */
  createMockAuthUser: (id: string, email: string) => ({
    id,
    email,
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }),

  /**
   * Create a mock Next.js request
   */
  createMockRequest: (url: string, options: RequestInit = {}) => {
    return new Request(url, {
      method: 'GET',
      ...options
    })
  }
}