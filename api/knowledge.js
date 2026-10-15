import admin from 'firebase-admin';

function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) return;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'iea-app-73f5f';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
    ? Buffer.from(String(process.env.FIREBASE_PRIVATE_KEY_BASE64).replace(/\s/g, ''), 'base64').toString('utf8')
    : process.env.FIREBASE_PRIVATE_KEY;
  if (!clientEmail || !privateKey) throw new Error('Faltan variables de Firebase Admin.');
  try {
    const json = JSON.parse(privateKey);
    privateKey = json.private_key || privateKey;
  } catch {
    // La clave también puede llegar directamente como PEM.
  }
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: String(privateKey).trim().replace(/\\n/g, '\n').replace(/\r/g, ''),
    }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    initializeFirebaseAdmin();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Token requerido.' });
    const token = await admin.auth().verifyIdToken(authHeader.slice(7));
    const userSnap = await admin.firestore().collection('users').doc(token.uid).get();
    const roles = Array.isArray(userSnap.data()?.role) ? userSnap.data().role : [userSnap.data()?.role];
    if (!roles.includes('Admin')) return res.status(403).json({ error: 'Solo Admin puede entrenar al asistente.' });

    const { topic, q, a } = req.body || {};
    if (![topic, q, a].every(value => typeof value === 'string' && value.trim())) {
      return res.status(400).json({ error: 'Tema, pregunta y respuesta son obligatorios.' });
    }
    const answer = a.trim().slice(0, 4000);
    const ref = await admin.firestore().collection('knowledge').add({
      topic: topic.trim().slice(0, 120),
      question: q.trim().slice(0, 1000),
      answer,
      createdBy: token.uid,
      createdAt: admin.firestore.Timestamp.now(),
    });
    return res.status(200).json({ id: ref.id, chunks: 1 });
  } catch (error) {
    console.error('Knowledge error:', error);
    return res.status(500).json({ error: error.message || 'No se pudo guardar el conocimiento.' });
  }
}
