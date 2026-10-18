import React, { useEffect, useState } from 'react';
import { ExternalLink, Landmark, RefreshCw, ShieldAlert } from 'lucide-react';
import Card from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import { getFinanceSummary } from '../../services/financeIntegrationService';

const money = value => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(Number(value) || 0);

export default function Finances() {
  const { currentUser } = useAuth();
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError('');
    try { setSummary(await getFinanceSummary()); } catch (err) { setError(err.message); setSummary(null); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [currentUser?.uid]);

  return <section className="finance-integration-page">
    <div className="d-flex justify-between align-center mb-4"><div><h1>Finanzas</h1><p>Vista integrada de solo lectura desde IEA APP.</p></div><a className="button button-outline" href="https://iea-finanzas.vercel.app/" target="_blank" rel="noreferrer">Abrir IEA Finanzas <ExternalLink size={16} /></a></div>
    {loading && <Card><p>Cargando información financiera…</p></Card>}
    {!loading && error && <Card><div className="d-flex align-center gap-3"><ShieldAlert /><div><h3>No se pudo habilitar la vista financiera</h3><p>{error}</p><button className="button button-outline" onClick={load}><RefreshCw size={15} /> Reintentar</button></div></div></Card>}
    {!loading && summary && <>
      <div className="d-flex gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
        {[['Ingresos', summary.summary.income], ['Egresos', summary.summary.expense], ['Saldo neto', summary.summary.net], ['Aportes', summary.summary.contributions]].map(([label, value]) => <Card key={label} style={{ flex: '1 1 190px' }}><small>{label}</small><h2>{money(value)}</h2></Card>)}
      </div>
      <Card><div className="d-flex align-center gap-2 mb-3"><Landmark size={20} /><h3>Resumen por sede</h3></div>{summary.sedes.length ? <div className="table-responsive"><table className="table"><thead><tr><th>Sede</th><th>Ingresos</th><th>Egresos</th><th>Aportes</th><th>Movimientos</th></tr></thead><tbody>{summary.summary.bySede.map(site => <tr key={site.sedeId}><td>{site.sedeName}</td><td>{money(site.income)}</td><td>{money(site.expense)}</td><td>{money(site.contributions)}</td><td>{site.transactionCount}</td></tr>)}</tbody></table></div> : <p>No hay sedes dentro del alcance asignado.</p>}</Card>
      <p className="mt-3"><small>Los datos se consultan en IEA Finanzas con permisos y sedes asignados. Para registrar o corregir movimientos, abrí la aplicación financiera.</small></p>
    </>}
  </section>;
}
