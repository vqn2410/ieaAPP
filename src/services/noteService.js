import { db } from './firebase';
import {
  collection, addDoc, getDocs, getDoc, updateDoc, deleteDoc, doc, query, where, serverTimestamp
} from 'firebase/firestore';

const COLLECTION_NAME = 'notes';

export const DEFAULT_CATEGORIES = [
  'Devocional',
  'Reuniones',
  'Seguimientos',
  'Ministerios',
  'Ideas',
  'Personal'
];

export const NOTE_COLORS = [
  '#2563eb',
  '#0ea5e9',
  '#059669',
  '#7c3aed',
  '#db2777',
  '#d97706',
  '#64748b'
];

export const getNotes = async (userId, userRole = 'Member') => {
  try {
    const isLeader = ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'].includes(userRole);
    const queries = [];

    if (isLeader) {
      queries.push(query(collection(db, COLLECTION_NAME), where('visibility', '==', 'public')));
    }
    queries.push(query(collection(db, COLLECTION_NAME), where('authorId', '==', userId)));

    const snapshots = await Promise.all(queries.map(q => getDocs(q)));
    const map = new Map();
    snapshots.forEach(snapshot => {
      snapshot.docs.forEach(d => {
        const data = d.data();
        if (data.visibility === 'private' && data.authorId !== userId) return;
        map.set(d.id, { id: d.id, ...data });
      });
    });

    return [...map.values()].sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0);
    });
  } catch (e) {
    console.error('Error loading notes', e);
    return [];
  }
};

export const createNote = async (note) => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      title: note.title || 'Sin título',
      content: note.content || '',
      category: note.category || 'Personal',
      color: note.color || NOTE_COLORS[0],
      pinned: false,
      visibility: note.visibility || 'private',
      authorId: note.authorId || '',
      authorName: note.authorName || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, ...note, pinned: false, createdAt: new Date() };
  } catch (e) {
    console.error('Error creating note', e);
    throw e;
  }
};

export const updateNote = async (id, patch) => {
  try {
    await updateDoc(doc(db, COLLECTION_NAME, id), {
      ...patch,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error('Error updating note', e);
    throw e;
  }
};

export const toggleNotePin = async (id, pinned) => {
  return updateNote(id, { pinned });
};

export const deleteNote = async (id) => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    return true;
  } catch (e) {
    console.error('Error deleting note', e);
    throw e;
  }
};

export const getNoteById = async (id) => {
  try {
    const snap = await getDoc(doc(db, COLLECTION_NAME, id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (e) {
    console.error('Error fetching note', e);
    return null;
  }
};