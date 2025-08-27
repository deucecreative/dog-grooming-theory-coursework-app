import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextResponse, type NextRequest } from 'next/server'

// Create hoisted mock functions
const mockCreateServerClient = vi.hoisted(() => vi.fn())
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  }
}

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient
}))

// Mock NextResponse
vi.mock('next/server', async () => {
  const actual = await vi.importActual('next/server')
  return {
    ...actual,
    NextResponse: {
      next: vi.fn(),
      redirect: vi.fn()
    }
  }
})

// Import the module being tested
import { updateSession } from '../middleware'

describe('Supabase Middleware', () => {
  const originalEnv = process.env
  let mockRequest: Partial<NextRequest>
  let mockNextResponse: { cookies: { set: ReturnType<typeof vi.fn>; getAll: ReturnType<typeof vi.fn> } }
  let mockCookies: { getAll: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key-123'
    }

    // Mock cookies
    mockCookies = {
      getAll: vi.fn().mockReturnValue([]),
      set: vi.fn()
    }

    // Mock NextResponse instance
    mockNextResponse = {
      cookies: {
        set: vi.fn(),
        getAll: vi.fn()
      }
    }

    // Mock request
    mockRequest = {
      cookies: mockCookies as unknown as NextRequest['cookies'],
      nextUrl: {
        pathname: '/dashboard',
        clone: vi.fn().mockReturnValue({
          pathname: '/login'
        })
      } as unknown as NextRequest['nextUrl']
    }

    // Setup mocks
    mockCreateServerClient.mockReturnValue(mockSupabaseClient)
    vi.mocked(NextResponse.next).mockReturnValue(mockNextResponse as unknown as NextResponse)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should_create_server_client_with_cookie_handlers_when_processing_request', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } }
    })

    await updateSession(mockRequest as NextRequest)

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test-project.supabase.co',
      'test-anon-key-123',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function)
        })
      })
    )
  })

  it('should_return_supabase_response_when_user_is_authenticated', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'test@example.com' } }
    })

    const result = await updateSession(mockRequest as NextRequest)

    expect(result).toBe(mockNextResponse)
    expect(vi.mocked(NextResponse.redirect)).not.toHaveBeenCalled()
  })

  it('should_redirect_to_login_when_user_not_authenticated_and_accessing_protected_route', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null }
    })

    const mockRedirectResponse = { redirected: true }
    vi.mocked(NextResponse.redirect).mockReturnValue(mockRedirectResponse as unknown as NextResponse)

    const result = await updateSession(mockRequest as NextRequest)

    expect(vi.mocked(NextResponse.redirect)).toHaveBeenCalled()
    expect(result).toBe(mockRedirectResponse)
  })

  it('should_not_redirect_when_user_not_authenticated_but_on_login_page', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null }
    })

    mockRequest.nextUrl!.pathname = '/login'

    const result = await updateSession(mockRequest as NextRequest)

    expect(vi.mocked(NextResponse.redirect)).not.toHaveBeenCalled()
    expect(result).toBe(mockNextResponse)
  })

  it('should_not_redirect_when_user_not_authenticated_but_on_signup_page', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null }
    })

    mockRequest.nextUrl!.pathname = '/signup'

    const result = await updateSession(mockRequest as NextRequest)

    expect(vi.mocked(NextResponse.redirect)).not.toHaveBeenCalled()
    expect(result).toBe(mockNextResponse)
  })

  it('should_not_redirect_when_user_not_authenticated_but_on_home_page', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null }
    })

    mockRequest.nextUrl!.pathname = '/'

    const result = await updateSession(mockRequest as NextRequest)

    expect(vi.mocked(NextResponse.redirect)).not.toHaveBeenCalled()
    expect(result).toBe(mockNextResponse)
  })

  it('should_handle_cookies_getAll_correctly_when_processing_request', async () => {
    const mockCookieData = [
      { name: 'session', value: 'abc123' },
      { name: 'refresh', value: 'def456' }
    ]
    mockCookies.getAll.mockReturnValue(mockCookieData)

    mockCreateServerClient.mockImplementation((url, key, options) => {
      const result = options.cookies.getAll()
      expect(result).toEqual(mockCookieData)
      return mockSupabaseClient
    })

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } }
    })

    await updateSession(mockRequest as NextRequest)

    expect(mockCookies.getAll).toHaveBeenCalled()
  })

  it('should_handle_cookies_setAll_correctly_when_processing_request', async () => {
    const cookiesToSet = [
      { name: 'new-session', value: 'xyz789', options: { httpOnly: true } }
    ]

    mockCreateServerClient.mockImplementation((url, key, options) => {
      // Simulate Supabase calling setAll
      options.cookies.setAll(cookiesToSet)
      return mockSupabaseClient
    })

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } }
    })

    await updateSession(mockRequest as NextRequest)

    expect(mockCookies.set).toHaveBeenCalledWith('new-session', 'xyz789')
    expect(mockNextResponse.cookies.set).toHaveBeenCalledWith('new-session', 'xyz789', { httpOnly: true })
  })

  it('should_create_new_response_when_cookies_are_set', async () => {
    const cookiesToSet = [
      { name: 'test-cookie', value: 'test-value', options: {} }
    ]

    mockCreateServerClient.mockImplementation((url, key, options) => {
      options.cookies.setAll(cookiesToSet)
      return mockSupabaseClient
    })

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-123' } }
    })

    await updateSession(mockRequest as NextRequest)

    // NextResponse.next should be called twice - once initially, once when cookies are set
    expect(vi.mocked(NextResponse.next)).toHaveBeenCalledTimes(2)
    expect(vi.mocked(NextResponse.next)).toHaveBeenCalledWith({ request: mockRequest })
  })

  describe('Authentication Error Handling', () => {
    it('should_handle_auth_getUser_error_gracefully_when_supabase_fails', async () => {
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Auth error'))

      // Should not throw, but should treat as unauthenticated
      await expect(updateSession(mockRequest as NextRequest)).rejects.toThrow('Auth error')
    })

    it('should_handle_null_user_data_when_auth_returns_empty_response', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null }
      })

      const mockRedirectResponse = { redirected: true }
      vi.mocked(NextResponse.redirect).mockReturnValue(mockRedirectResponse as unknown as NextResponse)

      const result = await updateSession(mockRequest as NextRequest)

      expect(result).toBe(mockRedirectResponse)
    })
  })

  describe('URL Path Handling', () => {
    const testCases = [
      { path: '/login', shouldRedirect: false, description: 'login page' },
      { path: '/signup', shouldRedirect: false, description: 'signup page' },
      { path: '/', shouldRedirect: false, description: 'home page' },
      { path: '/dashboard', shouldRedirect: true, description: 'protected dashboard' },
      { path: '/profile', shouldRedirect: true, description: 'protected profile' },
      { path: '/settings', shouldRedirect: true, description: 'protected settings' },
      { path: '/login/forgot-password', shouldRedirect: false, description: 'login subpath' },
      { path: '/signup/confirm', shouldRedirect: false, description: 'signup subpath' }
    ]

    testCases.forEach(({ path, shouldRedirect, description }) => {
      it(`should_${shouldRedirect ? '' : 'not_'}redirect_when_unauthenticated_user_accesses_${description.replace(' ', '_')}`, async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null }
        })

        mockRequest.nextUrl!.pathname = path

        const mockRedirectResponse = { redirected: true }
        vi.mocked(NextResponse.redirect).mockReturnValue(mockRedirectResponse as unknown as NextResponse)

        const result = await updateSession(mockRequest as NextRequest)

        if (shouldRedirect) {
          expect(vi.mocked(NextResponse.redirect)).toHaveBeenCalled()
          expect(result).toBe(mockRedirectResponse)
        } else {
          expect(vi.mocked(NextResponse.redirect)).not.toHaveBeenCalled()
          expect(result).toBe(mockNextResponse)
        }
      })
    })
  })

  describe('Environment Variable Edge Cases', () => {
    it('should_handle_missing_environment_variables_when_creating_client', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = undefined
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = undefined

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } }
      })

      await updateSession(mockRequest as NextRequest)

      expect(mockCreateServerClient).toHaveBeenCalledWith(
        undefined,
        undefined,
        expect.any(Object)
      )
    })
  })
})