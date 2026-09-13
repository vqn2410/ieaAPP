import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'campuses';

export const getCampuses = async () => {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), orderBy('name')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};

export const createCampus = async (campus) => {
  const ref = await addDoc(collection(db, COLLECTION_NAME), {
    name: campus.name.trim(),
    slug: campus.slug?.trim() || campus.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    active: campus.active !== false,
    createdAt: new Date(),
  });
  return { id: ref.id, ...campus };
};

export const updateCampus = (id, patch) => updateDoc(doc(db, COLLECTION_NAME, id), patch);
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
