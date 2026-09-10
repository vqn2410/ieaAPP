import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Edit, FileBarChart, GraduationCap, Plus, Search, Trash2, Users } from 'lucide-react';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { createIbrpAssigned, deleteIbrpAssigned, getIbrpAssigned, updateIbrpAssigned } from '../services/ibrpService';
import { getIbrpEvaluation, getIbrpEvaluationsForAssigned, saveIbrpEvaluation } from '../services/ibrpEvaluationService';
import { normalizeString } from '../utils/helpers';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import RadarChart from '../components/common/RadarChart';
import { jsPDF } from 'jspdf';
import './IbrpAssigned.css';

const emptyRecord = { lastName: '', firstName: '', dni: '', studyYear: '1', fourthTrack: '', previousStudies: '', discipleship: 'No', baptized: 'No', serviceAreas: [], previousChurch: '', active: true, performanceStatus: 'En seguimiento', performanceScore: '', performanceNotes: '' };
const EVALUATION_DIMENSIONS = [
  { key: 'formation', label: 'Formación' },
  { key: 'commitment', label: 'Compromiso' },
  { key: 'service', label: 'Servicio' },
  { key: 'character', label: 'Carácter' },
  { key: 'leadership', label: 'Liderazgo' },
  { key: 'fulfillment', label: 'Cumplimiento' },
];

