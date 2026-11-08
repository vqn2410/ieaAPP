import { db } from './firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';

const COLLECTION_NAME = 'groups';
const CACHE_TTL_MS = 60_000;
const groupsCache = new Map();
const groupsInFlight = new Map();

export const invalidateGroupsCache = () => {
    groupsCache.clear();
    groupsInFlight.clear();
};

export const getGroups = async (campusId = null, facilitatorEmail = null) => {
    const cacheKey = `${campusId || 'all'}::${facilitatorEmail ? facilitatorEmail.trim().toLowerCase() : 'all'}`;
    const cached = groupsCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.data;
    }
    if (groupsInFlight.has(cacheKey)) {
        return groupsInFlight.get(cacheKey);
    }

    const request = (async () => {
        try {
            const constraints = [];
            if (campusId) constraints.push(where('campusId', '==', campusId));
            if (facilitatorEmail) constraints.push(where('facilitatorEmails', 'array-contains', facilitatorEmail.trim().toLowerCase()));
            const q = constraints.length > 0 ? query(collection(db, COLLECTION_NAME), ...constraints) : query(collection(db, COLLECTION_NAME));
            const querySnapshot = await getDocs(q);
            const list = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
            groupsCache.set(cacheKey, { ts: Date.now(), data: list });
            return list;
        } catch (e) {
            console.error("Error obteniendo grupos", e);
            return [];
        } finally {
            groupsInFlight.delete(cacheKey);
        }
    })();

    groupsInFlight.set(cacheKey, request);
    return request;
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
        invalidateGroupsCache();
        return { id: docRef.id, ...groupData };
    } catch (e) {
        console.error("Error creando grupo", e);
        throw e;
    }
};

export const deleteGroup = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        invalidateGroupsCache();
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
        invalidateGroupsCache();
    } catch (e) {
        console.error("Error actualizando grupo", e);
        throw e;
    }
};
