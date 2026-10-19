import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'campuses';

/**
 * Normaliza y obtiene el slug canónico para un campus.
 * Ej: Sede Central -> 'sedecentral' (requisito específico /sedecentral/dashboard)
 *     Apóstoles -> 'apostoles'
 *     Las Heras -> 'las-heras'
 */
export const getCampusSlug = (campus) => {
  if (!campus) return 'sedecentral';
  if (campus.slug) {
    const rawSlug = campus.slug.trim().toLowerCase();
    if (/central/i.test(rawSlug)) return 'sedecentral';
    return rawSlug.replace(/[^a-z0-9-]/g, '');
  }
  const name = campus.name || '';
  if (/central/i.test(name)) return 'sedecentral';
  if (/apostoles/i.test(name)) return 'apostoles';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sedecentral';
};

/**
 * Compara un slug pasado por URL con un campus (tolerante a guiones y tildes).
 */
export const matchesCampusSlug = (campus, slugParam) => {
  if (!campus || !slugParam) return false;
  const paramNorm = String(slugParam).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const slugNorm = getCampusSlug(campus).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  const nameNorm = String(campus.name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  if (paramNorm === slugNorm || paramNorm === nameNorm) return true;
  if (paramNorm === 'sedecentral' && (/central/i.test(campus.name || '') || /central/i.test(campus.slug || ''))) return true;
  if (paramNorm === 'apostoles' && /apostoles/i.test(campus.name || '')) return true;
  if ((paramNorm === 'lasheras' || paramNorm === 'las-heras') && /heras/i.test(campus.name || '')) return true;
  return false;
};

export const DEFAULT_CAMPUSES = [
  { id: 'central-seed', name: 'Sede Central', slug: 'sedecentral', province: 'Buenos Aires', active: true },
  { id: 'apostoles-seed', name: 'Apóstoles', slug: 'apostoles', province: 'Misiones', active: true },
  { id: 'las-heras-seed', name: 'Las Heras', slug: 'las-heras', province: 'Santa Cruz', active: true },
];

export const getCampuses = async () => {
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), orderBy('name')));
    const list = snapshot.docs.map(item => {
      const data = item.data();
      const campusObj = { id: item.id, ...data };
      campusObj.slug = getCampusSlug(campusObj);
      return campusObj;
    });

    if (list.length === 0) {
      return DEFAULT_CAMPUSES;
    }

    // Asegurar que Sede Central tenga slug 'sedecentral'
    return list.map(c => ({
      ...c,
      slug: getCampusSlug(c),
    }));
  } catch (err) {
    console.error('Error cargando campuses de Firestore, usando defaults:', err);
    return DEFAULT_CAMPUSES;
  }
};

export const createCampus = async (campus) => {
  const slug = getCampusSlug(campus);
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    name: campus.name.trim(),
    slug,
    province: campus.province?.trim() || '',
    active: campus.active !== false,
    createdAt: new Date(),
  });
  return { id: ref.id, ...campus, slug };
};

export const updateCampus = (id, patch) => {
  const updated = { ...patch };
  if (updated.name && !updated.slug) {
    updated.slug = getCampusSlug(updated);
  }
  return updateDoc(doc(db, COLLECTION_NAME, id), updated);
};

export const deleteCampus = (id) => deleteDoc(doc(db, COLLECTION_NAME, id));

export const migrateLegacyRecordsToCampus = async (campusId) => {
  const [members, groups] = await Promise.all([
    getDocs(collection(db, 'members')),
    getDocs(collection(db, 'groups')),
  ]);
  const legacy = [...members.docs, ...groups.docs].filter(item => !item.data().campusId);
  for (let index = 0; index < legacy.length; index += 450) {
    const batch = writeBatch(db);
    legacy.slice(index, index + 450).forEach(item => batch.update(item.ref, { campusId }));
    await batch.commit();
  }
  const count = legacy.length;
  return count;
};
