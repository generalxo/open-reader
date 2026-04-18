import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter} from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react()
  ],
  base: './',
  build: {
    outDir: 'dist-react',
  },
  server: {
    port: 5173,
    strictPort: true,
    host: '127.0.0.1',
    open: false,
  },
});

