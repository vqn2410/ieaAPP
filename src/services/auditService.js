import { addDoc, collection, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';

const COLLECTION_NAME = 'auditLogs';

export const recordAudit = async ({ action, entity, entityId, metadata = {} }) => {
  const user = auth.currentUser;
  if (!user) return;
  await addDoc(collection(db, COLLECTION_NAME), {
    action,
    entity,
    entityId: entityId || null,
    metadata,
    actorId: user.uid,
    actorEmail: user.email || '',
    createdAt: new Date(),
  });
};

export const getAuditLogs = async () => {
  const snapshot = await getDocs(collection(db, COLLECTION_NAME));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
};
