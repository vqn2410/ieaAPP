import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
} from 'firebase/firestore';
import { auth, db as appDb } from './firebase';

const FINANCE_FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FINANCE_FIREBASE_API_KEY || 'AIzaSyBkjTjo2daYffuO0sEnTkWt7sYamPEs70Q',
  authDomain: import.meta.env.VITE_FINANCE_FIREBASE_AUTH_DOMAIN || 'iea-finanzas.firebaseapp.com',
  projectId: import.meta.env.VITE_FINANCE_FIREBASE_PROJECT_ID || 'iea-finanzas',
  storageBucket: import.meta.env.VITE_FINANCE_FIREBASE_STORAGE_BUCKET || 'iea-finanzas.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FINANCE_FIREBASE_MESSAGING_SENDER_ID || '486672001154',
  appId: import.meta.env.VITE_FINANCE_FIREBASE_APP_ID || '1:486672001154:web:133785df053ec7c5a62c9b',
};

const FINANCE_APP_NAME = 'iea-finanzas-integration';

function getFinanceDb() {
  const existing = getApps().find((app) => app.name === FINANCE_APP_NAME);
  const financeApp = existing || initializeApp(FINANCE_FIREBASE_CONFIG, FINANCE_APP_NAME);
  return getFirestore(financeApp);
}

export function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getNameTokens(value) {
  return normalizeText(value).split(' ').filter(Boolean);
}

export function getSortedTokenKey(value) {
  return [...getNameTokens(value)].sort().join(' ');
}

function isInstitutionalName(name) {
  return /edesur|uad|asamblea|merino|fundacion|contadora|banco|mercado\s*pago|alquiler|ministerio/i.test(String(name || ''));
}

