import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Landmark,
  Link2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Unlink,
  UserCheck,
  Users,
  Wallet,
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useAuth } from '../../context/AuthContext';
import { useCampus } from '../../context/CampusContext';
import {
  autoMatchContributors,
  getFinanceDatabaseMatch,
  getFinanceSummary,
  linkContributorToMember,
  unlinkContributorFromMember,
} from '../../services/financeIntegrationService';
import './Finances.css';

const CONTRIBUTORS_PER_PAGE = 50;

const money = (value) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(
    Number(value) || 0
  );

const formatDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

function getBadgeClass(type) {
  if (type === 'Ambos') return 'finance-badge both';
  if (type === 'Diezmante') return 'finance-badge tithe';
  if (type === 'Ofrendante') return 'finance-badge offering';
  return 'finance-badge none';
}

export default function Finances() {
  const { currentUser } = useAuth();
  const { activeCampusSlug } = useCampus() || {};
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('match');
  const [summaryData, setSummaryData] = useState(null);
  const [matchData, setMatchData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [autoMatching, setAutoMatching] = useState(false);
  const [actionId, setActionId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');

  // Match filters & pagination
  const [matchFilter, setMatchFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [manualSelection, setManualSelection] = useState({});

  // Transactions filter
  const [txFilter, setTxFilter] = useState('all');

  const loadAll = useCallback(async () => {
    if (!currentUser?.uid) return;
    setLoading(true);
    setError('');
    try {
      const [sumRes, matchRes] = await Promise.all([
        getFinanceSummary(),
        getFinanceDatabaseMatch(),
      ]);
      setSummaryData(sumRes);
      setMatchData(matchRes);
    } catch (err) {
      setError(err.message || 'No se pudo conectar con la base de IEA Finanzas.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleAutoMatchAll = async () => {
    setAutoMatching(true);
    setStatusMessage('');
    try {
      const result = await autoMatchContributors(92);
      setStatusMessage(
        result.matchedCount > 0
          ? `Se vincularon automáticamente ${result.matchedCount} contribuyentes con miembros de IEA APP.`
          : 'No había nuevas coincidencias automáticas pendientes de vincular.'
      );
      await loadAll();
    } catch (err) {
      setError(err.message || 'No se pudo completar el cruce automático.');
    } finally {
      setAutoMatching(false);
    }
  };

  const handleConfirmMatch = async (row, targetMember, isAutoSuggestion = false) => {
    if (!targetMember) return;
    setActionId(row.contributorId);
    setStatusMessage('');
    try {
      await linkContributorToMember({
        financialContributorId: row.contributorId,
        contributorName: row.contributorName,
        ieaAppMemberId: targetMember.id,
        memberName: targetMember.fullName,
        memberDni: targetMember.dni,
        campusId: targetMember.campusId,
        matchMethod: isAutoSuggestion ? 'auto' : 'manual',
        matchScore: isAutoSuggestion ? targetMember.score || 100 : 100,
        matchType: isAutoSuggestion ? targetMember.matchType || 'exact_name' : 'manual',
      });
      setStatusMessage(`Vinculado: ${row.contributorName} ↔ ${targetMember.fullName}`);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Error al vincular el contribuyente.');
    } finally {
      setActionId('');
    }
  };

  const handleUnlink = async (row) => {
    if (!window.confirm(`¿Desvincular a "${row.contributorName}" de "${row.linkedMember?.fullName}"?`)) return;
    setActionId(row.contributorId);
    setStatusMessage('');
    try {
      await unlinkContributorFromMember(row.contributorId);
      setStatusMessage(`Se desvinculó el registro de ${row.contributorName}.`);
      await loadAll();
    } catch (err) {
      setError(err.message || 'Error al desvincular.');
    } finally {
      setActionId('');
    }
  };

  const filteredMatchRows = useMemo(() => {
    if (!matchData?.rows) return [];
    const q = searchTerm.trim().toLowerCase();
    return matchData.rows.filter((row) => {
      if (matchFilter !== 'all' && row.status !== matchFilter) return false;
      if (!q) return true;
      const target = [
        row.contributorName,
        row.linkedMember?.fullName,
        row.linkedMember?.dni,
        row.suggestedMember?.fullName,
        row.suggestedMember?.dni,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return target.includes(q);
    });
  }, [matchData, matchFilter, searchTerm]);

  const totalMatchPages = Math.max(1, Math.ceil(filteredMatchRows.length / CONTRIBUTORS_PER_PAGE));
  const safePage = Math.min(currentPage, totalMatchPages);
  const paginatedMatchRows = useMemo(() => {
    const start = (safePage - 1) * CONTRIBUTORS_PER_PAGE;
    return filteredMatchRows.slice(start, start + CONTRIBUTORS_PER_PAGE);
  }, [filteredMatchRows, safePage]);

  const filteredTransactions = useMemo(() => {
    const list = summaryData?.recentTransactions || [];
    return list.filter((tx) => {
      if (txFilter === 'all') return true;
      if (txFilter === 'income') return tx.type === 'income';
      if (txFilter === 'expense') return tx.type === 'expense';
      if (txFilter === 'diezmo') return tx.category?.toLowerCase() === 'diezmo';
      if (txFilter === 'ofrenda') return tx.category?.toLowerCase() === 'ofrenda';
      return true;
    });
  }, [summaryData, txFilter]);

  const campusPrefix = activeCampusSlug ? `/${activeCampusSlug}` : '/sedecentral';

  return (
    <section className="finance-integration-page animate-fade-in">
      <div className="finance-header">
        <div>
          <p className="finance-eyebrow">Integración Financiera</p>
          <h1>Finanzas y Cruce de Padrón</h1>
          <p className="finance-subtitle">
            Conexión en vivo con la base de datos de <strong>IEA Finanzas</strong> y cruce inteligente con los miembros de <strong>IEA APP</strong>.
          </p>
        </div>
        <div className="finance-header-actions">
          <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
            <RefreshCw size={15} /> Actualizar
          </Button>
          <a
            className="finance-external-btn"
            href="https://iea-finanzas.vercel.app/"
            target="_blank"
            rel="noreferrer"
          >
            Abrir IEA Finanzas <ExternalLink size={15} />
          </a>
        </div>
      </div>

      {statusMessage && (
        <div className="finance-status-banner">
          <div className="finance-status-banner-left">
            <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
            <strong>{statusMessage}</strong>
          </div>
          <button
            type="button"
            className="finance-status-close"
            onClick={() => setStatusMessage('')}
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {loading && (
        <Card>
          <p style={{ margin: 0 }}>Conectando con la base de datos de IEA Finanzas y calculando coincidencias…</p>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <div className="d-flex align-center gap-3">
            <ShieldAlert size={22} />
            <div>
              <h3 style={{ margin: 0 }}>No se pudo consultar la base financiera</h3>
              <p style={{ margin: '0.25rem 0 0.75rem' }}>{error}</p>
              <Button variant="outline" size="sm" onClick={loadAll}>
                <RefreshCw size={15} /> Reintentar
              </Button>
            </div>
          </div>
        </Card>
      )}

      {!loading && !error && summaryData && matchData && (
        <>
          {/* KPIs Financieros Globales */}
          <div className="finance-kpi-grid">
            <div className="finance-kpi-card">
              <span className="finance-kpi-label">Ingresos Totales</span>
              <h2 className="finance-kpi-value income">{money(summaryData.summary.income)}</h2>
              <span className="finance-kpi-meta">{summaryData.summary.transactionCount} movimientos registrados</span>
            </div>
            <div className="finance-kpi-card">
              <span className="finance-kpi-label">Egresos Totales</span>
              <h2 className="finance-kpi-value expense">{money(summaryData.summary.expense)}</h2>
              <span className="finance-kpi-meta">Gastos y salidas operativas</span>
            </div>
            <div className="finance-kpi-card">
              <span className="finance-kpi-label">Saldo Neto</span>
              <h2 className="finance-kpi-value">{money(summaryData.summary.net)}</h2>
              <span className="finance-kpi-meta">Balance consolidado</span>
            </div>
            <div className="finance-kpi-card">
              <span className="finance-kpi-label">Diezmos y Ofrendas</span>
              <h2 className="finance-kpi-value accent">{money(summaryData.summary.contributions)}</h2>
              <span className="finance-kpi-meta">
                Diezmos: {money(summaryData.summary.tithes)} · Ofrendas: {money(summaryData.summary.offerings)}
              </span>
            </div>
          </div>

          {/* Pestañas de navegación */}
          <div className="finance-tabs">
            <Button
              variant={activeTab === 'match' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('match')}
            >
              <Link2 size={15} /> Cruce de Bases ({matchData.stats.linkedCount}/{matchData.stats.totalContributors})
            </Button>
            <Button
              variant={activeTab === 'summary' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('summary')}
            >
              <Landmark size={15} /> Resumen por Sede ({summaryData.sedes.length})
            </Button>
            <Button
              variant={activeTab === 'transactions' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('transactions')}
            >
              <Wallet size={15} /> Últimos Movimientos ({summaryData.recentTransactions.length})
            </Button>
          </div>

          {/* TAB 1: CRUCE DE BASES DE DATOS (MATCH) */}
          {activeTab === 'match' && (
            <>
              <div className="finance-kpi-grid">
                <div className="finance-kpi-card">
                  <div className="finance-kpi-top">
                    <span className="finance-kpi-label">Contribuyentes Finanzas</span>
                    <Users size={16} style={{ color: 'var(--color-text-muted)' }} />
                  </div>
                  <h3 className="finance-kpi-value">{matchData.stats.totalContributors}</h3>
                  <span className="finance-kpi-meta">Padrón IEA APP: {matchData.stats.totalAppMembers} miembros</span>
                </div>

                <div className="finance-kpi-card">
                  <div className="finance-kpi-top">
                    <span className="finance-kpi-label">Vinculados Activos</span>
                    <UserCheck size={16} style={{ color: '#10b981' }} />
                  </div>
                  <h3 className="finance-kpi-value income">{matchData.stats.linkedCount}</h3>
                  <span className="finance-kpi-meta">Aportes: {money(matchData.stats.matchedContributionsTotal)}</span>
                </div>

                <div className="finance-kpi-card">
                  <div className="finance-kpi-top">
                    <span className="finance-kpi-label">Matches Sugeridos</span>
                    <Sparkles size={16} style={{ color: '#6366f1' }} />
                  </div>
                  <h3 className="finance-kpi-value accent">{matchData.stats.suggestedCount}</h3>
                  <span className="finance-kpi-meta">Aportes: {money(matchData.stats.suggestedContributionsTotal)}</span>
                </div>

                <div className="finance-kpi-card">
                  <div className="finance-kpi-top">
                    <span className="finance-kpi-label">Sin Match en IEA APP</span>
                    <Unlink size={16} style={{ color: '#f59e0b' }} />
                  </div>
                  <h3 className="finance-kpi-value warning">{matchData.stats.unmatchedCount}</h3>
                  <span className="finance-kpi-meta">Aportes: {money(matchData.stats.unmatchedContributionsTotal)}</span>
                </div>
              </div>

              <Card>
                <div className="finance-section-head">
                  <div>
                    <h3>Cruce de Contribuyentes (IEA Finanzas ↔ Miembros IEA APP)</h3>
                    <p>
                      Compara automáticamente nombres invertidos, nombres compuestos y DNI entre ambas bases (mostrando de a {CONTRIBUTORS_PER_PAGE} por página).
                    </p>
                  </div>
                  {matchData.stats.highConfidenceSuggestedCount > 0 && (
                    <Button size="sm" onClick={handleAutoMatchAll} disabled={autoMatching}>
                      <Sparkles size={15} />
                      {autoMatching
                        ? 'Vinculando coincidencias…'
                        : `Auto-Vincular ${matchData.stats.highConfidenceSuggestedCount} coincidencias exactas`}
                    </Button>
                  )}
                </div>

                {/* Filtros y buscador */}
                <div className="finance-toolbar">
                  <div className="finance-filter-pills">
                    {[
                      { id: 'all', label: `Todos (${matchData.rows.length})` },
                      { id: 'suggested', label: `Sugeridos (${matchData.stats.suggestedCount})` },
                      { id: 'linked', label: `Vinculados (${matchData.stats.linkedCount})` },
                      { id: 'unmatched', label: `Sin coincidencia (${matchData.stats.unmatchedCount})` },
                    ].map((tab) => (
                      <Button
                        key={tab.id}
                        size="sm"
                        variant={matchFilter === tab.id ? 'primary' : 'outline'}
                        onClick={() => {
                          setMatchFilter(tab.id);
                          setCurrentPage(1);
                        }}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  <div className="finance-search-box">
                    <Search size={15} className="finance-search-icon" />
                    <input
                      type="text"
                      className="form-input finance-search-input"
                      placeholder="Buscar contribuyente o miembro..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="finance-table-container">
                  <table className="finance-table match-table">
                    <thead>
                      <tr>
                        <th>Contribuyente (IEA Finanzas)</th>
                        <th>Perfil / Mov.</th>
                        <th>Total Aportado</th>
                        <th>Estado de Cruce</th>
                        <th>Miembro en IEA APP</th>
                        <th className="text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMatchRows.length === 0 ? (
                        <tr>
                          <td colSpan={6} data-label="Resultado" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                            No se encontraron registros para el filtro seleccionado.
                          </td>
                        </tr>
                      ) : (
                        paginatedMatchRows.map((row) => {
                          const selectedMemberId = manualSelection[row.contributorId] || '';
                          const selectedManualMember = matchData.appMembers.find((m) => m.id === selectedMemberId);
                          const isBusy = actionId === row.contributorId;

                          return (
                            <tr key={row.contributorId}>
                              <td data-label="Contribuyente (Finanzas)">
                                <span className="finance-cell-primary">{row.contributorName}</span>
                                <span className="finance-cell-sub">
                                  {row.source === 'transactions' ? 'Detectado en movimientos' : 'Padrón contribuyentes'}
                                  {row.lastDate ? ` · Últ.: ${formatDate(row.lastDate)}` : ''}
                                </span>
                              </td>

                              <td data-label="Perfil / Movimientos">
                                <span className={getBadgeClass(row.contributorType)}>{row.contributorType}</span>
                                <span className="finance-cell-sub">
                                  {row.transactionCount} {row.transactionCount === 1 ? 'movimiento' : 'movimientos'}
                                </span>
                              </td>

                              <td data-label="Total Aportado">
                                <span className="finance-cell-primary">{money(row.totalAmount)}</span>
                                {(row.titheAmount > 0 || row.offeringAmount > 0) && (
                                  <span className="finance-cell-sub">
                                    {row.titheAmount > 0 ? `Diezmo: ${money(row.titheAmount)}` : ''}
                                    {row.titheAmount > 0 && row.offeringAmount > 0 ? ' · ' : ''}
                                    {row.offeringAmount > 0 ? `Ofrenda: ${money(row.offeringAmount)}` : ''}
                                  </span>
                                )}
                              </td>

                              <td data-label="Estado de Cruce">
                                {row.status === 'linked' && (
                                  <span className="finance-match-pill linked">
                                    ✓ Vinculado ({row.linkInfo?.matchMethod === 'auto' ? 'Auto' : 'Manual'})
                                  </span>
                                )}
                                {row.status === 'suggested' && (
                                  <span className="finance-match-pill suggested">
                                    ✦ Match {row.suggestedMember?.score}% · {row.suggestedMember?.label}
                                  </span>
                                )}
                                {row.status === 'unmatched' && (
                                  <span className="finance-match-pill unmatched">
                                    Sin match automático
                                  </span>
                                )}
                              </td>

                              <td data-label="Miembro en IEA APP">
                                {row.status === 'linked' && row.linkedMember ? (
                                  <div>
                                    <button
                                      type="button"
                                      className="finance-member-link-btn"
                                      onClick={() => navigate(`${campusPrefix}/miembros/${row.linkedMember.id}`)}
                                    >
                                      {row.linkedMember.fullName}
                                    </button>
                                    <span className="finance-cell-sub">
                                      {row.linkedMember.campusName}
                                      {row.linkedMember.dni ? ` · DNI ${row.linkedMember.dni}` : ''}
                                      {row.linkedMember.group ? ` · Grupo: ${row.linkedMember.group}` : ''}
                                    </span>
                                  </div>
                                ) : row.status === 'suggested' && row.suggestedMember ? (
                                  <div>
                                    <span className="finance-cell-primary">{row.suggestedMember.fullName}</span>
                                    <span className="finance-cell-sub">
                                      {row.suggestedMember.campusName}
                                      {row.suggestedMember.dni ? ` · DNI ${row.suggestedMember.dni}` : ''}
                                    </span>
                                  </div>
                                ) : (
                                  <select
                                    className="form-input finance-member-select"
                                    value={selectedMemberId}
                                    onChange={(e) =>
                                      setManualSelection((prev) => ({
                                        ...prev,
                                        [row.contributorId]: e.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">Seleccionar miembro…</option>
                                    {matchData.appMembers.map((m) => (
                                      <option key={m.id} value={m.id}>
                                        {m.lastName}, {m.firstName} {m.dni ? `(${m.dni})` : ''}
                                      </option>
                                    ))}
                                  </select>
                                )}
                              </td>

                              <td data-label="Acción">
                                <div className="finance-row-actions">
                                  {row.status === 'linked' && (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => navigate(`${campusPrefix}/miembros/${row.linkedMember.id}`)}
                                      >
                                        Ficha
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isBusy}
                                        onClick={() => handleUnlink(row)}
                                      >
                                        Desvincular
                                      </Button>
                                    </>
                                  )}
                                  {row.status === 'suggested' && row.suggestedMember && (
                                    <Button
                                      size="sm"
                                      disabled={isBusy}
                                      onClick={() => handleConfirmMatch(row, row.suggestedMember, true)}
                                    >
                                      {isBusy ? 'Vinculando…' : 'Confirmar'}
                                    </Button>
                                  )}
                                  {row.status === 'unmatched' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={!selectedManualMember || isBusy}
                                      onClick={() => handleConfirmMatch(row, selectedManualMember, false)}
                                    >
                                      {isBusy ? 'Vinculando…' : 'Vincular'}
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Paginación de 50 contribuyentes */}
                {filteredMatchRows.length > 0 && (
                  <div className="finance-pagination">
                    <span className="finance-pagination-info">
                      Mostrando {(safePage - 1) * CONTRIBUTORS_PER_PAGE + 1}–
                      {Math.min(safePage * CONTRIBUTORS_PER_PAGE, filteredMatchRows.length)} de{' '}
                      {filteredMatchRows.length} contribuyentes
                    </span>
                    {totalMatchPages > 1 && (
                      <div className="finance-pagination-controls">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage <= 1}
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        >
                          <ChevronLeft size={14} /> Anterior
                        </Button>
                        <span className="finance-page-indicator">
                          Página {safePage} de {totalMatchPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={safePage >= totalMatchPages}
                          onClick={() => setCurrentPage((p) => Math.min(totalMatchPages, p + 1))}
                        >
                          Siguiente <ChevronRight size={14} />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* TAB 2: RESUMEN POR SEDE */}
          {activeTab === 'summary' && (
            <Card>
              <div className="finance-section-head">
                <div>
                  <h3>Resumen consolidado por Sede (IEA Finanzas)</h3>
                  <p>Totales de ingresos, egresos, diezmos y ofrendas por cada sede activa.</p>
                </div>
              </div>
              {summaryData.summary.bySede.length ? (
                <div className="finance-table-container">
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Sede</th>
                        <th>Ingresos</th>
                        <th>Egresos</th>
                        <th>Diezmos</th>
                        <th>Ofrendas</th>
                        <th>Saldo Neto</th>
                        <th className="text-right">Movimientos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryData.summary.bySede.map((site) => (
                        <tr key={site.sedeId}>
                          <td data-label="Sede">
                            <span className="finance-cell-primary">{site.sedeName}</span>
                            {site.location && <span className="finance-cell-sub">{site.location}</span>}
                          </td>
                          <td data-label="Ingresos" style={{ color: '#10b981', fontWeight: 700 }}>
                            {money(site.income)}
                          </td>
                          <td data-label="Egresos" style={{ color: '#ef4444', fontWeight: 700 }}>
                            {money(site.expense)}
                          </td>
                          <td data-label="Diezmos">{money(site.tithes)}</td>
                          <td data-label="Ofrendas">{money(site.offerings)}</td>
                          <td data-label="Saldo Neto">
                            <span className="finance-cell-primary">{money(site.income - site.expense)}</span>
                          </td>
                          <td data-label="Movimientos" style={{ textAlign: 'right' }}>
                            <span className="finance-badge none">{site.transactionCount} mov.</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>No hay sedes registradas.</p>
              )}
            </Card>
          )}

          {/* TAB 3: ÚLTIMOS MOVIMIENTOS */}
          {activeTab === 'transactions' && (
            <Card>
              <div className="finance-toolbar">
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.125rem' }}>Últimos Movimientos en IEA Finanzas</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>
                    Mostrando los movimientos más recientes registrados en la base financiera.
                  </p>
                </div>
                <div className="finance-filter-pills">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'income', label: 'Ingresos' },
                    { id: 'expense', label: 'Egresos' },
                    { id: 'diezmo', label: 'Diezmos' },
                    { id: 'ofrenda', label: 'Ofrendas' },
                  ].map((f) => (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={txFilter === f.id ? 'primary' : 'outline'}
                      onClick={() => setTxFilter(f.id)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="finance-table-container">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Categoría</th>
                      <th>Contribuyente / Detalle</th>
                      <th>Método</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td data-label="Fecha">{formatDate(tx.date)}</td>
                        <td data-label="Tipo">
                          <span className={tx.type === 'income' ? 'finance-match-pill linked' : 'finance-match-pill unmatched'}>
                            {tx.type === 'income' ? 'Ingreso' : 'Egreso'}
                          </span>
                        </td>
                        <td data-label="Categoría" style={{ textTransform: 'capitalize', fontWeight: 600 }}>
                          {tx.category || '—'}
                        </td>
                        <td data-label="Contribuyente / Detalle">
                          <span className="finance-cell-primary">{tx.contributorName || tx.description || '—'}</span>
                          {tx.contributorName && tx.description && (
                            <span className="finance-cell-sub">{tx.description}</span>
                          )}
                        </td>
                        <td data-label="Método" style={{ textTransform: 'capitalize' }}>
                          {tx.method || '—'}
                        </td>
                        <td
                          data-label="Monto"
                          style={{
                            textAlign: 'right',
                            fontWeight: 700,
                            color: tx.type === 'income' ? '#10b981' : '#ef4444',
                          }}
                        >
                          {tx.type === 'expense' ? `- ${money(tx.amount)}` : money(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </section>
  );
}
