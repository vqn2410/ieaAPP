import { auth, db } from './firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { recordAudit } from './auditService';
import { flushEventAttendanceQueue, queueEventAttendance } from './offlineEventAttendance';

const COLLECTION_NAME = 'events';
const ATTENDANCE_COLLECTION = 'eventAttendance';
const REGISTRATIONS_COLLECTION = 'eventRegistrations';
const VOLUNTEERS_COLLECTION = 'eventVolunteers';
const CACHE_TTL_MS = 60_000;
let eventsCache = null;
let eventsInFlight = null;

export const invalidateEventsCache = () => {
    eventsCache = null;
    eventsInFlight = null;
};

export const getEvents = async () => {
    if (eventsCache && Date.now() - eventsCache.ts < CACHE_TTL_MS) {
        return eventsCache.data;
    }
    if (eventsInFlight) {
        return eventsInFlight;
    }

    eventsInFlight = (async () => {
        try {
            const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
            const list = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            eventsCache = { ts: Date.now(), data: list };
            return list;
        } catch (e) {
            console.error("Error obteniendo eventos", e);
            return [];
        } finally {
            eventsInFlight = null;
        }
    })();

    return eventsInFlight;
};

export const createEvent = async data => {
    const ref = await addDoc(collection(db, COLLECTION_NAME), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    invalidateEventsCache();
    void recordAudit({ action: 'create', entity: COLLECTION_NAME, entityId: ref.id }).catch(() => {});
    return { id: ref.id, ...data };
};

export const updateEvent = async (id, data) => {
    await updateDoc(doc(db, COLLECTION_NAME, id), { ...data, updatedAt: new Date() });
    invalidateEventsCache();
    void recordAudit({ action: 'update', entity: COLLECTION_NAME, entityId: id, metadata: { fields: Object.keys(data) } }).catch(() => {});
};

export const deleteEvent = async id => {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    invalidateEventsCache();
    void recordAudit({ action: 'delete', entity: COLLECTION_NAME, entityId: id }).catch(() => {});
};

export const getEventAttendance = async eventId => {
    const snapshot = await getDocs(query(
        collection(db, ATTENDANCE_COLLECTION),
        where('eventId', '==', eventId),
    ));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};

export const setEventAttendance = async (eventId, memberId, present) => {
    const id = `${eventId}_${memberId}`;
    const write = () => setDoc(doc(db, ATTENDANCE_COLLECTION, id), {
        eventId,
        memberId,
        present,
        checkedInAt: present ? new Date() : null,
        updatedAt: new Date(),
    }, { merge: true });

    if (!navigator.onLine) {
        queueEventAttendance({ uid: auth.currentUser?.uid, eventId, memberId, present });
        return { queued: true };
    }

    try {
        await write();
        return { queued: false };
    } catch (error) {
        const retryable = ['unavailable', 'deadline-exceeded'].includes(error?.code);
        if (!retryable) throw error;
        queueEventAttendance({ uid: auth.currentUser?.uid, eventId, memberId, present });
        return { queued: true };
    }
};

export const syncPendingEventAttendance = () => flushEventAttendanceQueue(
    auth.currentUser?.uid,
    ({ eventId, memberId, present }) => setEventAttendance(eventId, memberId, present),
);

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => { void syncPendingEventAttendance(); });
}

export const getEventRegistrations = async eventId => {
    const snapshot = await getDocs(query(
        collection(db, REGISTRATIONS_COLLECTION),
        where('eventId', '==', eventId),
    ));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};

export const setEventRegistration = async (eventId, memberId, registered, registrationData = {}) => {
    const id = `${eventId}_${memberId}`;
    await setDoc(doc(db, REGISTRATIONS_COLLECTION, id), {
        eventId,
        memberId,
        registered,
        registrationData: registered ? registrationData : {},
        registeredAt: registered ? new Date() : null,
        updatedAt: new Date(),
}, { merge: true });
};

export const getEventVolunteers = async eventId => {
    const snapshot = await getDocs(query(
        collection(db, VOLUNTEERS_COLLECTION),
        where('eventId', '==', eventId),
    ));
    return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
};

export const setEventVolunteer = async (eventId, memberId, role, assigned) => {
    const id = `${eventId}_${memberId}`;
    await setDoc(doc(db, VOLUNTEERS_COLLECTION, id), {
        eventId,
        memberId,
        role,
        assigned,
        updatedAt: new Date(),
    }, { merge: true });
};
