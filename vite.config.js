import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// React 버전 개발용 진입점은 dev.html (npm run dev 후 /dev.html 접속).
// 저장소 루트의 index.html은 GitHub Pages용 단일 HTML 앱(빌드 산출물)이라
// Vite 진입점으로 쓰지 않는다.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: { input: 'dev.html' },
  },
  server: { open: '/dev.html' },
})
