import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

const COLLECTION_NAME = 'group_attendance';

export const saveAttendance = async ({ groupId, groupName, date, presentMembers, absentDetails = {}, members, takenBy }) => {
    try {
        const recordRef = doc(db, COLLECTION_NAME, `${groupId}_${date}`);
        const record = await getDoc(recordRef);
        await setDoc(recordRef, {
            groupId,
            groupName,
            date,
            presentMembers,
            absentDetails,
            members,
            takenBy,
            ...(record.exists() ? {} : { createdAt: serverTimestamp() }),
            updatedAt: serverTimestamp(),
        }, { merge: true });
        return true;
    } catch (e) {
        console.error("Error saving attendance", e);
        throw e;
    }
};

export const getAttendance = async (groupId, date) => {
    try {
        const recordRef = doc(db, COLLECTION_NAME, `${groupId}_${date}`);
        const record = await getDoc(recordRef);
        if (record.exists()) return { id: record.id, ...record.data() };

        // Backward compatibility for records created before deterministic IDs.
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
        if (groupIds.length === 0) {
            const snapshot = await getDocs(query(
                collection(db, COLLECTION_NAME),
                where('date', '>=', startDate),
                where('date', '<=', endDate)
            ));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.date.localeCompare(a.date));
        }

        const recordsByGroup = await Promise.all(groupIds.map(async groupId => {
            const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId)));
            return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        }));

        return recordsByGroup.flat()
            .filter(record => record.date >= startDate && record.date <= endDate)
            .sort((a, b) => b.date.localeCompare(a.date));
    } catch (e) {
        console.error("Error fetching attendance records", e);
        return [];
    }
};
