import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, setDoc, deleteDoc, where, serverTimestamp } from 'firebase/firestore';

const COLLECTION_NAME = 'groupEvaluations';

export const DEFAULT_DIMENSIONS = [
  { key: 'communion', label: 'Comunión', description: 'Vínculos, confianza y unidad entre integrantes' },
  { key: 'prayer', label: 'Oración', description: 'Vida de oración del grupo y dependencia de Dios' },
  { key: 'service', label: 'Servicio', description: 'Disposición a servir y ayudar a otros' },
  { key: 'constancy', label: 'Constancia', description: 'Asistencia, compromiso y continuidad de los miembros' },
  { key: 'multiplication', label: 'Multiplicación', description: 'Crecimiento, invitaciones e incorporación de nuevas personas' },
  { key: 'companionship', label: 'Compañerismo', description: 'Actividades, celebraciones y momentos de convivencia' },
  { key: 'evangelism', label: 'Evangelismo', description: 'Llevar el evangelio a amigos y conocidos' }
];

export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getGroupEvaluations = async (groupId) => {
  try {
    if (!groupId) return [];
    const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId)));
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.month || '').localeCompare(a.month || ''));
  } catch (e) {
    console.error('Error loading evaluations', e);
    return [];
  }
};

export const saveGroupEvaluation = async ({ groupId, groupName, month, dimensions, evaluatedBy }) => {
  try {
    const ref = doc(db, COLLECTION_NAME, `${groupId}_${month}`);
    const existing = await getDoc(ref);
    await setDoc(ref, {
      groupId,
      groupName,
      month,
      dimensions,
      evaluatedBy: evaluatedBy || '',
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (e) {
    console.error('Error saving evaluation', e);
    throw e;
  }
};

export const deleteGroupEvaluation = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (e) {
    console.error('Error deleting evaluation', e);
    throw e;
  }
};