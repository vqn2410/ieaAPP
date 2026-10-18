import {
  authenticate,
  applyCors,
  getFinanceIdentity,
  getFinanceSedes,
  handleIntegrationError,
  handleOptions,
  hasPermission,
  requirePermission,
  resolveSedeScope,
  getScopedTransactions,
  validateDateRange,
  PAGE_SIZE,
} from '../../_lib/financeIntegration.js';

function summarize(transactions, sedes) {
  const totals = { income: 0, expense: 0, contributions: 0, transactionCount: transactions.length };
  const bySede = new Map(sedes.map((sede) => [sede.id, { sedeId: sede.id, sedeName: sede.name, income: 0, expense: 0, contributions: 0, transactionCount: 0 }]));

  for (const item of transactions) {
    const amount = Number(item.amount) || 0;
    const category = item.category.trim().toLowerCase();
    const isContribution = ['diezmo', 'ofrenda', 'donación', 'donacion'].includes(category);
    if (item.type === 'income') totals.income += amount;
    if (item.type === 'expense') totals.expense += amount;
    if (isContribution) totals.contributions += amount;

    const site = bySede.get(item.sedeId);
    if (site) {
      site.transactionCount += 1;
      if (item.type === 'income') site.income += amount;
      if (item.type === 'expense') site.expense += amount;
      if (isContribution) site.contributions += amount;
    }
  }
  return { ...totals, net: totals.income - totals.expense, bySede: [...bySede.values()] };
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: 'Origen no autorizado.' });
  if (handleOptions(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const context = await authenticate(req);
    const identity = await getFinanceIdentity(context);
    const view = String(req.query.view || 'summary');
    if (!['summary', 'transactions'].includes(view)) {
      return res.status(400).json({ error: 'La vista solicitada no está disponible.' });
    }
    const permission = view === 'transactions' ? 'finance.read.transactions' : 'finance.read.summary';
    requirePermission(identity, permission);

    const allSedes = await getFinanceSedes();
    const requestedSede = req.query.sedeId ? String(req.query.sedeId) : '';
    const sedeIds = resolveSedeScope(identity, requestedSede, allSedes.map((sede) => sede.id));
    const sedes = allSedes.filter((sede) => sedeIds.includes(sede.id));
    const { from, to } = validateDateRange(req.query.from, req.query.to);
    const { transactions, incomplete } = await getScopedTransactions(identity, sedeIds, { from, to });

    if (incomplete) {
      return res.status(413).json({
        error: 'El rango incluye demasiados movimientos para una consulta completa. Reducí el rango de fechas o filtrá por campus.',
        code: 'FINANCE_RANGE_TOO_LARGE',
      });
    }

    if (view === 'transactions') {
      const page = Math.max(1, Math.min(200, Number.parseInt(req.query.page, 10) || 1));
      const start = (page - 1) * PAGE_SIZE;
      return res.status(200).json({
        rows: transactions.slice(start, start + PAGE_SIZE),
        page,
        pageSize: PAGE_SIZE,
        total: transactions.length,
        hasMore: start + PAGE_SIZE < transactions.length,
        from: req.query.from || null,
        to: req.query.to || null,
        sedes,
      });
    }

    return res.status(200).json({
      summary: summarize(transactions, sedes),
      from: req.query.from || null,
      to: req.query.to || null,
      sedes,
      access: {
        global: identity.system === 'finanzas'
          ? ['administrador central', 'contador', 'revisor'].includes(String(identity.role).toLowerCase())
          : identity.permissions.includes('finance.read.global') || identity.permissions.includes('*'),
        canReadTransactions: hasPermission(identity, 'finance.read.transactions'),
        canReadContributions: hasPermission(identity, 'finance.read.contributions'),
        canReadAccounting: hasPermission(identity, 'finance.read.accounting'),
      },
    });
  } catch (error) {
    return handleIntegrationError(res, error);
  }
}
