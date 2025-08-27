import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import UsersPage from '../page'
import { createMockResponse } from '@/types/test-utilities'

// Mock the hooks - focusing on BEHAVIOR not implementation
const mockUser = { id: 'admin-1', email: 'admin@test.com' }
const mockProfile = { id: 'admin-1', role: 'admin', status: 'approved' }
const mockToast = vi.fn()
const mockPush = vi.fn()

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({ user: mockUser, profile: mockProfile }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

// Mock fetch with MINIMAL data for behavior testing
const createMockUsers = (includeCurrentUser = true) => [
  ...(includeCurrentUser ? [{
    id: 'admin-1',
    email: 'admin@test.com',
    full_name: 'Admin User',
    role: 'admin',
    status: 'approved',
  }] : []),
  {
    id: 'user-2',
    email: 'other@test.com', 
    full_name: 'Other User',
    role: 'student',
    status: 'pending',
  },
]

describe('Admin Users Page - TDD Behavior Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Create a proper fetch mock that returns a Response-like object
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ users: [] }),
      text: () => Promise.resolve('{"users":[]}'),
      status: 200,
      statusText: 'OK',
      headers: new Headers()
    } as Response)) as typeof fetch
  })

  /**
   * TDD Test 1: User Data Loading Behavior
   * DESIRED BEHAVIOR: When page loads, users should be displayed
   */
  describe('User Data Display', () => {
    it('should display user emails when data loads successfully', async () => {
      // ARRANGE: Mock successful API response
      vi.mocked(global.fetch).mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ users: createMockUsers() }),
        text: () => Promise.resolve('{"users":[]}'),
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      } as Response))

      // ACT: Render the component
      await act(async () => {
        render(<UsersPage />)
      })

      // ASSERT: User emails should be visible
      await waitFor(() => {
        expect(screen.getByText('admin@test.com')).toBeInTheDocument()
        expect(screen.getByText('other@test.com')).toBeInTheDocument()
      }, { timeout: 3000 })
    })

    it('should show loading state initially', async () => {
      // ARRANGE: Mock API response that never resolves (hanging request)
      vi.mocked(global.fetch).mockImplementation(() => new Promise(() => {}))

      // ACT: Render the component
      await act(async () => {
        render(<UsersPage />)
      })

      // ASSERT: Loading spinner should be visible
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument()
    })

    it('should handle empty user list gracefully', async () => {
      // ARRANGE: Mock empty response
      vi.mocked(global.fetch).mockImplementation(() => Promise.resolve(
        createMockResponse({ users: [] })
      ))

      // ACT: Render the component  
      await act(async () => {
        render(<UsersPage />)
      })

      // ASSERT: Should show empty state (or no loading spinner)
      await waitFor(() => {
        expect(screen.queryByRole('status', { hidden: true })).not.toBeInTheDocument()
      }, { timeout: 2000 })
    })
  })

  /**
   * TDD Test 2: Admin Security Behavior  
   * DESIRED BEHAVIOR: Admin cannot revoke their own account
   */
  describe('Admin Self-Protection', () => {
    it('should disable revoke button for current admin user', async () => {
      // ARRANGE: Mock API response with current admin
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({ users: createMockUsers() })
      )

      // ACT: Render and wait for data
      await act(async () => {
        render(<UsersPage />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('admin@test.com')).toBeInTheDocument()
      })

      // ASSERT: Current admin should show protection message instead of buttons
      await waitFor(() => {
        expect(screen.getByText('Current User (Cannot modify own status)')).toBeInTheDocument()
      })
    })

    it('should show active revoke button for other users', async () => {
      // ARRANGE: Mock API response 
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({ users: createMockUsers() })
      )

      // ACT: Render and wait for data
      await act(async () => {
        render(<UsersPage />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('other@test.com')).toBeInTheDocument()
      })

      // ASSERT: Other users should have action buttons (approve/deny for pending status)
      // The other user has pending status, so should see Approve and Deny buttons
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Deny' })).toBeInTheDocument()
      })
    })
  })

  /**
   * TDD Test 3: Error Handling Behavior
   * DESIRED BEHAVIOR: API failures should be handled gracefully 
   */
  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      // ARRANGE: Mock failed API response
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network failed'))

      // ACT: Render component
      await act(async () => {
        render(<UsersPage />)
      })

      // ASSERT: Error toast should be called
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            variant: 'destructive',
          })
        )
      })
    })

    it('should handle malformed API responses', async () => {
      // ARRANGE: Mock malformed response
      vi.mocked(global.fetch).mockResolvedValueOnce(
        createMockResponse({ invalid: 'data' }) // Missing users array
      )

      // ACT: Render component
      await act(async () => {
        render(<UsersPage />)
      })

      // ASSERT: Should not crash, should show empty state
      await waitFor(() => {
        expect(screen.getByText(/no users found/i)).toBeInTheDocument()
      })
    })
  })

  /**
   * TDD Test 4: User Action Behavior
   * DESIRED BEHAVIOR: User status changes should work correctly
   */
  describe('User Status Management', () => {
    it('should allow approving pending users', async () => {
      // ARRANGE: Mock initial data and update response
      vi.mocked(global.fetch)
        .mockResolvedValueOnce(
          createMockResponse({ users: createMockUsers() })
        )
        .mockResolvedValueOnce(
          createMockResponse({ message: 'User approved' })
        )
        .mockResolvedValueOnce(
          createMockResponse({ users: createMockUsers().map(u => 
            u.id === 'user-2' ? { ...u, status: 'approved' } : u
          )})
        )

      const user = userEvent.setup()

      // ACT: Render, find approve button, click it
      await act(async () => {
        render(<UsersPage />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('other@test.com')).toBeInTheDocument()
      })

      const approveButton = screen.getByRole('button', { name: /approve|accept/i })
      await user.click(approveButton)

      // ASSERT: Update API should be called
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/users', 
          expect.objectContaining({
            method: 'PATCH',
            body: JSON.stringify({ userId: 'user-2', status: 'approved' }),
          })
        )
      })
    })
  })
})