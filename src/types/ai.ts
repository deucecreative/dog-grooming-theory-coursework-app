import type { QuestionType, ConfidenceLevel } from './database';

// Export QuestionType for external use
export type { QuestionType } from './database';

export interface AIAssessmentRequest {
  questionId: string;
  questionTitle: string;
  questionContent: string;
  questionType: QuestionType;
  studentAnswer: string;
  expectedAnswer?: string;
  rubric?: Record<string, unknown>;
  options?: Record<string, unknown>; // For multiple choice questions
}

export interface AIAssessmentResponse {
  score: number;
  feedback: string;
  confidence: ConfidenceLevel;
  reasoning: string;
  suggestions?: string[];
}

export interface AIAssessmentResult extends AIAssessmentResponse {
  submissionId: string;
  assessedAt: Date;
  model: string;
  version: string;
}

export interface AssessmentMetrics {
  totalAssessments: number;
  averageScore: number;
  confidenceDistribution: {
    low: number;
    medium: number;
    high: number;
  };
  accuracyRate?: number; // When compared to human grading
}

// Simplified types for testing
export interface AssessmentRequest {
  question: {
    type: QuestionType;
    content: string;
    rubric: string;
  };
  studentAnswer: string;
  maxScore: number;
}

export interface AssessmentResponse {
  score: number;
  feedback: string;
  confidence: number;
  reasoning: string;
}