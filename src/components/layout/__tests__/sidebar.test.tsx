import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@/test/utils'
import { Sidebar } from '../sidebar'

// Mock the usePathname hook to return different paths
const mockUsePathname = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', async () => {
  const actual = await vi.importActual('next/navigation')
  return {
    ...actual,
    usePathname: mockUsePathname,
  }
})

// Mock useSupabase hook
vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: vi.fn(() => ({
    user: null,
    profile: { role: 'student' },
    loading: false,
    supabase: {},
    signOut: vi.fn(),
  })),
}))

describe('Sidebar', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/dashboard')
  })

  it('renders student navigation by default', () => {
    render(<Sidebar />)
    
    // Check student-specific navigation items
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Assignments')).toBeInTheDocument()
    expect(screen.getByText('My Progress')).toBeInTheDocument()
    
    // Should not show course leader or admin items
    expect(screen.queryByText('Review Submissions')).not.toBeInTheDocument()
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
  })

  it('highlights active navigation item', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar />)
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
    expect(dashboardLink).toHaveClass('bg-blue-50', 'text-blue-700')
  })

  it('shows non-active items without highlight', () => {
    mockUsePathname.mockReturnValue('/dashboard')
    render(<Sidebar />)
    
    const assignmentsLink = screen.getByRole('link', { name: /assignments/i })
    expect(assignmentsLink).toHaveClass('text-gray-600')
    expect(assignmentsLink).not.toHaveClass('bg-blue-50', 'text-blue-700')
  })

  it('has proper navigation structure', () => {
    render(<Sidebar />)
    
    const navigation = screen.getByRole('navigation')
    expect(navigation).toBeInTheDocument()
    expect(navigation).toHaveClass('p-4', 'space-y-2')
  })

  it('renders correct sidebar dimensions and styling', () => {
    render(<Sidebar />)
    
    const sidebar = screen.getByRole('navigation').parentElement
    expect(sidebar).toHaveClass('w-64', 'bg-white', 'border-r', 'border-gray-200')
  })

  it('renders icons for each navigation item', () => {
    render(<Sidebar />)
    
    // Check that icons are rendered (mocked in setup)
    const icons = screen.getAllByTestId('lucide-icon')
    expect(icons).toHaveLength(3) // Dashboard, Assignments, My Progress
  })

  it('has proper link structure', () => {
    render(<Sidebar />)
    
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i })
    expect(dashboardLink).toHaveAttribute('href', '/dashboard')
    
    const assignmentsLink = screen.getByRole('link', { name: /assignments/i })
    expect(assignmentsLink).toHaveAttribute('href', '/dashboard/assignments')
  })

  it('applies consistent link styling', () => {
    render(<Sidebar />)
    
    const links = screen.getAllByRole('link')
    
    links.forEach(link => {
      expect(link).toHaveClass(
        'flex',
        'items-center',
        'space-x-3',
        'px-3',
        'py-2',
        'rounded-md',
        'text-sm',
        'font-medium',
        'transition-colors'
      )
    })
  })

  it('handles different active paths correctly', () => {
    // Test with assignments page
    mockUsePathname.mockReturnValue('/dashboard/assignments')
    const { rerender } = render(<Sidebar />)
    
    const assignmentsLink = screen.getByRole('link', { name: /assignments/i })
    expect(assignmentsLink).toHaveClass('bg-blue-50', 'text-blue-700')
    
    // Test with progress page
    mockUsePathname.mockReturnValue('/dashboard/progress')
    rerender(<Sidebar />)
    
    const progressLink = screen.getByRole('link', { name: /my progress/i })
    expect(progressLink).toHaveClass('bg-blue-50', 'text-blue-700')
  })

  it('maintains proper accessibility', () => {
    render(<Sidebar />)
    
    const links = screen.getAllByRole('link')
    
    // Each link should be accessible
    links.forEach(link => {
      expect(link).toBeInTheDocument()
      expect(link).toHaveAttribute('href')
    })
  })
})