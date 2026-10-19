import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, writeBatch } from 'firebase/firestore';

const COLLECTION_NAME = 'birthdays';

/**
 * Extrae mes y día numéricos a partir de cualquier formato de fecha de cumpleaños.
 */
export const extractBirthdayParts = (data) => {
  if (!data) return null;
  if (data.day && data.month) {
    const d = Number(data.day);
    const m = Number(data.month);
    if (!Number.isNaN(d) && !Number.isNaN(m) && d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return { day: d, month: m };
    }
  }
  const value = data.birthDate || data.birthday || data.birthdate || data.dateOfBirth;
  if (!value) return null;
  if (typeof value === 'string') {
    const iso = value.match(/^\d{4}[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return { month: Number(iso[1]), day: Number(iso[2]) };
    const local = value.match(/^(\d{1,2})[-/](\d{1,2})/);
    if (local) return { month: Number(local[2]), day: Number(local[1]) };
  }
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { month: date.getMonth() + 1, day: date.getDate() };
};

/**
 * Consulta la colección 'birthdays' para miembros (solo nombre, mes, día y campusId).
 * Permite a cualquier miembro autenticado ver los cumpleaños sin violar privacidad de miembros.
 */
export const getBirthdays = async (campusId = null) => {
  try {
    let q;
    if (campusId) {
      q = query(collection(db, COLLECTION_NAME), where('campusId', '==', campusId));
    } else {
      q = query(collection(db, COLLECTION_NAME));
    }
    const snapshot = await getDocs(q);
    return snapshot.docs.map(docSnap => {
      const data = docSnap.data();
      const day = Number(data.day);
      const month = Number(data.month);
      return {
        id: docSnap.id,
        memberId: data.memberId || docSnap.id,
        name: data.name || 'Miembro',
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        day,
        month,
        campusId: data.campusId || null,
        // Fecha virtual para compatibilidad con formateadores existentes
        birthDate: `2000-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      };
    });
  } catch (err) {
    console.error('Error obteniendo cumpleaños:', err);
    return [];
  }
};

const BIRTHDAY_DATE_KEYS = ['birthDate', 'birthday', 'birthdate', 'dateOfBirth', 'day', 'month'];

/**
 * Sincroniza un cumpleaños individual en la colección 'birthdays' cuando un miembro se crea o actualiza.
 */
export const syncMemberBirthday = async (member) => {
  if (!member?.id) return;
  try {
    const parts = extractBirthdayParts(member);
    const docRef = doc(db, COLLECTION_NAME, member.id);
    if (!parts) {
      // Solo retirar de la colección si el registro especifica explícitamente un campo de fecha vacío
      const hasExplicitDateKey = BIRTHDAY_DATE_KEYS.some(key => Object.prototype.hasOwnProperty.call(member, key));
      if (hasExplicitDateKey) {
        await deleteDoc(docRef).catch(() => {});
      }
      return;
    }
    const name = `${member.lastName ? `${member.lastName}, ` : ''}${member.firstName || ''}`.trim()
      || member.name
      || 'Miembro';

    await setDoc(docRef, {
      memberId: member.id,
      name,
      firstName: member.firstName || '',
      lastName: member.lastName || '',
      day: parts.day,
      month: parts.month,
      campusId: member.campusId || null,
      updatedAt: new Date(),
    });
  } catch (err) {
    console.error('Error sincronizando cumpleaños de miembro:', err);
  }
};

/**
 * Elimina el cumpleaños correspondiente cuando un miembro es dado de baja o eliminado.
 */
export const deleteMemberBirthday = async (memberId) => {
  if (!memberId) return;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, memberId));
  } catch (err) {
    console.error('Error eliminando cumpleaños:', err);
  }
};

/**
 * Sincronización masiva de miembros hacia la colección 'birthdays'
 */
export const syncAllBirthdaysFromMembers = async (membersList) => {
  try {
    if (!Array.isArray(membersList) || membersList.length === 0) return 0;
    const membersWithBirthdays = membersList.filter(m => extractBirthdayParts(m) !== null);
    for (let i = 0; i < membersWithBirthdays.length; i += 450) {
      const batch = writeBatch(db);
      membersWithBirthdays.slice(i, i + 450).forEach(member => {
        const parts = extractBirthdayParts(member);
        if (!parts) return;
        const name = `${member.lastName ? `${member.lastName}, ` : ''}${member.firstName || ''}`.trim()
          || member.name
          || 'Miembro';
        const docRef = doc(db, COLLECTION_NAME, member.id);
        batch.set(docRef, {
          memberId: member.id,
          name,
          firstName: member.firstName || '',
          lastName: member.lastName || '',
          day: parts.day,
          month: parts.month,
          campusId: member.campusId || null,
          updatedAt: new Date(),
        });
      });
      await batch.commit();
    }
    return membersWithBirthdays.length;
  } catch (err) {
    console.error('Error en sincronización masiva de cumpleaños:', err);
    throw err;
  }
};
