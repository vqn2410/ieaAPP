import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

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