function IbrpForm({ initialData, onSave, onCancel }) {
  const { settings } = useSettings();
  const [form, setForm] = useState({ ...emptyRecord, ...initialData, serviceAreas: Array.isArray(initialData?.serviceAreas) ? initialData.serviceAreas : (initialData?.serviceAreas ? [initialData.serviceAreas] : []) });
  const change = event => setForm(prev => ({ ...prev, [event.target.name]: event.target.multiple ? Array.from(event.target.selectedOptions, option => option.value) : event.target.value }));
  return <div className="ibrp-form-wrapper">{initialData?.id && <div className="ibrp-form-qr"><img src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(`IBRP:${initialData.id}`)}`} alt="QR del asignado IBRP" /><small>QR del asignado</small></div>}<form className="ibrp-form" onSubmit={event => { event.preventDefault(); onSave(form); }}>
    <section className="ibrp-form-section"><h2>Datos personales</h2><div className="ibrp-grid"><label>Apellido *<input required name="lastName" value={form.lastName} onChange={change} /></label><label>Nombre *<input required name="firstName" value={form.firstName} onChange={change} /></label><label>DNI *<input required name="dni" value={form.dni} onChange={change} /></label><label>Año de cursada *<select name="studyYear" value={form.studyYear} onChange={change}><option value="1">1º año</option><option value="2">2º año</option><option value="3">3º año</option><option value="4">4º año</option></select></label>{form.studyYear === '4' && <label>Orientación de 4º año<select required name="fourthTrack" value={form.fourthTrack} onChange={change}><option value="">Seleccionar</option><option value="Ministerial">Ministerial</option><option value="Misiones">Misiones</option><option value="Educación">Educación</option></select></label>}</div></section>
    <section className="ibrp-form-section"><h2>Trayectoria en la iglesia</h2><div className="ibrp-grid"><label>Estudios previos<textarea name="previousStudies" value={form.previousStudies} onChange={change} placeholder="Estudios, instituto o formación previa" /></label><label>Iglesia de procedencia<input name="previousChurch" value={form.previousChurch} onChange={change} /></label><label>¿Hizo el discipulado en IEA?<select name="discipleship" value={form.discipleship} onChange={change}><option>Sí</option><option>No</option><option>En curso</option></select></label><label>¿Está bautizado?<select name="baptized" value={form.baptized} onChange={change}><option>Sí</option><option>No</option></select></label><label className="ibrp-wide">Áreas de servicio<div className="ibrp-area-picker">{(settings?.serviceAreas || []).map(area => <label key={area}><input type="checkbox" checked={(form.serviceAreas || []).includes(area)} onChange={() => setForm(prev => ({ ...prev, serviceAreas: (prev.serviceAreas || []).includes(area) ? prev.serviceAreas.filter(item => item !== area) : [...(prev.serviceAreas || []), area] }))} /> <span>{area}</span></label>)}</div><small>Podés seleccionar más de un área.</small><div className="ibrp-selected-areas">{(form.serviceAreas || []).map(area => <span key={area}>{area}<button type="button" onClick={() => setForm(prev => ({ ...prev, serviceAreas: prev.serviceAreas.filter(item => item !== area) }))}>×</button></span>)}</div></label></div></section>
    <section className="ibrp-form-section"><h2>Evaluación interna <small>Solo visible para encargados</small></h2><div className="ibrp-grid"><label>Estado<select name="performanceStatus" value={form.performanceStatus} onChange={change}><option>En seguimiento</option><option>Buen desempeño</option><option>Requiere acompañamiento</option><option>Finalizado</option></select></label><label>Puntaje interno<input type="number" min="0" max="10" name="performanceScore" value={form.performanceScore} onChange={change} /></label><label className="ibrp-wide">Observaciones privadas<textarea name="performanceNotes" value={form.performanceNotes} onChange={change} placeholder="Desempeño, participación, puntualidad y acompañamiento" /></label></div></section>
    <div className="ibrp-form-actions"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit">Guardar asignado</Button></div>
  </form></div>;
}

export default function IbrpAssigned() {
  const { userData } = useAuth();
  const { settings } = useSettings();
  const [records, setRecords] = useState([]);
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAssignedId, setSelectedAssignedId] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [evaluationMonth, setEvaluationMonth] = useState(new Date().toISOString().slice(0, 7));
  const [evaluationValues, setEvaluationValues] = useState(() => Object.fromEntries(EVALUATION_DIMENSIONS.map(item => [item.key, 0])));
  const [evaluationNotes, setEvaluationNotes] = useState('');
  const [savingEvaluation, setSavingEvaluation] = useState(false);
  const [generatedEvaluations, setGeneratedEvaluations] = useState([]);
  const [openActionId, setOpenActionId] = useState(null);
  const [profileRecord, setProfileRecord] = useState(null);
  const load = async () => { setLoading(true); try { setRecords(await getIbrpAssigned()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const filtered = useMemo(() => { const q = normalizeString(search).toLowerCase(); return records.filter(record => !q || normalizeString(`${record.lastName} ${record.firstName} ${record.dni}`).toLowerCase().includes(q)); }, [records, search]);
  const save = async data => { if (editing?.id) await updateIbrpAssigned(editing.id, data); else await createIbrpAssigned({ ...data, active: true }); setEditing(null); setTab('list'); load(); };
  const remove = async record => { if (window.confirm(`¿Eliminar a ${record.lastName}, ${record.firstName} de Asignados IBRP?`)) { await deleteIbrpAssigned(record.id); load(); } };
  const changeStatus = async record => { const next = record.active === false; if (!window.confirm(`¿Querés ${next ? 'reactivar' : 'dar de baja'} a ${record.lastName}, ${record.firstName}?`)) return; await updateIbrpAssigned(record.id, { active: next }); load(); };
  const report = { total: records.length, byYear: ['1', '2', '3', '4'].map(year => ({ year, count: records.filter(item => item.studyYear === year).length })), byStatus: [...new Set(records.map(item => item.performanceStatus))].map(status => ({ status, count: records.filter(item => item.performanceStatus === status).length })) };
  const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const canSeeAllAreas = roles.some(role => ['Admin', 'Pastor'].includes(role));
  const configuredAreas = settings?.serviceAreas || [];
  const allowedAreas = canSeeAllAreas ? configuredAreas : configuredAreas.filter(area => (userData?.serviceAreas || []).includes(area));
  const reportRecords = canSeeAllAreas ? records : records.filter(record => (record.serviceAreas || []).some(area => allowedAreas.includes(area)));
  const selectedAssigned = reportRecords.find(record => record.id === selectedAssignedId);

  useEffect(() => {
    if (!selectedAssignedId || !selectedArea) return;
    getIbrpEvaluation(selectedAssignedId, selectedArea, evaluationMonth).then(saved => {
      setEvaluationValues(saved?.values || Object.fromEntries(EVALUATION_DIMENSIONS.map(item => [item.key, 0])));
      setEvaluationNotes(saved?.notes || '');
    });
  }, [selectedAssignedId, selectedArea, evaluationMonth]);

  useEffect(() => {
    if (selectedAssignedId) getIbrpEvaluationsForAssigned(selectedAssignedId).then(setGeneratedEvaluations);
    else setGeneratedEvaluations([]);
  }, [selectedAssignedId]);

  const saveEvaluation = async () => {
    if (!selectedAssignedId || !selectedArea) return;
    setSavingEvaluation(true);
    try { await saveIbrpEvaluation(selectedAssignedId, selectedArea, evaluationMonth, { values: evaluationValues, notes: evaluationNotes, evaluatorId: userData?.uid || '', evaluatorName: userData?.name || '' }); alert('Evaluación mensual guardada correctamente.'); }
    finally { setSavingEvaluation(false); }
  };

  const downloadEvaluation = () => {
    if (!selectedAssigned || !selectedArea) return;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('IEA - Reporte privado de desempeño IBRP', 14, 18);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text(`Asignado: ${selectedAssigned.lastName}, ${selectedAssigned.firstName}`, 14, 28);
    pdf.text(`Área: ${selectedArea}`, 14, 35);
    pdf.text(`Evaluador: ${userData?.name || 'Encargado del área'}`, 14, 42);
    EVALUATION_DIMENSIONS.forEach((dimension, index) => pdf.text(`${dimension.label}: ${evaluationValues[dimension.key]}/10`, 18, 56 + index * 8));
    pdf.setFont('helvetica', 'bold');
    pdf.text('Observaciones privadas', 14, 112);
    pdf.setFont('helvetica', 'normal');
    pdf.text(pdf.splitTextToSize(evaluationNotes || 'Sin observaciones.', 180), 14, 120);
    pdf.save(`ibrp-${selectedAssigned.lastName}-${selectedArea.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };

  return <div className="ibrp-page animate-fade-in"><div className="ibrp-header"><div><p className="ibrp-eyebrow">Formación y servicio</p><h1>Asignados IBRP</h1><p>Registro privado de estudiantes asignados al IBRP.</p></div><Button icon={<Plus size={16} />} onClick={() => { setEditing({}); setTab('list'); }}>Nuevo asignado</Button></div><div className="ibrp-tabs"><button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}><Users size={15} />Listado</button><button className={tab === 'report' ? 'active' : ''} onClick={() => setTab('report')}><FileBarChart size={15} />Reporte de desempeño</button></div><div className="ibrp-summary"><div><strong>{records.length}</strong><span>Total asignados</span></div><div><strong>{records.filter(record => record.active !== false).length}</strong><span>Activos</span></div><div><strong>{new Set(records.flatMap(record => record.serviceAreas || [])).size}</strong><span>Áreas vinculadas</span></div><div><strong>{records.filter(record => record.studyYear === '4').length}</strong><span>En 4º año</span></div></div>
    {tab === 'list' && <Card>{editing ? <IbrpForm initialData={editing} onSave={save} onCancel={() => setEditing(null)} /> : <><div className="ibrp-toolbar"><div className="ibrp-search"><Search size={15} /><input placeholder="Buscar por apellido, nombre o DNI..." value={search} onChange={event => setSearch(event.target.value)} /></div><span>{filtered.length} asignados</span></div>{loading ? <p className="ibrp-empty">Cargando...</p> : filtered.length === 0 ? <EmptyState icon={GraduationCap} title="Sin asignados IBRP" message="Registrá el primer asignado para comenzar." /> : <div className="ibrp-table-wrap"><table className="ibrp-table"><thead><tr><th>Apellido y nombre</th><th>DNI</th><th>Año</th><th>Discipulado</th><th>Bautismo</th><th>Estado</th><th /></tr></thead><tbody>{filtered.map(record => <tr key={record.id}><td data-label="Asignado"><strong>{record.lastName}, {record.firstName}</strong><small>{record.previousChurch || 'Sin iglesia de procedencia'}</small></td><td data-label="DNI">{record.dni}</td><td data-label="Año">{record.studyYear}º {record.studyYear === '4' ? record.fourthTrack : ''}</td><td data-label="Discipulado">{record.discipleship}</td><td data-label="Bautismo">{record.baptized}</td><td data-label="Estado"><span className={`ibrp-status ${record.active === false ? 'inactive' : ''}`}>{record.active === false ? 'Inactivo' : 'Activo'}</span></td><td className="ibrp-actions"><div className="ibrp-action-menu"><button className="ibrp-more-button" onClick={() => setOpenActionId(openActionId === record.id ? null : record.id)} aria-label="Acciones">⋮</button>{openActionId === record.id && <div className="ibrp-action-popover"><button onClick={() => { setProfileRecord(record); setOpenActionId(null); }}>Ver perfil</button><button onClick={() => { setEditing(record); setOpenActionId(null); }}>Editar</button><button onClick={() => { changeStatus(record); setOpenActionId(null); }}>{record.active === false ? 'Reactivar' : 'Dar de baja'}</button><button className="danger" onClick={() => { remove(record); setOpenActionId(null); }}>Eliminar</button></div>}</div></td></tr>)}</tbody></table></div>}</>}</Card>}
    {tab === 'report' && <Card><div className="ibrp-report-heading"><div><p className="ibrp-eyebrow">Uso interno de encargados</p><h2>Reporte de desempeño</h2><p>Esta información no está disponible para los asignados.</p></div><strong className="ibrp-total"><BookOpen size={18} /> {reportRecords.length} asignados</strong></div><div className="ibrp-evaluation-selectors"><label>Asignado<select value={selectedAssignedId} onChange={event => { setSelectedAssignedId(event.target.value); setSelectedArea(''); }}>{<option value="">Seleccionar asignado...</option>}{reportRecords.map(record => <option key={record.id} value={record.id}>{record.lastName}, {record.firstName}</option>)}</select></label><label>Área a evaluar<select value={selectedArea} onChange={event => setSelectedArea(event.target.value)}><option value="">Seleccionar área...</option>{(selectedAssigned?.serviceAreas || []).filter(area => allowedAreas.includes(area)).map(area => <option key={area} value={area}>{area}</option>)}</select></label></div>{selectedAssigned && selectedArea && <div className="ibrp-wheel-evaluation"><div><p className="ibrp-eyebrow">{selectedArea}</p><h3>Rueda de vida del desempeño</h3><RadarChart dimensions={EVALUATION_DIMENSIONS} values={evaluationValues} size={320} /></div><div className="ibrp-wheel-controls">{EVALUATION_DIMENSIONS.map(dimension => <label key={dimension.key}>{dimension.label}<input type="range" min="0" max="10" value={evaluationValues[dimension.key]} onChange={event => setEvaluationValues(prev => ({ ...prev, [dimension.key]: Number(event.target.value) }))} /><span>{evaluationValues[dimension.key]}/10</span></label>)}<textarea value={evaluationNotes} onChange={event => setEvaluationNotes(event.target.value)} placeholder="Observaciones privadas del área..." /><Button onClick={saveEvaluation} disabled={savingEvaluation}>{savingEvaluation ? 'Guardando...' : 'Guardar evaluación'}</Button></div></div>}<div className="ibrp-report-grid"><div><h3>Por año de cursada</h3>{report.byYear.map(item => <div className="ibrp-report-row" key={item.year}><span>{item.year}º año</span><b>{item.count}</b></div>)}</div><div><h3>Estado de desempeño</h3>{report.byStatus.length === 0 ? <p className="ibrp-empty">Sin evaluaciones cargadas.</p> : report.byStatus.map(item => <div className="ibrp-report-row" key={item.status}><span>{item.status}</span><b>{item.count}</b></div>)}</div></div><div className="ibrp-private-note"><CheckCircle2 size={16} /> Los datos de desempeño, puntaje y observaciones son privados para los encargados del área.</div></Card>}
   <Modal isOpen={Boolean(profileRecord)} onClose={() => setProfileRecord(null)} title="Perfil del asignado IBRP" size="md">{profileRecord && <div className="ibrp-profile-modal"><h2>{profileRecord.lastName}, {profileRecord.firstName}</h2><p>DNI: {profileRecord.dni} · {profileRecord.studyYear}º año {profileRecord.fourthTrack ? `· ${profileRecord.fourthTrack}` : ''}</p><div className="ibrp-profile-facts"><span><strong>Discipulado</strong>{profileRecord.discipleship}</span><span><strong>Bautismo</strong>{profileRecord.baptized}</span><span><strong>Iglesia de procedencia</strong>{profileRecord.previousChurch || 'Sin dato'}</span><span><strong>Áreas de servicio</strong>{(profileRecord.serviceAreas || []).join(', ') || 'Sin áreas'}</span></div></div>}</Modal>
   </div>;
}
