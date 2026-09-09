import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, FileBarChart, GraduationCap, ShieldCheck } from 'lucide-react';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { getIbrpAssigned } from '../services/ibrpService';
import { getAllIbrpEvaluations } from '../services/ibrpEvaluationService';
import './IbrpReports.css';

export default function IbrpReports() {
  const [assigned, setAssigned] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getIbrpAssigned(), getAllIbrpEvaluations()]).then(([people, reports]) => { setAssigned(people); setEvaluations(reports); }).finally(() => setLoading(false));
  }, []);

  const reportGroups = useMemo(() => assigned.map(person => ({ person, reports: evaluations.filter(report => report.assignedId === person.id).sort((a, b) => String(b.month || '').localeCompare(String(a.month || ''))) })).filter(group => group.reports.length > 0), [assigned, evaluations]);

  return <div className="ibrp-reports-page animate-fade-in"><div className="ibrp-reports-header"><div><p className="ibrp-reports-eyebrow">Uso interno</p><h1>Reportes IBRP</h1><p>Evaluaciones mensuales por asignado y área de servicio.</p></div><div className="ibrp-reports-private"><ShieldCheck size={16} /> Solo encargados</div></div>{loading ? <Card><p>Cargando reportes...</p></Card> : reportGroups.length === 0 ? <Card><EmptyState icon={FileBarChart} title="Sin reportes generados" message="Las ruedas de vida guardadas aparecerán aquí." /></Card> : <div className="ibrp-report-groups">{reportGroups.map(({ person, reports }) => { const isExpanded = expanded[person.id]; const visible = isExpanded ? reports : reports.slice(0, 3); return <Card key={person.id} className="ibrp-report-person"><div className="ibrp-report-person-head"><div className="ibrp-report-person-avatar">{`${person.firstName?.[0] || '?'}${person.lastName?.[0] || '?'}`}</div><div><h2>{person.lastName}, {person.firstName}</h2><p>{person.studyYear}º año {person.fourthTrack ? `· ${person.fourthTrack}` : ''} · {reports.length} reportes</p></div></div><div className="ibrp-report-grid-cards">{visible.map(report => <article key={report.id}><div><strong>{report.area}</strong><span>{report.month || 'Sin mes'}</span></div><div className="ibrp-mini-scores">{Object.entries(report.values || {}).slice(0, 3).map(([key, value]) => <span key={key}>{value}/10</span>)}</div><p>{report.notes || 'Sin observaciones.'}</p></article>)}</div>{reports.length > 3 && <button className="ibrp-see-more" onClick={() => setExpanded(prev => ({ ...prev, [person.id]: !isExpanded }))}>{isExpanded ? 'Ver menos' : `Ver más (${reports.length - 3})`} <ChevronDown size={15} className={isExpanded ? 'rotated' : ''} /></button>}</Card>; })}</div>}</div>;
}
