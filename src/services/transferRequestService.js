import { db } from './firebase';
import { collection, doc, getDocs, addDoc, updateDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'transferRequests';

export const getTransferRequests = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (e) {
        console.error('Error obteniendo solicitudes de traslado', e);
        return [];
    }
};

export const createTransferRequest = async (payload) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...payload,
            status: 'pending',
            createdAt: new Date(),
        });
        return { id: docRef.id, ...payload, status: 'pending' };
    } catch (e) {
        console.error('Error creando solicitud de traslado', e);
        throw e;
    }
};

export const updateTransferRequest = async (id, patch) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, { ...patch, resolvedAt: new Date() });
    } catch (e) {
        console.error('Error actualizando solicitud de traslado', e);
        throw e;
    }
};
