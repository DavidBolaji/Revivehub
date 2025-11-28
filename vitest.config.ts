import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Use happy-dom for component tests (better compatibility than jsdom)
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    // Configure environment matching
    environmentMatchGlobs: [
      // Component tests use happy-dom
      ['**/__tests__/unit/**/*.test.{ts,tsx}', 'happy-dom'],
      ['**/__tests__/integration/**/*.test.{ts,tsx}', 'happy-dom'],
      // Other tests can use node
      ['**/__tests__/**/*.test.ts', 'node'],
    ],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
})
