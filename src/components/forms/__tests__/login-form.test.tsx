import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@/test/utils'
import { LoginForm } from '../login-form'

// Mock next/navigation
const mockPush = vi.fn()
const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

// Mock useToast
const mockToast = vi.fn()
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}))

// Mock Supabase client
const mockSignInWithPassword = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
    },
  }),
}))

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form elements', () => {
    render(<LoginForm />)

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText('Enter your credentials to access your coursework')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument()
  })

  it('allows user to enter email and password', async () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email') as HTMLInputElement
    const passwordInput = screen.getByLabelText('Password') as HTMLInputElement

    await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    await fireEvent.change(passwordInput, { target: { value: 'password123' } })

    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  it('submits form with email and password', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await act(async () => {
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })
      await fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      })
    })
  })

  it('shows loading state during submission', async () => {
    mockSignInWithPassword.mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    // Fill in required fields first
    await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    await fireEvent.change(passwordInput, { target: { value: 'password123' } })
    
    // Click submit and check loading state
    await fireEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Signing in...')).toBeInTheDocument()
    })
    expect(submitButton).toBeDisabled()
  })

  it('handles successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: { id: '123', email: 'test@example.com' } },
      error: null,
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await act(async () => {
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'password123' } })
      await fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('handles login error', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null },
      error: new Error('Invalid login credentials'),
    })

    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign In' })

    await act(async () => {
      await fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
      await fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
      await fireEvent.click(submitButton)
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Login Failed',
        description: 'Invalid email or password. Please check your credentials and try again.',
        variant: 'destructive',
      })
    })
  })

  it('requires email and password fields', () => {
    render(<LoginForm />)

    const emailInput = screen.getByLabelText('Email')
    const passwordInput = screen.getByLabelText('Password')

    expect(emailInput).toBeRequired()
    expect(passwordInput).toBeRequired()
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('has signup link', () => {
    render(<LoginForm />)

    const signupButton = screen.getByRole('button', { name: 'Sign up' })
    expect(signupButton).toBeInTheDocument()
  })
})