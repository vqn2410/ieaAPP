import { admin, getDefaultAdmin } from './_lib/firebase-admin.js';
import { handleError, asArray } from './_lib/http.js';
import { requireUser } from './_lib/auth.js';

const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();

function matchesMemberReference(value, member, email, uid) {
  const reference = normalize(typeof value === 'object' ? value.id || value.email || `${value.firstName || ''} ${value.lastName || ''}` : value);
  if (!reference) return false;
  if (reference === normalize(uid) || reference === normalize(member.authUid) || reference === normalize(member.id) || reference === normalize(email) || reference === normalize(member.email)) return true;
  const fullName = normalize(`${member.firstName || ''} ${member.lastName || ''}`);
  const reversedName = normalize(`${member.lastName || ''} ${member.firstName || ''}`);
  if (reference === fullName || reference === reversedName) return true;
  const parts = reference.split(' ').filter(part => part.length > 2);
  return parts.length > 0 && parts.some(part => fullName.includes(part) || reversedName.includes(part));
}

function isAssignedLeader(group, member, email, uid) {
  const assignments = [
    ...asArray(group.facilitatorUids),
    ...asArray(group.facilitators),
    ...asArray(group.coFacilitators),
    ...asArray(group.facilitatorEmails),
  ];
  return assignments.some(value => matchesMemberReference(value, member, email, uid));
}

function isGroupMember(group, member) {
  if (member.groupId === group.id) return true;
  const groupName = normalize(group.name);
  if (groupName && normalize(member.group) === groupName) return true;
  const assignedReferences = [
    ...asArray(group.initialMemberIds),
    ...asArray(group.memberIds),
    ...asArray(group.members),
  ];
  return assignedReferences.some(value => matchesMemberReference(value, member, member.email));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });
  try {
    const app = getDefaultAdmin();
    const db = app.firestore();
    const { decoded, user, roles } = await requireUser(req, app);
    const email = String(decoded.email || '').trim().toLowerCase();
    const memberCollection = db.collection('members');

    let ownSnapshot = await memberCollection.where('authUid', '==', decoded.uid).limit(1).get();
    if (ownSnapshot.empty && email) ownSnapshot = await memberCollection.where('email', '==', email).limit(1).get();
    if (ownSnapshot.empty && email) {
      // Compatibilidad temporal con emails históricos guardados con mayúsculas/espacios.
      const memberSnapshot = await memberCollection.get();
      ownSnapshot = {
        empty: !memberSnapshot.docs.some(item => String(item.data().email || '').trim().toLowerCase() === email),
        docs: memberSnapshot.docs.filter(item => String(item.data().email || '').trim().toLowerCase() === email).slice(0, 1),
      };
    }
    const ownDoc = ownSnapshot.docs[0];
    const own = ownDoc ? { id: ownDoc.id, ...ownDoc.data() } : null;
    if (own && own.authUid !== decoded.uid) {
      await memberCollection.doc(own.id).update({ authUid: decoded.uid, updatedAt: admin.firestore.Timestamp.now() });
      own.authUid = decoded.uid;
    }
    const ownMemberRoles = asArray(own?.role);
    const isLeader = roles.some(role => ['Facilitator', 'CoFacilitator', 'MinistryLeader'].includes(role))
      || ownMemberRoles.some(role => ['Facilitator', 'CoFacilitator', 'MinistryLeader'].includes(role));
    const isGlobal = roles.some(role => ['Admin', 'Pastor'].includes(role));
    const isCampusManager = roles.includes('CampusAdmin');
    if (!isGlobal && !isLeader && !isCampusManager) return res.status(403).json({ error: 'Rol sin acceso a grupos asignados.' });
    if (!isGlobal && !isCampusManager && !own) {
      return res.status(200).json({ groups: [], members: [], ownMember: null, warning: `No encontramos una ficha de miembro con el correo ${email}.` });
    }

    const groupSnapshot = await db.collection('groups').get();
    const groups = groupSnapshot.docs.map(item => ({ id: item.id, ...item.data() }));
    const assignedGroups = isGlobal
      ? groups
      : isCampusManager
        ? groups.filter(group => Array.isArray(user.campusIds) && user.campusIds.includes(group.campusId))
        : own ? groups.filter(group => isAssignedLeader(group, own, email, decoded.uid)) : [];

    // Backfill facilitatorEmails en grupos históricos para que las reglas de
    // Firestore autoricen después sus lecturas/escrituras directas de asistencia.
    if (isLeader && own && email) {
      await Promise.all(assignedGroups.map(async group => {
        const emails = Array.isArray(group.facilitatorEmails) ? group.facilitatorEmails.map(value => String(value).toLowerCase()) : [];
        const uids = Array.isArray(group.facilitatorUids) ? group.facilitatorUids : [];
        if (emails.includes(email) && uids.includes(decoded.uid)) return;
        const updatedEmails = [...new Set([...emails, ...(email ? [email] : [])])];
        const updatedUids = [...new Set([...uids, decoded.uid])];
        await db.collection('groups').doc(group.id).update({ facilitatorEmails: updatedEmails, facilitatorUids: updatedUids });
        group.facilitatorEmails = updatedEmails;
        group.facilitatorUids = updatedUids;
      }));
    }

    let assignedMembers;
    if (isGlobal) {
      assignedMembers = (await memberCollection.get()).docs.map(item => ({ id: item.id, ...item.data() }));
    } else {
      const memberSnapshots = await Promise.all(assignedGroups.flatMap(group => {
        const queries = [];
        queries.push(memberCollection.where('groupId', '==', group.id).get());
        if (group.name) queries.push(memberCollection.where('group', '==', group.name).get());
        return queries;
      }));
      const uniqueMembers = new Map();
      for (const snapshot of memberSnapshots) {
        for (const item of snapshot.docs) uniqueMembers.set(item.id, { id: item.id, ...item.data() });
      }

      // Los grupos más antiguos pueden almacenar las membresías como IDs sin
      // groupId o group-name en el documento del miembro.
      const explicitMemberIds = [...new Set(assignedGroups.flatMap(group => [
        ...asArray(group.initialMemberIds),
        ...asArray(group.memberIds),
        ...asArray(group.members),
      ]).filter(value => typeof value === 'string' && value.length > 0))];
      const missingIds = explicitMemberIds.filter(id => !uniqueMembers.has(id));
      const explicitSnapshots = await Promise.all(missingIds.map(id => memberCollection.doc(id).get()));
      for (const item of explicitSnapshots) {
        if (item.exists) uniqueMembers.set(item.id, { id: item.id, ...item.data() });
      }
      assignedMembers = [...uniqueMembers.values()];
    }

    const warning = assignedGroups.length === 0
      ? 'Tu rol está activo, pero ningún grupo tiene tu ficha/email asignado como facilitador. Pedile a un administrador que vuelva a guardar tu asignación en el grupo.'
      : assignedMembers.length === 0
        ? 'Encontramos tus grupos, pero todavía no hay miembros vinculados. El administrador debe asignar miembros a esos grupos.'
        : '';

    return res.status(200).json({
      groups: assignedGroups,
      members: assignedMembers,
      ownMember: own,
      warning,
      diagnostics: {
        memberProfileFound: Boolean(own),
        facilitatorRoleFound: isLeader,
        groupsScanned: groups.length,
        assignedGroups: assignedGroups.length,
        assignedMembers: assignedMembers.length,
      },
    });
  } catch (error) {
    return handleError(res, error, 'assigned-groups');
  }
}
