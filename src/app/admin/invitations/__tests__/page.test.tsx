import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import InvitationsPage from '../page'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import { createMockSupabaseClient, MockRouter, createMockUser } from '@/types/test-utilities'

// Mock dependencies
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
}))

vi.mock('@/hooks/use-supabase')
vi.mock('@/hooks/use-toast')

// Mock fetch
global.fetch = vi.fn()

const mockRouter: MockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  prefetch: vi.fn(),
}

const mockToast = vi.fn()

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
  updated_at: '2023-01-01T00:00:00.000Z',
}

const mockStudentProfile = {
  id: 'student-123',
  email: 'student@test.com',
  full_name: 'Student User',
  role: 'student' as const,
  status: 'approved' as const,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

const mockInvitations = [
  {
    id: 'invite-1',
    email: 'student1@test.com',
    role: 'student',
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    used_at: null,
    created_at: new Date().toISOString(),
    profiles: {
      full_name: 'Admin User',
      email: 'admin@test.com',
    },
  },
  {
    id: 'invite-2',
    email: 'student2@test.com',
    role: 'student',
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    used_at: new Date().toISOString(),
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    profiles: {
      full_name: 'Admin User',
      email: 'admin@test.com',
    },
  },
  {
    id: 'invite-3',
    email: 'expired@test.com',
    role: 'course_leader',
    expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    used_at: null,
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    profiles: {
      full_name: 'Admin User',
      email: 'admin@test.com',
    },
  },
]

describe('Admin Invitations Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    vi.mocked(useRouter).mockReturnValue(mockRouter as AppRouterInstance)
    vi.mocked(useToast).mockReturnValue({ 
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: []
    })

    // Mock successful invitations fetch
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ invitations: mockInvitations }),
    } as Response)

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    })
  })

  describe('Admin access', () => {
    beforeEach(() => {
      vi.mocked(useSupabase).mockReturnValue({
        user: { 
          id: 'admin-123',
          email: 'admin@test.com',
          app_metadata: {},
          user_metadata: {},
          aud: 'authenticated',
          created_at: '2023-01-01T00:00:00.000Z',
          role: 'authenticated',
          updated_at: '2023-01-01T00:00:00.000Z'
        },
        profile: mockAdminProfile,
        loading: false,
        supabase: createMockSupabaseClient(),
        signOut: vi.fn(),
      })
    })

    it('should display invitation management interface', async () => {
      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Invitation Management')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Create and manage user invitations')).toBeInTheDocument()
      expect(screen.getByText('Create New Invitation')).toBeInTheDocument()
      expect(screen.getByText('Recent Invitations')).toBeInTheDocument()
    })

    it('should show create invitation form', async () => {
      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      })
      
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Create Invitation')).toBeInTheDocument()
    })

    it('should display existing invitations with correct status badges', async () => {
      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('student1@test.com')).toBeInTheDocument()
      })
      
      expect(screen.getByText('student2@test.com')).toBeInTheDocument()
      expect(screen.getByText('expired@test.com')).toBeInTheDocument()
      
      // Check status badges
      expect(screen.getByText('Active')).toBeInTheDocument()
      expect(screen.getByText('Used')).toBeInTheDocument()
      expect(screen.getByText('Expired')).toBeInTheDocument()
    })

    it('should create new invitation successfully', async () => {
      // Mock successful invitation creation
      const createdInvitation = {
        message: 'Invitation created successfully',
        invitation: {
          id: 'new-invite',
          email: 'newuser@test.com',
          role: 'student',
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token: 'secure-token-123',
        },
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: mockInvitations }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createdInvitation,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: [...mockInvitations] }),
        } as Response)

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      })

      // Fill out form
      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'newuser@test.com' }
      })

      // Submit form
      fireEvent.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/invitations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'newuser@test.com',
            role: 'student',
          }),
        })
      })

      expect(mockToast).toHaveBeenCalledWith({
        title: 'Success',
        description: 'Invitation created successfully',
      })
    })

    it('should display generated invitation URL', async () => {
      // Mock invitation creation with token
      const createdInvitation = {
        message: 'Invitation created successfully',
        invitation: {
          token: 'test-token-123',
          email: 'newuser@test.com',
          role: 'student',
          expires_at: new Date().toISOString(),
        },
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: mockInvitations }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createdInvitation,
        } as Response)

      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
      })

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'newuser@test.com' }
      })
      fireEvent.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(screen.getByText('Invitation created!')).toBeInTheDocument()
      })

      expect(screen.getByText(/http:\/\/localhost:3000\/invite\/test-token-123/)).toBeInTheDocument()
      expect(screen.getByText('Copy')).toBeInTheDocument()
    })

    it('should copy invitation URL to clipboard', async () => {
      // Setup invitation URL display
      const createdInvitation = {
        message: 'Invitation created successfully',
        invitation: {
          token: 'test-token-123',
          email: 'newuser@test.com',
          role: 'student',
          expires_at: new Date().toISOString(),
        },
      }

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: mockInvitations }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => createdInvitation,
        } as Response)

      Object.defineProperty(window, 'location', {
        value: { origin: 'http://localhost:3000' },
      })

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'newuser@test.com' }
      })
      fireEvent.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(screen.getByText('Copy')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Copy'))

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'http://localhost:3000/invite/test-token-123'
      )
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Copied',
        description: 'Invitation link copied to clipboard',
      })
    })

    it('should handle invitation creation errors', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: mockInvitations }),
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'User already exists' }),
        } as Response)

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'existing@test.com' }
      })
      fireEvent.click(screen.getByText('Create Invitation'))

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'User already exists',
          variant: 'destructive',
        })
      })
    })

    it('should validate email input', async () => {
      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      })

      // Clear email field to ensure it's empty
      const emailInput = screen.getByLabelText('Email Address')
      fireEvent.change(emailInput, { target: { value: '' } })

      // Submit the form (not just click the button)
      const form = emailInput.closest('form')!
      fireEvent.submit(form)

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Email is required',
          variant: 'destructive',
        })
      })
    })

    it('should allow role selection for admin users', async () => {
      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument()
      })

      // Verify the role select is present and accessible
      const roleSelect = screen.getByRole('combobox')
      expect(roleSelect).toBeInTheDocument()
      expect(roleSelect).toHaveAttribute('aria-expanded', 'false')
    })
  })

  describe('Non-admin access', () => {
    it('should redirect non-admin users', async () => {
      vi.mocked(useSupabase).mockReturnValue({
        user: createMockUser({ id: 'student-123', email: 'student@test.com' }),
        profile: mockStudentProfile,
        loading: false,
        supabase: createMockSupabaseClient(),
        signOut: vi.fn(),
      })

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show access denied message for non-admin users', async () => {
      vi.mocked(useSupabase).mockReturnValue({
        user: createMockUser({ id: 'student-123', email: 'student@test.com' }),
        profile: mockStudentProfile,
        loading: false,
        supabase: createMockSupabaseClient(),
        signOut: vi.fn(),
      })

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Access denied. This page is only available to administrators.')).toBeInTheDocument()
      })
    })
  })

  describe('Loading states', () => {
    beforeEach(() => {
      vi.mocked(useSupabase).mockReturnValue({
        user: createMockUser({ id: 'admin-123', email: 'admin@test.com' }),
        profile: mockAdminProfile,
        loading: false,
        supabase: createMockSupabaseClient(),
        signOut: vi.fn(),
      })
    })

    it('should show loading state during form submission', async () => {
      // Mock slow invitation creation
      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ invitations: mockInvitations }),
        } as Response)
        .mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({
            ok: true,
            json: async () => ({ message: 'Success', invitation: {} }),
          } as Response), 100))
        )

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument()
      })

      fireEvent.change(screen.getByLabelText('Email Address'), {
        target: { value: 'test@test.com' }
      })
      fireEvent.click(screen.getByText('Create Invitation'))

      expect(screen.getByText('Creating...')).toBeInTheDocument()
      expect(screen.getByLabelText('Email Address')).toBeDisabled()
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      vi.mocked(useSupabase).mockReturnValue({
        user: createMockUser({ id: 'admin-123', email: 'admin@test.com' }),
        profile: mockAdminProfile,
        loading: false,
        supabase: createMockSupabaseClient(),
        signOut: vi.fn(),
      })
    })

    it('should handle fetch errors gracefully', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load invitations',
          variant: 'destructive',
        })
      })
    })

    it('should show no invitations message when list is empty', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ invitations: [] }),
      } as Response)

      render(<InvitationsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('No invitations found')).toBeInTheDocument()
      })
    })
  })
})