import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Note: base: "./" is required for Capacitor Android WebView to load assets correctly.
// This does NOT affect the web app (Vercel/local dev) in any way.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rolldownOptions: {
      output: {
        keepNames: true,
      },
    },
  },
})

