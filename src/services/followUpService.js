import { db } from './firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy } from 'firebase/firestore';

const COLLECTION_NAME = 'followups';

export const createFollowUp = async (data) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: docRef.id, ...data };
  } catch (e) {
    console.error('Error creating follow-up', e);
    throw e;
  }
};

export const getFollowUpsByMember = async (memberId) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('memberId', '==', memberId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching follow-ups', e);
    return [];
  }
};

export const getPendingFollowUps = async (limitTo = 10) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, limitTo);
  } catch (e) {
    console.error('Error fetching pending follow-ups', e);
    return [];
  }
};

export const updateFollowUp = async (id, data) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), { ...data, updatedAt: new Date() });
  } catch (e) {
    console.error('Error updating follow-up', e);
    throw e;
  }
};

export const getAllFollowUps = async () => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('Error fetching all follow-ups', e);
    return [];
  }
};

export const deleteFollowUp = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (e) {
    console.error('Error deleting follow-up', e);
    throw e;
  }
};
