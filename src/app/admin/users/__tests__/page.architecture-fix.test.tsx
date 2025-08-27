import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import UsersPage from '../page'

// TDD Test: Admin Users Component Architecture Fix
// RED PHASE: Write failing test that describes correct behavior

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

describe('Admin Users Page - Architecture Fix TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fetch to return successful response quickly - with proper type casting
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ 
        users: [{
          id: 'user-1',
          email: 'test@example.com',
          full_name: 'Test User',
          role: 'student',
          status: 'pending',
          created_at: '2024-01-01T00:00:00.000Z',
          approved_at: null,
          approved_by: null
        }] 
      })
    }) as typeof fetch
  })

  it('should load and display users within reasonable time (no infinite loops)', async () => {
    // RED: This test should pass once we fix the useEffect dependency issue
    // Current behavior: Component gets stuck in loading state due to infinite re-renders
    // Expected behavior: Component should load users and display them quickly
    
    render(<UsersPage />)
    
    // Should start with loading state
    expect(screen.getByRole('status', { name: /loading users/i })).toBeInTheDocument()
    
    // Should complete loading and show user data within 2 seconds (generous but reasonable)
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    }, { timeout: 2000 })
    
    // Should no longer show loading state
    expect(screen.queryByRole('status', { name: /loading users/i })).not.toBeInTheDocument()
    
    // Verify fetch was called but not excessively (should be 1-2 calls max)
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should not cause infinite re-renders when profile is stable', async () => {
    // RED: This test verifies the architectural fix
    // Track fetch calls to ensure stable behavior
    const fetchSpy = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ users: [] }),
      text: () => Promise.resolve('{"users":[]}'),
      status: 200,
      statusText: 'OK',
      headers: new Headers()
    } as Response))
    global.fetch = fetchSpy as typeof fetch
    
    render(<UsersPage />)
    
    // Wait for initial render to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    }, { timeout: 2000 })
    
    // Should have called fetch exactly once for initial load
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    
    // Wait a bit more to ensure no additional calls happen
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Still should be exactly one call - no infinite loop
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })
})