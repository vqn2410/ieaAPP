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

function matchesMemberReference(value, member, email) {
  const reference = normalize(typeof value === 'object' ? value.id || value.email || `${value.firstName || ''} ${value.lastName || ''}` : value);
  if (!reference) return false;
  if (reference === normalize(member.id) || reference === normalize(email) || reference === normalize(member.email)) return true;
  const fullName = normalize(`${member.firstName || ''} ${member.lastName || ''}`);
  const reversedName = normalize(`${member.lastName || ''} ${member.firstName || ''}`);
  if (reference === fullName || reference === reversedName) return true;
  const parts = reference.split(' ').filter(part => part.length > 2);
  return parts.length > 0 && parts.some(part => fullName.includes(part) || reversedName.includes(part));
}

function isAssignedLeader(group, member, email) {
  const assignments = [
    ...asArray(group.facilitators),
    ...asArray(group.coFacilitators),
    ...asArray(group.facilitatorEmails),
  ];
  return assignments.some(value => matchesMemberReference(value, member, email));
}

function isGroupMember(group, member) {
  if (member.groupId === group.id) return true;
  const groupName = normalize(group.name);
  if (groupName && normalize(member.group) === groupName) return true;
  const assignedReferences = [
    ...asArray(group.initialMemberIds),
    ...asArray(group.memberIds),
    ...asArray(group.members),
  ];
  return assignedReferences.some(value => matchesMemberReference(value, member, member.email));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    initAdmin();
    const token = await admin.auth().verifyIdToken(String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''));
    const db = admin.firestore();
    const user = (await db.collection('users').doc(token.uid).get()).data() || {};
    const roles = Array.isArray(user.role) ? user.role : [user.role];
    const email = String(token.email || '').toLowerCase();
    const members = (await db.collection('members').get()).docs.map(item => ({ id: item.id, ...item.data() }));
    const own = members.find(member => String(member.email || '').toLowerCase() === email);
    const ownMemberRoles = Array.isArray(own?.role) ? own.role : [own?.role];
    const isLeader = roles.some(role => ['Facilitator', 'CoFacilitator'].includes(role))
      || ownMemberRoles.some(role => ['Facilitator', 'CoFacilitator'].includes(role));
    const isGlobal = roles.some(role => ['Admin', 'Pastor'].includes(role));
    if (!isGlobal && !isLeader) return res.status(403).json({ error: 'Rol sin acceso a grupos asignados.' });

    const groups = (await db.collection('groups').get()).docs.map(item => ({ id: item.id, ...item.data() }));
    const assignedGroups = isGlobal
      ? groups
      : own ? groups.filter(group => isAssignedLeader(group, own, email)) : [];

    // Backfill facilitatorEmails en grupos históricos para que las reglas de
    // Firestore autoricen después sus lecturas/escrituras directas de asistencia.
    if (isLeader && own && email) {
      await Promise.all(assignedGroups.map(async group => {
        const emails = Array.isArray(group.facilitatorEmails) ? group.facilitatorEmails.map(value => String(value).toLowerCase()) : [];
        if (emails.includes(email)) return;
        await db.collection('groups').doc(group.id).update({ facilitatorEmails: [...new Set([...emails, email])] });
        group.facilitatorEmails = [...new Set([...emails, email])];
      }));
    }
    const assignedIds = new Set(assignedGroups.map(group => group.id));
    const assignedNames = new Set(assignedGroups.map(group => normalize(group.name)));
    const assignedMembers = isGlobal
      ? members
      : members.filter(member => assignedIds.has(member.groupId) || assignedNames.has(normalize(member.group)) || assignedGroups.some(group => isGroupMember(group, member)));

    return res.status(200).json({ groups: assignedGroups, members: assignedMembers });
  } catch (error) {
    console.error('Assigned groups error:', error);
    return res.status(500).json({ error: error.message || 'No se pudieron cargar los grupos.' });
  }
}
