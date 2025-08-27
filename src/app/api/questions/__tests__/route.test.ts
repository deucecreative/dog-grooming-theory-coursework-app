import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
import { NextRequest } from 'next/server'

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

const createMockQueryChain = (mockResult: { data: unknown; error: unknown }) => {
  const mockPromise = Promise.resolve(mockResult)
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
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

const mockAdminProfile = {
  id: 'admin-id-123',
  role: 'admin',
  status: 'approved'
}

const mockCourseLeaderProfile = {
  id: 'course-leader-id-123',
  role: 'course_leader',
  status: 'approved'
}

const mockStudentProfile = {
  id: 'student-id-123',
  role: 'student',
  status: 'approved'
}

const mockQuestions = [
  {
    id: 'question-1',
    title: 'Basic Grooming Tools',
    content: 'Which tool is best for removing loose undercoat?',
    type: 'multiple_choice',
    category: 'tools',
    difficulty: 'beginner',
    options: {
      choices: ['Slicker brush', 'Undercoat rake', 'Pin brush', 'Deshedding tool'],
      correct: 1
    },
    rubric: 'Award full points for correct answer',
    created_by: 'course-leader-id-123',
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z'
  },
  {
    id: 'question-2', 
    title: 'Safety Procedures',
    content: 'Describe the proper way to hold scissors when grooming around a dog\'s face.',
    type: 'short_text',
    category: 'safety',
    difficulty: 'intermediate',
    options: null,
    rubric: 'Look for mentions of blade direction, hand position, and dog restraint',
    created_by: 'admin-id-123',
    created_at: '2023-01-02T00:00:00.000Z',
    updated_at: '2023-01-02T00:00:00.000Z'
  }
]

describe('Questions API - GET /api/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return questions for authenticated admin users', async () => {
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
        data: mockQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.questions).toEqual(mockQuestions)
    expect(data.total).toBe(2)
  })

  it('should return questions for authenticated course leaders', async () => {
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
        data: mockQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.questions).toEqual(mockQuestions)
  })

  it('should allow students to read questions', async () => {
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
        data: mockQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.questions).toEqual(mockQuestions)
  })

  it('should filter questions by category', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const filteredQuestions = [mockQuestions[0]] // Only tools category

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: filteredQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions?category=tools')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.questions).toEqual(filteredQuestions)
    expect(data.total).toBe(1)
  })

  it('should filter questions by difficulty', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const beginnerQuestions = [mockQuestions[0]]

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: beginnerQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions?difficulty=beginner')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.questions).toEqual(beginnerQuestions)
  })

  it('should filter questions by type', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const multipleChoiceQuestions = [mockQuestions[0]]

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: multipleChoiceQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions?type=multiple_choice')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.questions).toEqual(multipleChoiceQuestions)
  })

  it('should support pagination with page and limit', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const paginatedQuestions = [mockQuestions[0]]

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: paginatedQuestions,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions?page=1&limit=1')
    const response = await GET(request)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.questions).toEqual(paginatedQuestions)
    expect(data.page).toBe(1)
    expect(data.limit).toBe(1)
  })

  it('should require authentication', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' }
    })

    const request = new NextRequest('http://localhost:3000/api/questions')
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
        error: { message: 'Database connection error' }
      }))

    const request = new NextRequest('http://localhost:3000/api/questions')
    const response = await GET(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toContain('Failed to fetch questions')
  })
})

