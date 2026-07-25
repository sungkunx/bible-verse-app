import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시 base를 '/저장소이름/' 으로 바꾸세요.
export default defineConfig({
  plugins: [react()],
  base: './',
})
