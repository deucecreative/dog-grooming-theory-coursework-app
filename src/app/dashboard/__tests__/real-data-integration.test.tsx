import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useSupabase } from '@/hooks/use-supabase'
import { createClient } from '@/lib/supabase/client'
import DashboardPage from '../page'

/**
 * Dashboard Real Data Integration Tests - TDD Phase
 * 
 * RED Phase: Write failing tests for real data integration
 * This will test that the dashboard fetches and displays real data
 * instead of hardcoded mock values.
 */

// Mock dependencies
vi.mock('@/hooks/use-supabase')
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(), 
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  }))
}))

// Mock fetch globally
global.fetch = vi.fn()

const mockApprovedStudent = {
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

const mockApprovedCourseLeader = {
  id: 'leader-123',
  email: 'leader@test.com', 
  full_name: 'Course Leader',
  role: 'course_leader' as const,
  status: 'approved' as const,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z'
}

const mockApprovedAdmin = {
  id: 'admin-123',
  email: 'admin@test.com',
  full_name: 'Admin User',
  role: 'admin' as const,
  status: 'approved' as const,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z'
}

const mockStudentUser = {
  id: 'student-123', 
  email: 'student@test.com',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
  phone: undefined,
  role: 'authenticated',
  updated_at: '2023-01-01T00:00:00.000Z'
}

describe('Dashboard Real Data Integration Tests - TDD RED Phase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Student Dashboard Real Data Integration', () => {
    it('should_fetch_and_display_real_active_assignments_count', async () => {
      // ARRANGE: Approved student user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockApprovedStudent,
        user: mockStudentUser,
        loading: false,
        supabase: createClient(),
        signOut: vi.fn()
      })

      // ARRANGE: Mock API response for active assignments
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (url === '/api/assignments/active') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              assignments: [
                { id: 'assign-1', title: 'Test Assignment 1', status: 'in_progress' },
                { id: 'assign-2', title: 'Test Assignment 2', status: 'in_progress' },
                { id: 'assign-3', title: 'Test Assignment 3', status: 'in_progress' },
                { id: 'assign-4', title: 'Test Assignment 4', status: 'in_progress' },
                { id: 'assign-5', title: 'Test Assignment 5', status: 'in_progress' }
              ]
            })
          } as Response
        }
        return { ok: false, status: 404 } as Response
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should display real count of 5 instead of hardcoded 3
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })
      
      // ASSERT: Should call the API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/assignments/active')
    })

    it('should_fetch_and_display_real_completed_assignments_data', async () => {
      // ARRANGE: Approved student user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockApprovedStudent,
        user: mockStudentUser,
        loading: false,
        supabase: createClient(),
        signOut: vi.fn()
      })

      // ARRANGE: Mock API response for completed assignments
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (url === '/api/assignments/completed') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              assignments: Array.from({ length: 8 }, (_, i) => ({
                id: `completed-${i}`,
                title: `Completed Assignment ${i}`,
                score: 88 + i // Scores from 88 to 95 = 91.5% average
              }))
            })
          } as Response
        }
        return { ok: false, status: 404 } as Response
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should display real count of 8 instead of hardcoded 12
      await waitFor(() => {
        expect(screen.getByText('8')).toBeInTheDocument()
      })
      
      // ASSERT: Should display calculated average instead of hardcoded 85%
      await waitFor(() => {
        expect(screen.getByText('92% average score')).toBeInTheDocument()
      })
      
      // ASSERT: Should call the API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/assignments/completed')
    })

    it('should_fetch_and_display_real_pending_review_count', async () => {
      // ARRANGE: Approved student user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockApprovedStudent,
        user: mockStudentUser,
        loading: false,
        supabase: createClient(),
        signOut: vi.fn()
      })

      // ARRANGE: Mock API response for pending review assignments
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (url === '/api/assignments/pending-review') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              assignments: [
                { id: 'review-1', title: 'Assignment Awaiting Review 1', status: 'submitted' },
                { id: 'review-2', title: 'Assignment Awaiting Review 2', status: 'submitted' },
                { id: 'review-3', title: 'Assignment Awaiting Review 3', status: 'submitted' }
              ]
            })
          } as Response
        }
        return { ok: false, status: 404 } as Response
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should display real count of 3 instead of hardcoded 2
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument()
      })
      
      // ASSERT: Should call the API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/assignments/pending-review')
    })

    it('should_fetch_and_display_real_recent_assignments', async () => {
      // ARRANGE: Approved student user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockApprovedStudent,
        user: mockStudentUser,
        loading: false,
        supabase: createClient(),
        signOut: vi.fn()
      })

      // ARRANGE: Mock API response for recent assignments
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (url === '/api/assignments/recent') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              assignments: [
                { 
                  id: 'recent-1', 
                  title: 'Canine Anatomy Module 2', 
                  status: 'in_progress',
                  completed_questions: 7,
                  total_questions: 10,
                  progress_percentage: 70
                },
                { 
                  id: 'recent-2', 
                  title: 'Grooming Techniques Assessment', 
                  status: 'completed',
                  score: 96,
                  progress_percentage: 100
                },
                { 
                  id: 'recent-3', 
                  title: 'Health and Safety Protocols', 
                  status: 'not_started',
                  due_date: '2025-08-30',
                  progress_percentage: 0
                }
              ]
            })
          } as Response
        }
        return { ok: false, status: 404 } as Response
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should display real assignment titles instead of hardcoded ones
      await waitFor(() => {
        expect(screen.getByText('Canine Anatomy Module 2')).toBeInTheDocument()
        expect(screen.getByText('Grooming Techniques Assessment')).toBeInTheDocument()
        expect(screen.getByText('Health and Safety Protocols')).toBeInTheDocument()
      })
      
      // ASSERT: Should display real progress data
      await waitFor(() => {
        expect(screen.getByText('7 of 10 questions completed')).toBeInTheDocument()
        expect(screen.getByText('Completed - Score: 96%')).toBeInTheDocument()
        expect(screen.getByText('Due in 3 days')).toBeInTheDocument()
      })
      
      // ASSERT: Should call the API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/assignments/recent')
    })
  })

  describe('Course Leader Dashboard Real Data Integration', () => {
    it('should_fetch_and_display_real_active_students_count', async () => {
      // ARRANGE: Approved course leader user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockApprovedCourseLeader,
        user: mockStudentUser, // Reusing user structure
        loading: false,
        supabase: createClient(),
        signOut: vi.fn()
      })

      // ARRANGE: Mock API response for active students
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (url === '/api/students/active') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              students: Array.from({ length: 32 }, (_, i) => ({
                id: `student-${i}`,
                name: `Student ${i}`,
                status: 'active'
              }))
            })
          } as Response
        }
        return { ok: false, status: 404 } as Response
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should display real count of 32 instead of hardcoded 24
      await waitFor(() => {
        expect(screen.getByText('32')).toBeInTheDocument()
      })
      
      // ASSERT: Should call the API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/students/active')
    })

    it('should_fetch_and_display_real_pending_reviews_count', async () => {
      // ARRANGE: Approved course leader user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockApprovedCourseLeader,
        user: mockStudentUser,
        loading: false,
        supabase: createClient(),
        signOut: vi.fn()
      })

      // ARRANGE: Mock API response for pending reviews
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (url === '/api/submissions/pending-review') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              submissions: Array.from({ length: 5 }, (_, i) => ({
                id: `submission-${i}`,
                student: `Student ${i}`,
                assignment: `Assignment ${i}`,
                status: 'pending_review'
              }))
            })
          } as Response
        }
        return { ok: false, status: 404 } as Response
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should display real count of 5 instead of hardcoded 8
      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument()
      })
      
      // ASSERT: Should call the API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/submissions/pending-review')
    })
  })

  describe('Admin Dashboard Real Data Integration', () => {
    it('should_fetch_and_display_real_total_users_count', async () => {
      // ARRANGE: Approved admin user
      vi.mocked(useSupabase).mockReturnValue({ 
        profile: mockApprovedAdmin,
        user: mockStudentUser,
        loading: false,
        supabase: createClient(),
        signOut: vi.fn()
      })

      // ARRANGE: Mock API response for total users
      vi.mocked(global.fetch).mockImplementation(async (url) => {
        if (url === '/api/admin/users/stats') {
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              total_users: 89,
              course_leaders: 7,
              students: 81,
              new_this_month: 12
            })
          } as Response
        }
        return { ok: false, status: 404 } as Response
      })

      // ACT: Render dashboard
      render(<DashboardPage />)

      // ASSERT: Should display real counts instead of hardcoded values
      await waitFor(() => {
        expect(screen.getByText('89')).toBeInTheDocument() // Total users: 89 instead of 127
        expect(screen.getByText('7')).toBeInTheDocument()  // Course leaders: 7 instead of 12
        expect(screen.getByText('81')).toBeInTheDocument() // Students: 81 instead of 114
        expect(screen.getByText('+12 this month')).toBeInTheDocument()
      })
      
      // ASSERT: Should call the API endpoint
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/users/stats')
    })
  })
})