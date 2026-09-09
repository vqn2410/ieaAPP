import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION = 'ibrpEvaluations';
const keyFor = (assignedId, area, month) => `${assignedId}_${area.toLowerCase().replace(/[^a-z0-9]+/g, '-')}_${month}`;

export const getIbrpEvaluation = async (assignedId, area, month) => {
  const snapshot = await getDoc(doc(db, COLLECTION, keyFor(assignedId, area, month)));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
};

export const saveIbrpEvaluation = (assignedId, area, month, data) => setDoc(doc(db, COLLECTION, keyFor(assignedId, area, month)), { assignedId, area, month, ...data, updatedAt: new Date() }, { merge: true });
export const getIbrpEvaluationsForAssigned = async (assignedId) => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => item.assignedId === assignedId).sort((a, b) => String(b.updatedAt?.seconds || '').localeCompare(String(a.updatedAt?.seconds || '')));
};

export const getAllIbrpEvaluations = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};
