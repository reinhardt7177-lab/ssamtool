import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vercel 루트(/)에서 열린다
export default defineConfig({
  plugins: [react()],
})
