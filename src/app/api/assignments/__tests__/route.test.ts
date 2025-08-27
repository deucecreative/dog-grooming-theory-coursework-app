import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'
// Using local createMockQueryChain definition below
// Types imported on-demand when needed
import type { PostgrestError } from '@supabase/supabase-js'
import { createMockPostgrestError } from '@/types/test-utilities'

// Mock Supabase server client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabaseClient),
}))

// Custom mock query chain for this test with promise methods  
const createMockQueryChain = (mockResult: { data: unknown; error: PostgrestError | null }) => {
  const mockPromise = Promise.resolve(mockResult)
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    order: vi.fn(() => chain),
    range: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    single: vi.fn(() => mockPromise),
    then: mockPromise.then.bind(mockPromise),
    catch: mockPromise.catch.bind(mockPromise),
    finally: mockPromise.finally.bind(mockPromise)
  }
  return Object.assign(mockPromise, chain)
}

const mockAdmin = {
  id: 'admin-id-123',
  email: 'admin@test.com',
}

const mockCourseLeader = {
  id: 'course-leader-id-123',
  email: 'leader@test.com',
}

const mockStudent = {
  id: 'student-id-123',
  email: 'student@test.com',
}

// Partial profile matching .select('role, status') query
const mockAdminProfile = {
  role: 'admin' as const,
  status: 'approved' as const
}

// Partial profile matching .select('role, status') query  
const mockCourseLeaderProfile = {
  role: 'course_leader' as const,
  status: 'approved' as const
}

// Partial profile matching .select('role, status') query
const mockStudentProfile = {
  role: 'student' as const,
  status: 'approved' as const
}

const mockQuestions = [
  {
    id: 'question-1',
    title: 'Basic Grooming Tools',
    content: 'Which tool is best for removing loose undercoat?',
    type: 'multiple_choice',
    category: 'tools',
    difficulty: 'beginner'
  },
  {
    id: 'question-2',
    title: 'Safety Procedures',
    content: 'Describe proper scissors safety.',
    type: 'short_text',
    category: 'safety',
    difficulty: 'intermediate'
  }
]

const mockAssignments = [
  {
    id: 'assignment-1',
    title: 'Week 1: Basic Grooming Fundamentals',
    description: 'Introduction to basic grooming tools and safety procedures.',
    question_ids: ['question-1', 'question-2'],
    due_date: '2023-12-31T23:59:59.000Z',
    created_by: 'course-leader-id-123',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'assignment-2',
    title: 'Week 2: Advanced Techniques',
    description: 'Advanced grooming techniques and breed-specific requirements.',
    question_ids: ['question-2'],
    due_date: '2024-01-07T23:59:59.000Z',
    created_by: 'admin-id-123',
    created_at: '2023-01-02T00:00:00.000Z',
    updated_at: '2023-01-02T00:00:00.000Z'
  }
]

describe('Assignments API - GET /api/assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return assignments for authenticated admin users', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAssignments,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.assignments).toEqual(mockAssignments)
    expect(data.total).toBe(2)
  })

  it('should return assignments for authenticated course leaders', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockCourseLeader },
      error: null
    })

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockCourseLeaderProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAssignments,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.assignments).toEqual(mockAssignments)
  })

  it('should return assignments for authenticated students', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockStudent },
      error: null
    })

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockStudentProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAssignments,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.assignments).toEqual(mockAssignments)
  })

  it('should include question details when expand=questions parameter is provided', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const _assignmentsWithQuestions = [
      {
        ...mockAssignments[0],
        questions: mockQuestions
      }
    ]

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAssignments,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: mockQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments?expand=questions')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.assignments[0].questions).toEqual(mockQuestions)
  })

  it('should support pagination with page and limit', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const paginatedAssignments = [mockAssignments[0]]

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: paginatedAssignments,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments?page=1&limit=1')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.assignments).toEqual(paginatedAssignments)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(1)
  })

  it('should require authentication', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' }
    })

    const request = new NextRequest('http://localhost:3000/api/assignments')
    const response = await GET(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle database errors gracefully', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: createMockPostgrestError('Database connection error')
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toContain('Failed to fetch assignments')
  })
})

