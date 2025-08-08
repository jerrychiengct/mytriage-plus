import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // For GitHub Pages: set $env:VITE_BASE='/{repo}/' before npm run deploy
  base: process.env.VITE_BASE || '/'
})
