import {
  applyCors,
  assertAppMemberAccess,
  authenticate,
  getAppMember,
  getFinanceIdentity,
  getFinanceClient,
  getScopedTransactions,
  handleIntegrationError,
  handleOptions,
  requirePermission,
  resolveSedeScope,
  validateDateRange,
} from '../../_lib/financeIntegration.js';

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: 'Origen no autorizado.' });
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const context = await authenticate(req);
    const identity = await getFinanceIdentity(context);
    requirePermission(identity, 'finance.read.contributions');

    const memberId = String(req.query.memberId || '').trim();
    if (!memberId || memberId.length > 150) return res.status(400).json({ error: 'El identificador del miembro no es válido.' });
    const member = await getAppMember(memberId);
    await assertAppMemberAccess(identity, member);

    const financeDb = getFinanceClient().firestore();
    const linkSnapshot = await financeDb.collection('member_links')
      .where('ieaAppMemberId', '==', memberId)
      .limit(2)
      .get();
    const activeLink = linkSnapshot.docs.find((doc) => doc.data().status === 'active');
    const canManageLink = identity.system === 'finanzas'
      ? identity.role === 'Administrador Central'
      : identity.permissions.includes('members.link.manage') || identity.permissions.includes('*');

    if (!activeLink) {
      return res.status(200).json({ linked: false, canManageLink, contributions: [], summary: { total: 0, count: 0 } });
    }

    const { from, to } = validateDateRange(req.query.from, req.query.to);
    const allSedes = (await financeDb.collection('sedes').get()).docs.map((doc) => doc.id);
    const requestedSede = req.query.sedeId ? String(req.query.sedeId) : '';
    const allowedSedes = resolveSedeScope(identity, requestedSede, allSedes);
    const { transactions, incomplete } = await getScopedTransactions(identity, allowedSedes, {
      from,
      to,
      memberId: String(activeLink.data().financialContributorId || activeLink.id),
    });
    if (incomplete) {
      return res.status(413).json({ error: 'El historial supera el límite de consulta. Acotá el rango de fechas.', code: 'MEMBER_HISTORY_TOO_LARGE' });
    }

    const contributions = transactions.filter((item) => item.type === 'income');
    return res.status(200).json({
      linked: true,
      canManageLink,
      link: { id: activeLink.id, linkedAt: activeLink.data().linkedAt?.toDate?.()?.toISOString?.() || null },
      contributions,
      summary: {
        total: contributions.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
        count: contributions.length,
        byType: contributions.reduce((acc, item) => {
          const type = item.category || 'Sin categoría';
          acc[type] = (acc[type] || 0) + (Number(item.amount) || 0);
          return acc;
        }, {}),
      },
      from: req.query.from || null,
      to: req.query.to || null,
    });
  } catch (error) {
    return handleIntegrationError(res, error);
  }
}
