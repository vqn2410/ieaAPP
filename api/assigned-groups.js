import admin from 'firebase-admin';

function initAdmin() {
  if (admin.apps.length) return;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64
    ? Buffer.from(process.env.FIREBASE_PRIVATE_KEY_BASE64.replace(/\s/g, ''), 'base64').toString('utf8')
    : process.env.FIREBASE_PRIVATE_KEY;
  if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey) throw new Error('Firebase Admin no configurado.');
  try { privateKey = JSON.parse(privateKey).private_key || privateKey; } catch { /* PEM directo */ }
  admin.initializeApp({ credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID || 'iea-app-73f5f',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: String(privateKey).replace(/\\n/g, '\n').replace(/\r/g, ''),
  }) });
}

const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();
const asArray = value => Array.isArray(value) ? value : value ? [value] : [];

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    initAdmin();
    const token = await admin.auth().verifyIdToken(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    const db = admin.firestore();
    const user = (await db.collection('users').doc(token.uid).get()).data() || {};
    const roles = Array.isArray(user.role) ? user.role : [user.role];
    if (!roles.some(role => ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'].includes(role))) {
      return res.status(403).json({ error: 'Rol sin acceso a grupos asignados.' });
    }

    const email = String(token.email || '').toLowerCase();
    const members = (await db.collection('members').get()).docs.map(item => ({ id: item.id, ...item.data() }));
    const own = members.find(member => String(member.email || '').toLowerCase() === email);
    const ownNames = new Set([email, own?.id, normalize(`${own?.firstName} ${own?.lastName}`), normalize(`${own?.lastName}, ${own?.firstName}`)].filter(Boolean));
    const groups = (await db.collection('groups').get()).docs.map(item => ({ id: item.id, ...item.data() }));
    const assignedGroups = roles.some(role => ['Admin', 'Pastor'].includes(role))
      ? groups
      : groups.filter(group => [...asArray(group.facilitators), ...asArray(group.coFacilitators), ...asArray(group.facilitatorEmails)].some(value => ownNames.has(normalize(value))));
    const assignedIds = new Set(assignedGroups.map(group => group.id));
    const assignedNames = new Set(assignedGroups.map(group => normalize(group.name)));
    const assignedMembers = roles.some(role => ['Admin', 'Pastor'].includes(role))
      ? members
      : members.filter(member => assignedIds.has(member.groupId) || assignedNames.has(normalize(member.group)));

    return res.status(200).json({ groups: assignedGroups, members: assignedMembers });
  } catch (error) {
    console.error('Assigned groups error:', error);
    return res.status(500).json({ error: error.message || 'No se pudieron cargar los grupos.' });
  }
}
