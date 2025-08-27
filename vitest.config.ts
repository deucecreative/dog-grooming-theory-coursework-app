import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    exclude: [
      'node_modules/**',
      '.next/**',
      'dist/**',
      'cypress/**',
      'coverage/**',
      'src/lib/ai/__tests__/openai.integration.test.ts', // Run with integration config
      '**/*.e2e.test.{ts,tsx}', // E2E tests run separately
      'src/app/__tests__/e2e/**', // E2E tests run separately
    ],
    coverage: {
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'src/app/globals.css',
        '**/types/**',
        '**/*.stories.*',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        // Higher standards for critical security paths
        'src/app/api/**': {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        // Higher standards for authentication and RLS
        'src/lib/supabase/**': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})