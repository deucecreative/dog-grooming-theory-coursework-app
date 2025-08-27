import { describe, it, expect, vi } from 'vitest'
import type { AssessmentRequest } from '../openai'

// Since OpenAI module is mocked in setup.ts, we import the mocked versions
import { assessAnswer, generateFeedbackSuggestions } from '../openai'

// Get the mocked functions
const mockedAssessAnswer = vi.mocked(assessAnswer)
const mockedGenerateFeedback = vi.mocked(generateFeedbackSuggestions)

describe('OpenAI Module Unit Tests (Mocked)', () => {
  describe('assessAnswer mock behavior', () => {
    it('returns default error response when not configured', async () => {
      // The default mock from setup.ts returns an error response
      const request: AssessmentRequest = {
        question: 'Test question',
        studentAnswer: 'Test answer',
        questionType: 'short_text',
      }

      const result = await assessAnswer(request)

      expect(result).toEqual({
        score: 0,
        feedback: 'Unable to assess answer automatically. This submission requires manual review by a course leader.',
        confidence: 'low',
        reasoning: 'AI assessment failed due to technical error.'
      })
    })

    it('can be configured to return specific responses', async () => {
      // Configure mock for this specific test
      mockedAssessAnswer.mockResolvedValueOnce({
        score: 85,
        feedback: 'Good answer with room for improvement.',
        confidence: 'high',
        reasoning: 'Answer shows understanding of core concepts.'
      })

      const request: AssessmentRequest = {
        question: 'Test question',
        studentAnswer: 'Test answer',
        questionType: 'short_text',
      }

      const result = await assessAnswer(request)

      expect(result.score).toBe(85)
      expect(result.confidence).toBe('high')
    })
  })

  describe('generateFeedbackSuggestions mock behavior', () => {
    it('returns empty array by default', async () => {
      const result = await generateFeedbackSuggestions(
        'feedback',
        'answer',
        'context'
      )

      expect(result).toEqual([])
    })

    it('can be configured to return suggestions', async () => {
      mockedGenerateFeedback.mockResolvedValueOnce([
        'Add more detail',
        'Include examples',
        'Explain reasoning'
      ])

      const result = await generateFeedbackSuggestions(
        'feedback',
        'answer', 
        'context'
      )

      expect(result).toHaveLength(3)
      expect(result[0]).toBe('Add more detail')
    })
  })

  describe('Function calls tracking', () => {
    it('tracks calls to assessAnswer', async () => {
      // Clear any previous calls
      mockedAssessAnswer.mockClear()
      
      const request: AssessmentRequest = {
        question: 'Which tool is best?',
        studentAnswer: 'Slicker brush',
        questionType: 'multiple_choice',
      }

      await assessAnswer(request)

      expect(mockedAssessAnswer).toHaveBeenCalledWith(request)
      expect(mockedAssessAnswer).toHaveBeenCalledTimes(1)
    })

    it('tracks calls to generateFeedbackSuggestions', async () => {
      // Clear any previous calls
      mockedGenerateFeedback.mockClear()
      
      await generateFeedbackSuggestions('feedback', 'answer', 'context')

      expect(mockedGenerateFeedback).toHaveBeenCalledWith(
        'feedback',
        'answer',
        'context'
      )
    })
  })
})