import { db } from './firebase';
import { collection, getDocs } from 'firebase/firestore';

const COLLECTION_NAME = 'events';

export const getEvents = async () => {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};
