import { getDefaultAdmin } from './firebase-admin.js';
import { httpError } from './http.js';
import { verifyIdToken } from './auth.js';

const CHANNELS = new Set(['email', 'sms', 'push']);

function configurationError(message) {
  return httpError(503, message, 'COMMUNICATION_PROVIDER_NOT_CONFIGURED');
}

export async function authenticateCommunication(req) {
  return verifyIdToken(req, getDefaultAdmin());
}

function getProvider() {
  return String(process.env.COMMUNICATION_PROVIDER || process.env.VITE_COMMUNICATION_PROVIDER || 'none')
    .trim()
    .toLowerCase();
}

function validateMessage(channel, message) {
  if (!CHANNELS.has(channel)) {
    throw httpError(400, 'El canal de comunicación no está disponible.');
  }
  if (!message || typeof message !== 'object') {
    throw httpError(400, 'El contenido de la comunicación es obligatorio.');
  }
  const destination = message.to || message.token;
  const content = message.body || message.text;
  if (!destination || !content) {
    throw httpError(400, 'La comunicación requiere destinatario y contenido.');
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
