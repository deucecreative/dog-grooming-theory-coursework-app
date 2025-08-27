import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import DashboardPage from '../page'

/**
 * Dashboard Integration Tests - Error Prevention
 * 
 * These tests specifically target real-world failure scenarios
 * that cause JSON parse errors and production issues
 */

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))
vi.mock('@/hooks/use-supabase')
vi.mock('@/hooks/use-toast')

// Mock fetch globally
global.fetch = vi.fn()

const mockRouter = {
  push: vi.fn(),
  back: vi.fn(), 
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn()
} satisfies AppRouterInstance

const mockAdminProfile = {
  id: 'admin-123',
  email: 'admin@test.com',
  full_name: 'Admin User',
  role: 'admin' as const,
  status: 'approved' as const,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z'
}

const mockToast = vi.fn()

// Minimal type-safe User mock (only required properties)
const mockUser = {
  id: 'admin-123',
  email: 'admin@test.com',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
  phone: undefined,
  role: 'authenticated',
  updated_at: '2023-01-01T00:00:00.000Z'
}

const mockStudentUser = {
  id: 'student-123', 
  email: 'student@test.com',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
  phone: undefined,
  role: 'authenticated',
  updated_at: '2023-01-01T00:00:00.000Z'
}

describe('Dashboard Integration Tests - Error Prevention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useRouter).mockReturnValue(mockRouter)
    vi.mocked(useToast).mockReturnValue({ 
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: []
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Critical Error Scenarios - JSON Parse Failures', () => {
    it('should_handle_500_internal_server_error_without_crashing', async () => {
      // ARRANGE: Admin user that should trigger API call
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockAdminProfile,
        user: mockUser,
        loading: false,
        supabase: createClient(), // Use the globally mocked client
        signOut: vi.fn()
      })

      // ARRANGE: Mock 500 error that returns HTML instead of JSON
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Internal Server Error' // HTML error, not JSON
      } as Response)

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Dashboard should render without crashing
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText(/Welcome to the platform administration dashboard/i)).toBeInTheDocument()

      // ASSERT: Should not show pending users notification when API fails
      await waitFor(() => {
        expect(screen.queryByText(/user.*awaiting approval/i)).not.toBeInTheDocument()
      })
    })

    it('should_handle_401_unauthorized_gracefully', async () => {
      // ARRANGE: Admin user 
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockAdminProfile,
        user: mockUser,
        loading: false,
        supabase: createClient(), // Use the globally mocked client
        signOut: vi.fn()
      })

      // ARRANGE: Mock 401 unauthorized
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => '{"error": "Unauthorized"}'
      } as Response)

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should not crash with JSON parse error
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should_handle_empty_response_body', async () => {
      // ARRANGE: Admin user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockAdminProfile,
        user: mockUser,
        loading: false,
        supabase: createClient(), // Use the globally mocked client
        signOut: vi.fn()
      })

      // ARRANGE: Mock empty response that causes JSON.parse to fail
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '' // Empty response
      } as Response)

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should handle empty response gracefully
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      
      await waitFor(() => {
        // Should not show pending users when response is empty
        expect(screen.queryByText(/awaiting approval/i)).not.toBeInTheDocument()
      })
    })

    it('should_handle_malformed_json_response', async () => {
      // ARRANGE: Admin user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockAdminProfile,
        user: mockUser,
        loading: false,
        supabase: createClient(), // Use the globally mocked client
        signOut: vi.fn()
      })

      // ARRANGE: Mock malformed JSON that causes parse error
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => '{"users": [invalid json'
      } as Response)

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should not crash on malformed JSON
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    it('should_handle_network_errors_gracefully', async () => {
      // ARRANGE: Admin user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockAdminProfile,
        user: mockUser,
        loading: false,
        supabase: createClient(), // Use the globally mocked client
        signOut: vi.fn()
      })

      // ARRANGE: Mock network failure
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should not crash on network failure
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })

  describe('Valid API Response Scenarios', () => {
    it('should_display_pending_users_count_for_admin', async () => {
      // ARRANGE: Admin user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockAdminProfile,
        user: mockUser,
        loading: false,
        supabase: createClient(), // Use the globally mocked client
        signOut: vi.fn()
      })

      // ARRANGE: Mock successful API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify({
          users: [
            { id: 'user-1', email: 'pending1@test.com', status: 'pending' },
            { id: 'user-2', email: 'pending2@test.com', status: 'pending' }
          ]
        })
      } as Response)

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should show pending users notification
      await waitFor(() => {
        // Check for the strong "2" element and separate text pieces
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText(/users awaiting approval/i)).toBeInTheDocument()
        expect(screen.getByText('Review Users')).toBeInTheDocument()
      })
    })

    it('should_not_call_api_for_non_privileged_users', async () => {
      // ARRANGE: Student user (not admin/course_leader)
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: {
          ...mockAdminProfile,
          role: 'student' as const
        },
        user: mockStudentUser,
        loading: false,
        supabase: createClient(), // Use the globally mocked client
        signOut: vi.fn()
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should not call users API for students
      expect(global.fetch).not.toHaveBeenCalled()
      
      // Should show student dashboard content
      expect(screen.getByText(/Welcome to your coursework management system/i)).toBeInTheDocument()
    })
  })
})