import { db } from './firebase';
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

const COLLECTION_NAME = 'group_attendance';

export const computeAttendanceStreaks = (records, memberId) => {
  const dated = (records || [])
    .filter(r => r && r.date)
    .sort((a, b) => a.date.localeCompare(b.date));
  const presentFlags = dated.map(r =>
    Array.isArray(r.presentMembers) && r.presentMembers.includes(memberId)
  );

  let current = 0;
  for (let i = presentFlags.length - 1; i >= 0; i--) {
    if (presentFlags[i]) current++;
    else break;
  }

  let best = 0;
  let run = 0;
  for (const p of presentFlags) {
    run = p ? run + 1 : 0;
    if (run > best) best = run;
  }

  const total = presentFlags.length;
  const present = presentFlags.filter(Boolean).length;
  const percentage = total ? Math.round((present / total) * 100) : 0;

  return { currentStreak: current, bestStreak: best, present, total, percentage };
};

export const getGroupAttendanceStats = async (groupId) => {
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTION_NAME), where('groupId', '==', groupId)));
    const records = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.date.localeCompare(b.date));

    const memberIds = new Set();
    records.forEach(r => (r.members || []).forEach(m => m && m.id && memberIds.add(m.id)));

    const memberStats = {};
    memberIds.forEach(id => { memberStats[id] = computeAttendanceStreaks(records, id); });

    return { records, memberStats };
  } catch (e) {
    console.error('Error fetching group attendance stats', e);
    return { records: [], memberStats: {} };
  }
};

export const getMemberAttendanceStats = async (memberId) => {
  try {
    const snapshot = await getDocs(collection(db, COLLECTION_NAME));
    const all = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const byGroup = {};
    all.forEach(r => {
      if (!Array.isArray(r.presentMembers) || !r.presentMembers.includes(memberId)) return;
      (byGroup[r.groupId] = byGroup[r.groupId] || []).push(r);
    });

    let bestStreak = 0;
    let currentStreak = 0;
    let present = 0;
    let total = 0;
    Object.values(byGroup).forEach(records => {
      const s = computeAttendanceStreaks(records, memberId);
      bestStreak = Math.max(bestStreak, s.bestStreak);
      currentStreak = Math.max(currentStreak, s.currentStreak);
      present += s.present;
      total += s.total;
    });

    return {
      bestStreak,
      currentStreak,
      present,
      total,
      percentage: total ? Math.round((present / total) * 100) : 0
    };
  } catch (e) {
    console.error('Error fetching member attendance stats', e);
    return { bestStreak: 0, currentStreak: 0, present: 0, total: 0, percentage: 0 };
  }
};

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