describe('Questions API - POST /api/questions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a question as admin', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const newQuestion = {
      title: 'New Question',
      content: 'What is proper nail trimming technique?',
      type: 'short_text',
      category: 'grooming',
      difficulty: 'intermediate',
      rubric: 'Look for mention of quick, angle, and dog comfort'
    }

    const createdQuestion = {
      id: 'new-question-id',
      ...newQuestion,
      options: null,
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
        data: createdQuestion,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(newQuestion),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.question).toEqual(createdQuestion)
  })

  it('should create a question as course leader', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockCourseLeader },
      error: null
    })

    const newQuestion = {
      title: 'Safety Question',
      content: 'How should you approach an anxious dog?',
      type: 'long_text',
      category: 'behavior',
      difficulty: 'advanced',
      rubric: 'Comprehensive answer covering body language, calming techniques, and safety protocols'
    }

    const createdQuestion = {
      id: 'safety-question-id',
      ...newQuestion,
      options: null,
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
        data: createdQuestion,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(newQuestion),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.question).toEqual(createdQuestion)
  })

  it('should create multiple choice question with options', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const newQuestion = {
      title: 'Breed Identification',
      content: 'Which breed requires the most frequent grooming?',
      type: 'multiple_choice',
      category: 'breeds',
      difficulty: 'intermediate',
      options: {
        choices: ['Golden Retriever', 'Poodle', 'Labrador', 'German Shepherd'],
        correct: 1
      },
      rubric: 'Correct answer is Poodle due to coat requirements'
    }

    const createdQuestion = {
      id: 'breed-question-id',
      ...newQuestion,
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
        data: createdQuestion,
        error: null
      }))

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(newQuestion),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(201)
    const data = await response.json()
    expect(data.question.options).toEqual(newQuestion.options)
  })

  it('should prevent students from creating questions', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockStudent },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockStudentProfile,
      error: null
    }))

    const newQuestion = {
      title: 'Unauthorized Question',
      content: 'This should not be allowed',
      type: 'short_text',
      category: 'unauthorized',
      difficulty: 'beginner',
      rubric: 'Should not exist'
    }

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(newQuestion),
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

    const incompleteQuestion = {
      title: 'Incomplete Question',
      // Missing required fields: content, type, category, difficulty, rubric
    }

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(incompleteQuestion),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Missing required fields')
  })

  it('should validate question type enum', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockAdminProfile,
      error: null
    }))

    const invalidQuestion = {
      title: 'Invalid Type Question',
      content: 'This has an invalid type',
      type: 'invalid_type',
      category: 'test',
      difficulty: 'beginner',
      rubric: 'Test rubric'
    }

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(invalidQuestion),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid question type')
  })

  it('should validate difficulty enum', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockAdminProfile,
      error: null
    }))

    const invalidQuestion = {
      title: 'Invalid Difficulty Question',
      content: 'This has an invalid difficulty',
      type: 'short_text',
      category: 'test',
      difficulty: 'super_hard',
      rubric: 'Test rubric'
    }

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(invalidQuestion),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid difficulty level')
  })

  it('should require options for multiple choice questions', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    mockSupabaseClient.from.mockReturnValueOnce(createMockQueryChain({
      data: mockAdminProfile,
      error: null
    }))

    const multipleChoiceWithoutOptions = {
      title: 'Multiple Choice Without Options',
      content: 'This should require options',
      type: 'multiple_choice',
      category: 'test',
      difficulty: 'beginner',
      rubric: 'Test rubric'
      // Missing options
    }

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(multipleChoiceWithoutOptions),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Multiple choice questions require options')
  })

  it('should require authentication for creating questions', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' }
    })

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe('Unauthorized')
  })

  it('should handle database errors when creating questions', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockAdmin },
      error: null
    })

    const validQuestion = {
      title: 'Database Error Question',
      content: 'This will cause a database error',
      type: 'short_text',
      category: 'error',
      difficulty: 'beginner',
      rubric: 'Test rubric'
    }

    mockSupabaseClient.from
      .mockReturnValueOnce(createMockQueryChain({
        data: mockAdminProfile,
        error: null
      }))
      .mockReturnValueOnce(createMockQueryChain({
        data: null,
        error: { message: 'Database constraint violation' }
      }))

    const request = new NextRequest('http://localhost:3000/api/questions', {
      method: 'POST',
      body: JSON.stringify(validQuestion),
      headers: { 'Content-Type': 'application/json' }
    })

    const response = await POST(request)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toContain('Failed to create question')
  })

  it('should handle malformed JSON gracefully', async () => {
    const request = new NextRequest('http://localhost:3000/api/questions', {
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