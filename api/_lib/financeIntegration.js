import admin from 'firebase-admin';

const APP_PROJECT_ID = 'iea-app-73f5f';
const FINANCE_PROJECT_ID = 'iea-finanzas';
const MAX_TRANSACTIONS_PER_SITE = 20000;
const PAGE_SIZE = 100;

function readCredentials(prefix, fallbackProjectId) {
  const projectId = process.env[`${prefix}_PROJECT_ID`] || fallbackProjectId;
  const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`];
  let privateKey = process.env[`${prefix}_PRIVATE_KEY_BASE64`]
    ? Buffer.from(String(process.env[`${prefix}_PRIVATE_KEY_BASE64`]).replace(/\s/g, ''), 'base64').toString('utf8')
    : process.env[`${prefix}_PRIVATE_KEY`];

  try {
    const parsed = JSON.parse(privateKey);
    privateKey = parsed.private_key || privateKey;
  } catch {
    // The private key may be provided directly as PEM text.
  }

  if (!clientEmail || !privateKey) return null;
  return {
    projectId,
    clientEmail,
    privateKey: String(privateKey)
      .trim()
      .replace(/^['"]|['"]$/g, '')
      .replace(/\\n/g, '\n')
      .replace(/\r/g, ''),
  };
}

function getAdminApp(name, prefix, expectedProjectId) {
  const existing = admin.apps.find((app) => app.name === name);
  if (existing) return existing;

  const credentials = readCredentials(prefix, expectedProjectId);
  if (!credentials || credentials.projectId !== expectedProjectId) {
    const error = new Error('El servicio de integración todavía no está configurado.');
    error.statusCode = 503;
    throw error;
  }

  return admin.initializeApp({ credential: admin.credential.cert(credentials) }, name);
}

function getAppClient() {
  return getAdminApp('iea-integration-app', 'FIREBASE', APP_PROJECT_ID);
}

function getFinanceClient() {
  return getAdminApp('iea-integration-finance', 'FINANCE_FIREBASE', FINANCE_PROJECT_ID);
}

export function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowedOrigins = new Set(
    String(process.env.FINANCE_INTEGRATION_ORIGINS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );

  if (origin && !allowedOrigins.has(origin)) return false;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  res.setHeader('Cache-Control', 'no-store');
  return true;
}

export function handleOptions(req, res) {
  if (!applyCors(req, res)) {
    res.status(403).end();
    return true;
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

function readBearerToken(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
}

export async function authenticate(req) {
  const token = readBearerToken(req);
  if (!token) {
    const error = new Error('Se requiere autenticación.');
    error.statusCode = 401;
    throw error;
  }

  let app;
  let finance;
  try {
    app = getAppClient();
    finance = getFinanceClient();
  } catch (error) {
    if (error.statusCode) throw error;
    const unavailable = new Error('El servicio de integración no está disponible.');
    unavailable.statusCode = 503;
    throw unavailable;
  }

  for (const [system, client] of [['ieaAPP', app], ['finanzas', finance]]) {
    try {
      const decoded = await client.auth().verifyIdToken(token, true);
      return { system, uid: decoded.uid, email: decoded.email || '', decoded, client };
    } catch {
      // A token from the other Firebase project is expected to fail here.
    }
  }

  const error = new Error('La sesión expiró o el token no pertenece a un sistema autorizado.');
  error.statusCode = 401;
  throw error;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export async function getFinanceIdentity(context) {
  if (context.system === 'finanzas') {
    const email = normalizeEmail(context.email || context.decoded.email);
    if (!email) {
      const error = new Error('La cuenta financiera no tiene un correo asociado.');
      error.statusCode = 403;
      throw error;
    }
    const userId = email.replace(/\./g, '_');
    const userSnap = await getFinanceClient().firestore().collection('users').doc(userId).get();
    if (!userSnap.exists) {
      const error = new Error('El perfil financiero no está habilitado.');
      error.statusCode = 403;
      throw error;
    }
    const data = userSnap.data();
    return {
      system: 'finanzas',
      uid: context.uid,
      email,
      role: data.role || 'Sin Perfil',
      financeSedeIds: Array.isArray(data.sedeIds) ? data.sedeIds : [],
      permissions: [],
      active: true,
    };
  }

  const [userSnap, grantSnap] = await Promise.all([
    getAppClient().firestore().collection('users').doc(context.uid).get(),
    getFinanceClient().firestore().collection('integration_access').doc(context.uid).get(),
  ]);
  if (!userSnap.exists) {
    const error = new Error('Este usuario no tiene acceso financiero asignado.');
    error.statusCode = 403;
    throw error;
  }

  const userData = userSnap.data();
  const roles = Array.isArray(userData.role) ? userData.role : [userData.role].filter(Boolean);
  const isGlobalManager = roles.some((r) => ['Admin', 'Pastor'].includes(r));

  if (!isGlobalManager) {
    const error = new Error('Los aportes y la información financiera están reservados exclusivamente para Pastores y Administración.');
    error.statusCode = 403;
    throw error;
  }

  if (grantSnap.exists) {
    const grant = grantSnap.data();
    if (grant.active === true && grant.ieaAppUid === context.uid) {
      return {
        system: 'ieaAPP',
        uid: context.uid,
        email: normalizeEmail(userData.email || context.email),
        role: grant.financeRole || 'Administrador Central',
        financeSedeIds: Array.isArray(grant.financeSedeIds) ? grant.financeSedeIds : ['central'],
        permissions: Array.isArray(grant.permissions) ? grant.permissions : ['*'],
        active: true,
      };
    }
  }

  return {
    system: 'ieaAPP',
    uid: context.uid,
    email: normalizeEmail(userData.email || context.email),
    role: 'Administrador Central',
    financeSedeIds: ['central'],
    permissions: ['*', 'finance.read.global', 'finance.read.summary', 'finance.read.transactions', 'finance.read.contributions', 'members.link.search', 'members.link.manage'],
    active: true,
  };
}

function financeRole(identity) {
  return String(identity.role || '').trim().toLowerCase();
}

export function hasPermission(identity, permission) {
  if (identity.system === 'ieaAPP') {
    return identity.permissions.includes('*') || identity.permissions.includes(permission);
  }

  const role = financeRole(identity);
  if (role === 'administrador central') return true;
  if (['contador', 'revisor'].includes(role)) {
    return permission.startsWith('finance.read.') || permission === 'members.link.search';
  }
  if (['administrador de sede', 'tesorero', 'secretario'].includes(role)) {
    return permission.startsWith('finance.read.') || permission === 'members.link.search';
  }
  return false;
}

export function requirePermission(identity, permission) {
  if (!hasPermission(identity, permission)) {
    const error = new Error('El rol financiero asignado no permite esta operación.');
    error.statusCode = 403;
    throw error;
  }
}

export function isFinanceAdministrator(identity) {
  return financeRole(identity) === 'administrador central';
}

export function resolveSedeScope(identity, requestedSedeId, allSedeIds = []) {
  const globalRead = identity.system === 'finanzas'
    ? ['administrador central', 'contador', 'revisor'].includes(financeRole(identity))
    : identity.permissions.includes('finance.read.global') || identity.permissions.includes('*');
  const assigned = [...new Set(identity.financeSedeIds.filter((id) => typeof id === 'string' && id.trim()))];

  if (requestedSedeId && requestedSedeId !== 'all') {
    if (!allSedeIds.includes(requestedSedeId)) {
      const error = new Error('No se encontró la sede financiera solicitada.');
      error.statusCode = 404;
      throw error;
    }
    if (!globalRead && !assigned.includes(requestedSedeId)) {
      const error = new Error('No tenés acceso a esa sede financiera.');
      error.statusCode = 403;
      throw error;
    }
    return [requestedSedeId];
  }

  if (requestedSedeId === 'all' && !globalRead) {
    const error = new Error('No tenés acceso a la vista financiera consolidada.');
    error.statusCode = 403;
    throw error;
  }

  if (globalRead) return [...new Set(allSedeIds)];
  if (assigned.length === 0) {
    const error = new Error('No hay sedes financieras asignadas a esta cuenta.');
    error.statusCode = 403;
    throw error;
  }
  return assigned;
}

export async function getFinanceSedes() {
  const snapshot = await getFinanceClient().firestore().collection('sedes').get();
  return snapshot.docs.map((doc) => ({ id: doc.id, name: String(doc.data().name || doc.id) }));
}

function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function serializeTransaction(doc) {
  const data = doc.data();
  const date = toDate(data.date);
  return {
    id: doc.id,
    date: date ? date.toISOString() : null,
    amount: Number(data.amount) || 0,
    type: data.type === 'expense' ? 'expense' : 'income',
    description: String(data.description || ''),
    category: String(data.category || ''),
    method: String(data.method || ''),
    sedeId: String(data.sedeId || ''),
    memberId: String(data.memberId || ''),
    contributorName: String(data.diezmante || ''),
    expenseStatus: String(data.expenseStatus || ''),
  };
}

function withinRange(transaction, from, to) {
  if (!from && !to) return true;
  if (!transaction.date) return false;
  const timestamp = new Date(transaction.date).getTime();
  if (from && timestamp < from.getTime()) return false;
  if (to && timestamp > to.getTime()) return false;
  return true;
}

export async function getScopedTransactions(identity, sedeIds, { from, to, memberId } = {}) {
  const financeDb = getFinanceClient().firestore();
  const result = [];
  let incomplete = false;

  for (const sedeId of sedeIds) {
    let query = financeDb.collection('transactions').where('sedeId', '==', sedeId);
    if (memberId) query = query.where('memberId', '==', memberId);
    const snapshot = await query.limit(MAX_TRANSACTIONS_PER_SITE + 1).get();
    if (snapshot.size > MAX_TRANSACTIONS_PER_SITE) incomplete = true;
    for (const doc of snapshot.docs.slice(0, MAX_TRANSACTIONS_PER_SITE)) {
      const item = serializeTransaction(doc);
      if (withinRange(item, from, to)) result.push(item);
    }
  }

  result.sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));
  return { transactions: result, incomplete };
}

export async function getAppUser(context) {
  const snapshot = await getAppClient().firestore().collection('users').doc(context.uid).get();
  return snapshot.exists ? snapshot.data() : null;
}

export async function getAppMember(memberId) {
  const snapshot = await getAppClient().firestore().collection('members').doc(memberId).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getAppMemberMatches(queryText, identity, financeSedeIds) {
  const appDb = getAppClient().firestore();
  const financeDb = getFinanceClient().firestore();
  const appUser = identity.system === 'ieaAPP' ? await getAppUser({ uid: identity.uid }) : null;
  const appRoles = Array.isArray(appUser?.role) ? appUser.role : [appUser?.role].filter(Boolean);
  const isGlobalAppUser = appRoles.some((role) => ['Admin', 'Pastor'].includes(role))
    && (identity.permissions.includes('finance.read.global') || identity.permissions.includes('*'));
  const isCampusAdmin = appRoles.includes('CampusAdmin');

  if (identity.system === 'ieaAPP' && !isGlobalAppUser && !isCampusAdmin) {
    const error = new Error('Tu rol institucional no permite buscar miembros para vinculación.');
    error.statusCode = 403;
    throw error;
  }

  let appCampusIds = null;
  if (identity.system === 'ieaAPP') {
    const configured = Array.isArray(appUser.campusIds) ? appUser.campusIds : [];
    const mapped = await Promise.all(financeSedeIds.map((sedeId) => financeDb.collection('integration_campuses').doc(sedeId).get()));
    const allowedMapped = new Set(mapped.filter((snap) => snap.exists && snap.data().active === true).map((snap) => snap.data().ieaAppCampusId));
    appCampusIds = isGlobalAppUser ? null : new Set(configured.filter((campusId) => allowedMapped.has(campusId)));
  } else if (identity.system === 'finanzas' && !['administrador central', 'contador', 'revisor'].includes(financeRole(identity))) {
    const links = await Promise.all(financeSedeIds.map((sedeId) => financeDb.collection('integration_campuses').doc(sedeId).get()));
    appCampusIds = new Set(links.filter((snap) => snap.exists && snap.data().active === true).map((snap) => snap.data().ieaAppCampusId));
  }

  const normalized = String(queryText || '').trim().toLowerCase();
  const digits = normalized.replace(/\D/g, '');
  let candidates = [];
  if (digits.length >= 6 && /^\d+$/.test(normalized.replace(/[.\s-]/g, ''))) {
    const snapshot = await appDb.collection('members').where('dni', '==', digits).limit(20).get();
    candidates = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } else {
    const snapshot = await appDb.collection('members').orderBy('lastName').limit(500).get();
    const queryWords = normalized.split(/\s+/).filter(Boolean);
    candidates = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((member) => {
        const fullName = `${member.firstName || ''} ${member.lastName || ''}`.toLowerCase();
        return queryWords.every((word) => fullName.includes(word));
      });
  }

  return candidates
    .filter((member) => isGlobalAppUser || !appCampusIds || appCampusIds.has(member.campusId))
    .slice(0, 20)
    .map((member) => ({
      id: member.id,
      firstName: String(member.firstName || ''),
      lastName: String(member.lastName || ''),
      dni: String(member.dni || ''),
      campusId: String(member.campusId || ''),
      active: !['Inactivo', 'Baja'].includes(member.extraData?.active || ''),
    }));
}

export async function assertAppMemberAccess(identity, member) {
  const appUser = identity.system === 'ieaAPP' ? await getAppUser({ uid: identity.uid }) : null;
  if (!member) {
    const error = new Error('No se encontró el miembro solicitado.');
    error.statusCode = 404;
    throw error;
  }

  if (identity.system === 'ieaAPP') {
    const roles = Array.isArray(appUser?.role) ? appUser.role : [appUser?.role].filter(Boolean);
    const global = roles.some((role) => ['Admin', 'Pastor'].includes(role))
      && (identity.permissions.includes('finance.read.global') || identity.permissions.includes('*'));
    const mapped = await Promise.all(identity.financeSedeIds.map((sedeId) => getFinanceClient().firestore().collection('integration_campuses').doc(sedeId).get()));
    const allowedCampuses = new Set(mapped.filter((snap) => snap.exists && snap.data().active === true).map((snap) => snap.data().ieaAppCampusId));
    if (global) return;
    if (allowedCampuses.has(member.campusId)) return;
    if (roles.includes('CampusAdmin') && (appUser.campusIds || []).includes(member.campusId) && allowedCampuses.has(member.campusId)) return;
    const error = new Error('No tenés acceso a la ficha de este miembro.');
    error.statusCode = 403;
    throw error;
  }

  const globalFinance = ['administrador central', 'contador', 'revisor'].includes(financeRole(identity));
  if (globalFinance) return;
  const links = await Promise.all(identity.financeSedeIds.map((sedeId) => getFinanceClient().firestore().collection('integration_campuses').doc(sedeId).get()));
  const memberCampusIds = new Set(links.filter((snap) => snap.exists && snap.data().active === true).map((snap) => snap.data().ieaAppCampusId));
  if (memberCampusIds.has(member.campusId)) return;
  const error = new Error('No tenés acceso a miembros de otras sedes.');
  error.statusCode = 403;
  throw error;
}

export async function auditIntegration({ actor, action, targetId, details = {} }) {
  await getFinanceClient().firestore().collection('integration_audit').add({
    actorUid: actor.uid,
    actorSystem: actor.system,
    actorEmail: actor.email || '',
    action,
    targetId: targetId || '',
    details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

export function validateDateRange(fromValue, toValue) {
  const parse = (value) => {
    if (!value) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return undefined;
    return date;
  };
  const from = parse(fromValue);
  const toStart = parse(toValue);
  if (from === undefined || toStart === undefined || (from && toStart && from > toStart)) {
    const error = new Error('El rango de fechas no es válido.');
    error.statusCode = 400;
    throw error;
  }
  const to = toStart ? new Date(toStart.getTime() + 86400000 - 1) : null;
  return { from, to };
}

export function handleIntegrationError(res, error) {
  const status = Number(error?.statusCode) || 500;
  if (status >= 500) console.error('Finance integration API error:', error);
  const messages = {
    400: error?.message || 'Solicitud no válida.',
    401: error?.message || 'Se requiere autenticación.',
    403: error?.message || 'Acceso denegado.',
    404: error?.message || 'No se encontró el recurso solicitado.',
    409: error?.message || 'La operación entra en conflicto con un vínculo existente.',
    413: error?.message || 'La consulta es demasiado amplia; acotá el rango.',
    503: error?.message || 'El servicio de integración no está configurado.',
  };
  return res.status(status).json({ error: messages[status] || 'No se pudo completar la consulta.' });
}

export { getAppClient, getFinanceClient, PAGE_SIZE, MAX_TRANSACTIONS_PER_SITE };
