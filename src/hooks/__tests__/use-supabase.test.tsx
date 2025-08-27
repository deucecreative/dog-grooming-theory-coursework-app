import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useSupabase } from '../use-supabase'
import type { Session } from '@supabase/supabase-js'
import { createMockSession } from '@/types/test-utilities'

// Create proper mock structure for Supabase client
const createMockSupabaseClient = () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockReturnThis(),
  }

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } }
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue(mockQuery),
    _mockQuery: mockQuery, // Expose for test access
  }
}

const mockSupabaseClient = createMockSupabaseClient()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

// Test data
const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
}

const mockProfile = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'student' as const,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

describe('useSupabase Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset to default state
    mockSupabaseClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    mockSupabaseClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockSupabaseClient._mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null })
  })

  describe('Initial State', () => {
    it('should start with loading true and no user/profile', async () => {
      const { result } = renderHook(() => useSupabase())

      // Initial state check
      expect(result.current.loading).toBe(true)
      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(result.current.supabase).toBeDefined()
      expect(result.current.signOut).toBeInstanceOf(Function)

      // Wait for useEffect to complete to prevent act() warning
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('Session Management', () => {
    it('should handle no session gracefully', async () => {
      const { result } = renderHook(() => useSupabase())

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toBeNull()
      expect(result.current.profile).toBeNull()
      expect(mockSupabaseClient.auth.getSession).toHaveBeenCalled()
    })

    it('should load user and profile when session exists', async () => {
      // Arrange - Set up session with user
      const mockSession = createMockSession({ user: mockUser })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      mockSupabaseClient._mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      // Act
      const { result } = renderHook(() => useSupabase())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toEqual(mockProfile)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles')
    })

    it('should handle missing profile by creating one', async () => {
      // Arrange - User exists but no profile
      const mockSession = createMockSession({ user: mockUser })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })
      
      // First call returns no profile (404 error), then insert succeeds
      mockSupabaseClient._mockQuery.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      
      mockSupabaseClient._mockQuery.insert.mockReturnValue(mockSupabaseClient._mockQuery)
      mockSupabaseClient._mockQuery.select.mockReturnValue(mockSupabaseClient._mockQuery)
      mockSupabaseClient._mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      // Act
      const { result } = renderHook(() => useSupabase())

      // Assert
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.user).toEqual(mockUser)
      expect(result.current.profile).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: 'student',
        status: 'pending'
      })
      expect(mockSupabaseClient._mockQuery.insert).toHaveBeenCalled()
    })
  })

  describe('Authentication State Changes', () => {
    it('should handle auth state changes', async () => {
      // Arrange
      let authStateChangeCallback: (event: string, session: Session | null) => void = () => {}
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const { result } = renderHook(() => useSupabase())

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // Simulate auth state change
      const mockSession = createMockSession({ user: mockUser })
      mockSupabaseClient._mockQuery.single.mockResolvedValue({
        data: mockProfile,
        error: null,
      })

      await act(async () => {
        authStateChangeCallback('SIGNED_IN', mockSession)
      })

      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
        expect(result.current.profile).toEqual(mockProfile)
      })
    })

    it('should clear user and profile on sign out', async () => {
      // Arrange - Start with authenticated user
      const mockSession = createMockSession({ user: mockUser })
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      let authStateChangeCallback: (event: string, session: Session | null) => void = () => {}
      mockSupabaseClient.auth.onAuthStateChange.mockImplementation((callback) => {
        authStateChangeCallback = callback
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })

      const { result } = renderHook(() => useSupabase())

      // Wait for initial authenticated state
      await waitFor(() => {
        expect(result.current.user).toEqual(mockUser)
      })

      // Act - Simulate sign out
      await act(async () => {
        authStateChangeCallback('SIGNED_OUT', null)
      })

      // Assert
      await waitFor(() => {
        expect(result.current.user).toBeNull()
        expect(result.current.profile).toBeNull()
        expect(result.current.loading).toBe(false)
      })
    })
  })

  describe('Sign Out Functionality', () => {
    it('should handle successful sign out', async () => {
      const { result } = renderHook(() => useSupabase())

      await act(async () => {
        await result.current.signOut()
      })

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled()
    })

    it('should handle sign out errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      mockSupabaseClient.auth.signOut.mockResolvedValue({
        error: { message: 'Sign out failed' }
      })

      const { result } = renderHook(() => useSupabase())

      await act(async () => {
        await result.current.signOut()
      })

      expect(consoleSpy).toHaveBeenCalledWith('Error signing out:', { message: 'Sign out failed' })
      consoleSpy.mockRestore()
    })
  })

  describe('Cleanup', () => {
    it('should unsubscribe from auth changes on unmount', () => {
      const mockUnsubscribe = vi.fn()
      mockSupabaseClient.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } }
      })

      const { unmount } = renderHook(() => useSupabase())

      unmount()

      expect(mockUnsubscribe).toHaveBeenCalled()
    })
  })
})