import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'ibrpAssigned';

export const getIbrpAssigned = async () => {
  const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy('lastName')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};

export const createIbrpAssigned = async (data) => {
  const ref = await addDoc(collection(db, COLLECTION), { ...data, createdAt: new Date(), updatedAt: new Date() });
  return { id: ref.id, ...data };
};

export const updateIbrpAssigned = (id, data) => updateDoc(doc(db, COLLECTION, id), { ...data, updatedAt: new Date() });
export const deleteIbrpAssigned = (id) => deleteDoc(doc(db, COLLECTION, id));
