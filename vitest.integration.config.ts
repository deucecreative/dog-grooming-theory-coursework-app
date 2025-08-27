import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node', // Use node environment for API calls
    // Don't use the setup file with mocks for integration tests
    setupFiles: [], 
    css: true,
    include: [
      '**/*.integration.test.{ts,tsx}',
      'src/app/__tests__/integration/**/*.{ts,tsx}',
    ],
    testTimeout: 30000, // Longer timeout for API calls
    coverage: {
      enabled: false, // Don't measure coverage for integration tests
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})