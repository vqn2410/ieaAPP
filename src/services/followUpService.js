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
      where('memberId', '==', memberId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });
  } catch (e) {
    console.error('Error fetching follow-ups', e);
    return [];
  }
};

export const getPendingFollowUps = async (limitTo = 10) => {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where('status', '==', 'pending')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, limitTo);
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
