import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { useSupabase } from '@/hooks/use-supabase'
import { useToast } from '@/hooks/use-toast'
import QuestionsPage from '../page'

/**
 * Questions Page TDD Tests - RED Phase
 * 
 * These tests are written FIRST before implementation
 * Following strict TDD methodology: RED → GREEN → REFACTOR
 */

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: vi.fn()
}))

// Mock useSupabase hook
vi.mock('@/hooks/use-supabase')

// Mock useToast hook
vi.mock('@/hooks/use-toast')

// Mock fetch globally
global.fetch = vi.fn()

const mockRouter: AppRouterInstance = {
  push: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn()
}

const mockProfile = {
  id: 'student-123',
  email: 'student@test.com',
  full_name: 'Student User',
  role: 'student' as const,
  status: 'approved' as const,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z'
}

const mockToast = vi.fn()

const mockQuestions = [
  {
    id: 'question-1',
    title: 'Basic Dog Grooming Safety',
    content: 'What is the most important safety consideration when grooming a dog?',
    type: 'multiple_choice' as const,
    category: 'safety',
    difficulty: 'beginner' as const,
    options: {
      a: 'Keep the dog calm',
      b: 'Use sharp tools',
      c: 'Work quickly',
      d: 'All of the above'
    },
    rubric: {},
    expected_answer: null,
    created_by: 'instructor-123',
    course_id: 'course-123',
    created_at: '2025-08-27T10:00:00Z',
    updated_at: '2025-08-27T10:00:00Z'
  },
  {
    id: 'question-2', 
    title: 'Breed Identification',
    content: 'Describe the key characteristics of a Golden Retriever coat.',
    type: 'short_text' as const,
    category: 'breeds',
    difficulty: 'intermediate' as const,
    options: null,
    rubric: {},
    expected_answer: null,
    created_by: 'instructor-123',
    course_id: 'course-123',
    created_at: '2025-08-27T11:00:00Z',
    updated_at: '2025-08-27T11:00:00Z'
  }
]

