import { db } from './firebase';
import { collection, doc, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const COLLECTION_NAME = 'holidays';

export const getHolidays = async () => {
    try {
        const snapshot = await getDocs(collection(db, COLLECTION_NAME));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a, b) => a.date.localeCompare(b.date));
    } catch (e) {
        console.error("Error fetching holidays", e);
        return [];
    }
};

export const addHoliday = async (holiday) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), holiday);
        return { id: docRef.id, ...holiday };
    } catch (e) {
        console.error("Error adding holiday", e);
        throw e;
    }
};

export const updateHoliday = async (id, holiday) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, id), holiday);
    } catch (e) {
        console.error("Error updating holiday", e);
        throw e;
    }
};

export const deleteHoliday = async (id) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (e) {
        console.error("Error deleting holiday", e);
        throw e;
    }
};

// Seed functionality
export const seedArgentineHolidays = async () => {
    // Current year national holidays roughly
    const year = new Date().getFullYear();
    const defaultHolidays = [
        { date: `${year}-01-01`, description: "Año Nuevo" },
        { date: `${year}-02-12`, description: "Carnaval" },
        { date: `${year}-02-13`, description: "Carnaval" },
        { date: `${year}-03-24`, description: "Día Nacional de la Memoria por la Verdad y la Justicia" },
        { date: `${year}-03-29`, description: "Viernes Santo" },
        { date: `${year}-04-02`, description: "Día del Veterano y de los Caídos en la Guerra de Malvinas" },
        { date: `${year}-05-01`, description: "Día del Trabajador" },
        { date: `${year}-05-25`, description: "Día de la Revolución de Mayo" },
        { date: `${year}-06-20`, description: "Paso a la Inmortalidad del Gral. Manuel Belgrano" },
        { date: `${year}-07-09`, description: "Día de la Independencia" },
        { date: `${year}-12-08`, description: "Día de la Inmaculada Concepción de María" },
        { date: `${year}-12-25`, description: "Navidad" }
    ];

    for (let h of defaultHolidays) {
        await addHoliday(h);
    }
};
