import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'friendshipClasses';

export const getFriendshipClasses = async () => {
  const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), orderBy('uploadedAt', 'desc')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};

export const createFriendshipClass = async ({ title, description, fileUrl, coverUrl, uploadedBy }) => {
  const document = await addDoc(collection(db, COLLECTION_NAME), {
    title,
    description,
    fileUrl,
    coverUrl,
    uploadedBy,
    uploadedAt: serverTimestamp(),
  });

  return { id: document.id, title, description, fileUrl, coverUrl, uploadedBy };
};

export const deleteFriendshipClass = async (classItem) => {
  await deleteDoc(doc(db, COLLECTION_NAME, classItem.id));
};