export function scoreContributorMemberMatch(contributorName, contributorDni, member) {
  const cDni = String(contributorDni || '').replace(/\D/g, '');
  const mDni = String(member?.dni || '').replace(/\D/g, '');
  if (cDni.length >= 6 && cDni === mDni) {
    return { score: 100, matchType: 'dni', label: 'DNI exacto' };
  }

  const cTokens = getNameTokens(contributorName);
  const fTokens = getNameTokens(member?.firstName);
  const lTokens = getNameTokens(member?.lastName);
  const mTokens = [...fTokens, ...lTokens];

  if (cTokens.length === 0 || mTokens.length === 0) {
    return { score: 0, matchType: 'none', label: 'Sin coincidencia' };
  }

  const cSorted = [...cTokens].sort().join(' ');
  const mSorted = [...mTokens].sort().join(' ');

  if (cSorted === mSorted) {
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

function parseTransactionDate(rawDate) {
  if (!rawDate || rawDate === 'S/F') return null;
  if (typeof rawDate?.toDate === 'function') {
    const d = rawDate.toDate();
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return `${str}T12:00:00.000Z`;
  }
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function serializeFinanceTx(docSnap) {
  const data = docSnap.data ? docSnap.data() : docSnap;
  const id = docSnap.id || data.id;
  const isoDate = parseTransactionDate(data.date || data.createdAt);
  return {
    id,
    date: isoDate,
    rawDate: String(data.date || ''),
    amount: Number(data.amount) || 0,
    type: data.type === 'expense' ? 'expense' : 'income',
    description: String(data.description || data.concept || ''),
    category: String(data.category || ''),
    method: String(data.method || ''),
    sedeId: String(data.sedeId || 'central'),
    memberId: String(data.memberId || ''),
    contributorName: String(data.diezmante || data.contributorName || ''),
    expenseStatus: String(data.expenseStatus || ''),
  };
}

async function fetchFinanceCollections() {
  const financeDb = getFinanceDb();
  const [sedesRes, contribRes, txRes, finLinksRes, appLinksRes] = await Promise.allSettled([
    getDocs(collection(financeDb, 'sedes')),
    getDocs(collection(financeDb, 'contribuyentes')),
    getDocs(collection(financeDb, 'transactions')),
    getDocs(collection(financeDb, 'member_links')),
    getDocs(collection(appDb, 'finance_member_links')),
  ]);

  const sedes = sedesRes.status === 'fulfilled' && sedesRes.value.docs.length > 0
    ? sedesRes.value.docs.map((d) => ({ id: d.id, ...d.data(), name: String(d.data().name || d.id) }))
    : [{ id: 'central', name: 'Sede Central', location: 'Buenos Aires' }];

  const contribuyentes = contribRes.status === 'fulfilled'
    ? contribRes.value.docs.map((d) => ({ id: d.id, ...d.data(), name: String(d.data().name || '').trim() }))
    : [];

  const transactions = txRes.status === 'fulfilled'
    ? txRes.value.docs.map(serializeFinanceTx)
    : [];

  transactions.sort((a, b) => (b.date || '').localeCompare(a.date || '') || String(a.id).localeCompare(String(b.id)));

  // Merge active links from both databases (appDb takes precedence if updated more recently)
  const linksByContribId = new Map();
  if (finLinksRes.status === 'fulfilled') {
    finLinksRes.value.docs.forEach((d) => {
      const data = d.data();
      linksByContribId.set(d.id, { id: d.id, ...data });
    });
  }
  if (appLinksRes.status === 'fulfilled') {
    appLinksRes.value.docs.forEach((d) => {
      const data = d.data();
      const prev = linksByContribId.get(d.id);
      if (!prev || String(data.updatedAt || '') >= String(prev.updatedAt || '')) {
        linksByContribId.set(d.id, { id: d.id, ...data });
      }
    });
  }

  return {
    sedes,
    contribuyentes,
    transactions,
    linksByContribId,
  };
}

function buildUnifiedContributors(contribuyentes, transactions) {
  const bySortedKey = new Map();
  const unified = [];

  for (const c of contribuyentes) {
    if (!c.name) continue;
    const key = getSortedTokenKey(c.name);
    if (!key) continue;
    const item = {
      id: c.id,
      name: c.name,
      dni: String(c.dni || ''),
      createdAt: c.createdAt || null,
      source: 'contribuyentes',
      sortedKey: key,
    };
    unified.push(item);
    if (!bySortedKey.has(key)) bySortedKey.set(key, item);
  }

  for (const tx of transactions) {
    if (tx.type !== 'income' || !tx.contributorName) continue;
    if (isInstitutionalName(tx.contributorName)) continue;
    const key = getSortedTokenKey(tx.contributorName);
    if (!key || bySortedKey.has(key)) continue;
    const syntheticId = `tx-${key.replace(/\s+/g, '-').slice(0, 48)}`;
    const item = {
      id: syntheticId,
      name: tx.contributorName.trim(),
      dni: '',
      createdAt: tx.date,
      source: 'transactions',
      sortedKey: key,
    };
    unified.push(item);
    bySortedKey.set(key, item);
  }

  return unified;
}

export async function getFinanceSummary(params = {}) {
  if (!auth.currentUser) throw new Error('Iniciá sesión para consultar Finanzas.');

  const { sedes, transactions } = await fetchFinanceCollections();
  const requestedSede = params.sedeId ? String(params.sedeId) : '';

  const filteredSedes = requestedSede && requestedSede !== 'all'
    ? sedes.filter((s) => s.id === requestedSede || normalizeText(s.name).includes(normalizeText(requestedSede)))
    : sedes;
  const activeSedes = filteredSedes.length > 0 ? filteredSedes : sedes;
  const allowedSedeIds = new Set(activeSedes.map((s) => s.id));

  const fromDate = params.from ? new Date(`${params.from}T00:00:00.000Z`) : null;
  const toDate = params.to ? new Date(`${params.to}T23:59:59.999Z`) : null;

  const scopedTx = transactions.filter((tx) => {
    if (requestedSede && requestedSede !== 'all' && !allowedSedeIds.has(tx.sedeId)) return false;
    if (fromDate || toDate) {
      if (!tx.date) return false;
      const t = new Date(tx.date).getTime();
      if (fromDate && t < fromDate.getTime()) return false;
      if (toDate && t > toDate.getTime()) return false;
    }
    return true;
  });

  const totals = {
    income: 0,
    expense: 0,
    contributions: 0,
    tithes: 0,
    offerings: 0,
    transactionCount: scopedTx.length,
  };

  const bySedeMap = new Map(
    activeSedes.map((sede) => [
      sede.id,
      {
        sedeId: sede.id,
        sedeName: sede.name,
        location: sede.location || '',
        income: 0,
        expense: 0,
        contributions: 0,
        tithes: 0,
        offerings: 0,
        transactionCount: 0,
      },
    ])
  );

  for (const item of scopedTx) {
    const amount = Number(item.amount) || 0;
    const category = normalizeText(item.category);
    const isTithe = category === 'diezmo';
    const isOffering = category === 'ofrenda';
    const isContribution = ['diezmo', 'ofrenda', 'donacion'].includes(category);

    if (item.type === 'income') totals.income += amount;
    if (item.type === 'expense') totals.expense += amount;
    if (isContribution) totals.contributions += amount;
    if (isTithe) totals.tithes += amount;
    if (isOffering) totals.offerings += amount;

    if (!bySedeMap.has(item.sedeId)) {
      bySedeMap.set(item.sedeId, {
        sedeId: item.sedeId,
        sedeName: item.sedeId === 'central' ? 'Sede Central' : item.sedeId,
        location: '',
        income: 0,
        expense: 0,
        contributions: 0,
        tithes: 0,
        offerings: 0,
        transactionCount: 0,
      });
    }
    const site = bySedeMap.get(item.sedeId);
    site.transactionCount += 1;
    if (item.type === 'income') site.income += amount;
    if (item.type === 'expense') site.expense += amount;
    if (isContribution) site.contributions += amount;
    if (isTithe) site.tithes += amount;
    if (isOffering) site.offerings += amount;
  }

  return {
    summary: {
      ...totals,
      net: totals.income - totals.expense,
      bySede: [...bySedeMap.values()],
    },
    sedes: activeSedes,
    recentTransactions: scopedTx.slice(0, 100),
    from: params.from || null,
    to: params.to || null,
  };
}

export async function getFinanceDatabaseMatch() {
  if (!auth.currentUser) throw new Error('Iniciá sesión para consultar el cruce de datos.');

  const [{ contribuyentes, transactions, linksByContribId }, membersSnap, campusesSnap] = await Promise.all([
    fetchFinanceCollections(),
    getDocs(collection(appDb, 'members')),
    getDocs(collection(appDb, 'campuses')),
  ]);

  const campusesById = new Map(
    campusesSnap.docs.map((d) => [d.id, { id: d.id, ...d.data() }])
  );

  const appMembers = membersSnap.docs
    .map((d) => {
      const data = d.data();
      const firstName = String(data.firstName || '').trim();
      const lastName = String(data.lastName || '').trim();
      const campus = campusesById.get(data.campusId);
      return {
        id: d.id,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        dni: String(data.dni || ''),
        email: String(data.email || ''),
        phone: String(data.phone || ''),
        group: String(data.group || ''),
        campusId: String(data.campusId || ''),
        campusName: campus?.name || 'Sede Central',
      };
    })
    .sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'es', { sensitivity: 'base' })
    );

  const membersById = new Map(appMembers.map((m) => [m.id, m]));
  const unifiedContributors = buildUnifiedContributors(contribuyentes, transactions);

  // Aggregate transactions by sorted contributor key and memberId
  const txBySortedKey = new Map();
  const txByMemberId = new Map();

  for (const tx of transactions) {
    if (tx.type !== 'income') continue;
    if (tx.memberId) {
      if (!txByMemberId.has(tx.memberId)) txByMemberId.set(tx.memberId, []);
      txByMemberId.get(tx.memberId).push(tx);
    }
    if (tx.contributorName) {
      const key = getSortedTokenKey(tx.contributorName);
      if (key) {
        if (!txBySortedKey.has(key)) txBySortedKey.set(key, []);
        txBySortedKey.get(key).push(tx);
      }
    }
  }

  // First pass: identify already-linked members
  const linkedMemberIds = new Set();
  for (const link of linksByContribId.values()) {
    if (link.status === 'active' && link.ieaAppMemberId && membersById.has(link.ieaAppMemberId)) {
      linkedMemberIds.add(link.ieaAppMemberId);
    }
  }

  const rows = unifiedContributors.map((contrib) => {
    const keyTx = txBySortedKey.get(contrib.sortedKey) || [];
    const idTx = txByMemberId.get(contrib.id) || [];
    const seenTxIds = new Set();
    const memberTxs = [];

    for (const t of [...keyTx, ...idTx]) {
      if (!seenTxIds.has(t.id)) {
        seenTxIds.add(t.id);
        memberTxs.push(t);
      }
    }

    let totalAmount = 0;
    let titheAmount = 0;
    let offeringAmount = 0;
    let lastDate = null;

    for (const t of memberTxs) {
      const amt = Number(t.amount) || 0;
      const cat = normalizeText(t.category);
      totalAmount += amt;
      if (cat === 'diezmo') titheAmount += amt;
      if (cat === 'ofrenda') offeringAmount += amt;
      if (t.date && (!lastDate || t.date > lastDate)) lastDate = t.date;
    }

    let contributorType = 'Sin Aportes';
    if (titheAmount > 0 && offeringAmount > 0) contributorType = 'Ambos';
    else if (titheAmount > 0) contributorType = 'Diezmante';
    else if (offeringAmount > 0) contributorType = 'Ofrendante';
    else if (totalAmount > 0) contributorType = 'Aportante';

    const existingLink = linksByContribId.get(contrib.id);
    const activeLinkedMember =
      existingLink?.status === 'active' && existingLink?.ieaAppMemberId
        ? membersById.get(existingLink.ieaAppMemberId) || null
        : null;

    let bestSuggestion = null;
    if (!activeLinkedMember) {
      for (const m of appMembers) {
        const res = scoreContributorMemberMatch(contrib.name, contrib.dni, m);
        if (res.score >= 85 && res.score > (bestSuggestion?.score || 0)) {
          bestSuggestion = {
            ...m,
            score: res.score,
            matchType: res.matchType,
            label: res.label,
            alreadyLinkedElsewhere: linkedMemberIds.has(m.id),
          };
        }
      }
    }

    const status = activeLinkedMember
      ? 'linked'
      : bestSuggestion
      ? 'suggested'
      : 'unmatched';

    return {
      contributorId: contrib.id,
      contributorName: contrib.name,
      contributorDni: contrib.dni,
      source: contrib.source,
      createdAt: contrib.createdAt,
      totalAmount,
      titheAmount,
      offeringAmount,
      transactionCount: memberTxs.length,
      lastDate,
      contributorType,
      status,
      linkedMember: activeLinkedMember,
      linkInfo: activeLinkedMember
        ? {
            matchMethod: existingLink.matchMethod || 'manual',
            matchScore: existingLink.matchScore || 100,
            matchType: existingLink.matchType || 'manual',
            linkedAt: existingLink.linkedAt || existingLink.updatedAt || null,
          }
        : null,
      suggestedMember: bestSuggestion,
    };
  });

  rows.sort((a, b) => {
    const order = { suggested: 0, linked: 1, unmatched: 2 };
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return b.totalAmount - a.totalAmount || a.contributorName.localeCompare(b.contributorName, 'es');
  });

  const stats = {
    totalContributors: rows.length,
    totalAppMembers: appMembers.length,
    linkedCount: rows.filter((r) => r.status === 'linked').length,
    suggestedCount: rows.filter((r) => r.status === 'suggested').length,
    highConfidenceSuggestedCount: rows.filter((r) => r.status === 'suggested' && r.suggestedMember?.score >= 92).length,
    unmatchedCount: rows.filter((r) => r.status === 'unmatched').length,
    matchedContributionsTotal: rows
      .filter((r) => r.status === 'linked')
      .reduce((sum, r) => sum + r.totalAmount, 0),
    suggestedContributionsTotal: rows
      .filter((r) => r.status === 'suggested')
      .reduce((sum, r) => sum + r.totalAmount, 0),
    unmatchedContributionsTotal: rows
      .filter((r) => r.status === 'unmatched')
      .reduce((sum, r) => sum + r.totalAmount, 0),
  };

  return {
    stats,
    rows,
    appMembers,
  };
}

export async function linkContributorToMember({
  financialContributorId,
  contributorName = '',
  ieaAppMemberId,
  memberName = '',
  memberDni = '',
  campusId = '',
  matchMethod = 'manual',
  matchScore = 100,
  matchType = 'manual',
}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Iniciá sesión para vincular registros.');
  if (!financialContributorId || !ieaAppMemberId) {
    throw new Error('Seleccioná tanto el contribuyente como el miembro de IEA APP.');
  }

  const now = new Date().toISOString();
  const payload = {
    financialContributorId,
    contributorName,
    ieaAppMemberId,
    memberName,
    memberDni,
    campusId,
    status: 'active',
    matchMethod,
    matchScore,
    matchType,
    linkedByUid: user.uid,
    linkedByEmail: user.email || '',
    linkedAt: now,
    updatedAt: now,
  };

  const financeDb = getFinanceDb();
  await Promise.allSettled([
    setDoc(doc(appDb, 'finance_member_links', financialContributorId), payload, { merge: true }),
    setDoc(doc(financeDb, 'member_links', financialContributorId), payload, { merge: true }),
  ]);

  return { linked: true, link: payload };
}

export async function unlinkContributorFromMember(financialContributorId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Iniciá sesión para desvincular registros.');
  if (!financialContributorId) throw new Error('Indicá el registro financiero que debe desvincularse.');

  const now = new Date().toISOString();
  const payload = {
    status: 'inactive',
    unlinkedAt: now,
    updatedAt: now,
    unlinkedByUid: user.uid,
    unlinkedByEmail: user.email || '',
  };

  const financeDb = getFinanceDb();
  await Promise.allSettled([
    setDoc(doc(appDb, 'finance_member_links', financialContributorId), payload, { merge: true }),
    setDoc(doc(financeDb, 'member_links', financialContributorId), payload, { merge: true }),
  ]);

  return { unlinked: true };
}

export async function autoMatchContributors(minScore = 92) {
  const user = auth.currentUser;
  if (!user) throw new Error('Iniciá sesión para ejecutar el cruce automático.');

  const { rows } = await getFinanceDatabaseMatch();
  const candidates = rows.filter(
    (row) =>
      row.status === 'suggested' &&
      row.suggestedMember &&
      row.suggestedMember.score >= minScore &&
      !row.suggestedMember.alreadyLinkedElsewhere
  );

  const usedMemberIds = new Set();
  const matched = [];

  for (const row of candidates) {
    if (usedMemberIds.has(row.suggestedMember.id)) continue;
    usedMemberIds.add(row.suggestedMember.id);
    const res = await linkContributorToMember({
      financialContributorId: row.contributorId,
      contributorName: row.contributorName,
      ieaAppMemberId: row.suggestedMember.id,
      memberName: row.suggestedMember.fullName,
      memberDni: row.suggestedMember.dni,
      campusId: row.suggestedMember.campusId,
      matchMethod: 'auto',
      matchScore: row.suggestedMember.score,
      matchType: row.suggestedMember.matchType,
    });
    matched.push(res.link);
  }

  return {
    matchedCount: matched.length,
    links: matched,
  };
}

export async function getMemberFinanceHistory(memberId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Iniciá sesión para consultar Finanzas.');
  if (!memberId) throw new Error('El identificador del miembro no es válido.');

  const [memberSnap, { contribuyentes, transactions, linksByContribId }] = await Promise.all([
    getDoc(doc(appDb, 'members', memberId)),
    fetchFinanceCollections(),
  ]);

  if (!memberSnap.exists()) {
    throw new Error('No se encontró el miembro solicitado.');
  }

  const member = { id: memberSnap.id, ...memberSnap.data() };
  const unifiedContributors = buildUnifiedContributors(contribuyentes, transactions);

  // 1. Check active manual/auto link
  let activeLink = null;
  for (const link of linksByContribId.values()) {
    if (link.status === 'active' && link.ieaAppMemberId === memberId) {
      activeLink = link;
      break;
    }
  }

  // 2. If no saved link yet, check if there is a high-confidence match (>= 92)
  let matchedContrib = null;
  if (activeLink) {
    matchedContrib =
      unifiedContributors.find((c) => c.id === activeLink.financialContributorId) || {
        id: activeLink.financialContributorId,
        name: activeLink.contributorName || `${member.firstName || ''} ${member.lastName || ''}`.trim(),
        sortedKey: getSortedTokenKey(activeLink.contributorName || `${member.firstName || ''} ${member.lastName || ''}`),
      };
  } else {
    let best = null;
    for (const c of unifiedContributors) {
      const scoreRes = scoreContributorMemberMatch(c.name, c.dni, member);
      if (scoreRes.score >= 92 && scoreRes.score > (best?.score || 0)) {
        best = { contrib: c, ...scoreRes };
      }
    }
    if (best) {
      matchedContrib = best.contrib;
      activeLink = {
        id: best.contrib.id,
        financialContributorId: best.contrib.id,
        contributorName: best.contrib.name,
        ieaAppMemberId: memberId,
        matchMethod: 'auto_detected',
        matchScore: best.score,
        matchType: best.matchType,
        linkedAt: null,
      };
    }
  }

  if (!matchedContrib) {
    return {
      linked: false,
      canManageLink: true,
      contributions: [],
      summary: { total: 0, count: 0, byType: {} },
    };
  }

  const targetKeys = new Set([
    matchedContrib.sortedKey || getSortedTokenKey(matchedContrib.name),
    getSortedTokenKey(`${member.firstName || ''} ${member.lastName || ''}`),
  ]);

  const contributions = transactions.filter((tx) => {
    if (tx.type !== 'income') return false;
    if (tx.memberId && (tx.memberId === matchedContrib.id || tx.memberId === memberId)) return true;
    const txKey = getSortedTokenKey(tx.contributorName);
    return Boolean(txKey && targetKeys.has(txKey));
  });

  const byType = {};
  let total = 0;
  for (const item of contributions) {
    const amount = Number(item.amount) || 0;
    total += amount;
    const type = item.category || 'Sin categoría';
    byType[type] = (byType[type] || 0) + amount;
  }

  return {
    linked: true,
    canManageLink: true,
    contributor: {
      id: matchedContrib.id,
      name: matchedContrib.name,
    },
    link: {
      id: activeLink.id || matchedContrib.id,
      matchMethod: activeLink.matchMethod || 'auto',
      matchScore: activeLink.matchScore || 100,
      linkedAt: activeLink.linkedAt || null,
    },
    contributions,
    summary: {
      total,
      count: contributions.length,
      byType,
    },
  };
}
