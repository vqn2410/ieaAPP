const STORAGE_KEY = 'iea-event-attendance-queue-v1';
const MAX_QUEUE_SIZE = 100;

const readQueue = () => {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const writeQueue = queue => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // A full or unavailable localStorage must not break the check-in screen.
  }
};

export const queueEventAttendance = ({ uid, eventId, memberId, present }) => {
  if (!uid || !eventId || !memberId) return false;

  const queue = readQueue().filter(item => !(item.uid === uid && item.eventId === eventId && item.memberId === memberId));
  queue.push({ uid, eventId, memberId, present: present === true, queuedAt: Date.now() });
  writeQueue(queue.slice(-MAX_QUEUE_SIZE));
  return true;
};

export const getQueuedEventAttendanceCount = uid => readQueue().filter(item => item.uid === uid).length;

export const flushEventAttendanceQueue = async (uid, send) => {
  if (!uid || !navigator.onLine) return 0;

  const queue = readQueue();
  const pending = queue.filter(item => item.uid === uid);
  let synced = 0;

  for (const item of pending) {
    try {
      await send(item);
      synced += 1;
    } catch {
      break;
    }
  }

  if (synced > 0) {
    const syncedItems = new Set(pending.slice(0, synced));
    writeQueue(queue.filter(item => !syncedItems.has(item)));
  }
  return synced;
};
