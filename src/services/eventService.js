import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const COLLECTION_NAME = 'events';

export const getEvents = async () => {
    try {
        const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    } catch (e) {
        console.error("Error obteniendo eventos", e);
        return [];
    }
};
