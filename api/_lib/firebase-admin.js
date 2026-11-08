import admin from 'firebase-admin';

const DEFAULT_APP_PROJECT_ID = 'iea-app-73f5f';

/**
 * Descifra una clave privada de cuenta de servicio Firebase. Acepta:
 *  - PEM directo (con o sin saltos de línea escapados).
 *  - JSON completo de cuenta de servicio.
 *  - Cualquiera de los anteriores codificado en Base64 (formato típico en Vercel).
 *
 * Devuelve la clave PEM lista para `admin.credential.cert`, o '' si no hay valor.
 */
export function decodePrivateKey(rawValue) {
  if (!rawValue) return '';
  let candidate = String(rawValue);

  const isBase64 =
    /^[A-Za-z0-9+/=\s]+$/.test(candidate.replace(/\s/g, '')) && !candidate.includes('BEGIN');
  if (isBase64) {
    try {
      const decoded = Buffer.from(candidate.replace(/\s/g, ''), 'base64').toString('utf8');
      if (decoded) candidate = decoded;
    } catch {
      // Conservar el valor original si no era Base64 válido.
    }
  }

  if (candidate.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed.private_key) candidate = parsed.private_key;
    } catch {
      // No era JSON; se mantiene el valor.
    }
  }

  return candidate
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();
}

/**
 * Lee credenciales de cuenta de servicio desde variables de entorno con un
 * prefijo (p. ej. `FIREBASE` o `FINANCE_FIREBASE`). Si la clave privada es un
 * JSON completo, sus `client_email`/`project_id` completan lo que falte.
 *
 * Devuelve `{ projectId, clientEmail, privateKey }` o `null` si falta email
 * o clave privada.
 */
export function readServiceAccount(prefix, fallbackProjectId) {
  const envProjectId = process.env[`${prefix}_PROJECT_ID`];
  const envClientEmail = process.env[`${prefix}_CLIENT_EMAIL`];
  const rawKey =
    process.env[`${prefix}_PRIVATE_KEY_BASE64`] || process.env[`${prefix}_PRIVATE_KEY`] || '';

  let projectId = envProjectId || fallbackProjectId || '';
  let clientEmail = envClientEmail || '';
  let privateKey = rawKey;

  // Si la clave es un JSON completo de cuenta de servicio, aprovechar sus campos.
  let candidate = rawKey;
  const isBase64 =
    /^[A-Za-z0-9+/=\s]+$/.test(candidate.replace(/\s/g, '')) && !candidate.includes('BEGIN');
  if (isBase64) {
    try {
      const decoded = Buffer.from(candidate.replace(/\s/g, ''), 'base64').toString('utf8');
      if (decoded) candidate = decoded;
    } catch {
      // Conservar el valor original.
    }
  }
  if (candidate.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(candidate);
      privateKey = parsed.private_key || privateKey;
      if (parsed.project_id) projectId = parsed.project_id;
      if (parsed.client_email) clientEmail = parsed.client_email;
    } catch {
      // No era JSON; se mantienen los valores de entorno.
    }
  }

  privateKey = String(privateKey)
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '')
    .trim();

  if (!clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/**
 * Devuelve (e inicializa en el primer uso) una app Admin con nombre. Lanza un
 * error 503 si las credenciales no están configuradas o no coinciden con el
 * proyecto esperado.
 *
 * @param {string} name Nombre de la app. `'default'` (o `'[DEFAULT]'`) crea la
 *   app por defecto, la que usan `admin.firestore()` y `admin.auth()` sin argumentos.
 * @param {{ prefix?: string, fallbackProjectId?: string, expectedProjectId?: string, missingMessage?: string }} [options]
 */
export function getAdminApp(name, { prefix, fallbackProjectId, expectedProjectId, missingMessage } = {}) {
  const appName = name === 'default' || name === '[DEFAULT]' ? '[DEFAULT]' : name;
  const existing = admin.apps.find((app) => app.name === appName);
  if (existing) return existing;

  const credentials = readServiceAccount(prefix, fallbackProjectId);
  if (!credentials) {
    const error = new Error(missingMessage || 'Firebase Admin no está configurado en el servidor.');
    error.statusCode = 503;
    error.code = 'FIREBASE_ADMIN_NOT_CONFIGURED';
    throw error;
  }
  if (expectedProjectId && credentials.projectId !== expectedProjectId) {
    const error = new Error('Firebase Admin mal configurado: el proyecto no coincide con el esperado.');
    error.statusCode = 503;
    error.code = 'FIREBASE_ADMIN_PROJECT_MISMATCH';
    throw error;
  }

  const options = {
    credential: admin.credential.cert({
      projectId: credentials.projectId,
      clientEmail: credentials.clientEmail,
      privateKey: credentials.privateKey,
    }),
  };

  return appName === '[DEFAULT]' ? admin.initializeApp(options) : admin.initializeApp(options, appName);
}

/**
 * App Admin por defecto del proyecto ieaAPP, configurada con `FIREBASE_*`.
 */
export function getDefaultAdmin() {
  return getAdminApp('default', { prefix: 'FIREBASE', fallbackProjectId: DEFAULT_APP_PROJECT_ID });
}

export { admin };
