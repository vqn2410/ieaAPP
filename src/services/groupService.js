import { db } from './firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const COLLECTION_NAME = 'groups';

export const getGroups = async (campusId = null, facilitatorEmail = null) => {
    try {
        const constraints = [];
        if (campusId) constraints.push(where('campusId', '==', campusId));
        if (facilitatorEmail) constraints.push(where('facilitatorEmails', 'array-contains', facilitatorEmail.trim().toLowerCase()));
        const q = constraints.length > 0 ? query(collection(db, COLLECTION_NAME), ...constraints) : query(collection(db, COLLECTION_NAME));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
    } catch (e) {
        console.error("Error obteniendo grupos", e);
        return [];
    }
};

export const getGroupsByFacilitatorUid = async uid => {
    if (!uid) return [];
    const snapshot = await getDocs(query(
        collection(db, COLLECTION_NAME),
        where('facilitatorUids', 'array-contains', uid),
    ));
    return snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
};

export const getGroup = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
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
