import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../sidebar'
import { useSupabase } from '@/hooks/use-supabase'
import '@testing-library/jest-dom'

vi.mock('@/hooks/use-supabase')
vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/invitations',
}))

// Test admin profile with proper invitation system navigation
const mockAdminProfile = {
  id: 'admin-123',
  email: 'admin@test.com',
  role: 'admin' as const,
  status: 'approved' as const,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

const mockCourseLeaderProfile = {
  ...mockAdminProfile,
  role: 'course_leader' as const,
}

const mockStudentProfile = {
  ...mockAdminProfile,
  role: 'student' as const,
}

describe('Sidebar - Invitation System Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Admin Navigation', () => {
    beforeEach(() => {
      vi.mocked(useSupabase).mockReturnValue({
        user: { id: 'admin-123' },
        profile: mockAdminProfile,
        loading: false,
        supabase: {},
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useSupabase>)
    })

    it('should display Invitations link for admin users', () => {
      render(<Sidebar />)
      
      const invitationsLink = screen.getByRole('link', { name: /invitations/i })
      expect(invitationsLink).toBeInTheDocument()
      expect(invitationsLink).toHaveAttribute('href', '/admin/invitations')
    })

    it('should show Invitations link with Mail icon', () => {
      render(<Sidebar />)
      
      const invitationsLink = screen.getByRole('link', { name: /invitations/i })
      expect(invitationsLink).toBeInTheDocument()
      
      // Check that icon is present (Mail icon renders as svg)
      const icon = invitationsLink.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })

    it('should show all admin navigation items including invitations', () => {
      render(<Sidebar />)
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /user management/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /invitations/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /question bank/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /analytics/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument()
    })

    it('should place Invitations link in correct position (after User Management)', () => {
      render(<Sidebar />)
      
      const navLinks = screen.getAllByRole('link')
      const linkTexts = navLinks.map(link => link.textContent)
      
      const userMgmtIndex = linkTexts.indexOf('User Management')
      const invitationsIndex = linkTexts.indexOf('Invitations')
      const questionBankIndex = linkTexts.indexOf('Question Bank')
      
      expect(userMgmtIndex).toBeGreaterThan(-1)
      expect(invitationsIndex).toBeGreaterThan(-1)
      expect(questionBankIndex).toBeGreaterThan(-1)
      
      // Invitations should be between User Management and Question Bank
      expect(invitationsIndex).toBe(userMgmtIndex + 1)
      expect(questionBankIndex).toBe(invitationsIndex + 1)
    })

    it('should highlight Invitations link when on invitations page', () => {
      render(<Sidebar />)
      
      const invitationsLink = screen.getByRole('link', { name: /invitations/i })
      
      // Should have active styling classes
      expect(invitationsLink).toHaveClass('bg-blue-50', 'text-blue-700')
      expect(invitationsLink).toHaveClass('border-r-2', 'border-blue-700')
    })
  })

  describe('Course Leader Navigation', () => {
    beforeEach(() => {
      vi.mocked(useSupabase).mockReturnValue({
        user: { id: 'leader-123' },
        profile: mockCourseLeaderProfile,
        loading: false,
        supabase: {},
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useSupabase>)
    })

    it('should NOT display Invitations link for course leaders', () => {
      render(<Sidebar />)
      
      const invitationsLink = screen.queryByRole('link', { name: /invitations/i })
      expect(invitationsLink).not.toBeInTheDocument()
    })

    it('should show course leader navigation without invitation management', () => {
      render(<Sidebar />)
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /review submissions/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /manage students/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /my courses/i })).toBeInTheDocument()
      
      // Should NOT have invitation management
      expect(screen.queryByRole('link', { name: /invitations/i })).not.toBeInTheDocument()
    })
  })

  describe('Student Navigation', () => {
    beforeEach(() => {
      vi.mocked(useSupabase).mockReturnValue({
        user: { id: 'student-123' },
        profile: mockStudentProfile,
        loading: false,
        supabase: {},
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useSupabase>)
    })

    it('should NOT display Invitations link for students', () => {
      render(<Sidebar />)
      
      const invitationsLink = screen.queryByRole('link', { name: /invitations/i })
      expect(invitationsLink).not.toBeInTheDocument()
    })

    it('should show student navigation without invitation management', () => {
      render(<Sidebar />)
      
      expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /assignments/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /my progress/i })).toBeInTheDocument()
      
      // Should NOT have invitation management
      expect(screen.queryByRole('link', { name: /invitations/i })).not.toBeInTheDocument()
    })
  })

  describe('Security - Role-based Access', () => {
    it('should only show invitation management to admin users', () => {
      // Test all three roles
      const roles = [
        { profile: mockAdminProfile, shouldShow: true },
        { profile: mockCourseLeaderProfile, shouldShow: false },
        { profile: mockStudentProfile, shouldShow: false },
      ]

      roles.forEach(({ profile, shouldShow }) => {
        vi.mocked(useSupabase).mockReturnValue({
          user: { id: profile.id },
          profile,
          loading: false,
          supabase: {},
          signOut: vi.fn(),
        } as unknown as ReturnType<typeof useSupabase>)

        const { unmount } = render(<Sidebar />)
        
        const invitationsLink = screen.queryByRole('link', { name: /invitations/i })
        
        if (shouldShow) {
          expect(invitationsLink).toBeInTheDocument()
        } else {
          expect(invitationsLink).not.toBeInTheDocument()
        }
        
        unmount()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton during profile load', () => {
      vi.mocked(useSupabase).mockReturnValue({
        user: null,
        profile: null,
        loading: true,
        supabase: {},
        signOut: vi.fn(),
      } as unknown as ReturnType<typeof useSupabase>)

      render(<Sidebar />)
      
      // Should show loading state, not navigation items
      expect(screen.queryByRole('link', { name: /invitations/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument()
      
      // Should show loading placeholders
      const loadingElements = screen.getAllByRole('generic')
      const hasLoadingClass = loadingElements.some(el => 
        el.classList.contains('animate-pulse')
      )
      expect(hasLoadingClass).toBe(true)
    })
  })
})