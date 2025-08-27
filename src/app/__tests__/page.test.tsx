import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@/test/utils'
import '@testing-library/jest-dom'
import HomePage from '../page'
import { createMockSupabaseClient } from '@/types/test-utilities'

// Mock useSupabase hook
vi.mock('@/hooks/use-supabase', () => ({
  useSupabase: vi.fn(() => ({
    user: null,
    loading: false,
  })),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main title and description when not authenticated', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Dog Grooming Theory Coursework App')).toBeInTheDocument()
    })
    expect(screen.getByText('Digital coursework platform for Upper Hound Dog Grooming Academy')).toBeInTheDocument()
  })

  it('renders the features section when not authenticated', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Features Coming Soon')).toBeInTheDocument()
    })
    expect(screen.getByText('Streamlined coursework management with AI-powered assessment')).toBeInTheDocument()
  })

  it('displays action buttons with correct text when not authenticated', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
  })

  it('displays tech stack information when not authenticated', async () => {
    render(<HomePage />)
    
    await waitFor(() => {
      expect(screen.getByText('Built with Next.js 15, Supabase, and OpenAI')).toBeInTheDocument()
    })
  })

  it('shows loading state when authentication is loading', async () => {
    const { useSupabase } = await import('@/hooks/use-supabase')
    vi.mocked(useSupabase).mockReturnValue({
      user: null,
      loading: true,
      profile: null,
      supabase: createMockSupabaseClient(),
      signOut: vi.fn(),
    })

    render(<HomePage />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center')
  })
})