import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'src/vite-env.d.ts',
        '**/*.d.ts',
        'vitest.config.ts',
        'tailwind.config.js',
        'postcss.config.js'
      ]
    }
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})