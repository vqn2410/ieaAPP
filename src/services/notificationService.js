import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';

const COLLECTION_NAME = 'notifications';

// Las notificaciones se consultan siempre con el uid del usuario autenticado.
export const getNotifications = async userId => {
  if (!userId) return [];

  const snapshot = await getDocs(query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
  ));

  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => {
      const first = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime();
      const second = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime();
      return second - first;
    });
};

export const markNotificationRead = async notificationId => {
  await updateDoc(doc(db, COLLECTION_NAME, notificationId), {
    read: true,
    readAt: new Date(),
    updatedAt: new Date(),
  });
};

// Crea una sola notificación para un destinatario concreto. No acepta listas.
export const createDirectedNotification = async (userId, data) => {
  if (!userId || !data?.title || !data?.message) {
    throw new Error('Una notificación requiere destinatario, título y mensaje.');
  }

  const notification = {
    userId,
    title: data.title,
    message: data.message,
    type: data.type || 'info',
    link: data.link || null,
    read: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const reference = await addDoc(collection(db, COLLECTION_NAME), notification);
  return { id: reference.id, ...notification };
};
