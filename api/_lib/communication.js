import admin from 'firebase-admin';

const CHANNELS = new Set(['email', 'sms', 'push']);

function configurationError(message) {
  const error = new Error(message);
  error.statusCode = 503;
  error.code = 'COMMUNICATION_PROVIDER_NOT_CONFIGURED';
  return error;
}

function initializeFirebase() {
  if (admin.apps.length) return;

  const projectId = process.env.FIREBASE_PROJECT_ID || 'iea-app-73f5f';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
    ? Buffer.from(String(process.env.FIREBASE_PRIVATE_KEY_BASE64).replace(/\s/g, ''), 'base64').toString('utf8')
    : process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw configurationError('El servicio de comunicaciones requiere credenciales de Firebase en el servidor.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: String(privateKey).replace(/\\n/g, '\n'),
    }),
  });
}

export async function authenticateCommunication(req) {
  initializeFirebase();
  const match = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error('Token de autenticación requerido.');
    error.statusCode = 401;
    throw error;
  }
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch {
    const error = new Error('Token inválido o expirado.');
    error.statusCode = 401;
    throw error;
  }
}

function getProvider() {
  return String(process.env.COMMUNICATION_PROVIDER || process.env.VITE_COMMUNICATION_PROVIDER || 'none')
    .trim()
    .toLowerCase();
}

function validateMessage(channel, message) {
  if (!CHANNELS.has(channel)) {
    const error = new Error('El canal de comunicación no está disponible.');
    error.statusCode = 400;
    throw error;
  }
  if (!message || typeof message !== 'object') {
    const error = new Error('El contenido de la comunicación es obligatorio.');
    error.statusCode = 400;
    throw error;
  }
  const destination = message.to || message.token;
  const content = message.body || message.text;
  if (!destination || !content) {
    const error = new Error('La comunicación requiere destinatario y contenido.');
    error.statusCode = 400;
    throw error;
  }
}

async function sendWithWebhook(channel, message) {
  const url = process.env.COMMUNICATION_WEBHOOK_URL;
  const token = process.env.COMMUNICATION_WEBHOOK_TOKEN;
  if (!url || !token) {
    throw configurationError('El proveedor de comunicaciones no está configurado: faltan COMMUNICATION_WEBHOOK_URL y/o COMMUNICATION_WEBHOOK_TOKEN.');
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel, message }),
  });
  if (!response.ok) {
    throw new Error(`El proveedor de comunicaciones respondió con ${response.status}.`);
  }
  return { accepted: true };
}

export async function sendCommunication(channel, message) {
  validateMessage(channel, message);
  const provider = getProvider();
  if (provider === 'none' || !provider) {
    throw configurationError('El proveedor de comunicaciones no está configurado. Definí COMMUNICATION_PROVIDER en el servidor.');
  }
  if (provider === 'webhook') return sendWithWebhook(channel, message);
  throw configurationError(`El proveedor de comunicaciones "${provider}" no está implementado.`);
}

export function handleCommunicationError(res, error) {
  const status = Number(error?.statusCode) || 500;
  if (status >= 500 && status !== 503) console.error('Communication API error:', error);
  return res.status(status).json({
    error: error?.message || 'No se pudo enviar la comunicación.',
    ...(error?.code ? { code: error.code } : {}),
  });
}
