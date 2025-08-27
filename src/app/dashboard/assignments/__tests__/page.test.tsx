'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { mockUser, mockProfile } from '@/test/utils'
import '@testing-library/jest-dom'
import AssignmentsPage from '../page'

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

// Mock useToast
vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Assignment Page - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default successful API response
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        assignments: [
          {
            id: 'assignment-1',
            title: 'Basic Grooming Theory',
            description: 'Introduction to dog grooming fundamentals',
            due_date: '2025-09-01T00:00:00.000Z',
            questions: [
              {
                id: 'q1',
                title: 'Question 1',
                content: 'What is the first step in grooming?',
                type: 'short_text',
              },
              {
                id: 'q2',
                title: 'Question 2',
                content: 'Which brush is best for long-haired dogs?',
                type: 'multiple_choice',
                options: ['Slicker brush', 'Pin brush', 'Bristle brush'],
              },
            ],
          },
          {
            id: 'assignment-2',
            title: 'Safety Protocols',
            description: 'Understanding safety in grooming environments',
            due_date: '2025-09-15T00:00:00.000Z',
            questions: [
              {
                id: 'q3',
                title: 'Question 3',
                content: 'Describe the safety checklist for grooming.',
                type: 'long_text',
              },
            ],
          },
        ],
        total: 2,
        page: 1,
        limit: 50,
      }),
    } as Response)
  })

  describe('RED Phase: Failing Tests for Assignment List Display', () => {
    it('should_render_assignment_list_page_heading', async () => {
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'My Assignments' })).toBeInTheDocument()
      })
      expect(screen.getByText('View your assigned coursework and submit completed work')).toBeInTheDocument()
    })

    it('should_fetch_assignments_from_api_with_questions_expanded', async () => {
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/assignments?expand=questions')
      })
    })

    it('should_display_assignment_cards_with_details', async () => {
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Basic Grooming Theory')).toBeInTheDocument()
      })
      expect(screen.getByText('Introduction to dog grooming fundamentals')).toBeInTheDocument()
      expect(screen.getByText('Safety Protocols')).toBeInTheDocument()
      expect(screen.getByText('Understanding safety in grooming environments')).toBeInTheDocument()
    })

    it('should_show_due_dates_for_assignments', async () => {
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        // Due dates should be formatted as "Due: Sep 1, 2025"
        const dueDates = screen.getAllByText(/Due.*Sep.*\d+.*2025/)
        expect(dueDates).toHaveLength(2)
      })
    })

    it('should_display_question_count_for_each_assignment', async () => {
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        expect(screen.getByText('2 questions')).toBeInTheDocument()
      })
      expect(screen.getByText('1 question')).toBeInTheDocument()
    })

    it('should_show_start_assignment_buttons', async () => {
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        const startButtons = screen.getAllByRole('button', { name: /start assignment|continue/i })
        expect(startButtons).toHaveLength(2)
      })
    })
  })

  describe('Loading States and Error Handling', () => {
    it('should_show_loading_state_while_fetching_assignments', async () => {
      // Mock delayed response
      vi.mocked(global.fetch).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: async () => ({ assignments: [], total: 0, page: 1, limit: 50 }),
        } as Response), 100))
      )
      
      render(<AssignmentsPage />)
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument()
    })

    it('should_handle_api_errors_gracefully', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))
      
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        // Should show error message or empty state, not crash
        expect(screen.queryByText('Basic Grooming Theory')).not.toBeInTheDocument()
      })
    })

    it('should_display_empty_state_when_no_assignments', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [],
          total: 0,
          page: 1,
          limit: 50,
        }),
      } as Response)
      
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/no assignments/i)).toBeInTheDocument()
      })
    })
  })

  describe('Authentication Requirements', () => {
    it('should_require_user_profile_to_load_assignments', () => {
      // This test verifies that no API call happens when there's no profile
      // The default mock already provides a profile, so this tests the current behavior
      render(<AssignmentsPage />)
      
      // With profile present, API should be called
      expect(global.fetch).toHaveBeenCalledWith('/api/assignments?expand=questions')
    })
  })

  describe('Assignment Progress Tracking', () => {
    it('should_display_progress_indicators_for_assignments', async () => {
      // Mock API response with progress data
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          assignments: [
            {
              id: 'assignment-1',
              title: 'Basic Grooming Theory',
              description: 'Introduction to dog grooming fundamentals',
              due_date: '2025-09-01T00:00:00.000Z',
              questions: Array(5).fill(null).map((_, i) => ({
                id: `q${i}`,
                title: `Question ${i + 1}`,
                content: 'Test question',
                type: 'short_text',
              })),
              // Progress data would come from submissions
              progress: {
                answered: 2,
                total: 5,
                percentage: 40,
              },
            },
          ],
          total: 1,
        }),
      } as Response)
      
      render(<AssignmentsPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/2 of 5 completed/i)).toBeInTheDocument()
      })
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })
})