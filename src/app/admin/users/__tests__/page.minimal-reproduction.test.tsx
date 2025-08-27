import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import UsersPage from '../page'

// MINIMAL TDD REPRODUCTION: Focus on the core useEffect issue

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

describe('Admin Users Page - Minimal Reproduction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Simple mock that returns empty users immediately  
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ users: [] })
    }) as typeof fetch
  })

  it('should not get stuck in loading state with empty response', async () => {
    // This is the most basic case - component should load and show "No users found"
    render(<UsersPage />)
    
    // Should start with loading
    expect(screen.getByRole('status', { name: /loading users/i })).toBeInTheDocument()
    
    // Should finish loading and show "No users found" within 1 second
    await waitFor(() => {
      expect(screen.getByText(/No users found/i)).toBeInTheDocument()
    }, { timeout: 1000 })
    
    // Loading should be gone
    expect(screen.queryByRole('status', { name: /loading users/i })).not.toBeInTheDocument()
    
    // Should have called fetch exactly once
    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith('/api/users')
  })
})