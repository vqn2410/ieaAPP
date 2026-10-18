import {
  applyCors,
  assertAppMemberAccess,
  auditIntegration,
  authenticate,
  getAppMember,
  getFinanceClient,
  getFinanceIdentity,
  handleIntegrationError,
  handleOptions,
  requirePermission,
} from '../../_lib/financeIntegration.js';

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: 'Origen no autorizado.' });
  if (handleOptions(req, res)) return;
  if (!['POST', 'DELETE'].includes(req.method)) return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const context = await authenticate(req);
    const identity = await getFinanceIdentity(context);
    requirePermission(identity, 'members.link.manage');

    if (req.method === 'DELETE') {
      const contributorId = String(req.body?.financialContributorId || '').trim();
      if (!contributorId) return res.status(400).json({ error: 'Indicá el registro financiero que debe desvincularse.' });
      const financeDb = getFinanceClient().firestore();
      const linkRef = financeDb.collection('member_links').doc(contributorId);
      const auditRef = financeDb.collection('integration_audit').doc();
      const now = new Date().toISOString();
      const currentBeforeUpdate = await linkRef.get();
      if (currentBeforeUpdate.exists && currentBeforeUpdate.data().status === 'active') {
        const linkedMember = await getAppMember(currentBeforeUpdate.data().ieaAppMemberId);
        await assertAppMemberAccess(identity, linkedMember);
      }
      await financeDb.runTransaction(async (transaction) => {
        const current = await transaction.get(linkRef);
        if (!current.exists || current.data().status !== 'active') return;
        transaction.set(linkRef, { status: 'inactive', unlinkedAt: now, updatedAt: now, unlinkedByUid: identity.uid }, { merge: true });
        transaction.set(auditRef, { actorUid: identity.uid, actorSystem: identity.system, actorEmail: identity.email || '', action: 'MEMBER_LINK_REVOKED', targetId: contributorId, details: { ieaAppMemberId: current.data().ieaAppMemberId }, createdAt: now });
      });
      return res.status(200).json({ unlinked: true });
    }

    const memberId = String(req.body?.ieaAppMemberId || '').trim();
    const contributorId = String(req.body?.financialContributorId || '').trim();
    if (!memberId || !contributorId || req.body?.confirm !== true) {
      return res.status(400).json({ error: 'Seleccioná ambos registros y confirmá la vinculación.' });
    }

    const member = await getAppMember(memberId);
    await assertAppMemberAccess(identity, member);
    const financeDb = getFinanceClient().firestore();
    const contributorRef = financeDb.collection('contribuyentes').doc(contributorId);
    const contributorSnapshot = await contributorRef.get();
    if (!contributorSnapshot.exists) return res.status(404).json({ error: 'No se encontró el registro financiero seleccionado.' });

    const linkRef = financeDb.collection('member_links').doc(contributorId);
    const auditRef = financeDb.collection('integration_audit').doc();
    const now = new Date().toISOString();
    const result = await financeDb.runTransaction(async (transaction) => {
      const [currentLink, memberLinks] = await Promise.all([
        transaction.get(linkRef),
        transaction.get(financeDb.collection('member_links').where('ieaAppMemberId', '==', memberId)),
      ]);

      if (currentLink.exists && currentLink.data().status === 'active' && currentLink.data().ieaAppMemberId !== memberId) {
        const error = new Error('Este registro financiero ya está vinculado a otra persona.');
        error.statusCode = 409;
        throw error;
      }
      const otherLink = memberLinks.docs.find((doc) => doc.id !== contributorId && doc.data().status === 'active');
      if (otherLink) {
        const error = new Error('Esta persona ya tiene otro registro financiero vinculado. Revisá la asociación antes de continuar.');
        error.statusCode = 409;
        throw error;
      }

      const alreadyLinked = currentLink.exists
        && currentLink.data().status === 'active'
        && currentLink.data().ieaAppMemberId === memberId;
      const linkData = {
        financialContributorId: contributorId,
        ieaAppMemberId: memberId,
        status: 'active',
        matchMethod: 'manual',
        linkedByUid: identity.uid,
        linkedBySystem: identity.system,
        linkedByEmail: identity.email || '',
        linkedAt: currentLink.exists ? (currentLink.data().linkedAt || now) : now,
        updatedAt: now,
      };
      transaction.set(linkRef, linkData, { merge: true });
      transaction.set(auditRef, {
        actorUid: identity.uid,
        actorSystem: identity.system,
        actorEmail: identity.email || '',
        action: alreadyLinked ? 'MEMBER_LINK_CONFIRMED' : 'MEMBER_LINK_CREATED',
        targetId: contributorId,
        details: { ieaAppMemberId: memberId },
        createdAt: now,
      });
      return { alreadyLinked, linkData };
    });

    return res.status(200).json({ linked: true, alreadyLinked: result.alreadyLinked });
  } catch (error) {
    return handleIntegrationError(res, error);
  }
}
