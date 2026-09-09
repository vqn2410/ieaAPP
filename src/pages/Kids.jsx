import React, { useEffect, useMemo, useState } from 'react';
import { Baby, Cake, Check, ClipboardCheck, Edit, FileBarChart, HeartHandshake, Plus, Search, Trash2, Users } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import { createKid, deleteKid, getKids, getKidsAttendance, saveKidsAttendance, updateKid } from '../services/kidService';
import { normalizeString } from '../utils/helpers';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Kids.css';

const ROOMS = ['Sala 4 a 6', 'Sala 7 a 9', 'Sala 10 a 12'];
const emptyKid = { firstName: '', lastName: '', birthDate: '', room: '', guardianName: '', guardianPhone: '', group: '', notes: '', followUpNotes: '' };
const AGE_GROUPS = [
  { id: '4-6', label: '4 a 6 años', min: 4, max: 6 },
  { id: '7-9', label: '7 a 9 años', min: 7, max: 9 },
  { id: '10-12', label: '10 a 12 años', min: 10, max: 12 },
];
const tabs = [
  { id: 'list', label: 'Listado de niños', icon: Users },
  { id: 'followUp', label: 'Seguimiento', icon: HeartHandshake },
  { id: 'birthdays', label: 'Cumpleaños', icon: Cake },
  { id: 'attendance', label: 'Tomar lista', icon: ClipboardCheck },
  { id: 'reports', label: 'Reportes', icon: FileBarChart },
];

const birthdayParts = (kid) => {
  const value = kid.birthDate;
  if (!value) return null;
  if (typeof value === 'string') {
    const iso = value.match(/^\d{4}[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return { month: Number(iso[1]), day: Number(iso[2]) };
    const local = value.match(/^(\d{1,2})[-/](\d{1,2})/);
    if (local) return { month: Number(local[2]), day: Number(local[1]) };
  }
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : { month: date.getMonth() + 1, day: date.getDate() };
};

const dateValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};

const isoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const date = dateValue(value);
  return date ? new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : 'Sin fecha';
};

