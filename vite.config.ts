import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 3039, strictPort: true },
  preview: { host: '127.0.0.1', port: 3040, strictPort: true },
  build: { rollupOptions: { output: { manualChunks: (id: string) => id.includes('/node_modules/three/') ? 'three' : undefined } } },
});
