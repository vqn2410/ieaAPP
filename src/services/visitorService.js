import { db } from './firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const COLLECTION_NAME = 'visitors';

export const getVisitors = async () => {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching visitors', e);
    return [];
  }
};

export const createVisitor = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      converted: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: docRef.id, ...data };
  } catch (e) {
    console.error('Error creating visitor', e);
    throw e;
  }
};

export const updateVisitor = async (id, data) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), { ...data, updatedAt: new Date() });
  } catch (e) {
    console.error('Error updating visitor', e);
    throw e;
  }
};

export const deleteVisitor = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (e) {
    console.error('Error deleting visitor', e);
    throw e;
  }
};
