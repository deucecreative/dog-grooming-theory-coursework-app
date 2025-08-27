import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import UsersPage from '../page'
import { createMockResponse } from '@/types/test-utilities'

// Mock the hooks
const mockUser = { id: 'admin-1', email: 'admin@test.com' }
const mockProfile = { id: 'admin-1', role: 'admin', status: 'approved' }
const mockToast = vi.fn()
const mockPush = vi.fn()

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({
    user: mockUser,
    profile: mockProfile,
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

// Mock fetch for API calls
global.fetch = vi.fn()

describe('Admin Users Page - Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mock for successful users fetch
    vi.mocked(global.fetch).mockResolvedValue(
      createMockResponse({
        users: [
          {
            id: 'admin-1', // Same as current user
            email: 'admin@test.com',
            full_name: 'Admin User',
            role: 'admin',
            status: 'approved',
            created_at: '2023-01-01T00:00:00Z',
            approved_at: '2023-01-01T00:00:00Z',
            approved_by: null,
            approved_profile: null,
          },
          {
            id: 'user-2', // Different user
            email: 'other@test.com',
            full_name: 'Other User',
            role: 'student',
            status: 'pending',
            created_at: '2023-01-02T00:00:00Z',
            approved_at: null,
            approved_by: null,
            approved_profile: null,
          },
        ],
      })
    )
  })

  it('should prevent admin from revoking their own account', async () => {
    render(<UsersPage />)
    
    // Wait for the component to render
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })
    
    // Wait for users to load by checking if admin email appears
    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    }, { timeout: 5000 })
    
    // Wait for users to load - use more flexible matcher
    await waitFor(() => {
      const adminEmail = screen.getByText((content, _element) => {
        return content.includes('admin@test.com')
      })
      expect(adminEmail).toBeInTheDocument()
    })

    // Current user (admin-1) should show "Current User" message instead of action buttons
    const selfModifyText = screen.getByText('Current User (Cannot modify own status)')
    expect(selfModifyText).toBeInTheDocument()
    
    // Should have Admin badge for current user
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('should show action buttons for other users', async () => {
    render(<UsersPage />)
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })
    
    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('other@test.com')).toBeInTheDocument()
    })

    // Other user (user-2) should have action buttons since they're pending
    expect(screen.getByText('Approve')).toBeInTheDocument()
    expect(screen.getByText('Deny')).toBeInTheDocument()
    
    // Should show pending badge
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('should show role badges correctly', async () => {
    render(<UsersPage />)
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })
    
    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    })

    // Should show Admin badge for admin user
    expect(screen.getByText('Admin')).toBeInTheDocument()
    
    // Should show Student badge for student user
    expect(screen.getByText('Student')).toBeInTheDocument()
  })

  it('should handle empty user list gracefully', async () => {
    // Mock empty response
    vi.mocked(global.fetch).mockResolvedValueOnce(
      createMockResponse({ users: [] })
    )

    render(<UsersPage />)
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })
    
    // Should show no users message
    await waitFor(() => {
      expect(screen.getByText('No users found')).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    // Mock API error
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Access denied' }),
      text: async () => JSON.stringify({ error: 'Access denied' }),
      status: 403,
      statusText: 'Forbidden',
      headers: new Headers()
    } as Response)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<UsersPage />)
    
    // Wait for component to render
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument()
    })
    
    // Wait for error to be logged
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching users:', expect.any(Error))
    })
    
    // Should have called toast with error
    expect(mockToast).toHaveBeenCalledWith({
      title: 'Error',
      description: 'Failed to load users',
      variant: 'destructive',
    })

    consoleSpy.mockRestore()
  })
})