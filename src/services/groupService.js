import { db } from './firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';

const COLLECTION_NAME = 'groups';

export const getGroups = async () => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('name'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error obteniendo grupos", e);
        return [];
    }
};

export const getGroup = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await import('firebase/firestore').then(m => m.getDoc(docRef));
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Error obteniendo grupo", e);
        return null;
    }
};

export const createGroup = async (groupData) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...groupData,
            createdAt: new Date()
        });
        return { id: docRef.id, ...groupData };
    } catch (e) {
        console.error("Error creando grupo", e);
        throw e;
    }
};

export const deleteGroup = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (e) {
        console.error("Error eliminando grupo", e);
        throw e;
    }
};

export const updateGroup = async (id, groupData) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, {
            ...groupData,
            updatedAt: new Date()
        });
    } catch (e) {
        console.error("Error actualizando grupo", e);
        throw e;
    }
};
