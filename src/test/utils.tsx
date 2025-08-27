import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Mock data factories
export const mockUser = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00.000Z',
}

export const mockProfile = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  full_name: 'Test User',
  role: 'student' as const,
  status: 'approved' as const,
  approved_by: null,
  approved_at: null,
  rejection_reason: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
}

export const mockQuestion = {
  id: '123e4567-e89b-12d3-a456-426614174001',
  title: 'Test Question',
  content: 'What is the main difference between a double coat and single coat?',
  type: 'long_text' as const,
  expected_answer: 'Double coat has undercoat and guard hairs...',
  rubric: { max_score: 100 },
  options: null,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
  created_by: '123e4567-e89b-12d3-a456-426614174000',
}

export const mockAssessment = {
  score: 85,
  feedback: 'Good understanding of coat types with room for improvement.',
  confidence: 'high' as const,
  reasoning: 'Answer demonstrates clear understanding of key concepts.',
}