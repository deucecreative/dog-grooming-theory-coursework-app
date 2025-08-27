import { describe, it, expect } from 'vitest'
import type { 
  Database, 
  UserRole, 
  QuestionType, 
  SubmissionStatus, 
  GradeStatus, 
  ConfidenceLevel 
} from '../database'

describe('Database Types', () => {
  describe('Type Definitions', () => {
    it('defines UserRole correctly', () => {
      const studentRole: UserRole = 'student'
      const courseLeaderRole: UserRole = 'course_leader'
      const adminRole: UserRole = 'admin'

      expect(studentRole).toBe('student')
      expect(courseLeaderRole).toBe('course_leader')
      expect(adminRole).toBe('admin')

      // TypeScript should prevent invalid values at compile time
      // @ts-expect-error - should not allow invalid role
      const _invalidRole: UserRole = 'invalid_role'
    })

    it('defines QuestionType correctly', () => {
      const multipleChoice: QuestionType = 'multiple_choice'
      const shortText: QuestionType = 'short_text'
      const longText: QuestionType = 'long_text'

      expect(multipleChoice).toBe('multiple_choice')
      expect(shortText).toBe('short_text')
      expect(longText).toBe('long_text')
    })

    it('defines SubmissionStatus correctly', () => {
      const draft: SubmissionStatus = 'draft'
      const submitted: SubmissionStatus = 'submitted'
      const graded: SubmissionStatus = 'graded'

      expect(draft).toBe('draft')
      expect(submitted).toBe('submitted')
      expect(graded).toBe('graded')
    })

    it('defines GradeStatus correctly', () => {
      const pass: GradeStatus = 'pass'
      const fail: GradeStatus = 'fail'

      expect(pass).toBe('pass')
      expect(fail).toBe('fail')
    })

    it('defines ConfidenceLevel correctly', () => {
      const low: ConfidenceLevel = 'low'
      const medium: ConfidenceLevel = 'medium'
      const high: ConfidenceLevel = 'high'

      expect(low).toBe('low')
      expect(medium).toBe('medium')
      expect(high).toBe('high')
    })
  })

  describe('Table Type Definitions', () => {
    it('defines profiles table structure correctly', () => {
      // Test that the type accepts valid profile data
      const validProfile: Database['public']['Tables']['profiles']['Row'] = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'student',
        status: 'approved',
        approved_by: '123e4567-e89b-12d3-a456-426614174001',
        approved_at: '2023-01-01T12:00:00.000Z',
        rejection_reason: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }

      expect(validProfile.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(validProfile.role).toBe('student')
      expect(validProfile.full_name).toBe('Test User')

      // Test Insert type (some fields optional)
      const insertProfile: Database['public']['Tables']['profiles']['Insert'] = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        // full_name is optional
        // role defaults to 'student'
        // timestamps are optional (have defaults)
      }

      expect(insertProfile.email).toBe('test@example.com')
    })

    it('defines questions table structure correctly', () => {
      const validQuestion: Database['public']['Tables']['questions']['Row'] = {
        id: '123e4567-e89b-12d3-a456-426614174001',
        title: 'Test Question',
        content: 'What is the main difference between coats?',
        type: 'long_text',
        category: 'grooming',
        difficulty: 'intermediate',
        rubric: { max_score: 100, criteria: ['accuracy', 'completeness'] },
        expected_answer: 'Double coat has undercoat...',
        options: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        course_id: null,
      }

      expect(validQuestion.type).toBe('long_text')
      expect(validQuestion.rubric).toEqual({ max_score: 100, criteria: ['accuracy', 'completeness'] })
      expect(validQuestion.options).toBeNull()
    })

    it('defines assignments table structure correctly', () => {
      const validAssignment: Database['public']['Tables']['assignments']['Row'] = {
        id: '123e4567-e89b-12d3-a456-426614174002',
        title: 'Basic Grooming Module 1',
        description: 'Introduction to grooming fundamentals',
        question_ids: ['q1', 'q2', 'q3'],
        course_id: '123e4567-e89b-12d3-a456-426614174001',
        due_date: '2023-12-31T23:59:59.000Z',
        created_by: '123e4567-e89b-12d3-a456-426614174000',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }

      expect(validAssignment.question_ids).toEqual(['q1', 'q2', 'q3'])
      expect(validAssignment.course_id).toBe('123e4567-e89b-12d3-a456-426614174001')
      expect(validAssignment.due_date).toBe('2023-12-31T23:59:59.000Z')
    })

    it('defines submissions table structure correctly', () => {
      const validSubmission: Database['public']['Tables']['submissions']['Row'] = {
        id: '123e4567-e89b-12d3-a456-426614174003',
        assignment_id: '123e4567-e89b-12d3-a456-426614174002',
        student_id: '123e4567-e89b-12d3-a456-426614174000',
        answers: { 'q1': 'Double coats have two layers...', 'q2': 'Brushing should be done...' },
        status: 'submitted',
        submitted_at: '2023-06-15T12:30:00.000Z',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }

      expect(validSubmission.status).toBe('submitted')
      expect(validSubmission.answers).toEqual({ 'q1': 'Double coats have two layers...', 'q2': 'Brushing should be done...' })
    })

    it('defines assessments table structure correctly', () => {
      const validAssessment: Database['public']['Tables']['assessments']['Row'] = {
        id: '123e4567-e89b-12d3-a456-426614174004',
        submission_id: '123e4567-e89b-12d3-a456-426614174003',
        question_id: '123e4567-e89b-12d3-a456-426614174001',
        ai_score: 85,
        ai_feedback: 'Good understanding shown...',
        confidence_score: 0.85,
        created_at: '2023-01-01T00:00:00.000Z',
      }

      expect(validAssessment.ai_score).toBe(85)
      expect(validAssessment.confidence_score).toBe(0.85)
      expect(validAssessment.ai_feedback).toBe('Good understanding shown...')
    })

    it('defines final_grades table structure correctly', () => {
      const validGrade: Database['public']['Tables']['final_grades']['Row'] = {
        id: '123e4567-e89b-12d3-a456-426614174005',
        submission_id: '123e4567-e89b-12d3-a456-426614174003',
        course_leader_id: '123e4567-e89b-12d3-a456-426614174010',
        final_score: 90.0,
        comments: 'Excellent work, well explained',
        status: 'pass',
        graded_at: '2023-06-20T14:00:00.000Z',
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }

      expect(validGrade.final_score).toBe(90.0)
      expect(validGrade.status).toBe('pass')
      expect(validGrade.comments).toBe('Excellent work, well explained')
    })
  })

  describe('Type Safety', () => {
    it('enforces required fields in Row types', () => {
      // This should compile without errors
      const completeProfile: Database['public']['Tables']['profiles']['Row'] = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        full_name: 'Test User',
        role: 'student',
        status: 'approved',
        approved_by: '123e4567-e89b-12d3-a456-426614174001',
        approved_at: '2023-01-01T12:00:00.000Z',
        rejection_reason: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }

      expect(completeProfile.id).toBeDefined()
      expect(completeProfile.email).toBeDefined()
    })

    it('allows optional fields in Insert types', () => {
      // This should compile - optional fields can be omitted
      const minimalInsert: Database['public']['Tables']['profiles']['Insert'] = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
      }

      expect(minimalInsert.id).toBe('123e4567-e89b-12d3-a456-426614174000')
      expect(minimalInsert.email).toBe('test@example.com')
    })

    it('allows partial updates in Update types', () => {
      // Update types should allow partial objects
      const partialUpdate: Database['public']['Tables']['profiles']['Update'] = {
        full_name: 'Updated Name',
        // Other fields are optional in updates
      }

      expect(partialUpdate.full_name).toBe('Updated Name')
    })

    it('enforces enum values in table types', () => {
      const profileWithRole: Database['public']['Tables']['profiles']['Row'] = {
        id: '123',
        email: 'test@example.com',
        full_name: null,
        role: 'student', // Must be a valid UserRole
        status: 'pending',
        approved_by: null,
        approved_at: null,
        rejection_reason: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
      }

      expect(profileWithRole.role).toBe('student')
    })
  })

  describe('Json Type Safety', () => {
    it('handles Json type for flexible fields', () => {
      const questionWithRubric: Database['public']['Tables']['questions']['Row'] = {
        id: '123',
        title: 'Test',
        content: 'Test content',
        type: 'multiple_choice',
        category: 'assessment',
        difficulty: 'beginner',
        rubric: { max_score: 100, criteria: [{ name: 'accuracy', weight: 60 }, { name: 'completeness', weight: 40 }] },
        expected_answer: null,
        options: [
          { id: 'a', text: 'Option A' },
          { id: 'b', text: 'Option B' },
        ],
        course_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        created_by: '456',
      }

      expect(questionWithRubric.rubric).toHaveProperty('max_score', 100)
      expect(questionWithRubric.options).toHaveLength(2)
    })

    it('allows null values for optional Json fields', () => {
      const questionWithoutOptions: Database['public']['Tables']['questions']['Row'] = {
        id: '123',
        title: 'Test',
        content: 'Test content',
        type: 'long_text',
        category: 'practical',
        difficulty: 'advanced',
        expected_answer: 'Expected answer',
        rubric: { max_score: 100, criteria: ['accuracy'] }, // rubric field is required Json
        options: null, // Json field can be null
        course_id: null,
        created_at: '2023-01-01T00:00:00.000Z',
        updated_at: '2023-01-01T00:00:00.000Z',
        created_by: '456',
      }

      expect(questionWithoutOptions.rubric).toHaveProperty('max_score', 100)
      expect(questionWithoutOptions.options).toBeNull()
    })
  })
})