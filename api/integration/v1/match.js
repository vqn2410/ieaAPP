import {
  applyCors,
  authenticate,
  getAppClient,
  getFinanceClient,
  getFinanceIdentity,
  handleIntegrationError,
  handleOptions,
  requirePermission,
} from '../../_lib/financeIntegration.js';

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getTokens(value) {
  return normalizeText(value).split(' ').filter(Boolean);
}

function getSortedKey(value) {
  return [...getTokens(value)].sort().join(' ');
}

function scoreMatch(contribName, contribDni, member) {
  const cDni = String(contribDni || '').replace(/\D/g, '');
  const mDni = String(member?.dni || '').replace(/\D/g, '');
  if (cDni.length >= 6 && cDni === mDni) {
    return { score: 100, matchType: 'dni', label: 'DNI exacto' };
  }
  const cTokens = getTokens(contribName);
  const fTokens = getTokens(member?.firstName);
  const lTokens = getTokens(member?.lastName);
  const mTokens = [...fTokens, ...lTokens];
  if (!cTokens.length || !mTokens.length) return { score: 0, matchType: 'none', label: 'Sin coincidencia' };

  if ([...cTokens].sort().join(' ') === [...mTokens].sort().join(' ')) {
    return { score: 100, matchType: 'exact_name', label: 'Nombre exacto' };
  }
  const allLastMatch = lTokens.length > 0 && lTokens.every((t) => cTokens.includes(t));
  const anyFirstMatch = fTokens.length > 0 && fTokens.some((t) => cTokens.includes(t));
  const allContribInMember = cTokens.length >= 2 && cTokens.every((t) => mTokens.includes(t));
  const allMemberInContrib = mTokens.length >= 2 && mTokens.every((t) => cTokens.includes(t));

  if (allLastMatch && (allContribInMember || allMemberInContrib)) {
    return { score: 92, matchType: 'compound_name', label: 'Nombre compuesto' };
  }
  if (allLastMatch && anyFirstMatch) {
    return { score: 85, matchType: 'partial_name', label: 'Coincidencia parcial' };
  }
  return { score: 0, matchType: 'none', label: 'Sin coincidencia' };
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return res.status(403).json({ error: 'Origen no autorizado.' });
  if (handleOptions(req, res)) return;
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Método no permitido.' });

  try {
    const context = await authenticate(req);
    const identity = await getFinanceIdentity(context);
    requirePermission(identity, 'members.link.search');

    const appDb = getAppClient().firestore();
    const financeDb = getFinanceClient().firestore();

    const [contribSnap, linksSnap, membersSnap] = await Promise.all([
      financeDb.collection('contribuyentes').get(),
      financeDb.collection('member_links').get(),
      appDb.collection('members').get(),
    ]);

    const members = membersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const linksByContrib = new Map(linksSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }]));

    const results = contribSnap.docs.map((d) => {
      const contrib = { id: d.id, ...d.data() };
      const existing = linksByContrib.get(d.id);
      let best = null;
      for (const m of members) {
        const s = scoreMatch(contrib.name, contrib.dni, m);
        if (s.score >= 85 && s.score > (best?.score || 0)) {
          best = { memberId: m.id, firstName: m.firstName, lastName: m.lastName, dni: m.dni, ...s };
        }
      }
      return {
        contributorId: contrib.id,
        contributorName: contrib.name,
        sortedKey: getSortedKey(contrib.name),
        status: existing?.status === 'active' ? 'linked' : best ? 'suggested' : 'unmatched',
        link: existing?.status === 'active' ? existing : null,
        suggestion: best,
      };
    });

    return res.status(200).json({ rows: results });
  } catch (error) {
    return handleIntegrationError(res, error);
  }
}
