import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import LoginPage from '../page'

describe('LoginPage', () => {
  it('renders the login form card', () => {
    render(<LoginPage />)
    
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText('Enter your credentials to access your coursework')).toBeInTheDocument()
  })

  it('displays email input field', () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    expect(emailInput).toBeInTheDocument()
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('placeholder', 'your.email@example.com')
    expect(emailInput).toBeRequired()
  })

  it('displays password input field', () => {
    render(<LoginPage />)
    
    const passwordInput = screen.getByLabelText('Password')
    expect(passwordInput).toBeInTheDocument()
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toBeRequired()
  })

  it('renders sign in button', () => {
    render(<LoginPage />)
    
    const signInButton = screen.getByRole('button', { name: 'Sign In' })
    expect(signInButton).toBeInTheDocument()
    expect(signInButton).toHaveClass('w-full')
  })

  it('displays help text for account creation', () => {
    render(<LoginPage />)
    
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign up' })).toBeInTheDocument()
  })

  it('has proper form structure', () => {
    render(<LoginPage />)
    
    // Check that inputs are properly associated with labels
    const emailInput = screen.getByRole('textbox', { name: /email/i })
    const passwordInput = screen.getByLabelText('Password')
    
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
  })

  it('has proper card layout structure', () => {
    render(<LoginPage />)
    
    // Check card header
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText('Enter your credentials to access your coursework')).toBeInTheDocument()
    
    // Check card content area exists
    const emailLabel = screen.getByText('Email')
    const passwordLabel = screen.getByText('Password')
    expect(emailLabel).toBeInTheDocument()
    expect(passwordLabel).toBeInTheDocument()
  })

  it('applies correct styling to form elements', () => {
    render(<LoginPage />)
    
    const signInButton = screen.getByRole('button', { name: 'Sign In' })
    expect(signInButton).toHaveClass('w-full')
    
    // Check that the contact link is styled as a link variant
    const contactButton = screen.getByRole('button', { name: 'Sign up' })
    expect(contactButton).toHaveClass('p-0', 'h-auto')
  })

  it('has proper accessibility structure', () => {
    render(<LoginPage />)
    
    // Check that form has proper labeling
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    
    expect(emailInput).toBeInTheDocument()
    expect(passwordInput).toBeInTheDocument()
    
    // Check required attributes
    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
  })

  it('displays appropriate input types', () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('has proper layout spacing', () => {
    render(<LoginPage />)
    
    // The form fields should be in a container with proper spacing
    const emailLabel = screen.getByText('Email').parentElement
    const passwordLabel = screen.getByText('Password').parentElement
    
    expect(emailLabel).toHaveClass('space-y-2')
    expect(passwordLabel).toHaveClass('space-y-2')
  })
})