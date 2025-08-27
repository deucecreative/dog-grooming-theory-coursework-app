import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/utils'
import AdminDashboard from '../page'

describe('AdminDashboard', () => {
  it('renders the admin dashboard heading', () => {
    render(<AdminDashboard />)
    
    expect(screen.getByRole('heading', { level: 1, name: 'Admin Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('System overview and management')).toBeInTheDocument()
  })

  it('displays all system metrics cards', () => {
    render(<AdminDashboard />)
    
    // Check all metric cards are present
    expect(screen.getByText('Total Users')).toBeInTheDocument()
    expect(screen.getByText('Questions')).toBeInTheDocument()
    expect(screen.getByText('Assignments')).toBeInTheDocument()
    expect(screen.getByText('AI Usage')).toBeInTheDocument()
  })

  it('shows correct metric values', () => {
    render(<AdminDashboard />)
    
    // Check metric numbers
    expect(screen.getByText('127')).toBeInTheDocument() // Total Users
    expect(screen.getByText('45')).toBeInTheDocument() // Questions
    expect(screen.getByText('8')).toBeInTheDocument() // Assignments
    expect(screen.getByText('342')).toBeInTheDocument() // AI Usage
  })

  it('displays metric descriptions', () => {
    render(<AdminDashboard />)
    
    expect(screen.getByText('Active system users')).toBeInTheDocument()
    expect(screen.getByText('Total question bank')).toBeInTheDocument()
    expect(screen.getByText('Active coursework')).toBeInTheDocument()
    expect(screen.getByText('Assessments this month')).toBeInTheDocument()
  })

  it('shows additional metric context', () => {
    render(<AdminDashboard />)
    
    expect(screen.getByText('+12 this month')).toBeInTheDocument()
    expect(screen.getByText('3 pending review')).toBeInTheDocument()
    expect(screen.getByText('2 due this week')).toBeInTheDocument()
    expect(screen.getByText('89% accuracy')).toBeInTheDocument()
  })

  it('renders system status section', () => {
    render(<AdminDashboard />)
    
    expect(screen.getByText('System Status')).toBeInTheDocument()
    expect(screen.getByText('Current system health and performance')).toBeInTheDocument()
  })

  it('displays system health indicators', () => {
    render(<AdminDashboard />)
    
    // Check system components
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('AI Service')).toBeInTheDocument()
    expect(screen.getByText('Storage')).toBeInTheDocument()
  })

  it('shows system component status', () => {
    render(<AdminDashboard />)
    
    expect(screen.getByText('Healthy')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('85% capacity')).toBeInTheDocument()
  })

  it('displays appropriate status indicators', () => {
    render(<AdminDashboard />)
    
    // Check for status symbols (using text content)
    const statusIndicators = screen.getAllByText('✓')
    expect(statusIndicators).toHaveLength(2) // Database and AI Service are healthy
    
    expect(screen.getByText('⚠')).toBeInTheDocument() // Storage warning
  })

  it('uses appropriate color coding for metrics', () => {
    render(<AdminDashboard />)
    
    // Check that numbers have appropriate color classes
    const totalUsers = screen.getByText('127')
    expect(totalUsers).toHaveClass('text-blue-600')
    
    const questions = screen.getByText('45')
    expect(questions).toHaveClass('text-green-600')
    
    const assignments = screen.getByText('8')
    expect(assignments).toHaveClass('text-orange-600')
    
    const aiUsage = screen.getByText('342')
    expect(aiUsage).toHaveClass('text-purple-600')
  })

  it('has proper grid layout for metrics', () => {
    render(<AdminDashboard />)
    
    const metricsGrid = screen.getByText('Total Users').closest('.grid')
    expect(metricsGrid).toHaveClass('grid', 'gap-6', 'md:grid-cols-2', 'lg:grid-cols-4')
  })

  it('has proper grid layout for system status', () => {
    render(<AdminDashboard />)
    
    const statusGrid = screen.getByText('Database').closest('.grid')
    expect(statusGrid).toHaveClass('grid', 'gap-4', 'md:grid-cols-3')
  })

  it('applies consistent card styling', () => {
    render(<AdminDashboard />)
    
    // All status items should have consistent styling
    const statusItems = [
      screen.getByText('Database').closest('.text-center'),
      screen.getByText('AI Service').closest('.text-center'),
      screen.getByText('Storage').closest('.text-center'),
    ]
    
    statusItems.forEach(item => {
      expect(item).toHaveClass('text-center', 'p-4', 'border', 'rounded-lg')
    })
  })

  it('has proper spacing and layout structure', () => {
    render(<AdminDashboard />)
    
    // The root container has the space-y-6 class
    const { container } = render(<AdminDashboard />)
    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass('space-y-6')
  })

  it('displays appropriate status colors', () => {
    render(<AdminDashboard />)
    
    // Check healthy status (green)
    const healthyStatuses = screen.getAllByText('✓')
    healthyStatuses.forEach(status => {
      expect(status).toHaveClass('text-green-600')
    })
    
    // Check warning status (yellow)
    const warningStatus = screen.getByText('⚠')
    expect(warningStatus).toHaveClass('text-yellow-600')
  })
})