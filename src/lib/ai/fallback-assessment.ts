import type { AssessmentResult, AssessmentRequest } from './openai';

/**
 * Fallback assessment logic when OpenAI is unavailable
 * Provides basic rule-based assessment for different question types
 */

export async function fallbackAssessment(request: AssessmentRequest): Promise<AssessmentResult> {
  const { question, studentAnswer, expectedAnswer, questionType } = request;

  switch (questionType) {
    case 'multiple_choice':
      return assessMultipleChoice(studentAnswer, expectedAnswer);
    
    case 'short_text':
      return assessShortText(studentAnswer, expectedAnswer, question);
    
    case 'long_text':
      return assessLongText(studentAnswer, question);
    
    default:
      return {
        score: 0,
        feedback: 'Manual review required for this answer type.',
        confidence: 'low',
        reasoning: 'Unsupported question type for automated assessment.'
      };
  }
}

function assessMultipleChoice(
  studentAnswer: string,
  expectedAnswer?: string
): AssessmentResult {
  if (!expectedAnswer) {
    return {
      score: 0,
      feedback: 'Cannot assess without expected answer. Manual review required.',
      confidence: 'low',
      reasoning: 'No expected answer provided for comparison.'
    };
  }

  const isCorrect = studentAnswer.toLowerCase().trim() === expectedAnswer.toLowerCase().trim();
  
  return {
    score: isCorrect ? 100 : 0,
    feedback: isCorrect 
      ? 'Correct answer! Well done.'
      : `Incorrect. The correct answer is: ${expectedAnswer}`,
    confidence: 'high',
    reasoning: 'Multiple choice questions have definitive answers.'
  };
}

function assessShortText(
  studentAnswer: string,
  _expectedAnswer: string | undefined,
  _question: string
): AssessmentResult {
  const answer = studentAnswer.toLowerCase().trim();
  
  // Basic keyword matching for common grooming terms
  const groomingKeywords = {
    safety: ['safety', 'safe', 'careful', 'caution', 'gentle', 'secure', 'restraint'],
    tools: ['brush', 'comb', 'scissors', 'clippers', 'shears', 'rake', 'nail', 'trimmer'],
    technique: ['technique', 'method', 'approach', 'process', 'procedure', 'step'],
    hygiene: ['clean', 'sanitize', 'disinfect', 'wash', 'hygiene', 'sterile'],
    comfort: ['comfort', 'calm', 'relax', 'stress', 'anxiety', 'gentle', 'patient']
  };

  let score = 0;
  const matchedCategories: string[] = [];

  // Check for keyword matches
  Object.entries(groomingKeywords).forEach(([category, keywords]) => {
    if (keywords.some(keyword => answer.includes(keyword))) {
      score += 20;
      matchedCategories.push(category);
    }
  });

  // Cap score at 80 for automated assessment
  score = Math.min(score, 80);

  // Check answer length (minimum effort)
  if (answer.split(' ').length < 3) {
    score = Math.max(score - 20, 0);
  }

  return {
    score,
    feedback: generateShortTextFeedback(score, matchedCategories),
    confidence: 'low',
    reasoning: `Automated assessment based on keyword matching. Found relevant terms in categories: ${matchedCategories.join(', ') || 'none'}`
  };
}

function assessLongText(
  studentAnswer: string,
  _question: string
): AssessmentResult {
  const answer = studentAnswer.toLowerCase().trim();
  const wordCount = answer.split(/\s+/).length;

  // Basic quality indicators
  let score = 0;
  const feedback: string[] = [];

  // Check answer length
  if (wordCount < 20) {
    feedback.push('Your answer is quite brief. Consider expanding with more detail.');
    score = 10;
  } else if (wordCount < 50) {
    feedback.push('Good start, but more detail would strengthen your answer.');
    score = 30;
  } else if (wordCount < 100) {
    feedback.push('You\'ve provided a reasonable amount of detail.');
    score = 50;
  } else {
    feedback.push('You\'ve provided a comprehensive response.');
    score = 60;
  }

  // Check for structure (paragraphs, sentences)
  const sentences = answer.split(/[.!?]+/).filter(s => s.trim().length > 0);
  if (sentences.length > 3) {
    score += 10;
    feedback.push('Good use of multiple sentences to explain your points.');
  }

  // Check for grooming-specific terminology
  const technicalTerms = [
    'undercoat', 'topcoat', 'mat', 'tangle', 'shed', 'groom',
    'clipper', 'blade', 'guard', 'scissors', 'shears',
    'nail', 'quick', 'pad', 'ear', 'teeth',
    'shampoo', 'conditioner', 'dryer', 'table'
  ];

  const usedTerms = technicalTerms.filter(term => answer.includes(term));
  if (usedTerms.length > 0) {
    score += Math.min(usedTerms.length * 5, 20);
    feedback.push(`Good use of technical terminology (${usedTerms.slice(0, 3).join(', ')}${usedTerms.length > 3 ? ', ...' : ''}).`);
  }

  // Cap score at 70 for automated assessment of long text
  score = Math.min(score, 70);

  return {
    score,
    feedback: feedback.join(' ') + ' Manual review recommended for complete assessment.',
    confidence: 'low',
    reasoning: 'Basic automated assessment based on length, structure, and terminology. Full evaluation requires manual review.'
  };
}

function generateShortTextFeedback(score: number, matchedCategories: string[]): string {
  if (score >= 60) {
    return `Good answer covering ${matchedCategories.join(', ')}. Consider adding more specific details for a complete response.`;
  } else if (score >= 40) {
    return `Partial answer. You mentioned ${matchedCategories.join(', ') || 'some relevant points'}, but more detail is needed.`;
  } else if (score >= 20) {
    return `Basic answer. Try to include more specific grooming concepts and techniques.`;
  } else {
    return `Your answer needs more detail. Please review the course material and provide specific grooming information.`;
  }
}

export function isOpenAIAvailable(): boolean {
  // Check if we have a valid API key and it's not the placeholder
  const apiKey = process.env.OPENAI_API_KEY;
  return !!(apiKey && 
           !apiKey.includes('your_openai_api_key') && 
           !apiKey.includes('test-api-key'));
}