import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface AssessmentResult {
  score: number;
  feedback: string;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface AssessmentRequest {
  question: string;
  studentAnswer: string;
  expectedAnswer?: string;
  rubric?: Record<string, unknown>;
  questionType: 'multiple_choice' | 'short_text' | 'long_text';
}

export async function assessAnswer(request: AssessmentRequest): Promise<AssessmentResult> {
  const { question, studentAnswer, expectedAnswer, rubric, questionType } = request;

  const systemPrompt = `You are an expert dog grooming instructor evaluating student coursework. Your role is to:
1. Assess the student's answer for accuracy, completeness, and understanding
2. Provide constructive feedback to help the student improve
3. Assign a score from 0-100
4. Indicate your confidence level in the assessment

Key principles:
- Be encouraging and constructive
- Focus on dog grooming theory and practical knowledge
- Consider safety as paramount in grooming practices
- Recognize different valid approaches where appropriate`;

  let userPrompt = '';

  switch (questionType) {
    case 'multiple_choice':
      userPrompt = `
Question: ${question}
Student's Answer: ${studentAnswer}
Expected Answer: ${expectedAnswer}

Please evaluate this multiple choice answer. Return a JSON object with:
- score: 100 for correct, 0 for incorrect
- feedback: Brief explanation of why the answer is correct/incorrect
- confidence: "high" (for clear multiple choice)
- reasoning: Explanation of the correct answer
`;
      break;

    case 'short_text':
      userPrompt = `
Question: ${question}
Student's Answer: ${studentAnswer}
Expected Answer: ${expectedAnswer || 'Not provided'}
Rubric: ${rubric ? JSON.stringify(rubric) : 'General assessment'}

Please evaluate this short answer. Return a JSON object with:
- score: 0-100 based on accuracy and completeness
- feedback: Constructive feedback (2-3 sentences)
- confidence: "low", "medium", or "high"
- reasoning: Brief explanation of scoring rationale
`;
      break;

    case 'long_text':
      userPrompt = `
Question: ${question}
Student's Answer: ${studentAnswer}
Expected Answer: ${expectedAnswer || 'Not provided'}
Rubric: ${rubric ? JSON.stringify(rubric) : 'General assessment focusing on understanding, accuracy, and practical application'}

Please evaluate this detailed answer. Return a JSON object with:
- score: 0-100 based on understanding, accuracy, completeness, and practical application
- feedback: Detailed constructive feedback (3-5 sentences) highlighting strengths and areas for improvement
- confidence: "low", "medium", or "high" based on how clear-cut the assessment is
- reasoning: Explanation of how you arrived at the score
`;
      break;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3, // Lower temperature for more consistent grading
      max_tokens: 1000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const result = JSON.parse(response) as AssessmentResult;

    // Validate the response structure
    if (typeof result.score !== 'number' || result.score < 0 || result.score > 100) {
      throw new Error('Invalid score in AI response');
    }

    if (!result.feedback || !result.confidence || !result.reasoning) {
      throw new Error('Missing required fields in AI response');
    }

    return result;
  } catch (error) {
    console.error('Error assessing answer with OpenAI:', error);
    
    // Fallback response in case of AI failure
    return {
      score: 0,
      feedback: 'Unable to assess answer automatically. This submission requires manual review by a course leader.',
      confidence: 'low',
      reasoning: 'AI assessment failed due to technical error.'
    };
  }
}

export async function generateFeedbackSuggestions(
  originalFeedback: string,
  studentAnswer: string,
  questionContext: string
): Promise<string[]> {
  const prompt = `
Given this student answer and original feedback, suggest 3 specific, actionable improvements the student could make:

Question Context: ${questionContext}
Student Answer: ${studentAnswer}
Original Feedback: ${originalFeedback}

Return only a JSON array of 3 short, specific suggestions (each under 50 words).
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      console.warn('OpenAI returned empty response, using fallback suggestions');
      return getDefaultFeedbackSuggestions(originalFeedback, studentAnswer);
    }

    // Robust JSON parsing with validation
    return parseAndValidateFeedbackResponse(response, originalFeedback, studentAnswer);
  } catch (error) {
    console.error('Error generating feedback suggestions:', error);
    return getDefaultFeedbackSuggestions(originalFeedback, studentAnswer);
  }
}

/**
 * Safely parse and validate OpenAI response as feedback suggestions array
 */
function parseAndValidateFeedbackResponse(
  response: string,
  originalFeedback: string,
  studentAnswer: string
): string[] {
  try {
    // Clean the response - remove common formatting issues
    const cleanResponse = response.trim();
    
    // Check if response looks like JSON array
    if (!cleanResponse.startsWith('[') || !cleanResponse.endsWith(']')) {
      console.warn('OpenAI response is not JSON array format, using fallback');
      return getDefaultFeedbackSuggestions(originalFeedback, studentAnswer);
    }

    // Attempt to parse JSON
    const parsed = JSON.parse(cleanResponse);
    
    // Validate it's actually an array
    if (!Array.isArray(parsed)) {
      console.warn('OpenAI returned valid JSON but not an array, using fallback');
      return getDefaultFeedbackSuggestions(originalFeedback, studentAnswer);
    }

    // Validate array contains strings
    const validSuggestions = parsed.filter(item => 
      typeof item === 'string' && item.trim().length > 0
    );

    if (validSuggestions.length === 0) {
      console.warn('OpenAI returned array with no valid string suggestions, using fallback');
      return getDefaultFeedbackSuggestions(originalFeedback, studentAnswer);
    }

    // Return valid suggestions (limit to 3 as requested)
    return validSuggestions.slice(0, 3);

  } catch (parseError) {
    console.warn('Failed to parse OpenAI response as JSON:', parseError);
    return getDefaultFeedbackSuggestions(originalFeedback, studentAnswer);
  }
}

/**
 * Generate contextual fallback suggestions when AI fails
 */
function getDefaultFeedbackSuggestions(
  originalFeedback: string,
  studentAnswer: string
): string[] {
  const suggestions: string[] = [];

  // Provide contextual suggestions based on feedback and answer content
  if (originalFeedback.toLowerCase().includes('detail') || studentAnswer.length < 50) {
    suggestions.push('Expand your answer with more specific details and examples');
  }

  if (originalFeedback.toLowerCase().includes('safety') || originalFeedback.toLowerCase().includes('precaution')) {
    suggestions.push('Include relevant safety considerations and best practices');
  }

  if (originalFeedback.toLowerCase().includes('technique') || originalFeedback.toLowerCase().includes('method')) {
    suggestions.push('Describe the specific techniques and methods you would use');
  }

  // Ensure we always have at least 2 suggestions
  if (suggestions.length === 0) {
    suggestions.push('Provide more comprehensive explanation of your reasoning');
    suggestions.push('Include specific examples to illustrate your points');
  } else if (suggestions.length === 1) {
    suggestions.push('Support your answer with relevant examples or evidence');
  }

  return suggestions.slice(0, 3); // Max 3 suggestions
}