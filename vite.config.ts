import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Для GitHub Pages: base = /имя-репозитория/ (задаётся в CI через VITE_BASE)
const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  /** Удобно тестировать с телефона в той же Wi‑Fi: `npm run dev` покажет Network URL */
  server: {
    host: true,
    port: 5173,
  },
  base,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
