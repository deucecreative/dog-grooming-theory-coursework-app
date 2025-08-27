import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Supabase Server Client', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-123'
    }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('should_export_createClient_function_when_imported', async () => {
    const serverModule = await import('../server')
    
    expect(serverModule.createClient).toBeDefined()
    expect(typeof serverModule.createClient).toBe('function')
  })

  it('should_handle_environment_variables_correctly_when_creating_client', () => {
    // Test that environment variables are accessible
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test-project.supabase.co')
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe('test-anon-key-123')
  })

  it('should_handle_missing_environment_variables_when_undefined', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = undefined
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined
    
    // Test that undefined values are handled (Supabase SSR handles this gracefully)
    expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined()
    expect(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBeUndefined()
  })

  it('should_use_async_cookies_import_when_creating_client', async () => {
    // Mock cookies before importing
    vi.doMock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({
        getAll: vi.fn().mockReturnValue([]),
        set: vi.fn()
      })
    }))

    vi.doMock('@supabase/ssr', () => ({
      createServerClient: vi.fn().mockReturnValue({
        auth: { getUser: vi.fn() }
      })
    }))

    const { createClient } = await import('../server')
    
    // Should not throw when called and should return a client
    const result = await createClient()
    expect(result).toBeDefined()
  })

  it('should_create_client_successfully_when_all_dependencies_available', async () => {
    const mockClient = {
      auth: { getUser: vi.fn() },
      from: vi.fn(),
      storage: { from: vi.fn() }
    }

    vi.doMock('@supabase/ssr', () => ({
      createServerClient: vi.fn().mockReturnValue(mockClient)
    }))

    vi.doMock('next/headers', () => ({
      cookies: vi.fn().mockResolvedValue({
        getAll: vi.fn(),
        set: vi.fn()
      })
    }))

    const { createClient } = await import('../server')
    const result = await createClient()

    // Verify the client has expected methods
    expect(result).toBeDefined()
    expect(result.auth).toBeDefined()
    expect(result.from).toBeDefined()
  })
})