import { describe, it, expect } from 'vitest'
import type { 
  AIAssessmentRequest, 
  AIAssessmentResponse, 
  AIAssessmentResult, 
  AssessmentMetrics 
} from '../ai'

describe('AI Types', () => {
  describe('AIAssessmentRequest', () => {
    it('accepts valid assessment request data', () => {
      const validRequest: AIAssessmentRequest = {
        questionId: '123e4567-e89b-12d3-a456-426614174001',
        questionTitle: 'Dog Coat Types',
        questionContent: 'What are the main differences between a double coat and a single coat?',
        questionType: 'long_text',
        studentAnswer: 'A double coat has two layers - an undercoat and guard hairs...',
        expectedAnswer: 'Double coats have undercoat and outer layer...',
        rubric: { max_score: 100, criteria: ['accuracy', 'completeness'] },
        options: undefined,
      }

      expect(validRequest.questionId).toBe('123e4567-e89b-12d3-a456-426614174001')
      expect(validRequest.questionType).toBe('long_text')
      expect(validRequest.studentAnswer).toContain('double coat')
    })

    it('handles multiple choice questions with options', () => {
      const multipleChoiceRequest: AIAssessmentRequest = {
        questionId: '123',
        questionTitle: 'Grooming Tools',
        questionContent: 'Which tool is best for undercoat removal?',
        questionType: 'multiple_choice',
        studentAnswer: 'undercoat_rake',
        expectedAnswer: 'undercoat_rake',
        options: {
          a: 'slicker_brush',
          b: 'undercoat_rake',
          c: 'pin_brush',
          d: 'bristle_brush',
        },
      }

      expect(multipleChoiceRequest.questionType).toBe('multiple_choice')
      expect(multipleChoiceRequest.options).toHaveProperty('b', 'undercoat_rake')
    })

    it('handles short text questions', () => {
      const shortTextRequest: AIAssessmentRequest = {
        questionId: '456',
        questionTitle: 'Safety Considerations',
        questionContent: 'List three safety considerations for anxious dogs.',
        questionType: 'short_text',
        studentAnswer: 'Proper restraints, calm environment, gradual introduction',
        expectedAnswer: 'Restraints, calm setting, slow introduction',
        rubric: { criteria: ['safety_awareness', 'completeness'], max_score: 100 },
      }

      expect(shortTextRequest.questionType).toBe('short_text')
      expect(shortTextRequest.rubric).toHaveProperty('max_score', 100)
    })
  })

  describe('AIAssessmentResponse', () => {
    it('defines valid assessment response structure', () => {
      const validResponse: AIAssessmentResponse = {
        score: 85,
        feedback: 'Good understanding demonstrated. Consider adding more specific examples.',
        confidence: 'high',
        reasoning: 'Answer covers all key points with clear explanations.',
        suggestions: [
          'Add specific grooming tool examples',
          'Include safety protocols',
          'Mention breed-specific considerations',
        ],
      }

      expect(validResponse.score).toBe(85)
      expect(validResponse.confidence).toBe('high')
      expect(validResponse.suggestions).toHaveLength(3)
    })

    it('handles responses without suggestions', () => {
      const responseWithoutSuggestions: AIAssessmentResponse = {
        score: 95,
        feedback: 'Excellent comprehensive answer.',
        confidence: 'high',
        reasoning: 'Perfect understanding of all concepts.',
      }

      expect(responseWithoutSuggestions.suggestions).toBeUndefined()
    })

    it('supports different confidence levels', () => {
      const lowConfidence: AIAssessmentResponse = {
        score: 60,
        feedback: 'Answer is unclear and may require human review.',
        confidence: 'low',
        reasoning: 'Student response is ambiguous.',
      }

      const mediumConfidence: AIAssessmentResponse = {
        score: 75,
        feedback: 'Good answer with minor gaps.',
        confidence: 'medium',
        reasoning: 'Most concepts correct, some details missing.',
      }

      expect(lowConfidence.confidence).toBe('low')
      expect(mediumConfidence.confidence).toBe('medium')
    })
  })

  describe('AIAssessmentResult', () => {
    it('extends assessment response with metadata', () => {
      const validResult: AIAssessmentResult = {
        submissionId: '123e4567-e89b-12d3-a456-426614174003',
        assessedAt: new Date('2023-06-15T14:30:00.000Z'),
        model: 'gpt-4',
        version: '1.0.0',
        score: 88,
        feedback: 'Very good answer with clear understanding.',
        confidence: 'high',
        reasoning: 'Student demonstrates mastery of key concepts.',
        suggestions: ['Consider adding practical examples'],
      }

      expect(validResult.submissionId).toBe('123e4567-e89b-12d3-a456-426614174003')
      expect(validResult.assessedAt).toBeInstanceOf(Date)
      expect(validResult.model).toBe('gpt-4')
      expect(validResult.version).toBe('1.0.0')
      
      // Should also have all AIAssessmentResponse properties
      expect(validResult.score).toBe(88)
      expect(validResult.confidence).toBe('high')
    })

    it('tracks assessment metadata correctly', () => {
      const resultWithMetadata: AIAssessmentResult = {
        submissionId: 'sub-123',
        assessedAt: new Date(),
        model: 'gpt-4-turbo',
        version: '2.1.0',
        score: 92,
        feedback: 'Exceptional work.',
        confidence: 'high',
        reasoning: 'Comprehensive and accurate.',
      }

      expect(resultWithMetadata.model).toBe('gpt-4-turbo')
      expect(resultWithMetadata.version).toBe('2.1.0')
      expect(resultWithMetadata.assessedAt).toBeInstanceOf(Date)
    })
  })

  describe('AssessmentMetrics', () => {
    it('defines comprehensive metrics structure', () => {
      const validMetrics: AssessmentMetrics = {
        totalAssessments: 150,
        averageScore: 82.5,
        confidenceDistribution: {
          low: 15,
          medium: 45,
          high: 90,
        },
        accuracyRate: 89.2,
      }

      expect(validMetrics.totalAssessments).toBe(150)
      expect(validMetrics.averageScore).toBe(82.5)
      expect(validMetrics.confidenceDistribution.high).toBe(90)
      expect(validMetrics.accuracyRate).toBe(89.2)
    })

    it('handles metrics without accuracy rate', () => {
      const metricsWithoutAccuracy: AssessmentMetrics = {
        totalAssessments: 100,
        averageScore: 75.0,
        confidenceDistribution: {
          low: 20,
          medium: 50,
          high: 30,
        },
        // accuracyRate is optional
      }

      expect(metricsWithoutAccuracy.totalAssessments).toBe(100)
      expect(metricsWithoutAccuracy.accuracyRate).toBeUndefined()
    })

    it('validates confidence distribution structure', () => {
      const metrics: AssessmentMetrics = {
        totalAssessments: 75,
        averageScore: 80.0,
        confidenceDistribution: {
          low: 10,
          medium: 25,
          high: 40,
        },
      }

      // Should have all three confidence levels
      expect(metrics.confidenceDistribution).toHaveProperty('low')
      expect(metrics.confidenceDistribution).toHaveProperty('medium')
      expect(metrics.confidenceDistribution).toHaveProperty('high')
      
      // Values should sum to total assessments
      const sum = metrics.confidenceDistribution.low + 
                  metrics.confidenceDistribution.medium + 
                  metrics.confidenceDistribution.high
      expect(sum).toBe(75)
    })
  })

  describe('Type Relationships', () => {
    it('maintains consistency between request and response types', () => {
      // Question types should be consistent between database and AI types
      const request: AIAssessmentRequest = {
        questionId: '123',
        questionTitle: 'Test',
        questionContent: 'Test content',
        questionType: 'multiple_choice', // Should match database QuestionType
        studentAnswer: 'answer',
      }

      expect(request.questionType).toBe('multiple_choice')
    })

    it('ensures confidence levels match between types', () => {
      const response: AIAssessmentResponse = {
        score: 80,
        feedback: 'Good work',
        confidence: 'medium', // Should match database ConfidenceLevel
        reasoning: 'Solid understanding',
      }

      expect(response.confidence).toBe('medium')
    })
  })

  describe('Type Constraints', () => {
    it('enforces reasonable score ranges in practice', () => {
      // While TypeScript doesn't enforce numeric ranges,
      // we can test that valid scores are accepted
      const validScores = [0, 25, 50, 75, 100]
      
      validScores.forEach(score => {
        const response: AIAssessmentResponse = {
          score,
          feedback: 'Test feedback',
          confidence: 'high',
          reasoning: 'Test reasoning',
        }
        
        expect(response.score).toBe(score)
        expect(response.score).toBeGreaterThanOrEqual(0)
        expect(response.score).toBeLessThanOrEqual(100)
      })
    })

    it('accepts valid confidence levels only', () => {
      const validConfidenceLevels: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high']
      
      validConfidenceLevels.forEach(confidence => {
        const response: AIAssessmentResponse = {
          score: 80,
          feedback: 'Test',
          confidence,
          reasoning: 'Test',
        }
        
        expect(response.confidence).toBe(confidence)
      })
    })
  })
})