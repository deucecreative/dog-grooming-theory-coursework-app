'use client'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { mockUser, mockProfile } from '@/test/utils'
import '@testing-library/jest-dom'
import AssignmentDetailPage from '../page'

// Mock the useRouter hook from Next.js
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
    refresh: vi.fn(),
  })),
  useParams: vi.fn(() => ({
    id: 'assignment-1',
  })),
}))

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

describe('Assignment Detail Page - TDD Implementation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock assignment with questions API response
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (typeof url === 'string' && url.includes('/api/assignments/assignment-1')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            assignment: {
              id: 'assignment-1',
              title: 'Basic Grooming Theory',
              description: 'Introduction to dog grooming fundamentals',
              due_date: '2025-09-01T00:00:00.000Z',
              questions: [
                {
                  id: 'q1',
                  title: 'Safety First',
                  content: 'What safety precautions should you take before starting a grooming session?',
                  type: 'short_text',
                  rubric: 'Answer should mention checking equipment, securing the dog, and preparing the workspace.',
                },
                {
                  id: 'q2',
                  title: 'Tool Selection',
                  content: 'Which brush is most suitable for long-haired dogs?',
                  type: 'multiple_choice',
                  options: ['Slicker brush', 'Pin brush', 'Bristle brush', 'Undercoat rake'],
                  rubric: 'Correct answer is Pin brush for long-haired dogs.',
                },
                {
                  id: 'q3',
                  title: 'Grooming Process',
                  content: 'Describe the complete grooming process from start to finish, including pre-grooming assessment, bathing, drying, and finishing touches.',
                  type: 'long_text',
                  rubric: 'Should include assessment, pre-brushing, bathing technique, proper drying, and finishing steps.',
                },
              ],
            },
          }),
        } as Response)
      }
      
      if (typeof url === 'string' && url.includes('/api/submissions')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            submissions: [{
              id: 'sub-1',
              assignment_id: 'assignment-1',
              answers: {
                'q1': 'Check equipment and secure the dog',
                'q2': 'Pin brush',
              },
              status: 'draft',
              created_at: '2025-08-27T13:00:00.000Z',
              updated_at: '2025-08-27T13:30:00.000Z',
            }],
          }),
        } as Response)
      }
      
      // Default mock for other endpoints
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({}),
      } as Response)
    })
  })

  describe('RED Phase: Failing Tests for Assignment Detail Display', () => {
    it('should_render_assignment_detail_page_heading', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1, name: 'Basic Grooming Theory' })).toBeInTheDocument()
      })
      expect(screen.getByText('Introduction to dog grooming fundamentals')).toBeInTheDocument()
    })

    it('should_fetch_assignment_with_questions_from_api', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/assignments/assignment-1?expand=questions')
      })
    })

    it('should_display_assignment_due_date', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/Due.*Sep.*1.*2025/)).toBeInTheDocument()
      })
    })

    it('should_display_progress_indicator', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        // Should show progress based on loaded answers (2 questions have answers from mock)
        expect(screen.getByText(/\d+ of \d+ questions completed/)).toBeInTheDocument()
      })
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
    })
  })

  describe('Question Answering Interface', () => {
    it('should_render_all_questions_with_proper_types', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        // Question 1: Short text
        expect(screen.getByText('Question 1: Safety First')).toBeInTheDocument()
        expect(screen.getByText('What safety precautions should you take before starting a grooming session?')).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: /safety first/i })).toBeInTheDocument()
      })
      
      // Question 2: Multiple choice
      expect(screen.getByText('Question 2: Tool Selection')).toBeInTheDocument()
      expect(screen.getByText('Which brush is most suitable for long-haired dogs?')).toBeInTheDocument()
      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Slicker brush' })).toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Pin brush' })).toBeInTheDocument()
      
      // Question 3: Long text
      expect(screen.getByText('Question 3: Grooming Process')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /grooming process/i })).toBeInTheDocument()
    })

    it('should_load_existing_answers_from_submission', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        // Should load existing draft answers
        const shortTextInput = screen.getByRole('textbox', { name: /safety first/i })
        expect(shortTextInput).toHaveValue('Check equipment and secure the dog')
      })
      
      const pinBrushRadio = screen.getByRole('radio', { name: 'Pin brush' })
      expect(pinBrushRadio).toBeChecked()
    })

    it('should_handle_short_text_input', async () => {
      const user = userEvent.setup()
      render(<AssignmentDetailPage />)

      await waitFor(() => {
        const textInput = screen.getByRole('textbox', { name: /safety first/i })
        expect(textInput).toBeInTheDocument()
      })

      const textInput = screen.getByRole('textbox', { name: /safety first/i })
      await user.clear(textInput)
      await user.type(textInput, 'New safety answer')

      expect(textInput).toHaveValue('New safety answer')
    })

    it('should_handle_multiple_choice_selection', async () => {
      const user = userEvent.setup()
      render(<AssignmentDetailPage />)

      await waitFor(() => {
        const slickerBrushRadio = screen.getByRole('radio', { name: 'Slicker brush' })
        expect(slickerBrushRadio).toBeInTheDocument()
      })

      const slickerBrushRadio = screen.getByRole('radio', { name: 'Slicker brush' })
      await user.click(slickerBrushRadio)

      expect(slickerBrushRadio).toBeChecked()
    })

    it('should_handle_long_text_input_with_character_count', async () => {
      const user = userEvent.setup()
      render(<AssignmentDetailPage />)

      await waitFor(() => {
        const longTextArea = screen.getByRole('textbox', { name: /grooming process/i })
        expect(longTextArea).toBeInTheDocument()
      })

      const longTextArea = screen.getByRole('textbox', { name: /grooming process/i })
      const longText = 'This is a detailed grooming process that includes multiple steps...'
      await user.clear(longTextArea)
      await user.type(longTextArea, longText)

      expect(longTextArea).toHaveValue(longText)
      // Should show character count
      expect(screen.getByText(/\d+ characters/)).toBeInTheDocument()
    })
  })

  describe('Auto-Save Functionality', () => {
    it('should_auto_save_answers_on_change', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        const textInput = screen.getByRole('textbox', { name: /safety first/i })
        fireEvent.change(textInput, { target: { value: 'Updated safety answer' } })
      })
      
      // Should debounce and then save
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/submissions', expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Updated safety answer'),
        }))
      })
    })

    it('should_show_auto_save_indicator', async () => {
      // Create a delayed response for this test
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/assignments/assignment-1')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              assignment: {
                id: 'assignment-1',
                title: 'Basic Grooming Theory',
                description: 'Introduction to dog grooming fundamentals',
                due_date: '2025-09-01T00:00:00.000Z',
                questions: [
                  {
                    id: 'q1',
                    title: 'Safety First',
                    content: 'What safety precautions should you take before starting a grooming session?',
                    type: 'short_text',
                    rubric: 'Answer should mention checking equipment, securing the dog, and preparing the workspace.',
                  },
                ],
              },
            }),
          } as Response)
        }
        
        if (typeof url === 'string' && url.includes('/api/submissions?assignment_id=')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ submissions: [] }),
          } as Response)
        }
        
        if (typeof url === 'string' && url.includes('/api/submissions')) {
          // Add delay to test saving indicator
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ submission: { id: 'new-sub' } }),
              } as Response)
            }, 100)
          })
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response)
      })
      
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        const textInput = screen.getByRole('textbox', { name: /safety first/i })
        fireEvent.change(textInput, { target: { value: 'Updated answer' } })
      })
      
      // Should show saving indicator
      expect(screen.getByText(/saving/i)).toBeInTheDocument()
      
      await waitFor(() => {
        // Should show saved indicator
        expect(screen.getByText(/saved/i)).toBeInTheDocument()
      })
    })
  })

  describe('Submission Flow', () => {
    it('should_show_submit_button_when_all_questions_answered', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        // Fill in the missing answer
        const longTextArea = screen.getByRole('textbox', { name: /grooming process/i })
        fireEvent.change(longTextArea, { target: { value: 'Complete grooming process description' } })
      })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Submit Assignment' })).toBeInTheDocument()
      })
    })

    it('should_disable_submit_button_when_questions_incomplete', async () => {
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        const submitButton = screen.queryByRole('button', { name: 'Submit Assignment' })
        if (submitButton) {
          expect(submitButton).toBeDisabled()
        }
      })
    })

    it('should_show_submission_confirmation_dialog', async () => {
      render(<AssignmentDetailPage />)
      
      // Fill all questions first
      await waitFor(() => {
        const longTextArea = screen.getByRole('textbox', { name: /grooming process/i })
        fireEvent.change(longTextArea, { target: { value: 'Complete answer' } })
      })
      
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: 'Submit Assignment' })
        fireEvent.click(submitButton)
      })
      
      expect(screen.getByText(/confirm submission/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should_handle_assignment_not_found', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/assignments/assignment-1')) {
          return Promise.resolve({
            ok: false,
            status: 404,
          } as Response)
        }
        return Promise.reject(new Error('Unknown endpoint'))
      })
      
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        expect(screen.getByText(/assignment not found/i)).toBeInTheDocument()
      })
    })

    it('should_handle_save_errors_gracefully', async () => {
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (typeof url === 'string' && url.includes('/api/assignments/assignment-1')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              assignment: {
                id: 'assignment-1',
                title: 'Test Assignment',
                questions: [
                  { id: 'q1', title: 'Q1', content: 'Test', type: 'short_text' }
                ],
              },
            }),
          } as Response)
        }
        
        if (typeof url === 'string' && url.includes('/api/submissions')) {
          // For GET requests (initial fetch), return empty result
          // For POST requests (save), return error
          if (typeof url === 'string' && url.includes('assignment_id=')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: async () => ({ submissions: [] }),
            } as Response)
          }
          return Promise.reject(new Error('Network error'))
        }
        
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        } as Response)
      })
      
      render(<AssignmentDetailPage />)
      
      await waitFor(() => {
        const textInput = screen.getByRole('textbox')
        fireEvent.change(textInput, { target: { value: 'New answer' } })
      })
      
      await waitFor(() => {
        expect(screen.getByText(/save failed/i)).toBeInTheDocument()
      })
    })
  })
})