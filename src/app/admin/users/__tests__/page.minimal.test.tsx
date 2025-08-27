import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import UsersPage from '../page'

// Mock hooks with minimal setup
const mockProfile = { id: 'admin-1', role: 'admin', status: 'approved' }
const mockToast = vi.fn()
const mockPush = vi.fn()

vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: () => ({ 
    user: { id: 'admin-1', email: 'admin@test.com' }, 
    profile: mockProfile 
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}))

describe('Admin Users Page - Minimal TDD Test', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock with small delay to test loading transition
    global.fetch = vi.fn(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ users: [] }),
          text: () => Promise.resolve('{"users":[]}'),
          status: 200,
          statusText: 'OK',
          headers: new Headers()
        } as Response), 10) // 10ms delay to allow loading state to be visible
      )
    ) as typeof fetch
  })

  it('should transition from loading to empty state', async () => {
    // ARRANGE & ACT: Render component
    await act(async () => {
      render(<UsersPage />)
    })

    // ASSERT: Should start with loading spinner
    expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()

    // ASSERT: Should transition to empty state
    await waitFor(() => {
      expect(screen.queryByRole('status', { name: /loading/i })).not.toBeInTheDocument()
    }, { timeout: 2000 })

    // Should show empty message
    expect(screen.getByText(/no users found/i)).toBeInTheDocument()
  })

  it('should display user data when fetch returns users', async () => {
    // ARRANGE: Mock with actual user data
    global.fetch = vi.fn(() => 
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          users: [{
            id: 'user-1',
            email: 'test@example.com',
            full_name: 'Test User',
            role: 'student',
            status: 'pending',
            created_at: '2023-01-01T00:00:00Z',
            approved_at: null,
            approved_by: null,
            approved_profile: null,
          }]
        }),
        text: () => Promise.resolve('{"users":[{"id":"user-1","email":"test@example.com"}]}'),
        status: 200,
        statusText: 'OK',
        headers: new Headers()
      } as Response)
    ) as typeof fetch

    // ACT: Render component
    await act(async () => {
      render(<UsersPage />)
    })

    // ASSERT: Should display the user email
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    }, { timeout: 2000 })
  })
})