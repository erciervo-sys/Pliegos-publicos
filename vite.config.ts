import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    define: {
      'process.env': {
         ...env,
         API_KEY: env.API_KEY || env.VITE_API_KEY
      }
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    build: {
      target: 'esnext'
    }
  };
});