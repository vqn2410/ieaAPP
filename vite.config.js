import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import youtubeHandler from './api/youtube.js'

const localYoutubeApiPlugin = () => ({
  name: 'local-youtube-api',
  configureServer(server) {
    server.middlewares.use('/api/youtube', async (req, res) => {
      const response = {
        setHeader(key, value) {
          res.setHeader(key, value);
          return this;
        },
        status(code) {
          res.statusCode = code;
          return this;
        },
        json(data) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(data));
          return this;
        },
      };
      await youtubeHandler(req, response);
    });
  },
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || env.VITE_APP_VERSION || 'dev';

  return {
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
    },
    plugins: [react(), localYoutubeApiPlugin()],
    base: '/',
    server: {
      proxy: {
        '/api': 'http://localhost:3005',
      },
    },
  };
});
