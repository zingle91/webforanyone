import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * GitHub Pages project site base: /webforanyone/
 * - VITE_BASE wins when set (e.g. /webforanyone/)
 * - else GITHUB_PAGES=true → /webforanyone/
 * - else local default → /
 */
function resolveBase(): string {
  const fromEnv = process.env.VITE_BASE?.trim()
  if (fromEnv) {
    return fromEnv.endsWith('/') ? fromEnv : `${fromEnv}/`
  }
  if (process.env.GITHUB_PAGES === 'true') {
    return '/webforanyone/'
  }
  return '/'
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: true,
    port: 5173,
    strictPort: true,
  },
})
