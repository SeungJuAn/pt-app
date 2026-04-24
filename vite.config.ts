import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 배포 시 base는 /pt-app/ (repo 이름)
// 로컬 개발에선 / 사용
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/pt-app/' : '/',
  plugins: [react()],
}));
