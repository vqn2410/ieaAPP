import admin from 'firebase-admin';

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60_000;

function checkRateLimit(key) {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(key, { windowStart: now, count: 1 });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) {
    return false;
  }
  record.count++;
  return true;
}

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return true;

  const projectId = process.env.FIREBASE_PROJECT_ID || "iea-app-73f5f";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error('Faltan Variables de Entorno en Vercel.');
  }

  privateKey = privateKey.replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  return true;
}

async function callAssistant(question) {
  const apiUrl = process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions';
  const apiKey = process.env.AI_API_KEY;
  const model = process.env.AI_MODEL || 'gpt-4o-mini';

  const system = [
    'Sos IEA, el asistente oficial de la Iglesia Extremo Amor (IEA) en Remedios de Escalada, Buenos Aires.',
    'Respondés en español rioplatense, de forma breve, amable y útil.',
    'Solo respondés con información de IEA que se te dé en esta conversación. No usés conocimiento general, internet ni datos externos.',
    'Si la información no está disponible, decilo con honestidad y no inventes.',
    'No compartas información sensible o interna (cantidad de miembros, bautizados, nombres, seguencias, finanzas, estadísticas).',
  ].join(' ');

  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Error de la IA (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) throw new Error('Respuesta vacía del modelo.');
  return answer.trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(`ip:${ip}`)) {
    return res.status(429).json({ error: 'Demasiadas solicitudes. Espera un minuto.' });
  }

  try {
    initializeFirebaseAdmin();
  } catch (initError) {
    return res.status(500).json({ error: initError.message });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación requerido.' });
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(authHeader.split('Bearer ')[1]);
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }

  const callerUid = decodedToken.uid;
  const callerDoc = await admin.firestore().collection('users').doc(callerUid).get();
  if (!callerDoc.exists) {
    return res.status(403).json({ error: 'Usuario no encontrado en Firestore.' });
  }

  const callerData = callerDoc.data();
  const callerRoles = Array.isArray(callerData.role) ? callerData.role : [callerData.role];

  const allowed = ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'];
  if (!allowed.some(r => callerRoles.includes(r))) {
    return res.status(403).json({ error: 'Rol sin acceso al asistente.' });
  }

  const { question } = req.body;
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ error: 'La pregunta es obligatoria.' });
  }

  const trimmedQuestion = question.trim().slice(0, 1000);

  try {
    const answer = await callAssistant(trimmedQuestion);
    res.status(200).json({ answer });
  } catch (error) {
    console.error('Assistant error:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
}