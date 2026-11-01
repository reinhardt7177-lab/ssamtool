import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// 배포처마다 앱이 열리는 경로가 다르다.
// GitHub Pages는 /ssamtool/ 아래(워크플로가 VITE_BASE를 넘김), Vercel과 개발 서버는 / 에서 열린다.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: loadEnv(mode, '.', 'VITE_').VITE_BASE || '/',
}))
