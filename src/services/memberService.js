import { db } from './firebase';
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, runTransaction, where } from 'firebase/firestore';
import { reciprocalRelationship, normalizeFamilyLinks, upsertFamilyLink, removeFamilyLink } from '../utils/familyHelpers';
import { recordAudit } from './auditService';
import { syncMemberBirthday, deleteMemberBirthday } from './birthdayService';

const COLLECTION_NAME = 'members';

// Obtener todos los miembros
export const getMembers = async (groupId = null, campusId = null) => {
    try {
        let q;
        if (groupId && campusId) {
            q = query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId));
        } else if (groupId) {
            // Filtrar por grupo si el usuario es facilitador
            q = query(collection(db, COLLECTION_NAME), where('group', '==', groupId));
        } else if (campusId) {
            q = query(collection(db, COLLECTION_NAME), where('campusId', '==', campusId));
        } else {
            // Todos los miembros
            q = query(collection(db, COLLECTION_NAME));
        }
        
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => String(a.lastName || '').localeCompare(String(b.lastName || '')));
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

export const getMemberByEmail = async email => {
    if (!email) return null;
    const snapshot = await getDocs(query(
        collection(db, COLLECTION_NAME),
        where('email', '==', email.trim().toLowerCase()),
    ));
    const result = snapshot.docs[0];
    return result ? { id: result.id, ...result.data() } : null;
};

export const getMembersByGroupId = async groupId => {
    if (!groupId) return [];
    const snapshot = await getDocs(query(
        collection(db, COLLECTION_NAME),
        where('groupId', '==', groupId),
    ));
    return snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(a.lastName || '').localeCompare(String(b.lastName || '')));
};

// Agregar un miembro nuevo
export const createMember = async (memberData) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...memberData,
            createdAt: new Date()
        });
        void recordAudit({ action: 'create', entity: COLLECTION_NAME, entityId: docRef.id }).catch(() => {});
        void syncMemberBirthday({ id: docRef.id, ...memberData }).catch(() => {});
        return { id: docRef.id, ...memberData };
    } catch (e) {
        console.error("Error creando miembro", e);
        throw e;
    }
};

const BIRTHDAY_SYNC_KEYS = ['birthDate', 'birthday', 'birthdate', 'dateOfBirth', 'day', 'month', 'firstName', 'lastName', 'name', 'campusId'];

// Actualizar un miembro
export const updateMember = async (id, memberData) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, { ...memberData, updatedAt: new Date() });
        void recordAudit({ action: 'update', entity: COLLECTION_NAME, entityId: id, metadata: { fields: Object.keys(memberData) } }).catch(() => {});
        if (Object.keys(memberData || {}).some(key => BIRTHDAY_SYNC_KEYS.includes(key))) {
            void getDoc(docRef)
                .then(snap => snap.exists() && syncMemberBirthday({ id, ...snap.data() }))
                .catch(() => {});
        }
    } catch (e) {
        console.error("Error actualizando miembro", e);
        throw e;
    }
};

export const linkFamilyMembers = async (memberId, relatedMemberId, relationship) => {
    if (!memberId || !relatedMemberId || memberId === relatedMemberId || !reciprocalRelationship[relationship]) {
        throw new Error('Vínculo familiar inválido.');
    }

    const memberRef = doc(db, COLLECTION_NAME, memberId);
    const relatedRef = doc(db, COLLECTION_NAME, relatedMemberId);
    await runTransaction(db, async transaction => {
        const [memberSnap, relatedSnap] = await Promise.all([
            transaction.get(memberRef),
            transaction.get(relatedRef),
        ]);
        if (!memberSnap.exists() || !relatedSnap.exists()) throw new Error('No se encontró uno de los miembros.');

        const memberLinks = upsertFamilyLink(
            normalizeFamilyLinks(memberSnap.data().familyLinks),
            relatedMemberId,
            relationship,
        );
        const relatedLinks = upsertFamilyLink(
            normalizeFamilyLinks(relatedSnap.data().familyLinks),
            memberId,
            reciprocalRelationship[relationship],
        );
        transaction.update(memberRef, { familyLinks: memberLinks, updatedAt: new Date() });
        transaction.update(relatedRef, { familyLinks: relatedLinks, updatedAt: new Date() });
    });
};

export const unlinkFamilyMembers = async (memberId, relatedMemberId) => {
    if (!memberId || !relatedMemberId || memberId === relatedMemberId) return;

    const memberRef = doc(db, COLLECTION_NAME, memberId);
    const relatedRef = doc(db, COLLECTION_NAME, relatedMemberId);
    await runTransaction(db, async transaction => {
        const [memberSnap, relatedSnap] = await Promise.all([
            transaction.get(memberRef),
            transaction.get(relatedRef),
        ]);
        if (!memberSnap.exists() || !relatedSnap.exists()) return;

        transaction.update(memberRef, {
            familyLinks: removeFamilyLink(memberSnap.data().familyLinks, relatedMemberId),
            updatedAt: new Date(),
        });
        transaction.update(relatedRef, {
            familyLinks: removeFamilyLink(relatedSnap.data().familyLinks, memberId),
            updatedAt: new Date(),
        });
    });
};

// Eliminar un miembro
export const deleteMember = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
        void recordAudit({ action: 'delete', entity: COLLECTION_NAME, entityId: id }).catch(() => {});
        void deleteMemberBirthday(id).catch(() => {});
    } catch (e) {
        console.error("Error eliminando miembro", e);
        throw e;
    }
};
