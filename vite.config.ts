import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages는 https://<계정>.github.io/ssamtool/ 아래에서 열리므로 빌드할 때만 경로를 맞춘다
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/ssamtool/' : '/',
}))
