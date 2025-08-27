import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/utils'
import userEvent from '@testing-library/user-event'
import { Header } from '../header'

// Mock useSupabase hook with authenticated user
vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: vi.fn(() => ({
    user: {
      id: '123',
      email: 'test@example.com',
    },
    profile: {
      id: '123',
      email: 'test@example.com', 
      full_name: 'Student Name',
      role: 'student',
    },
    loading: false,
    supabase: {},
    signOut: vi.fn(),
  })),
}))

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

describe('Header', () => {
  it('renders the academy name and subtitle', () => {
    render(<Header />)
    
    expect(screen.getByText('Upper Hound Academy')).toBeInTheDocument()
    expect(screen.getByText('Coursework Management')).toBeInTheDocument()
  })

  it('displays user dropdown with correct structure', () => {
    render(<Header />)
    
    // Check if dropdown trigger is present
    const userButton = screen.getByRole('button')
    expect(userButton).toBeInTheDocument()
    expect(userButton).toHaveTextContent('Student Name')
  })

  it('has proper dropdown menu items when opened', async () => {
    const user = userEvent.setup()
    render(<Header />)
    
    const userButton = screen.getByRole('button')
    await user.click(userButton)
    
    // Check for dropdown menu items
    // Note: These might not be visible in JSDOM without proper dropdown implementation
    // but the structure should be there
    const dropdownContent = screen.getByRole('menu', { hidden: true })
    expect(dropdownContent).toBeInTheDocument()
  })

  it('applies correct styling classes', () => {
    render(<Header />)
    
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('bg-white', 'border-b', 'border-gray-200', 'px-6', 'py-4')
  })

  it('has responsive layout structure', () => {
    render(<Header />)
    
    const headerContent = screen.getByRole('banner').firstChild
    expect(headerContent).toHaveClass('flex', 'justify-between', 'items-center')
  })

  it('renders user icon in dropdown trigger', () => {
    render(<Header />)
    
    // Check that Lucide User icon is rendered (mocked in setup)
    expect(screen.getByTestId('lucide-icon')).toBeInTheDocument()
  })

  it('has semantic header structure', () => {
    render(<Header />)
    
    // Check semantic HTML structure
    const header = screen.getByRole('banner')
    expect(header.tagName).toBe('HEADER')
    
    // Check heading hierarchy
    const mainHeading = screen.getByRole('heading', { level: 1 })
    expect(mainHeading).toHaveTextContent('Upper Hound Academy')
  })

  it('maintains consistent branding', () => {
    render(<Header />)
    
    const title = screen.getByText('Upper Hound Academy')
    expect(title).toHaveClass('text-xl', 'font-semibold', 'text-gray-900')
    
    const subtitle = screen.getByText('Coursework Management')
    expect(subtitle).toHaveClass('text-sm', 'text-gray-600')
  })
})