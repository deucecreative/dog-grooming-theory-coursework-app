import '@testing-library/jest-dom/vitest'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { config } from 'dotenv'
import { resolve } from 'path'
import * as React from 'react'

// Load environment variables for integration tests
config({ path: resolve(process.cwd(), '.env.local') })

// Cleanup after each test case
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/dashboard'
  },
}))

// Mock Next.js Link
interface LinkProps extends React.PropsWithChildren {
  href: string
  [key: string]: unknown
}

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: LinkProps) => {
    return React.createElement('a', { href, ...props }, children)
  },
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      insert: vi.fn().mockReturnThis(),
    })),
  })),
}))

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: 'test-user-id', role: 'admin', status: 'approved' },
        error: null,
      }),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: 'test-user-id', role: 'admin', status: 'approved' },
        error: null,
      }),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    })),
  })),
}))

// Mock OpenAI - return default implementations that can be overridden in specific tests
vi.mock('@/lib/ai/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: vi.fn(),
      },
    },
  },
  assessAnswer: vi.fn().mockResolvedValue({
    score: 0,
    feedback: 'Unable to assess answer automatically. This submission requires manual review by a course leader.',
    confidence: 'low',
    reasoning: 'AI assessment failed due to technical error.'
  }),
  generateFeedbackSuggestions: vi.fn().mockResolvedValue([]),
}))

// Mock Lucide icons
vi.mock('lucide-react', () => {
  const MockIcon = (props: React.SVGProps<SVGSVGElement>) => {
    return React.createElement('svg', { 'data-testid': 'lucide-icon', ...props })
  }
  return {
    Home: MockIcon,
    FileText: MockIcon,
    ClipboardCheck: MockIcon,
    BarChart3: MockIcon,
    Users: MockIcon,
    Settings: MockIcon,
    BookOpen: MockIcon,
    User: MockIcon,
    LogOut: MockIcon,
    Mail: MockIcon,
    AlertTriangle: MockIcon,
    Shield: MockIcon,
    ChevronDown: MockIcon,
    ChevronUp: MockIcon,
    Check: MockIcon,
    RefreshCw: MockIcon,
    XCircle: MockIcon,
    CheckCircle: MockIcon,
    Clock: MockIcon,
    Calendar: MockIcon,
    Trash2: MockIcon,
    Send: MockIcon,
    Plus: MockIcon,
    Edit: MockIcon,
    Eye: MockIcon,
    EyeOff: MockIcon,
    GraduationCap: MockIcon,
    Download: MockIcon,
    Bell: MockIcon,
    UserCheck: MockIcon,
  }
})