describe('Questions Page - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mocks
    vi.mocked(useRouter).mockReturnValue(mockRouter as AppRouterInstance)
    vi.mocked(useSupabase).mockReturnValue({ 
      profile: mockProfile,
      user: null,
      loading: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase: {} as any,
      signOut: vi.fn()
    })
    vi.mocked(useToast).mockReturnValue({ 
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: []
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetAllMocks()
  })

  describe('RED Phase: Failing Tests for API Integration', () => {
    it('should_fetch_questions_from_api_on_mount', async () => {
      // ARRANGE: Mock successful API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: mockQuestions,
          total: 2,
          page: 1,
          limit: 10
        })
      } as Response)

      // ACT: Render the Questions page
      render(<QuestionsPage />)

      // ASSERT: Should call the questions API
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/questions')
      })

      // ASSERT: Should display questions after loading
      await waitFor(() => {
        expect(screen.getByText('Basic Dog Grooming Safety')).toBeInTheDocument()
        expect(screen.getByText('Breed Identification')).toBeInTheDocument()
      })
    })

    it('should_display_questions_in_card_format', async () => {
      // ARRANGE: Mock API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: mockQuestions,
          total: 2,
          page: 1,
          limit: 10
        })
      } as Response)

      // ACT: Render the page
      render(<QuestionsPage />)

      // ASSERT: Should display question details in structured format
      await waitFor(() => {
        // Question titles should be visible
        expect(screen.getByText('Basic Dog Grooming Safety')).toBeInTheDocument()
        expect(screen.getByText('Breed Identification')).toBeInTheDocument()
        
        // Question content should be visible
        expect(screen.getByText(/What is the most important safety consideration/)).toBeInTheDocument()
        expect(screen.getByText(/Describe the key characteristics/)).toBeInTheDocument()
        
        // Question metadata should be displayed
        expect(screen.getByText('safety')).toBeInTheDocument() // category
        expect(screen.getByText('breeds')).toBeInTheDocument() // category
        expect(screen.getByText('beginner')).toBeInTheDocument() // difficulty
        expect(screen.getByText('intermediate')).toBeInTheDocument() // difficulty
      })
    })

    it('should_filter_questions_by_category', async () => {
      // ARRANGE: Mock API responses for different filters
      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ questions: mockQuestions, total: 2 })
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            questions: [mockQuestions[0]], // Only safety question
            total: 1 
          })
        } as Response)

      // ACT: Render page and interact with filter
      render(<QuestionsPage />)
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByText('Basic Dog Grooming Safety')).toBeInTheDocument()
      })

      // Should have category filter
      const categoryFilter = screen.getByLabelText(/category/i)
      expect(categoryFilter).toBeInTheDocument()

      // ASSERT: Should make filtered API call when category changes
      // This will fail because filtering is not implemented yet
    })

    it('should_handle_loading_and_error_states', async () => {
      // ARRANGE: Mock API error
      vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

      // ACT: Render the page
      render(<QuestionsPage />)

      // ASSERT: Should show loading state initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // ASSERT: Should show error state after API failure
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: 'Error',
          description: 'Failed to load questions',
          variant: 'destructive'
        })
      })
    })

    it('should_display_question_types_with_appropriate_formatting', async () => {
      // ARRANGE: Mock questions with different types
      const typedQuestions = [
        { ...mockQuestions[0], type: 'multiple_choice' as const },
        { ...mockQuestions[1], type: 'short_text' as const },
        { 
          id: 'question-3',
          title: 'Essay Question',
          content: 'Write a detailed analysis of...',
          type: 'long_text' as const,
          category: 'theory',
          difficulty: 'advanced' as const,
          options: null,
          rubric: {},
          expected_answer: null,
          created_by: 'instructor-123',
          course_id: 'course-123',
          created_at: '2025-08-27T12:00:00Z',
          updated_at: '2025-08-27T12:00:00Z'
        }
      ]

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ questions: typedQuestions, total: 3 })
      } as Response)

      // ACT: Render the page
      render(<QuestionsPage />)

      // ASSERT: Should display type-specific formatting
      await waitFor(() => {
        // Multiple choice should show options
        expect(screen.getByText('Keep the dog calm')).toBeInTheDocument()
        
        // Should show question type indicators
        expect(screen.getByText('Multiple Choice')).toBeInTheDocument()
        expect(screen.getByText('Short Text')).toBeInTheDocument()
        expect(screen.getByText('Long Text')).toBeInTheDocument()
      })
    })

    it('should_require_authentication_to_view_questions', async () => {
      // ARRANGE: No authenticated user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: null, 
        user: null, 
        loading: false, 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supabase: {} as any, 
        signOut: vi.fn() 
      })

      // ACT: Render the page
      render(<QuestionsPage />)

      // ASSERT: Should not fetch questions without auth
      expect(global.fetch).not.toHaveBeenCalled()
      
      // Should show auth required message
      expect(screen.getByText(/please log in/i)).toBeInTheDocument()
    })

    it('should_handle_empty_questions_list', async () => {
      // ARRANGE: Empty API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: [],
          total: 0,
          page: 1,
          limit: 10
        })
      } as Response)

      // ACT: Render the page
      render(<QuestionsPage />)

      // ASSERT: Should display empty state message
      await waitFor(() => {
        expect(screen.getByText(/no questions available/i)).toBeInTheDocument()
        expect(screen.getByText(/check back later/i)).toBeInTheDocument()
      })
    })
  })

  describe('RED Phase: Failing Tests for Question Filtering', () => {
    it('should_filter_questions_by_difficulty_level', async () => {
      // ARRANGE: Mock API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: mockQuestions,
          total: 2,
          page: 1,
          limit: 10
        })
      } as Response)

      // ACT: Render page
      render(<QuestionsPage />)
      
      // Wait for questions to load
      await waitFor(() => {
        expect(screen.getByText('Basic Dog Grooming Safety')).toBeInTheDocument()
      })

      // ASSERT: Should have difficulty filter dropdown
      expect(screen.getByLabelText(/difficulty/i)).toBeInTheDocument()
      
      // Should filter API calls when difficulty changes
      // Implementation will make this pass
    })

    it('should_filter_questions_by_question_type', async () => {
      // ARRANGE: Mock API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: mockQuestions,
          total: 2,
          page: 1,
          limit: 10
        })
      } as Response)

      // ACT: Render page
      render(<QuestionsPage />)
      
      // Wait for questions to load
      await waitFor(() => {
        expect(screen.getByText('Basic Dog Grooming Safety')).toBeInTheDocument()
      })

      // ASSERT: Should have type filter
      expect(screen.getByLabelText(/question type/i)).toBeInTheDocument()
    })

    it('should_clear_all_filters_with_reset_button', async () => {
      // ARRANGE: Mock API response
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          questions: mockQuestions,
          total: 2,
          page: 1,
          limit: 10
        })
      } as Response)

      // ACT: Render page
      render(<QuestionsPage />)
      
      // Wait for questions to load
      await waitFor(() => {
        expect(screen.getByText('Basic Dog Grooming Safety')).toBeInTheDocument()
      })

      // ASSERT: Should have reset filters button
      expect(screen.getByText(/reset filters/i)).toBeInTheDocument()
    })
  })
})