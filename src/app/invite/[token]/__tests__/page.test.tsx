import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, useParams } from 'next/navigation'
import InviteAcceptPage from '../page'
import { useToast } from '@/hooks/use-toast'
import '@testing-library/jest-dom'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useParams: vi.fn(),
}))

vi.mock('@/hooks/use-toast')

// Mock fetch globally
global.fetch = vi.fn()

const mockRouter = {
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
}

const mockToast = vi.fn()

const validInvitation = {
  valid: true,
  invitation: {
    email: 'newuser@test.com',
    role: 'student',
    invited_by: 'Admin User',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }
}

const expiredInvitation = {
  error: 'This invitation has expired'
}

const mockSupabaseClient = {
  auth: {
    signUp: vi.fn(),
  },
}

// Mock createClient
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}))

describe('Invite Accept Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useRouter).mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>)
    vi.mocked(useParams).mockReturnValue({ token: 'valid-token-123' })
    vi.mocked(useToast).mockReturnValue({ toast: mockToast, dismiss: vi.fn(), toasts: [] } as unknown as ReturnType<typeof useToast>)
  })

  describe('Valid invitation', () => {
    beforeEach(() => {
      // Clear all previous mocks and mock successful invitation verification  
      vi.mocked(fetch).mockClear()
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => validInvitation,
      } as Response)
    })

    it('should display invitation acceptance form', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Accept Invitation')).toBeInTheDocument()
      })
      
      expect(screen.getByDisplayValue('newuser@test.com')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Student')).toBeInTheDocument()
      expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
      expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument()
    })

    it('should show invitation details', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/You have been invited by Admin User/)).toBeInTheDocument()
      })
      
      expect(screen.getByText(/join as a student/)).toBeInTheDocument()
    })

    it('should disable email and role fields', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('newuser@test.com')).toBeDisabled()
      })
      
      expect(screen.getByDisplayValue('Student')).toBeDisabled()
    })

    it('should handle successful account creation', async () => {
      // Mock successful signup
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { 
          user: { id: 'new-user-id' },
          session: { access_token: 'token' }
        },
        error: null,
      })

      // Mock invitation acceptance
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => validInvitation,
      } as Response).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'Invitation accepted' }),
      } as Response)

      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      })

      // Fill out form
      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'New User' }
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' }
      })
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'password123' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Create account'))

      await waitFor(() => {
        expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
          email: 'newuser@test.com',
          password: 'password123',
          options: {
            data: {
              full_name: 'New User',
              role: 'student',
              invitation_token: 'valid-token-123',
            },
          },
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Welcome!',
        description: 'Account created successfully! You are now logged in.',
      })

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
    })

    it('should validate password confirmation', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'New User' }
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' }
      })
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'different123' }
      })

      fireEvent.click(screen.getByText('Create account'))

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      })
    })

    it('should validate minimum password length', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'New User' }
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: '123' }
      })
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: '123' }
      })

      fireEvent.click(screen.getByText('Create account'))

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Password must be at least 6 characters long.',
        variant: 'destructive',
      })
    })

    it('should disable form during submission', async () => {
      // Mock resolved promise instead of using setTimeout to avoid cleanup warnings
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: { id: 'user' } },
        error: null,
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => validInvitation,
      } as Response)

      render(<InviteAcceptPage />)

      await waitFor(() => {
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'New User' }
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' }
      })
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'password123' }
      })

      fireEvent.click(screen.getByText('Create account'))

      // Check for loading state immediately after click
      expect(screen.getByText('Creating account...')).toBeInTheDocument()
      expect(screen.getByLabelText('Full Name')).toBeDisabled()
    })
  })

  describe('Invalid invitation', () => {
    beforeEach(() => {
      // Clear all previous mocks and mock failed invitation verification
      vi.mocked(fetch).mockClear()
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: async () => expiredInvitation,
      } as Response)
    })

    it('should show error for expired invitation', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Invitation')).toBeInTheDocument()
      })
      
      expect(screen.getByText('This invitation has expired')).toBeInTheDocument()
    })

    it('should show go to login button for invalid invitation', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Go to Login')).toBeInTheDocument()
      })
    })

    it('should not show form for invalid invitation', async () => {
      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Invitation')).toBeInTheDocument()
      })

      expect(screen.queryByLabelText('Full Name')).not.toBeInTheDocument()
    })
  })

  describe('Loading states', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockClear()
    })

    it('should show loading while verifying invitation', async () => {
      // Mock slow verification using pending promise approach
      let resolvePromise: (value: Response) => void

      vi.mocked(fetch).mockImplementation(() =>
        new Promise<Response>(resolve => {
          resolvePromise = resolve
        })
      )

      render(<InviteAcceptPage />)

      expect(screen.getByText('Verifying Invitation...')).toBeInTheDocument()

      // Resolve the promise after checking loading state
      resolvePromise!({
        ok: true,
        json: async () => validInvitation,
      } as Response)

      await waitFor(() => {
        expect(screen.getByText('Accept Invitation')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockClear()
    })

    it('should handle signup errors', async () => {
      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null },
        error: new Error('Email already registered'),
      })

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => validInvitation,
      } as Response)

      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Full Name')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Full Name'), {
        target: { value: 'New User' }
      })
      fireEvent.change(screen.getByLabelText('Password'), {
        target: { value: 'password123' }
      })
      fireEvent.change(screen.getByLabelText('Confirm Password'), {
        target: { value: 'password123' }
      })

      fireEvent.click(screen.getByText('Create account'))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Account Creation Failed',
          description: 'Email already registered',
          variant: 'destructive',
        })
      })
    })

    it('should handle network errors during verification', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Invitation')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  describe('Token handling', () => {
    beforeEach(() => {
      vi.mocked(fetch).mockClear()
    })

    it('should use token from URL params', async () => {
      vi.mocked(useParams).mockReturnValue({ token: 'test-token-456' })
      
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => validInvitation,
      } as Response)

      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/invitations/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token: 'test-token-456' }),
        })
      })
    })

    it('should handle missing token', async () => {
      vi.mocked(useParams).mockReturnValue({})

      render(<InviteAcceptPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Invalid Invitation')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Invitation Not Found')).toBeInTheDocument()
    })
  })
})