import { db } from './firebase';
import { collection, doc, getDocs, addDoc, updateDoc, query, where, orderBy } from 'firebase/firestore';

const COLLECTION_NAME = 'group_attendance';

export const saveAttendance = async (groupId, date, presentMembers) => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME), 
            where('groupId', '==', groupId), 
            where('date', '==', date)
        );
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
            const docId = snapshot.docs[0].id;
            await updateDoc(doc(db, COLLECTION_NAME, docId), { 
                presentMembers, 
                updatedAt: new Date().toISOString() 
            });
        } else {
            await addDoc(collection(db, COLLECTION_NAME), {
                groupId,
                date,
                presentMembers,
                createdAt: new Date().toISOString()
            });
        }
        return true;
    } catch (e) {
        console.error("Error saving attendance", e);
        throw e;
    }
};

export const getAttendance = async (groupId, date) => {
    try {
        const q = query(
            collection(db, COLLECTION_NAME), 
            where('groupId', '==', groupId), 
            where('date', '==', date)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        }
        return null;
    } catch (e) {
        console.error("Error fetching attendance", e);
        return null;
    }
};

export const getAttendanceForDateRange = async (groupIds, startDate, endDate) => {
    try {
        // Querying all and filtering in memory to avoid complex compound index setup for users
        const q = query(collection(db, COLLECTION_NAME));
        const snapshot = await getDocs(q);
        const allRecords = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        return allRecords.filter(record => {
            const isGroupMatch = groupIds.length === 0 || groupIds.includes(record.groupId);
            const isDateMatch = record.date >= startDate && record.date <= endDate;
            return isGroupMatch && isDateMatch;
        }).sort((a,b) => b.date.localeCompare(a.date));
    } catch (e) {
        console.error("Error fetching attendance records", e);
        return [];
    }
};
