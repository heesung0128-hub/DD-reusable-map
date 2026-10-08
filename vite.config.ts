import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';

export default defineConfig({
  // GitHub Pages 배포 경로. 저장소 이름과 같아야 함
  base: '/DD-reusable-map/',
  plugins: [react(), tailwindcss()],
});
