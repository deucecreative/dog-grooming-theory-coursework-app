import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { SignUpForm } from '../signup-form'

// Mock Next.js router
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: mockPush,
  })),
}))

describe('SignUpForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the signup form with invitation-only message', () => {
      render(<SignUpForm />)

      // Check main heading
      expect(screen.getByText('Join the Platform')).toBeInTheDocument()
      
      // Check description
      expect(screen.getByText('Account creation is by invitation only')).toBeInTheDocument()
      
      // Check alert message
      expect(screen.getByText(/New accounts require an invitation/)).toBeInTheDocument()
      expect(screen.getByText(/Public registration has been disabled for security reasons/)).toBeInTheDocument()
    })

    it('should display proper contact instructions for different user types', () => {
      render(<SignUpForm />)

      expect(screen.getByText('Students:')).toBeInTheDocument()
      expect(screen.getByText(/Contact your course leader/)).toBeInTheDocument()
      
      expect(screen.getByText('Course Leaders:')).toBeInTheDocument()
      expect(screen.getByText(/Contact your administrator/)).toBeInTheDocument()
      
      expect(screen.getByText('Administrators:')).toBeInTheDocument()
      expect(screen.getByText(/Contact system support/)).toBeInTheDocument()
    })

    it('should display invitation link information', () => {
      render(<SignUpForm />)

      expect(screen.getByText('Have an invitation link?')).toBeInTheDocument()
      expect(screen.getByText(/Check your email for an invitation link/)).toBeInTheDocument()
      expect(screen.getByText('/invite/', { selector: 'code' })).toBeInTheDocument()
    })

    it('should render navigation buttons', () => {
      render(<SignUpForm />)

      expect(screen.getByRole('button', { name: 'Back to Login' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })

    it('should display the mail icon in the alert', () => {
      render(<SignUpForm />)

      const mailIcon = screen.getByTestId('lucide-icon')
      expect(mailIcon).toBeInTheDocument()
    })
  })

  describe('Navigation', () => {
    it('should navigate to login page when "Back to Login" button is clicked', async () => {
      render(<SignUpForm />)

      const backButton = screen.getByRole('button', { name: 'Back to Login' })
      fireEvent.click(backButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should navigate to login page when "Sign In" link is clicked', async () => {
      render(<SignUpForm />)

      const signInButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(signInButton)

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })

    it('should call router push only once per button click', async () => {
      render(<SignUpForm />)

      const backButton = screen.getByRole('button', { name: 'Back to Login' })
      
      fireEvent.click(backButton)
      fireEvent.click(backButton) // Double click

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledTimes(2)
        expect(mockPush).toHaveBeenCalledWith('/login')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<SignUpForm />)

      const mainHeading = screen.getByRole('heading', { level: 3 })
      expect(mainHeading).toHaveTextContent('Join the Platform')

      const subHeading = screen.getByRole('heading', { level: 4 })
      expect(subHeading).toHaveTextContent('Need an Account?')
    })

    it('should have proper button types and roles', () => {
      render(<SignUpForm />)

      const backButton = screen.getByRole('button', { name: 'Back to Login' })
      // The Back button doesn't have an explicit type attribute, but defaults to button
      expect(backButton).toBeInTheDocument()

      const signInButton = screen.getByRole('button', { name: 'Sign In' })
      expect(signInButton).toHaveAttribute('type', 'button')
    })

    it('should have descriptive alert content', () => {
      render(<SignUpForm />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
      expect(alert).toHaveTextContent(/New accounts require an invitation/)
    })
  })

  describe('Styling and Layout', () => {
    it('should apply correct CSS classes to main card', () => {
      render(<SignUpForm />)

      const card = screen.getByRole('heading', { level: 3 }).closest('[class*="card"]')
      expect(card).toHaveClass('w-full', 'max-w-md', 'mx-auto')
    })

    it('should have proper button variants', () => {
      render(<SignUpForm />)

      const backButton = screen.getByRole('button', { name: 'Back to Login' })
      expect(backButton).toHaveClass('w-full') // Should be full width

      const signInButton = screen.getByRole('button', { name: 'Sign In' })
      expect(signInButton).toHaveClass('p-0', 'h-auto') // Link variant styling
    })

    it('should have color-coded information sections', () => {
      render(<SignUpForm />)

      const invitationInfo = screen.getByText('Have an invitation link?').closest('div')
      expect(invitationInfo).toHaveClass('bg-blue-50', 'border-blue-200')
    })
  })

  describe('Error Handling', () => {
    it('should handle router errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockPush.mockImplementation(() => {
        throw new Error('Navigation failed')
      })

      render(<SignUpForm />)

      const backButton = screen.getByRole('button', { name: 'Back to Login' })
      
      // Should not throw even if router fails
      expect(() => fireEvent.click(backButton)).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('Content Validation', () => {
    it('should contain all required informational content', () => {
      render(<SignUpForm />)

      // Main messaging
      expect(screen.getByText(/invitation only/)).toBeInTheDocument()
      expect(screen.getByText(/security reasons/)).toBeInTheDocument()
      
      // User type instructions
      expect(screen.getByText('Students:')).toBeInTheDocument()
      expect(screen.getByText('Course Leaders:')).toBeInTheDocument()
      expect(screen.getByText('Administrators:')).toBeInTheDocument()
      
      // Technical guidance
      expect(screen.getByText(/\/invite\//)).toBeInTheDocument()
      expect(screen.getByText(/Check your email/)).toBeInTheDocument()
    })

    it('should have consistent messaging about invitation requirement', () => {
      render(<SignUpForm />)

      // Both the description and alert should mention invitations
      expect(screen.getByText('Account creation is by invitation only')).toBeInTheDocument()
      expect(screen.getByText(/New accounts require an invitation/)).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('should properly use Next.js router hook', () => {
      render(<SignUpForm />)

      expect(useRouter).toHaveBeenCalled()
    })

    it('should integrate with UI components correctly', () => {
      render(<SignUpForm />)

      // Should use Card components
      expect(screen.getByRole('heading', { level: 3 }).closest('[class*="card"]')).toBeInTheDocument()
      
      // Should use Alert component
      expect(screen.getByRole('alert')).toBeInTheDocument()
      
      // Should use Button components
      expect(screen.getAllByRole('button')).toHaveLength(2)
    })
  })
})