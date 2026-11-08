import { getDefaultAdmin } from './firebase-admin.js';
import { httpError, readBearerToken, asArray } from './http.js';

/**
 * Verifica el ID token Bearer de la petición contra la app Admin indicada.
 * Lanza 401 si no hay token o si es inválido/expirado.
 */
export async function verifyIdToken(req, app) {
  const token = readBearerToken(req);
  if (!token) throw httpError(401, 'Se requiere autenticación.');
  const resolved = app || getDefaultAdmin();
  try {
    return await resolved.auth().verifyIdToken(token);
  } catch {
    throw httpError(401, 'Token inválido o expirado.');
  }
}

/** Carga el documento `users/{uid}` de Firestore, o `null` si no existe. */
export async function getUserDocument(uid, db) {
  const snapshot = await db.collection('users').doc(uid).get();
  return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Autentica y carga el perfil del usuario. Devuelve `{ decoded, user, roles }`.
 * Lanza 401 si el token no es válido y 403 si no existe el documento en Firestore.
 */
export async function requireUser(req, app) {
  const resolved = app || getDefaultAdmin();
  const decoded = await verifyIdToken(req, resolved);
  const user = await getUserDocument(decoded.uid, resolved.firestore());
  if (!user) throw httpError(403, 'Usuario no encontrado en Firestore.');
  return { decoded, user, roles: asArray(user.role) };
}

/**
 * Exige que el usuario tenga al menos uno de los roles permitidos.
 * Lanza 403 en caso contrario.
 */
export function requireRole(roles, allowed) {
  const list = asArray(allowed);
  if (!list.some((role) => roles.includes(role))) {
    throw httpError(403, 'Tu rol no tiene acceso a esta operación.');
  }
}
