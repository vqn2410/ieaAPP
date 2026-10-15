import { createServer } from 'node:http';
import { loadEnvFile } from 'node:process';
import assignedGroupsHandler from '../api/assigned-groups.js';

try {
  loadEnvFile('.env.local');
} catch {
  console.warn('No se encontró .env.local; el API necesita FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY_BASE64.');
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  if (pathname !== '/api/assigned-groups') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Ruta local no encontrada.' }));
    return;
  }

  const response = {
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
    await assignedGroupsHandler(req, response);
  } catch (error) {
    console.error('Error en API local de grupos asignados:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: 'Falló el API local de grupos asignados.' }));
    }
  }
});

server.listen(3005, '127.0.0.1', () => {
  console.log('API local de grupos asignados disponible en http://localhost:3005/api/assigned-groups');
});
