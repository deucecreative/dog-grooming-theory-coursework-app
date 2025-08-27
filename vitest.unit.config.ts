import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'unit',
    include: [
      // Regular unit tests
      'src/**/*.test.{ts,tsx}',
      'src/**/*.spec.{ts,tsx}',
      'src/**/__tests__/**/*.{ts,tsx}',
      // SECURITY EXCEPTION: Include critical security tests that must run in unit suite
      'src/test/__tests__/authenticated-invitation-deletion.test.ts',
      'src/test/__tests__/user-api-authenticated-integration.test.ts',
    ],
    exclude: [
      // Exclude integration and e2e tests from regular locations
      'src/**/*.integration.test.{ts,tsx}',
      'src/**/*.e2e.test.{ts,tsx}',
      // Exclude separated test categories
      'src/app/__tests__/integration/**/*',
      'src/app/__tests__/e2e/**/*',
      // Standard exclusions
      'node_modules/**/*',
      '.next/**/*',
    ],
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    globals: true,
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})