import { db } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, where } from 'firebase/firestore';

const COLLECTION_NAME = 'members';

// Obtener todos los miembros
export const getMembers = async (groupId = null) => {
    try {
        let q;
        if (groupId) {
            // Filtrar por grupo si el usuario es facilitador
            q = query(collection(db, COLLECTION_NAME), where('group', '==', groupId), orderBy('lastName'));
        } else {
            // Todos los miembros
            q = query(collection(db, COLLECTION_NAME), orderBy('lastName'));
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error obteniendo miembros", e);
        return [];
    }
};

// Obtener un miembro específico
export const getMember = async (id) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (e) {
        console.error("Error obteniendo el perfil del miembro", e);
        return null;
    }
};

// Agregar un miembro nuevo
export const createMember = async (memberData) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...memberData,
            createdAt: new Date()
        });
        return { id: docRef.id, ...memberData };
    } catch (e) {
        console.error("Error creando miembro", e);
        throw e;
    }
};

// Actualizar un miembro
export const updateMember = async (id, memberData) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, { ...memberData, updatedAt: new Date() });
    } catch (e) {
        console.error("Error actualizando miembro", e);
        throw e;
    }
};

// Eliminar un miembro
export const deleteMember = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (e) {
        console.error("Error eliminando miembro", e);
        throw e;
    }
};
