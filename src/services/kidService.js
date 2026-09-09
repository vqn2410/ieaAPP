import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const KIDS_COLLECTION = 'kids';
const ATTENDANCE_COLLECTION = 'kidsAttendance';

export const getKids = async () => {
  const snapshot = await getDocs(query(collection(db, KIDS_COLLECTION), orderBy('lastName')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};

export const createKid = async (kid) => {
  const ref = await addDoc(collection(db, KIDS_COLLECTION), {
    ...kid,
    active: kid.active !== false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { id: ref.id, ...kid };
};

export const updateKid = (id, kid) => updateDoc(doc(db, KIDS_COLLECTION, id), { ...kid, updatedAt: new Date() });
export const deleteKid = (id) => deleteDoc(doc(db, KIDS_COLLECTION, id));

export const saveKidsAttendance = (date, room, records) => {
  const roomKey = room ? room.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'general';
  return setDoc(doc(db, ATTENDANCE_COLLECTION, `${date}_${roomKey}`), { date, room, records, updatedAt: new Date() }, { merge: true });
};

export const getKidsAttendance = async (startDate, endDate) => {
  const snapshot = await getDocs(collection(db, ATTENDANCE_COLLECTION));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(item => item.date >= startDate && item.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
};
