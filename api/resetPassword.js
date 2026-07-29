import admin from 'firebase-admin';

const rateLimitMap = new Map();
const RATE_LIMIT_MAX = 10;
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

  const idToken = authHeader.split('Bearer ')[1];

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
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

  if (!callerRoles.includes('Admin')) {
    return res.status(403).json({ error: 'Solo administradores pueden resetear contraseñas.' });
  }

  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return res.status(400).json({ error: 'Email y nueva contraseña son obligatorios.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword,
    });

    res.status(200).json({ success: true, message: 'Contraseña actualizada con éxito.' });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    res.status(500).json({ error: error.message || 'Error del servidor' });
  }
}
