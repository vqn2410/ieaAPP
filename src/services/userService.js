import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Sincroniza datos (rol, áreas) con el documento del usuario en `users`
 * buscándolo por email. Es best-effort: si el usuario no existe, no hace nada.
 */
export const syncUserByEmail = async (email, patch) => {
  const key = String(email || '').toLowerCase().trim();
  if (!key || !patch || Object.keys(patch).length === 0) return false;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', key)));
    if (snap.empty) return false;
    await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'users', d.id), patch)));
    return true;
  } catch (e) {
    console.error('syncUserByEmail', e);
    return false;
  }
};

export const syncUserServiceAreas = (email, serviceAreas) => syncUserByEmail(email, { serviceAreas });
export const syncUserRole = (email, role) => syncUserByEmail(email, { role });

export const addUserRoleByEmail = async (email, role) => {
  const key = String(email || '').toLowerCase().trim();
  if (!key || !role) return false;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', key)));
    await Promise.all(snap.docs.map(userDoc => {
      const current = userDoc.data().role;
      const roles = Array.isArray(current) ? current : [current || 'Member'];
      const next = roles.includes(role) ? roles : [...roles.filter(item => item !== 'Member'), role];
      return updateDoc(doc(db, 'users', userDoc.id), { role: next });
    }));
    return !snap.empty;
  } catch (e) {
    console.error('addUserRoleByEmail', e);
    return false;
  }
};

/**
 * Consulta la última conexión (lastSignInTime) de los usuarios desde Firebase Auth.
 * Devuelve un mapa `{ email: lastSignInTime|null }`.
 */
export const fetchLastSignInMap = async () => {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  const res = await fetch('/api/users-last-signin', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'No se pudo obtener la última conexión de los usuarios.');
  }
  const data = await res.json();
  return data.users || {};
};

/**
 * Consulta la última conexión de un único usuario por email.
 * Devuelve un string (lastSignInTime) o null si nunca ingresó.
 */
export const fetchLastSignInByEmail = async email => {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdToken();
  const res = await fetch(`/api/users-last-signin?email=${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('No se pudo obtener la última conexión del usuario.');
  const data = await res.json();
  return data.users?.[key] || null;
};

export const getUserUidByEmail = async email => {
  const key = String(email || '').trim().toLowerCase();
  if (!key) return null;
  try {
    const snap = await getDocs(query(collection(db, 'users'), where('email', '==', key)));
    return snap.docs[0]?.id || null;
  } catch (e) {
    // Esta lectura es best-effort para roles que no administran users.
    console.warn('No se pudo resolver UID por email:', e.message);
    return null;
  }
};