const getAge = (value) => {
  const date = dateValue(value);
  if (!date) return null;
  const birth = new Date(`${date}T12:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const getAgeGroup = (kid) => {
  const age = getAge(kid.birthDate);
  return AGE_GROUPS.find(group => age >= group.min && age <= group.max) || null;
};

function KidForm({ initialKid, onSave, onCancel }) {
  const [form, setForm] = useState({ ...emptyKid, ...initialKid, birthDate: dateValue(initialKid?.birthDate) });
  const change = (event) => setForm(prev => ({ ...prev, [event.target.name]: event.target.value }));
  return <form className="kids-form" onSubmit={event => { event.preventDefault(); onSave(form); }}>
    <div className="kids-form-grid">
      <label>Nombre<input required name="firstName" value={form.firstName} onChange={change} /></label>
      <label>Apellido<input required name="lastName" value={form.lastName} onChange={change} /></label>
      <label>Fecha de nacimiento<input type="date" name="birthDate" value={form.birthDate} onChange={change} /></label>
      <label>Sala / agrupamiento<select name="room" value={form.room} onChange={change}><option value="">Sin asignar</option>{ROOMS.map(room => <option key={room} value={room}>{room}</option>)}</select></label>
      <label>Adulto responsable<input name="guardianName" value={form.guardianName} onChange={change} /></label>
      <label>Teléfono del responsable<input name="guardianPhone" value={form.guardianPhone} onChange={change} /></label>
      <label className="kids-form-wide">Notas<input name="notes" value={form.notes} onChange={change} /></label>
    </div>
    <div className="kids-form-actions"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit">Guardar niño</Button></div>
  </form>;
}

export default function Kids() {
  const [kids, setKids] = useState([]);
  const [tab, setTab] = useState('list');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState({});
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendanceRoom, setAttendanceRoom] = useState('');
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [report, setReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportRoom, setReportRoom] = useState('');

  const load = async () => { setLoading(true); try { setKids(await getKids()); } catch (error) { console.error('Error cargando Kids', error); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const filteredKids = useMemo(() => {
    const query = normalizeString(search).toLowerCase();
    return [...kids].sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)).filter(kid => !query || normalizeString(`${kid.firstName} ${kid.lastName} ${kid.guardianName}`).toLowerCase().includes(query));
  }, [kids, search]);
  const birthdays = kids.filter(kid => birthdayParts(kid)?.month === new Date().getMonth() + 1).sort((a, b) => birthdayParts(a).day - birthdayParts(b).day);
  const followUps = kids.filter(kid => kid.followUpStatus !== 'completed');
  const groupedKids = AGE_GROUPS.map(group => ({ ...group, kids: filteredKids.filter(kid => getAgeGroup(kid)?.id === group.id) })).filter(group => group.kids.length > 0);
  const ungroupedKids = filteredKids.filter(kid => !getAgeGroup(kid));

  const saveKid = async (data) => { try { if (editing?.id) await updateKid(editing.id, data); else await createKid(data); setEditing(null); await load(); } catch (error) { console.error('Error guardando niño', error); } };
  const removeKid = async (kid) => { if (window.confirm(`¿Eliminar a ${kid.firstName} ${kid.lastName}?`)) { await deleteKid(kid.id); load(); } };
  const toggleAttendance = (id) => setAttendance(prev => ({ ...prev, [id]: !prev[id] }));
  const kidsForAttendance = kids.filter(kid => !attendanceRoom || kid.room === attendanceRoom);
  const saveAttendance = async () => { setSavingAttendance(true); try { const visibleIds = new Set(kidsForAttendance.map(kid => kid.id)); await saveKidsAttendance(attendanceDate, attendanceRoom, Object.entries(attendance).filter(([kidId, present]) => present && visibleIds.has(kidId)).map(([kidId]) => kidId)); } finally { setSavingAttendance(false); } };

  const getReportRange = () => {
    const end = new Date();
    let start;
    if (reportPeriod === 'monthly') start = new Date(end.getFullYear(), end.getMonth(), 1);
    if (reportPeriod === 'quarterly') start = new Date(end.getFullYear(), Math.floor(end.getMonth() / 3) * 3, 1);
    if (reportPeriod === 'semester') start = new Date(end.getFullYear(), end.getMonth() < 6 ? 0 : 6, 1);
    if (reportPeriod === 'annual') start = new Date(end.getFullYear(), 0, 1);
    const iso = date => isoDate(date);
    return { start: iso(start), end: iso(end) };
  };

  const loadReport = async () => {
    setLoadingReport(true);
    try {
      const range = getReportRange();
      const attendanceRecords = (await getKidsAttendance(range.start, range.end)).filter(record => !reportRoom || record.room === reportRoom);
      const reportKids = kids.filter(kid => !reportRoom || kid.room === reportRoom);
      const attendanceMap = {};
      reportKids.forEach(kid => { attendanceMap[kid.id] = { kid, present: 0 }; });
      attendanceRecords.forEach(record => (record.records || []).forEach(kidId => { if (attendanceMap[kidId]) attendanceMap[kidId].present += 1; }));
      setReport({ ...range, meetings: attendanceRecords.length, rows: Object.values(attendanceMap).map(row => ({ ...row, rate: attendanceRecords.length ? Math.round((row.present / attendanceRecords.length) * 100) : 0 })).sort((a, b) => b.present - a.present || `${a.kid.lastName} ${a.kid.firstName}`.localeCompare(`${b.kid.lastName} ${b.kid.firstName}`)) });
    } catch (error) { console.error('Error generando reporte de Kids', error); }
    finally { setLoadingReport(false); }
  };

  const downloadReportPdf = () => {
    if (!report) return;
    const periodLabels = { monthly: 'Mensual', quarterly: 'Trimestral', semester: 'Semestral', annual: 'Anual' };
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text('IEA - Reporte de asistencia Kids', 14, 16);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(`Período: ${periodLabels[reportPeriod]} | ${report.start} al ${report.end}`, 14, 23);
    pdf.text(`Sala: ${reportRoom || 'Todas las salas'} | Reuniones registradas: ${report.meetings}`, 14, 29);
    autoTable(pdf, {
      startY: 36,
      head: [['Niño', 'Sala', 'Reuniones', 'Asistencias', 'Porcentaje']],
      body: report.rows.map(row => [`${row.kid.lastName}, ${row.kid.firstName}`, row.kid.room || '-', report.meetings, row.present, `${row.rate}%`]),
      headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 14, right: 14 },
    });
    pdf.save(`asistencia-kids-${report.start}-${report.end}.pdf`);
  };

  return <div className="kids-page animate-fade-in">
    <div className="kids-header"><div><p className="kids-eyebrow">Cuidado pastoral</p><h1>Kids</h1><p>Un espacio para acompañar, cuidar y registrar a los niños de IEA.</p></div><Button icon={<Plus size={16} />} onClick={() => { setEditing({}); setTab('list'); }}>Agregar niño</Button></div>
    <div className="kids-tabs">{tabs.map(({ id, label, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}><Icon size={16} />{label}{id === 'followUp' && followUps.length > 0 && <b>{followUps.length}</b>}</button>)}</div>

    {tab === 'list' && <Card>{editing ? <KidForm initialKid={editing} onSave={saveKid} onCancel={() => setEditing(null)} /> : <><div className="kids-toolbar"><div className="kids-search"><Search size={16} /><input placeholder="Buscar niño o adulto responsable..." value={search} onChange={event => setSearch(event.target.value)} /></div><span className="kids-count">{filteredKids.length} niños</span></div>{loading ? <p className="kids-empty">Cargando listado...</p> : filteredKids.length === 0 ? <EmptyState icon={Baby} title="Sin niños registrados" message="Agregá el primer niño de IEA para comenzar el seguimiento." /> : <div className="kids-groups">{groupedKids.map(group => <section className="kids-age-section" key={group.id}><div className="kids-age-heading"><span>{group.label}</span><b>{group.kids.length}</b></div><div className="kids-table-wrap"><table className="kids-table"><thead><tr><th>Niño</th><th>Edad</th><th>Cumpleaños</th><th>Adulto responsable</th><th>Grupo / sala</th><th /></tr></thead><tbody>{group.kids.map(kid => <tr key={kid.id}><td><strong>{kid.lastName}, {kid.firstName}</strong></td><td>{getAge(kid.birthDate)} años</td><td>{formatDate(kid.birthDate)}</td><td>{kid.guardianName || '-'}<small>{kid.guardianPhone}</small></td><td>{kid.group || '-'}</td><td className="kids-actions"><button onClick={() => setEditing(kid)} title="Editar"><Edit size={15} /></button><button onClick={() => removeKid(kid)} title="Eliminar"><Trash2 size={15} /></button></td></tr>)}</tbody></table></div></section>)}{ungroupedKids.length > 0 && <section className="kids-age-section"><div className="kids-age-heading muted"><span>Sin grupo etario (falta fecha o fuera de rango)</span><b>{ungroupedKids.length}</b></div></section>}</div>}</>}</Card>}
    {tab === 'followUp' && <Card><div className="kids-section-title"><div><p className="kids-eyebrow">Acompañamiento</p><h2>Seguimiento de niños</h2></div><span>{followUps.length} pendientes</span></div>{followUps.length === 0 ? <EmptyState icon={Check} title="Todo al día" message="No hay seguimientos pendientes." /> : <div className="kids-followup-list">{followUps.map(kid => <div className="kids-followup" key={kid.id}><span className="kids-avatar">{`${kid.firstName?.[0] || '?'}${kid.lastName?.[0] || '?'}`}</span><div><strong>{kid.firstName} {kid.lastName}</strong><small>{kid.followUpNotes || 'Sin notas de seguimiento'}</small></div><Button size="sm" variant="outline" onClick={() => setEditing(kid)}>Actualizar</Button></div>)}</div>}</Card>}
    {tab === 'birthdays' && <Card><div className="kids-section-title"><div><p className="kids-eyebrow">{new Date().toLocaleDateString('es-AR', { month: 'long' })}</p><h2>Cumpleaños de Kids</h2></div><Cake size={22} /></div>{birthdays.length === 0 ? <EmptyState icon={Cake} title="Sin cumpleaños este mes" message="Las fechas cargadas aparecerán aquí." /> : <div className="kids-birthday-grid">{birthdays.map(kid => <div className="kids-birthday" key={kid.id}><Cake size={18} /><strong>{kid.firstName} {kid.lastName}</strong><span>{formatDate(kid.birthDate)}</span></div>)}</div>}</Card>}
    {tab === 'attendance' && <Card><div className="kids-section-title"><div><p className="kids-eyebrow">Registro de reunión</p><h2>Tomar lista</h2></div><div className="kids-report-actions"><select value={attendanceRoom} onChange={event => setAttendanceRoom(event.target.value)}><option value="">Todas las salas</option>{ROOMS.map(room => <option key={room} value={room}>{room}</option>)}</select><label className="kids-date">Fecha<input type="date" value={attendanceDate} onChange={event => setAttendanceDate(event.target.value)} /></label></div></div>{kidsForAttendance.length === 0 ? <EmptyState icon={ClipboardCheck} title="Sin niños en esta sala" message="Asigná niños a una sala para tomar asistencia." /> : <><div className="kids-attendance-list">{kidsForAttendance.map(kid => <button className={`kids-attendance-row ${attendance[kid.id] ? 'present' : ''}`} key={kid.id} onClick={() => toggleAttendance(kid.id)}><span className="kids-avatar">{`${kid.firstName?.[0] || '?'}${kid.lastName?.[0] || '?'}`}</span><span><strong>{kid.firstName} {kid.lastName}</strong><small>{kid.room || 'Sin sala'}</small></span><span className="kids-check">{attendance[kid.id] && <Check size={15} />}</span></button>)}</div><Button onClick={saveAttendance} disabled={savingAttendance}>{savingAttendance ? 'Guardando...' : 'Guardar asistencia'}</Button></>}</Card>}
    {tab === 'reports' && <Card><div className="kids-section-title"><div><p className="kids-eyebrow">Asistencia</p><h2>Reportes de Kids</h2></div><div className="kids-report-actions"><select value={reportRoom} onChange={event => { setReportRoom(event.target.value); setReport(null); }}><option value="">Todas las salas</option>{ROOMS.map(room => <option key={room} value={room}>{room}</option>)}</select><select value={reportPeriod} onChange={event => { setReportPeriod(event.target.value); setReport(null); }}><option value="monthly">Mensual</option><option value="quarterly">Trimestral</option><option value="semester">Semestral</option><option value="annual">Anual</option></select><Button size="sm" onClick={loadReport}>{loadingReport ? 'Generando...' : 'Generar reporte'}</Button></div></div>{!report ? <EmptyState icon={FileBarChart} title="Elegí un período y una sala" message="Generá un reporte para ver la asistencia de los niños." /> : <><div className="kids-report-summary"><div><strong>{report.meetings}</strong><span>Reuniones registradas</span></div><div><strong>{report.rows.reduce((sum, row) => sum + row.present, 0)}</strong><span>Asistencias acumuladas</span></div><div><strong>{report.rows.length ? Math.round(report.rows.reduce((sum, row) => sum + row.rate, 0) / report.rows.length) : 0}%</strong><span>Promedio del período</span></div></div><div className="kids-table-wrap"><table className="kids-table"><thead><tr><th>Niño</th><th>Sala</th><th>Reuniones</th><th>Asistencias</th><th>Porcentaje</th></tr></thead><tbody>{report.rows.map(row => <tr key={row.kid.id}><td><strong>{row.kid.lastName}, {row.kid.firstName}</strong></td><td>{row.kid.room || '-'}</td><td>{report.meetings}</td><td>{row.present}</td><td><strong>{row.rate}%</strong></td></tr>)}</tbody></table></div><Button variant="outline" size="sm" onClick={downloadReportPdf}>Descargar PDF</Button></>}</Card>}
  </div>;
}
