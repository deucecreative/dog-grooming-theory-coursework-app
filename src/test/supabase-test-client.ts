import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Supabase Test Client Factory
 * 
 * Manages Supabase client creation for tests to avoid multiple instance warnings
 * and ensure proper test isolation.
 */

let testClientCounter = 0

export interface TestSupabaseClient {
  serviceClient: ReturnType<typeof createClient<Database>>
  anonClient: ReturnType<typeof createClient<Database>>
  cleanup: () => Promise<void>
}

export function createTestSupabaseClients(): TestSupabaseClient {
  // Generate unique storage keys for this test run with high-resolution timestamp
  const timestamp = Date.now()
  const counter = ++testClientCounter
  const performanceTime = performance.now()
  const randomSuffix = Math.random().toString(36).substring(2, 15)
  const processId = process.pid
  const stackTrace = new Error().stack
  const testFileHash = stackTrace ? stackTrace.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '') : 'unknown'
  // Add microsecond precision to ensure absolute uniqueness
  const microTime = process.hrtime.bigint().toString()
  const uniqueId = `${timestamp}-${counter}-${performanceTime}-${processId}-${testFileHash}-${microTime}-${randomSuffix}`

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  }

  // Service role client (admin access)
  const serviceClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: `test-service-${uniqueId}`,
        flowType: 'pkce'
      }
    }
  )

  // Anonymous client (no authentication)
  const anonClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: `test-anon-${uniqueId}`,
        flowType: 'pkce'
      }
    }
  )

  const cleanup = async () => {
    try {
      // Sign out and cleanup both clients
      await Promise.allSettled([
        serviceClient.auth.signOut(),
        anonClient.auth.signOut()
      ])
    } catch (error) {
      // Ignore cleanup errors in tests
      console.warn('Test client cleanup warning:', error)
    }
  }

  return {
    serviceClient,
    anonClient,
    cleanup
  }
}

/**
 * Utility for creating a single service role client
 * Use this when you only need admin access
 */
export function createTestServiceClient() {
  const timestamp = Date.now()
  const counter = ++testClientCounter
  const processId = process.pid
  const stackTrace = new Error().stack
  const testFileHash = stackTrace ? stackTrace.substring(0, 50).replace(/[^a-zA-Z0-9]/g, '') : 'unknown'
  const uniqueId = `${timestamp}-${counter}-${processId}-${testFileHash}-${Math.random().toString(36).substring(7)}`

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required environment variables')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        storageKey: `test-service-single-${uniqueId}`,
        flowType: 'pkce'
      }
    }
  )
}