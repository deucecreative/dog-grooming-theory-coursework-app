import { describe, it, expect, beforeEach } from 'vitest';
import { fallbackAssessment, isOpenAIAvailable } from '../fallback-assessment';
import type { AssessmentRequest } from '../openai';
import type { QuestionType } from '@/types/database';

describe('Fallback Assessment', () => {
  describe('fallbackAssessment', () => {
    describe('Multiple Choice Questions', () => {
      it('should score correct answers as 100', async () => {
        const request: AssessmentRequest = {
          question: 'What tool is best for removing undercoat?',
          studentAnswer: 'undercoat_rake',
          expectedAnswer: 'undercoat_rake',
          questionType: 'multiple_choice'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBe(100);
        expect(result.feedback).toContain('Correct');
        expect(result.confidence).toBe('high');
      });

      it('should score incorrect answers as 0', async () => {
        const request: AssessmentRequest = {
          question: 'What tool is best for removing undercoat?',
          studentAnswer: 'slicker_brush',
          expectedAnswer: 'undercoat_rake',
          questionType: 'multiple_choice'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBe(0);
        expect(result.feedback).toContain('Incorrect');
        expect(result.feedback).toContain('undercoat_rake');
        expect(result.confidence).toBe('high');
      });

      it('should handle case-insensitive matching', async () => {
        const request: AssessmentRequest = {
          question: 'What tool is best?',
          studentAnswer: 'UNDERCOAT_RAKE',
          expectedAnswer: 'undercoat_rake',
          questionType: 'multiple_choice'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBe(100);
      });

      it('should handle missing expected answer', async () => {
        const request: AssessmentRequest = {
          question: 'What tool is best?',
          studentAnswer: 'undercoat_rake',
          questionType: 'multiple_choice'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBe(0);
        expect(result.feedback).toContain('Cannot assess');
        expect(result.confidence).toBe('low');
      });
    });

    describe('Short Text Questions', () => {
      it('should score based on keyword matching', async () => {
        const request: AssessmentRequest = {
          question: 'What safety measures should you take?',
          studentAnswer: 'Use proper restraints and maintain a calm environment',
          questionType: 'short_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeGreaterThan(0);
        expect(result.score).toBeLessThanOrEqual(80);
        expect(result.confidence).toBe('low');
        expect(result.reasoning).toContain('keyword matching');
      });

      it('should recognize safety keywords', async () => {
        const request: AssessmentRequest = {
          question: 'Describe safety procedures',
          studentAnswer: 'Be careful and gentle, use caution with sharp tools',
          questionType: 'short_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeGreaterThan(0);
        expect(result.reasoning).toContain('safety');
      });

      it('should recognize tool keywords', async () => {
        const request: AssessmentRequest = {
          question: 'What tools do you need?',
          studentAnswer: 'You need scissors, clippers, and a brush',
          questionType: 'short_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeGreaterThan(0);
        expect(result.reasoning).toContain('tools');
      });

      it('should penalize very short answers', async () => {
        const request: AssessmentRequest = {
          question: 'Explain the grooming process',
          studentAnswer: 'Just brush',
          questionType: 'short_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeLessThan(40);
      });

      it('should cap score at 80 for automated assessment', async () => {
        const request: AssessmentRequest = {
          question: 'Describe complete grooming',
          studentAnswer: 'Safety first with gentle restraints. Use brush, scissors, clippers, and proper technique. Clean and sanitize all tools. Keep the dog comfortable and calm throughout.',
          questionType: 'short_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeLessThanOrEqual(80);
      });
    });

    describe('Long Text Questions', () => {
      it('should score based on length and structure', async () => {
        const longAnswer = `
          Grooming a Yorkshire Terrier requires careful attention to detail.
          First, secure the dog safely on the grooming table.
          Begin by brushing out the coat to remove any mats or tangles.
          Use thinning shears for the topknot area, being careful around the eyes.
          The face should be trimmed with blunt-tip scissors for safety.
          Clean any tear stains with appropriate products.
          Trim the nails carefully, avoiding the quick.
          Check and clean the ears as needed.
          Finish with a thorough brushing to ensure the coat is smooth.
          This comprehensive approach ensures the dog is properly groomed and comfortable throughout the process.
          Always prioritize the dog's safety and wellbeing during grooming sessions.
        `;

        const request: AssessmentRequest = {
          question: 'Describe grooming a Yorkshire Terrier',
          studentAnswer: longAnswer,
          questionType: 'long_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeGreaterThan(50);
        expect(result.feedback).toContain('comprehensive');
        expect(result.confidence).toBe('low');
      });

      it('should recognize technical terminology', async () => {
        const request: AssessmentRequest = {
          question: 'Explain coat care',
          studentAnswer: 'The undercoat and topcoat require different care. Use appropriate shampoo and conditioner. Remove mats and tangles carefully.',
          questionType: 'long_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.feedback).toContain('technical terminology');
        expect(result.score).toBeGreaterThanOrEqual(30);
      });

      it('should provide feedback for brief answers', async () => {
        const request: AssessmentRequest = {
          question: 'Explain the complete grooming process',
          studentAnswer: 'Brush the dog and trim nails.',
          questionType: 'long_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeLessThan(30);
        expect(result.feedback).toContain('brief');
      });

      it('should cap score at 70 for long text', async () => {
        const veryLongAnswer = Array(150).fill('grooming process').join(' ');
        
        const request: AssessmentRequest = {
          question: 'Describe grooming',
          studentAnswer: veryLongAnswer,
          questionType: 'long_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBeLessThanOrEqual(70);
      });

      it('should recommend manual review', async () => {
        const request: AssessmentRequest = {
          question: 'Explain grooming',
          studentAnswer: 'Grooming involves many steps and careful attention to the dog.',
          questionType: 'long_text'
        };

        const result = await fallbackAssessment(request);

        expect(result.feedback).toContain('Manual review recommended');
      });
    });

    describe('Unsupported Question Types', () => {
      it('should handle unknown question types', async () => {
        const request: AssessmentRequest = {
          question: 'Test question',
          studentAnswer: 'Test answer',
          questionType: 'unknown' as QuestionType
        };

        const result = await fallbackAssessment(request);

        expect(result.score).toBe(0);
        expect(result.feedback).toContain('Manual review required');
        expect(result.confidence).toBe('low');
      });
    });
  });

  describe('isOpenAIAvailable', () => {
    const originalEnv = process.env.OPENAI_API_KEY;

    beforeEach(() => {
      process.env.OPENAI_API_KEY = originalEnv;
    });

    it('should return false when no API key is set', () => {
      delete process.env.OPENAI_API_KEY;
      expect(isOpenAIAvailable()).toBe(false);
    });

    it('should return false for placeholder API key', () => {
      process.env.OPENAI_API_KEY = 'your_openai_api_key_here';
      expect(isOpenAIAvailable()).toBe(false);
    });

    it('should return false for test API key', () => {
      process.env.OPENAI_API_KEY = 'test-api-key-123';
      expect(isOpenAIAvailable()).toBe(false);
    });

    it('should return true for real-looking API key', () => {
      process.env.OPENAI_API_KEY = 'sk-abc123def456';
      expect(isOpenAIAvailable()).toBe(true);
    });
  });
});