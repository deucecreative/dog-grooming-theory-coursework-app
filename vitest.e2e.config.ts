import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'e2e',
    globals: true,
    environment: 'node', // Use node environment for API calls and database operations
    setupFiles: [], // Don't use mock setup for e2e tests
    globalSetup: ['src/test/e2e-setup.ts'], // Start/stop dev server automatically
    css: true,
    include: [
      '**/*.e2e.test.{ts,tsx}',
      'src/app/__tests__/e2e/**/*.{ts,tsx}',
    ],
    testTimeout: 45000, // Longer timeout for full e2e workflows
    coverage: {
      enabled: false, // Don't measure coverage for e2e tests
    },
    env: {
      // Default API base URL for E2E tests
      API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3002'
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})