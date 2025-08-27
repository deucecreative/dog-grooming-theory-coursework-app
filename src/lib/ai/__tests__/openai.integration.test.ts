import { describe, it, expect, beforeAll, vi } from 'vitest'

// Unmock the OpenAI module for real integration tests
vi.unmock('@/lib/ai/openai')
vi.unmock('../openai')

// Now import the real implementations
import { assessAnswer, generateFeedbackSuggestions } from '../openai'
import type { AssessmentRequest } from '../openai'

// Skip these tests if no real API key is available
const hasRealApiKey = process.env.OPENAI_API_KEY && 
                      !process.env.OPENAI_API_KEY.includes('test-api-key') &&
                      !process.env.OPENAI_API_KEY.includes('your_openai_api_key')

describe.skipIf(!hasRealApiKey)('OpenAI Real Integration Tests', () => {
  beforeAll(() => {
    console.log('🤖 Running real OpenAI integration tests with actual API')
  })

  describe('assessAnswer with real OpenAI', () => {
    it('assesses a multiple choice question correctly', async () => {
      const request: AssessmentRequest = {
        question: 'Which tool is best for removing loose undercoat from a Golden Retriever?',
        studentAnswer: 'undercoat_rake',
        expectedAnswer: 'undercoat_rake',
        questionType: 'multiple_choice',
      }

      const result = await assessAnswer(request)

      // With real AI, we check structure and reasonable values
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('feedback')
      expect(result).toHaveProperty('confidence')
      expect(result).toHaveProperty('reasoning')
      
      expect(result.score).toBeGreaterThanOrEqual(90) // Correct answer should score high
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.feedback).toBeTruthy()
      expect(['low', 'medium', 'high']).toContain(result.confidence)
    }, 30000) // 30 second timeout for API call

    it('assesses an incorrect answer appropriately', async () => {
      const request: AssessmentRequest = {
        question: 'Which tool is best for removing loose undercoat from a Golden Retriever?',
        studentAnswer: 'slicker_brush',
        expectedAnswer: 'undercoat_rake',
        questionType: 'multiple_choice',
      }

      const result = await assessAnswer(request)

      expect(result.score).toBeLessThan(50) // Wrong answer should score low
      expect(result.feedback.toLowerCase()).toContain('incorrect') // Should indicate wrong answer
    }, 30000)

    it('evaluates a short text answer', async () => {
      const request: AssessmentRequest = {
        question: 'List three essential safety considerations when grooming an anxious dog.',
        studentAnswer: 'Use proper restraints, maintain calm environment, take frequent breaks',
        questionType: 'short_text',
      }

      const result = await assessAnswer(request)

      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
      expect(result.feedback.length).toBeGreaterThan(20) // Meaningful feedback
      expect(result.reasoning).toBeTruthy()
    }, 30000)

    it('provides detailed feedback for long text answers', async () => {
      const request: AssessmentRequest = {
        question: 'Describe the complete process for grooming a Yorkshire Terrier face.',
        studentAnswer: 'Start by securing the dog comfortably. Use thinning shears for the topknot, being careful not to cut too short. Trim around the eyes carefully with blunt-tip scissors for safety. Clean tear stains with appropriate solution. Finish with a rounded teddy bear cut on the muzzle using curved shears.',
        questionType: 'long_text',
      }

      const result = await assessAnswer(request)

      expect(result.score).toBeGreaterThanOrEqual(60) // Decent answer should score reasonably
      expect(result.feedback.split(' ').length).toBeGreaterThan(10) // Detailed feedback
      expect(result.confidence).toBeTruthy()
    }, 30000)
  })

  describe('generateFeedbackSuggestions with real OpenAI', () => {
    it('generates relevant improvement suggestions', async () => {
      const result = await generateFeedbackSuggestions(
        'Your answer shows understanding but lacks specific detail about the grooming process.',
        'Double coats have two layers that need different treatment.',
        'Explain the difference between double and single coats in dog grooming.'
      )

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result.length).toBeLessThanOrEqual(3)
      
      // Each suggestion should be a meaningful string
      result.forEach(suggestion => {
        expect(typeof suggestion).toBe('string')
        expect(suggestion.length).toBeGreaterThan(10)
        expect(suggestion.length).toBeLessThan(200) // Under 50 words as specified
      })
    }, 30000)

    it('handles edge cases gracefully', async () => {
      const result = await generateFeedbackSuggestions(
        '',
        '',
        ''
      )

      // Even with empty input, should return array (possibly empty)
      expect(Array.isArray(result)).toBe(true)
    }, 30000)
  })
})