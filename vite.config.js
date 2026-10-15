import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || env.VITE_APP_VERSION || 'dev';

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    plugins: [react()],
    base: './',
    server: {
      proxy: {
        '/api': 'http://localhost:3005',
      },
    },
  };
});
