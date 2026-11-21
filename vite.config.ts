import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter} from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite';

// No inline scripts or event handlers may run in the app document, so markup from a book
// (e.g. <img onerror="...">) can't reach window.electronAPI.
// Styles/images/fonts stay permissive enough for the current reader (inline <style>, data: URIs).
// book: is the main process's protocol for files inside library books.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' book:",
  "img-src 'self' data: book:",
  "font-src 'self' data: book:",
  "connect-src 'self' book:",
  "object-src 'none'",
  "base-uri 'none'",
].join('; ')

// Build only: the dev server injects an inline React Refresh script that this policy would block.
function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CONTENT_SECURITY_POLICY },
        injectTo: 'head-prepend',
      },
    ],
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tailwindcss(),
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    contentSecurityPolicy(),
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
