import { defineConfig, defineProject } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  test: {
    projects: [
      defineProject({
        test: {
          name: 'electron',
          environment: 'node',
          include: ['src/electron/**/*.test.ts'],
          setupFiles: ['src/electron/test/setup.ts'],
        },
      }),
      defineProject({
        plugins: [react()],
        test: {
          name: 'react',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.test.{ts,tsx}'],
          exclude: ['src/electron/**'],
          setupFiles: ['src/test/setup.ts'],
        },
      }),
    ],
  },
})
