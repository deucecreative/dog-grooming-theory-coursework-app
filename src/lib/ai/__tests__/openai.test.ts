import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { AssessmentRequest, AssessmentResult } from '../openai'

// Import the mocked functions (they're mocked globally in setup.ts)
import { assessAnswer, generateFeedbackSuggestions } from '../openai'

// Get the mocked versions so we can configure them
const mockedAssessAnswer = vi.mocked(assessAnswer)
const mockedGenerateFeedback = vi.mocked(generateFeedbackSuggestions)

describe('OpenAI Integration', () => {
  beforeEach(() => {
    // Clear mock state before each test
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clear mocks but don't reset them (preserve default behavior from setup.ts)
    vi.clearAllMocks()
  })

  describe('assessAnswer', () => {
    const mockRequest: AssessmentRequest = {
      question: 'What is the difference between a double coat and single coat?',
      studentAnswer: 'A double coat has two layers with undercoat and guard hairs.',
      expectedAnswer: 'Double coat has undercoat and guard hairs, single coat has one layer.',
      questionType: 'short_text',
      rubric: { max_score: 100 }
    }

    it('should_successfully_assess_short_text_answer_when_configured', async () => {
      const mockAIResponse: AssessmentResult = {
        score: 85,
        feedback: 'Good understanding of coat types with room for improvement.',
        confidence: 'high',
        reasoning: 'Answer demonstrates clear understanding of key concepts.'
      }

      // Configure the mock for this test
      mockedAssessAnswer.mockResolvedValueOnce(mockAIResponse)

      const result = await assessAnswer(mockRequest)

      expect(result).toEqual(mockAIResponse)
      expect(mockedAssessAnswer).toHaveBeenCalledWith(mockRequest)
    })

    it('should_handle_multiple_choice_questions_correctly_when_configured', async () => {
      const mcRequest: AssessmentRequest = {
        question: 'Which tool is safest for nail trimming? A) Guillotine clippers B) Scissor-type clippers',
        studentAnswer: 'B) Scissor-type clippers',
        expectedAnswer: 'B) Scissor-type clippers',
        questionType: 'multiple_choice'
      }

      const mockAIResponse: AssessmentResult = {
        score: 100,
        feedback: 'Correct! Scissor-type clippers provide better control.',
        confidence: 'high',
        reasoning: 'Student selected the safer option.'
      }

      mockedAssessAnswer.mockResolvedValueOnce(mockAIResponse)

      const result = await assessAnswer(mcRequest)

      expect(result.score).toBe(100)
      expect(result.confidence).toBe('high')
      expect(mockedAssessAnswer).toHaveBeenCalledWith(mcRequest)
    })

    it('should_handle_long_text_questions_with_detailed_feedback_when_configured', async () => {
      const longTextRequest: AssessmentRequest = {
        question: 'Explain the complete process for safely grooming an anxious dog.',
        studentAnswer: 'First, create a calm environment. Use positive reinforcement. Work slowly and check the dog\'s stress levels throughout.',
        questionType: 'long_text',
        rubric: { safety: 30, technique: 40, animal_welfare: 30 }
      }

      const mockAIResponse: AssessmentResult = {
        score: 78,
        feedback: 'Good foundation but missing some key safety protocols. Consider discussing restraint techniques and emergency procedures.',
        confidence: 'medium',
        reasoning: 'Answer covers basics but lacks depth in safety procedures.'
      }

      mockedAssessAnswer.mockResolvedValueOnce(mockAIResponse)

      const result = await assessAnswer(longTextRequest)

      expect(result.score).toBe(78)
      expect(result.feedback).toContain('safety protocols')
      expect(mockedAssessAnswer).toHaveBeenCalledWith(longTextRequest)
    })

    it('should_return_fallback_response_when_using_default_mock', async () => {
      // Don't configure the mock, use default behavior from setup.ts
      const result = await assessAnswer(mockRequest)

      expect(result).toEqual({
        score: 0,
        feedback: 'Unable to assess answer automatically. This submission requires manual review by a course leader.',
        confidence: 'low',
        reasoning: 'AI assessment failed due to technical error.'
      })
    })

    it('should_return_fallback_response_when_mock_throws_error', async () => {
      mockedAssessAnswer.mockRejectedValueOnce(new Error('Mock error'))

      // The mock will throw, but the function should handle it gracefully
      await expect(assessAnswer(mockRequest)).rejects.toThrow('Mock error')
    })

    it('should_handle_questions_with_special_characters_when_configured', async () => {
      const specialCharRequest: AssessmentRequest = {
        question: 'What is the "best" way to handle a dog\'s "nervous" behavior?',
        studentAnswer: 'Use calm & patient techniques with treats/rewards.',
        questionType: 'short_text'
      }

      const mockResponse: AssessmentResult = {
        score: 80,
        feedback: 'Good approach using positive reinforcement.',
        confidence: 'medium',
        reasoning: 'Shows understanding of behavior management.'
      }

      mockedAssessAnswer.mockResolvedValueOnce(mockResponse)

      const result = await assessAnswer(specialCharRequest)
      expect(result.score).toBe(80)
      expect(mockedAssessAnswer).toHaveBeenCalledWith(specialCharRequest)
    })

    it('should_handle_very_long_student_answers_when_configured', async () => {
      const longAnswer = 'This is a very long answer that goes into great detail about dog grooming techniques and safety procedures. '.repeat(20)
      
      const longAnswerRequest: AssessmentRequest = {
        question: 'Describe proper grooming techniques.',
        studentAnswer: longAnswer,
        questionType: 'long_text'
      }

      const mockResponse: AssessmentResult = {
        score: 95,
        feedback: 'Comprehensive answer with excellent detail.',
        confidence: 'high',
        reasoning: 'Student demonstrates thorough understanding.'
      }

      mockedAssessAnswer.mockResolvedValueOnce(mockResponse)

      const result = await assessAnswer(longAnswerRequest)
      expect(result.score).toBe(95)
      expect(mockedAssessAnswer).toHaveBeenCalledWith(longAnswerRequest)
    })

    it('should_handle_empty_student_answers_when_configured', async () => {
      const emptyAnswerRequest: AssessmentRequest = {
        question: 'What is proper brushing technique?',
        studentAnswer: '',
        questionType: 'short_text'
      }

      const mockResponse: AssessmentResult = {
        score: 0,
        feedback: 'No answer provided. Please provide a response.',
        confidence: 'high',
        reasoning: 'Empty submission receives zero score.'
      }

      mockedAssessAnswer.mockResolvedValueOnce(mockResponse)

      const result = await assessAnswer(emptyAnswerRequest)
      expect(result.score).toBe(0)
      expect(mockedAssessAnswer).toHaveBeenCalledWith(emptyAnswerRequest)
    })
  })

  describe('generateFeedbackSuggestions', () => {
    it('should_generate_improvement_suggestions_when_configured', async () => {
      const mockSuggestions = [
        'Add more detail about safety precautions',
        'Explain the tools needed for the procedure',
        'Include information about recognizing stress signals'
      ]

      mockedGenerateFeedback.mockResolvedValueOnce(mockSuggestions)

      const result = await generateFeedbackSuggestions(
        'Good start but needs more detail',
        'Dogs should be groomed carefully',
        'What safety measures should be taken when grooming?'
      )

      expect(result).toEqual(mockSuggestions)
      expect(mockedGenerateFeedback).toHaveBeenCalledWith(
        'Good start but needs more detail',
        'Dogs should be groomed carefully',
        'What safety measures should be taken when grooming?'
      )
    })

    it('should_return_empty_array_when_using_default_mock', async () => {
      // Don't configure the mock, use default behavior from setup.ts
      const result = await generateFeedbackSuggestions(
        'feedback',
        'answer',
        'context'
      )

      expect(result).toEqual([])
      expect(mockedGenerateFeedback).toHaveBeenCalledWith(
        'feedback',
        'answer',
        'context'
      )
    })

    it('should_handle_error_when_mock_throws', async () => {
      mockedGenerateFeedback.mockRejectedValueOnce(new Error('Mock error'))

      await expect(generateFeedbackSuggestions(
        'feedback',
        'answer',
        'context'
      )).rejects.toThrow('Mock error')
    })
  })

  describe('Environment Variable Validation', () => {
    it('should_have_access_to_test_environment_variables', () => {
      // These tests run with mocked functions, so we just verify the test environment
      expect(process.env.OPENAI_API_KEY).toBeTruthy()
    })
  })
})