describe('Assignments API - POST /api/assignments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create an assignment as admin', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const newAssignment = {
      title: 'New Assignment',
      description: 'Test assignment for API',
      question_ids: ['question-1', 'question-2'],
      due_date: '2024-02-01T23:59:59.000Z'
    }

    const createdAssignment = {
      id: 'new-assignment-id',
      ...newAssignment,
      created_by: mockAdmin.id,
      created_at: '2023-01-03T00:00:00.000Z',
      updated_at: '2023-01-03T00:00:00.000Z'
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: mockQuestions, // Questions exist
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: createdAssignment,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(newAssignment),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.assignment).toEqual(createdAssignment)
  })

  it('should create an assignment as course leader', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockCourseLeader },
      error: null
    })

    const newAssignment = {
      title: 'Course Leader Assignment',
      description: 'Assignment created by course leader',
      question_ids: ['question-1'],
      due_date: '2024-03-01T23:59:59.000Z'
    }

    const createdAssignment = {
      id: 'course-leader-assignment-id',
      ...newAssignment,
      created_by: mockCourseLeader.id,
      created_at: '2023-01-03T00:00:00.000Z',
      updated_at: '2023-01-03T00:00:00.000Z'
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockCourseLeaderProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: [mockQuestions[0]], // One question exists
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: createdAssignment,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(newAssignment),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.assignment).toEqual(createdAssignment)
  })

  it('should prevent students from creating assignments', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockStudent },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockStudentProfile,
      error: null
    }))

    const newAssignment = {
      title: 'Unauthorized Assignment',
      description: 'This should not be allowed',
      question_ids: ['question-1'],
      due_date: '2024-02-01T23:59:59.000Z'
    }

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(newAssignment),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.error).toBe('Insufficient permissions')
  })

  it('should validate required fields', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockAdminProfile,
      error: null
    }))

    const incompleteAssignment = {
      title: 'Incomplete Assignment',
      // Missing required fields: description, question_ids, due_date
    }

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(incompleteAssignment),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Missing required fields')
  })

  it('should validate question_ids is non-empty array', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockAdminProfile,
      error: null
    }))

    const assignmentWithEmptyQuestions = {
      title: 'Empty Questions Assignment',
      description: 'This has no questions',
      question_ids: [],
      due_date: '2024-02-01T23:59:59.000Z'
    }

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentWithEmptyQuestions),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('At least one question is required')
  })

  it('should validate that all question IDs exist', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const assignmentWithInvalidQuestions = {
      title: 'Invalid Questions Assignment',
      description: 'This references non-existent questions',
      question_ids: ['question-1', 'non-existent-question'],
      due_date: '2024-02-01T23:59:59.000Z'
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: [mockQuestions[0]], // Only one question found
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentWithInvalidQuestions),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('One or more question IDs are invalid')
  })

  it('should validate due_date format', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockAdminProfile,
      error: null
    }))

    const assignmentWithInvalidDate = {
      title: 'Invalid Date Assignment',
      description: 'This has an invalid due date',
      question_ids: ['question-1'],
      due_date: 'invalid-date-format'
    }

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(assignmentWithInvalidDate),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid due_date format')
  })

  it('should require authentication for creating assignments', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' }
    })

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle database errors when creating assignments', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const validAssignment = {
      title: 'Database Error Assignment',
      description: 'This will cause a database error',
      question_ids: ['question-1'],
      due_date: '2024-02-01T23:59:59.000Z'
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: [mockQuestions[0]], // Questions exist
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: createMockPostgrestError('Database constraint violation')
      }))

    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: JSON.stringify(validAssignment),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toContain('Failed to create assignment')
  })

  it('should handle malformed JSON gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/assignments', {
      method: 'POST',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid request body')
  })
})