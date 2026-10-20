import { createServer } from 'node:http';
import { loadEnvFile } from 'node:process';
import assignedGroupsHandler from '../api/assigned-groups.js';
import youtubeHandler from '../api/youtube.js';

try {
  loadEnvFile('.env.local');
} catch {
  console.warn('No se encontró .env.local; el API necesita FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY_BASE64.');
}

const routes = {
  '/api/assigned-groups': assignedGroupsHandler,
  '/api/youtube': youtubeHandler,
};

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  const routeHandler = routes[pathname];
  if (!routeHandler) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Ruta local no encontrada.' }));
    return;
  }

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

  try {
    await routeHandler(req, response);
  } catch (error) {
    console.error(`Error en API local (${pathname}):`, error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Falló el API local.' }));
    }
  }
});

server.listen(3005, '127.0.0.1', () => {
  console.log('API local disponible en http://localhost:3005 (/api/assigned-groups, /api/youtube)');
});
