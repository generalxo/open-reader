import { defineConfig, defineProject } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: 'electron',
          environment: 'node',
          include: ['tests/node/**/*.test.ts'],
          setupFiles: ['tests/node/setup.ts'],
        },
      }),
      defineProject({
        plugins: [react()],
        test: {
          name: 'react',
          environment: 'jsdom',
          globals: true,
          include: ['tests/react/**/*.test.{ts,tsx}'],
          setupFiles: ['tests/react/setup.ts'],
        },
      }),
    ],
  },
})
