import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../route'
import { NextRequest } from 'next/server'

/**
 * Schema Validation Tests for Questions API
 * 
 * These tests verify that the database schema matches the PROJECT.md requirements:
 * - Question types: ['multiple_choice', 'short_text', 'long_text'] 
 * - Required fields: category, difficulty, rubric, course_id
 * 
 * Following TDD methodology: Tests first, implementation second
 */

// Mock the supabase server client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

const createMockQueryChain = (mockResult: { data: unknown; error: unknown }) => {
  const mockPromise = Promise.resolve(mockResult)
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(() => mockPromise),
    then: mockPromise.then.bind(mockPromise),
    catch: mockPromise.catch.bind(mockPromise),
    finally: mockPromise.finally.bind(mockPromise),
  }
  return Object.assign(mockPromise, chain)
}

const mockAdminUser = {
  id: 'admin-123',
  email: 'admin@test.com',
}

const mockAdminProfile = {
  id: 'admin-123',
  role: 'admin',
  status: 'approved',
}

describe('Questions API - Schema Validation Tests (TDD)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default auth success
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdminUser },
      error: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('RED Phase: Failing Tests for Schema Requirements', () => {
    it('should_validate_short_text_question_type_when_creating_question', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockAdminProfile,
          error: null,
        })
      )

      // Arrange: Mock successful question creation with short_text type
      const expectedQuestion = {
        id: 'question-123',
        title: 'Test Short Text Question',
        content: 'What is your favorite grooming technique?',
        type: 'short_text', // This should be valid according to PROJECT.md
        category: 'grooming_basics',
        difficulty: 'beginner',
        rubric: 'Look for understanding of basic techniques',
        course_id: 'course-123',
        created_by: 'admin-123',
      }

      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: expectedQuestion,
          error: null,
        })
      )

      // Act: Create question with short_text type
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Short Text Question',
          content: 'What is your favorite grooming technique?',
          type: 'short_text',
          category: 'grooming_basics',
          difficulty: 'beginner',
          rubric: 'Look for understanding of basic techniques',
        }),
      })

      const response = await POST(request)

      // Assert: Should succeed (will fail until schema is updated)
      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData.question.type).toBe('short_text')
    })

    it('should_validate_long_text_question_type_when_creating_question', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockAdminProfile,
          error: null,
        })
      )

      // Arrange: Mock successful question creation with long_text type
      const expectedQuestion = {
        id: 'question-456',
        title: 'Test Long Text Question',
        content: 'Describe the complete dog grooming process from start to finish.',
        type: 'long_text', // This should be valid according to PROJECT.md
        category: 'comprehensive_grooming',
        difficulty: 'advanced',
        rubric: 'Should demonstrate comprehensive knowledge of grooming workflow',
        course_id: 'course-123',
        created_by: 'admin-123',
      }

      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: expectedQuestion,
          error: null,
        })
      )

      // Act: Create question with long_text type
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Long Text Question',
          content: 'Describe the complete dog grooming process from start to finish.',
          type: 'long_text',
          category: 'comprehensive_grooming',
          difficulty: 'advanced',
          rubric: 'Should demonstrate comprehensive knowledge of grooming workflow',
        }),
      })

      const response = await POST(request)

      // Assert: Should succeed (will fail until schema is updated)
      expect(response.status).toBe(201)
      const responseData = await response.json()
      expect(responseData.question.type).toBe('long_text')
    })

    it('should_reject_invalid_question_types_from_old_schema', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockAdminProfile,
          error: null,
        })
      )

      // Act: Try to create question with old schema types
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Essay Question',
          content: 'Old essay type question',
          type: 'essay', // This should be rejected
          category: 'test_category',
          difficulty: 'beginner',
          rubric: 'Test rubric',
        }),
      })

      const response = await POST(request)

      // Assert: Should reject old enum values
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Invalid question type')
    })

    it('should_require_all_new_schema_fields_when_creating_question', async () => {
      // Arrange: Mock profile fetch
      mockSupabaseClient.from.mockReturnValueOnce(
        createMockQueryChain({
          data: mockAdminProfile,
          error: null,
        })
      )

      // Act: Try to create question without required fields (category, difficulty, rubric)
      const request = new NextRequest('http://localhost:3000/api/questions', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test Question',
          content: 'Test content',
          type: 'multiple_choice',
          // Missing: category, difficulty, rubric
        }),
      })

      const response = await POST(request)

      // Assert: Should require all schema fields
      expect(response.status).toBe(400)
      const responseData = await response.json()
      expect(responseData.error).toContain('Missing required fields')
      expect(responseData.error).toContain('category')
      expect(responseData.error).toContain('difficulty')
      expect(responseData.error).toContain('rubric')
    })

    it('should_accept_valid_difficulty_levels', async () => {
      const validDifficulties = ['beginner', 'intermediate', 'advanced']

      for (const difficulty of validDifficulties) {
        // Reset mocks for each iteration
        vi.clearAllMocks()
        
        // Setup auth
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockAdminUser },
          error: null,
        })
        
        // Arrange: Mock profile fetch
        mockSupabaseClient.from.mockReturnValueOnce(
          createMockQueryChain({
            data: mockAdminProfile,
            error: null,
          })
        )
        // Arrange: Mock successful question creation
        const expectedQuestion = {
          id: `question-${difficulty}`,
          title: `Test ${difficulty} Question`,
          content: 'Test content',
          type: 'multiple_choice',
          category: 'test_category',
          difficulty,
          rubric: 'Test rubric',
          created_by: 'admin-123',
        }

        mockSupabaseClient.from.mockReturnValueOnce(
          createMockQueryChain({
            data: expectedQuestion,
            error: null,
          })
        )

        // Act: Create question with valid difficulty
        const request = new NextRequest('http://localhost:3000/api/questions', {
          method: 'POST',
          body: JSON.stringify({
            title: `Test ${difficulty} Question`,
            content: 'Test content',
            type: 'multiple_choice',
            category: 'test_category',
            difficulty,
            rubric: 'Test rubric',
            options: {
              choices: ['A', 'B', 'C'],
              correct: 0,
            },
          }),
        })

        const response = await POST(request)

        // Assert: Should accept valid difficulty levels
        expect(response.status).toBe(201)
        const responseData = await response.json()
        expect(responseData.question.difficulty).toBe(difficulty)
      }
    })
  })
})