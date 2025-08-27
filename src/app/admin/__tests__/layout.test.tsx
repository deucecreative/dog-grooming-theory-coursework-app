import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import AdminLayout from '../layout'
import { useSupabase } from '@/hooks/use-supabase'
import { createMockSupabaseClient } from '@/types/test-utilities'

// Mock components
vi.mock('@/components/layout/sidebar', () => ({
  Sidebar: () => <nav data-testid="sidebar">Admin Sidebar</nav>
}))

vi.mock('@/components/layout/header', () => ({
  Header: () => <header data-testid="header">Admin Header</header>
}))

vi.mock('@/hooks/use-supabase')

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

describe('Admin Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
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

  it('should render admin layout with header and sidebar', () => {
    render(
      <AdminLayout>
        <div data-testid="admin-content">Admin Page Content</div>
      </AdminLayout>
    )
    
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('admin-content')).toBeInTheDocument()
  })

  it('should have proper layout structure', () => {
    render(
      <AdminLayout>
        <div>Content</div>
      </AdminLayout>
    )
    
    // Should have main container with proper styling
    const container = screen.getByTestId('header').parentElement
    expect(container).toHaveClass('min-h-screen', 'bg-gray-50')
    
    // Should have flex layout for sidebar and main content
    const flexContainer = screen.getByTestId('sidebar').parentElement
    expect(flexContainer).toHaveClass('flex')
  })

  it('should wrap content in main element with proper styling', () => {
    render(
      <AdminLayout>
        <div data-testid="content">Test Content</div>
      </AdminLayout>
    )
    
    const content = screen.getByTestId('content')
    const mainElement = content.closest('main')
    
    expect(mainElement).toBeInTheDocument()
    expect(mainElement).toHaveClass('flex-1', 'p-6')
  })

  it('should render children correctly', () => {
    const TestComponent = () => (
      <div>
        <h1>Admin Test Page</h1>
        <p>This is admin content</p>
      </div>
    )
    
    render(
      <AdminLayout>
        <TestComponent />
      </AdminLayout>
    )
    
    expect(screen.getByText('Admin Test Page')).toBeInTheDocument()
    expect(screen.getByText('This is admin content')).toBeInTheDocument()
  })

  it('should have consistent layout with dashboard', () => {
    // This test ensures admin layout matches dashboard layout structure
    render(
      <AdminLayout>
        <div data-testid="test-content">Admin Content</div>
      </AdminLayout>
    )
    
    // Check for same structural elements as dashboard layout
    expect(screen.getByTestId('header')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    
    // Check layout container structure
    const header = screen.getByTestId('header')
    const sidebar = screen.getByTestId('sidebar')
    const content = screen.getByTestId('test-content')
    
    // Header should be at top level
    expect(header.parentElement).toHaveClass('min-h-screen')
    
    // Sidebar and content should be in flex container
    expect(sidebar.parentElement).toHaveClass('flex')
    expect(content.closest('main')).toHaveClass('flex-1', 'p-6')
  })
})