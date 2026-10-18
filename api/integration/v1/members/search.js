import {
  applyCors,
  authenticate,
  getFinanceIdentity,
  getAppMemberMatches,
  handleIntegrationError,
  handleOptions,
  requirePermission,
} from '../../../_lib/financeIntegration.js';

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: 'Origen no autorizado.' });
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const context = await authenticate(req);
    const identity = await getFinanceIdentity(context);
    requirePermission(identity, 'members.link.search');
    const search = String(req.query.q || '').trim();
    if (search.length < 2) return res.status(400).json({ error: 'Ingresá al menos dos caracteres para buscar.' });

    const matches = await getAppMemberMatches(search, identity, identity.financeSedeIds);
    return res.status(200).json({ matches });
  } catch (error) {
    return handleIntegrationError(res, error);
  }
}
