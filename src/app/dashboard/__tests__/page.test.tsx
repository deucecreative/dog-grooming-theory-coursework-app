import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, mockUser, mockProfile } from '@/test/utils'
import DashboardPage from '../page'

// Mock the useSupabase hook
vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: vi.fn(() => ({
    user: mockUser,
    profile: mockProfile,
    loading: false,
    supabase: {},
    signOut: vi.fn(),
  })),
}))

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main dashboard heading', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    })
    expect(screen.getByText('Welcome to your coursework management system')).toBeInTheDocument()
  })

  it('displays statistics cards', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Active Assignments')).toBeInTheDocument()
    })
    expect(screen.getByText('Completed Work')).toBeInTheDocument()
    expect(screen.getByText('Pending Review')).toBeInTheDocument()
  })

  it('shows correct statistics values', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument() // Active Assignments
    })
    expect(screen.getByText('12')).toBeInTheDocument() // Completed Work
    expect(screen.getByText('2')).toBeInTheDocument() // Pending Review
  })

  it('displays statistics descriptions', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Coursework currently in progress')).toBeInTheDocument()
    })
    expect(screen.getByText('Finished assignments')).toBeInTheDocument()
    expect(screen.getByText('Awaiting course leader feedback')).toBeInTheDocument()
  })

  it('shows additional context for statistics', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('2 due this week')).toBeInTheDocument()
    })
    expect(screen.getByText('85% average score')).toBeInTheDocument()
    expect(screen.getByText('Will be reviewed soon')).toBeInTheDocument()
  })

  it('renders recent assignments section', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Recent Assignments')).toBeInTheDocument()
    })
    expect(screen.getByText('Your latest coursework progress')).toBeInTheDocument()
  })

  it('displays assignment items with correct details', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('Basic Grooming Theory - Module 1')).toBeInTheDocument()
    })
    expect(screen.getByText('Dog Breed Identification')).toBeInTheDocument()
    expect(screen.getByText('Safety Protocols')).toBeInTheDocument()
  })

  it('shows assignment progress information', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('3 of 5 questions completed')).toBeInTheDocument()
    })
    expect(screen.getByText('Completed - Score: 92%')).toBeInTheDocument()
    expect(screen.getByText('Due in 3 days')).toBeInTheDocument()
  })

  it('displays action buttons for assignments', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
  })

  it('renders progress bars', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      const progressBars = screen.getAllByRole('progressbar')
      expect(progressBars).toHaveLength(3)
    })
  })

  it('has proper grid layout for statistics cards', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      const statsGrid = screen.getByText('Active Assignments').closest('.grid')
      expect(statsGrid).toHaveClass('grid', 'gap-6', 'md:grid-cols-2', 'lg:grid-cols-3')
    })
  })

  it('uses appropriate color coding for statistics', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      const activeAssignments = screen.getByText('3')
      expect(activeAssignments).toHaveClass('text-blue-600')
    })
    
    const completedWork = screen.getByText('12')
    expect(completedWork).toHaveClass('text-green-600')
    
    const pendingReview = screen.getByText('2')
    expect(pendingReview).toHaveClass('text-orange-600')
  })

  it('has proper spacing and layout', async () => {
    const { container } = render(<DashboardPage />)
    
    await waitFor(() => {
      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('space-y-6')
    })
  })

  it('displays all required headings with proper hierarchy', async () => {
    render(<DashboardPage />)
    
    await waitFor(() => {
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('Dashboard')
    })
    
    // Check assignment titles (h4 level)
    const assignmentHeadings = screen.getAllByRole('heading', { level: 4 })
    expect(assignmentHeadings.length).toBe(3) // Three assignment cards
    expect(assignmentHeadings[0]).toHaveTextContent('Basic Grooming Theory - Module 1')
    expect(assignmentHeadings[1]).toHaveTextContent('Dog Breed Identification')
    expect(assignmentHeadings[2]).toHaveTextContent('Safety Protocols')
  })

})