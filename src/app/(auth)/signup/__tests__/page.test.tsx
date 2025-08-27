import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import SignUpPage from '../page'

// Mock the SignUpForm component
vi.mock('@/components/forms/signup-form', () => ({
  SignUpForm: () => (
    <div data-testid="signup-form">
      <h2>Mocked SignUp Form</h2>
      <p>Account creation is by invitation only</p>
    </div>
  ),
}))

describe('SignUp Page', () => {
  describe('Rendering', () => {
    it('should render the signup page with branding and form', () => {
      render(<SignUpPage />)

      // Check main heading
      expect(screen.getByText('Upper Hound Academy')).toBeInTheDocument()
      
      // Check subtitle
      expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      
      // Check that SignUpForm component is rendered
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<SignUpPage />)

      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Upper Hound Academy')

      const formHeading = screen.getByRole('heading', { level: 2 })
      expect(formHeading).toHaveTextContent('Mocked SignUp Form')
    })

    it('should display the academy branding prominently', () => {
      render(<SignUpPage />)

      const heading = screen.getByText('Upper Hound Academy')
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H1')
    })

    it('should include contextual subtitle about account creation', () => {
      render(<SignUpPage />)

      const subtitle = screen.getByText('Create Your Account')
      expect(subtitle).toBeInTheDocument()
    })
  })

  describe('Layout and Styling', () => {
    it('should apply proper CSS classes for centering and layout', () => {
      const { container } = render(<SignUpPage />)

      const outerDiv = container.firstChild as HTMLElement
      expect(outerDiv).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center', 'bg-gray-50')

      const contentWrapper = outerDiv.firstChild as HTMLElement
      expect(contentWrapper).toHaveClass('w-full', 'max-w-md')
    })

    it('should have centered content with proper spacing', () => {
      const { container } = render(<SignUpPage />)

      const headerSection = container.querySelector('.text-center.mb-8')
      expect(headerSection).toBeInTheDocument()
    })

    it('should apply proper typography classes to headings', () => {
      render(<SignUpPage />)

      const mainHeading = screen.getByText('Upper Hound Academy')
      expect(mainHeading).toHaveClass('text-3xl', 'font-bold', 'text-gray-900')

      const subtitle = screen.getByText('Create Your Account')
      expect(subtitle).toHaveClass('text-gray-600', 'mt-2')
    })
  })

  describe('Component Integration', () => {
    it('should render the SignUpForm component', () => {
      render(<SignUpPage />)

      // Verify that the SignUpForm component is included
      expect(screen.getByTestId('signup-form')).toBeInTheDocument()
      
      // Verify content from the mocked component appears
      expect(screen.getByText('Account creation is by invitation only')).toBeInTheDocument()
    })

    it('should maintain proper component structure', () => {
      const { container } = render(<SignUpPage />)

      // Should have header section followed by form
      const wrapper = container.querySelector('.w-full.max-w-md')
      expect(wrapper?.children).toHaveLength(2) // header section + SignUpForm
    })
  })

  describe('Accessibility', () => {
    it('should have accessible heading structure', () => {
      render(<SignUpPage />)

      const headings = screen.getAllByRole('heading')
      expect(headings).toHaveLength(2)
      
      // Main page heading should be h1
      const h1 = screen.getByRole('heading', { level: 1 })
      expect(h1).toHaveTextContent('Upper Hound Academy')
      
      // Form heading should be h2 (from mocked component)
      const h2 = screen.getByRole('heading', { level: 2 })
      expect(h2).toHaveTextContent('Mocked SignUp Form')
    })

    it('should have descriptive page content', () => {
      render(<SignUpPage />)

      // Should have clear branding
      expect(screen.getByText('Upper Hound Academy')).toBeInTheDocument()
      
      // Should have clear page purpose
      expect(screen.getByText('Create Your Account')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('should use responsive layout classes', () => {
      const { container } = render(<SignUpPage />)

      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer).toHaveClass('min-h-screen') // Full height on all screens

      const contentWrapper = outerContainer.firstChild as HTMLElement
      expect(contentWrapper).toHaveClass('w-full', 'max-w-md') // Responsive width with max constraint
    })

    it('should center content both horizontally and vertically', () => {
      const { container } = render(<SignUpPage />)

      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer).toHaveClass('flex', 'items-center', 'justify-center')
    })
  })

  describe('Visual Design', () => {
    it('should use appropriate background color', () => {
      const { container } = render(<SignUpPage />)

      const outerContainer = container.firstChild as HTMLElement
      expect(outerContainer).toHaveClass('bg-gray-50')
    })

    it('should apply proper text colors for contrast', () => {
      render(<SignUpPage />)

      const mainHeading = screen.getByText('Upper Hound Academy')
      expect(mainHeading).toHaveClass('text-gray-900') // Dark text for good contrast

      const subtitle = screen.getByText('Create Your Account')
      expect(subtitle).toHaveClass('text-gray-600') // Slightly lighter for hierarchy
    })

    it('should have consistent spacing between elements', () => {
      const { container } = render(<SignUpPage />)

      const headerSection = container.querySelector('.mb-8')
      expect(headerSection).toBeInTheDocument() // Space between header and form

      const subtitle = screen.getByText('Create Your Account')
      expect(subtitle).toHaveClass('mt-2') // Space between title and subtitle
    })
  })

  describe('Branding', () => {
    it('should prominently display the academy name', () => {
      render(<SignUpPage />)

      const academyName = screen.getByText('Upper Hound Academy')
      expect(academyName).toBeInTheDocument()
      expect(academyName.tagName).toBe('H1')
      expect(academyName).toHaveClass('text-3xl', 'font-bold')
    })

    it('should provide clear context about the page purpose', () => {
      render(<SignUpPage />)

      expect(screen.getByText('Create Your Account')).toBeInTheDocument()
      expect(screen.getByText('Account creation is by invitation only')).toBeInTheDocument()
    })
  })
})