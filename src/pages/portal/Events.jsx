import React, { useEffect, useState } from 'react';
import { Calendar as CalIcon, Check, ClipboardList, Edit, ListOrdered, MapPin, Plus, Search, Trash2, UserPlus, Users } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';
import { useCampus } from '../../context/CampusContext';
import { createEvent, deleteEvent, getEventAttendance, getEventRegistrations, getEventVolunteers, getEvents, setEventAttendance, setEventRegistration, setEventVolunteer, updateEvent } from '../../services/eventService';
import { getMembers } from '../../services/memberService';
import { getAssignedGroups } from '../../services/assignedGroupService';
import './Events.css';

const emptyEvent = { title: '', date: '', time: '', location: '', description: '', registrationFields: [] };
const fieldTypes = ['text', 'select', 'textarea'];

const Events = () => {
  const { hasRole } = useAuth();
  const { activeCampusId } = useCampus();
  const canManage = hasRole(['Admin', 'Pastor']);
  const canCheckIn = hasRole(['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator']);
  const isGlobalManager = hasRole(['Admin', 'Pastor']);
  const isCampusManager = hasRole(['CampusAdmin']);
  const isGroupLeader = hasRole(['MinistryLeader', 'Facilitator', 'CoFacilitator']);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyEvent);
  const [checkinEvent, setCheckinEvent] = useState(null);
  const [checkinMembers, setCheckinMembers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [checkinSearch, setCheckinSearch] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [qrEvent, setQrEvent] = useState(null);
  const [registrationEvent, setRegistrationEvent] = useState(null);
  const [registrationMembers, setRegistrationMembers] = useState([]);
  const [registrations, setRegistrations] = useState({});
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [volunteerEvent, setVolunteerEvent] = useState(null);
  const [volunteerMembers, setVolunteerMembers] = useState([]);
  const [volunteers, setVolunteers] = useState({});
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [volunteerLoading, setVolunteerLoading] = useState(false);
  const [planEvent, setPlanEvent] = useState(null);
  const [planItems, setPlanItems] = useState([]);
  const [planForm, setPlanForm] = useState({ title: '', responsible: '', minutes: '' });

  const getRosterMembers = async () => {
    if (isGlobalManager) return getMembers();
    if (isCampusManager) return getMembers(null, activeCampusId || null);
    if (isGroupLeader) {
      const assigned = await getAssignedGroups();
      return assigned.members || [];
    }
    throw new Error('Tu rol no tiene acceso al listado de asistentes.');
  };

  const load = async () => {
    setLoading(true);
    const data = await getEvents();
    setEvents(data);
    setLoading(false);

    const checkinId = new URLSearchParams(window.location.search).get('checkin');
    const target = data.find(event => event.id === checkinId);
    if (checkinId && target && canCheckIn) {
      await openCheckin(target);
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  // Sincronización inicial con la fuente remota de eventos.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyEvent);
    setShowForm(true);
  };

  const openEdit = event => {
    setEditing(event);
    setForm({ title: event.title || '', date: event.date || '', time: event.time || '', location: event.location || '', description: event.description || '', registrationFields: Array.isArray(event.registrationFields) ? event.registrationFields : [] });
    setShowForm(true);
  };

  const updateRegistrationField = (index, changes) => {
    setForm(previous => ({ ...previous, registrationFields: previous.registrationFields.map((field, fieldIndex) => fieldIndex === index ? { ...field, ...changes } : field) }));
  };

  const addRegistrationField = () => {
    setForm(previous => ({ ...previous, registrationFields: [...previous.registrationFields, { label: '', type: 'text', required: false }] }));
  };

  const removeRegistrationField = index => {
    setForm(previous => ({ ...previous, registrationFields: previous.registrationFields.filter((_, fieldIndex) => fieldIndex !== index) }));
  };

  const save = async () => {
    if (!form.title.trim() || !form.date) return;
    const registrationFields = form.registrationFields
      .filter(field => field.label.trim() && fieldTypes.includes(field.type))
      .map(field => ({
        label: field.label.trim(),
        type: field.type,
        required: field.required === true,
        ...(field.type === 'select' ? { options: (field.options || []).map(option => option.trim()).filter(Boolean) } : {}),
      }));
    const data = { ...form, title: form.title.trim(), location: form.location.trim(), description: form.description.trim(), registrationFields };
    if (editing) await updateEvent(editing.id, data);
    else await createEvent(data);
    setShowForm(false);
    await load();
  };

  const remove = async event => {
    if (!window.confirm(`¿Eliminar "${event.title}"?`)) return;
    await deleteEvent(event.id);
    load();
  };

  const openCheckin = async event => {
    setCheckinEvent(event);
    setCheckinSearch('');
    setCheckinLoading(true);
    try {
      const [members, records] = await Promise.all([getRosterMembers(), getEventAttendance(event.id)]);
      setCheckinMembers(members);
      setAttendance(Object.fromEntries(records.map(record => [record.memberId, record.present === true])));
    } finally {
      setCheckinLoading(false);
    }
  };

  const toggleAttendance = async memberId => {
    const present = !attendance[memberId];
    setAttendance(previous => ({ ...previous, [memberId]: present }));
    try {
      await setEventAttendance(checkinEvent.id, memberId, present);
    } catch (error) {
      setAttendance(previous => ({ ...previous, [memberId]: !present }));
      throw error;
    }
  };

  const openRegistration = async event => {
    setRegistrationEvent(event);
    setRegistrationSearch('');
    setRegistrationLoading(true);
    try {
      const [members, records] = await Promise.all([getRosterMembers(), getEventRegistrations(event.id)]);
      setRegistrationMembers(members);
      setRegistrations(Object.fromEntries(records.map(record => [record.memberId, record.registered === true])));
    } finally {
      setRegistrationLoading(false);
    }
  };

  const toggleRegistration = async memberId => {
    const registered = !registrations[memberId];
    setRegistrations(previous => ({ ...previous, [memberId]: registered }));
    try {
      await setEventRegistration(registrationEvent.id, memberId, registered);
    } catch (error) {
      setRegistrations(previous => ({ ...previous, [memberId]: !registered }));
      throw error;
    }
  };

  const openVolunteers = async event => {
    setVolunteerEvent(event);
    setVolunteerSearch('');
    setVolunteerLoading(true);
    try {
      const [members, records] = await Promise.all([getRosterMembers(), getEventVolunteers(event.id)]);
      setVolunteerMembers(members);
      setVolunteers(Object.fromEntries(records.filter(record => record.assigned !== false).map(record => [record.memberId, record.role || 'Voluntario'])));
    } finally {
      setVolunteerLoading(false);
    }
  };

  const toggleVolunteer = async memberId => {
    const assigned = !volunteers[memberId];
    const role = volunteers[memberId] || 'Voluntario';
    setVolunteers(previous => {
      const next = { ...previous };
      if (assigned) next[memberId] = role;
      else delete next[memberId];
      return next;
    });
    await setEventVolunteer(volunteerEvent.id, memberId, role, assigned);
  };

  const openPlan = event => {
    setPlanEvent(event);
    setPlanItems(Array.isArray(event.plan) ? event.plan : []);
    setPlanForm({ title: '', responsible: '', minutes: '' });
  };

  const addPlanItem = () => {
    if (!planForm.title.trim()) return;
    setPlanItems(previous => [...previous, {
      id: `${Date.now()}-${Math.random()}`,
      title: planForm.title.trim(),
      responsible: planForm.responsible.trim(),
      minutes: Number(planForm.minutes) || 0,
    }]);
    setPlanForm({ title: '', responsible: '', minutes: '' });
  };

  const savePlan = async () => {
    await updateEvent(planEvent.id, { plan: planItems });
    setPlanEvent(null);
    await load();
  };

  const orderedEvents = [...events].sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const visibleCheckinMembers = checkinMembers.filter(member => {
    const query = checkinSearch.trim().toLowerCase();
    return !query || `${member.firstName || ''} ${member.lastName || ''} ${member.dni || ''}`.toLowerCase().includes(query);
  });
  const visibleRegistrationMembers = registrationMembers.filter(member => {
    const query = registrationSearch.trim().toLowerCase();
    return !query || `${member.firstName || ''} ${member.lastName || ''} ${member.dni || ''}`.toLowerCase().includes(query);
  });
  const visibleVolunteerMembers = volunteerMembers.filter(member => {
    const query = volunteerSearch.trim().toLowerCase();
    return !query || `${member.firstName || ''} ${member.lastName || ''} ${member.dni || ''}`.toLowerCase().includes(query);
  });

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-between align-center mb-4">
        <div><p className="eyebrow">Agenda IEA</p><h1>Calendario de Actividades</h1></div>
        {canManage && <Button icon={<Plus size={16} />} onClick={openCreate}>Nuevo evento</Button>}
      </div>
       {loading ? <Card><p>Cargando eventos...</p></Card> : orderedEvents.length === 0 ? <Card><div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}><CalIcon size={48} style={{ marginBottom: '1rem', color: 'var(--color-primary)' }} /><h3>No hay eventos próximos registrados</h3><p>Creá la primera actividad para comenzar la agenda.</p></div></Card> : <div className="d-grid gap-3">{orderedEvents.map(event => <Card key={event.id}><div className="d-flex justify-between align-center gap-3"><div><h2 style={{ margin: 0 }}>{event.title}</h2><p style={{ color: 'var(--color-text-muted)' }}>{event.date}{event.time ? ` · ${event.time}` : ''}{event.location ? <><br /><MapPin size={14} /> {event.location}</> : null}</p>{event.description && <p>{event.description}</p>}</div><div className="d-flex gap-2">{canManage && <Button variant="outline" size="sm" icon={<ListOrdered size={14} />} onClick={() => openPlan(event)}>Plan</Button>}{canCheckIn && <><Button variant="outline" size="sm" icon={<UserPlus size={14} />} onClick={() => openVolunteers(event)}>Voluntarios</Button><Button variant="outline" size="sm" icon={<ClipboardList size={14} />} onClick={() => openRegistration(event)}>RSVP</Button><Button variant="outline" size="sm" icon={<Check size={14} />} onClick={() => openCheckin(event)}>Check-in</Button></>}<Button variant="outline" size="sm" onClick={() => setQrEvent(event)}>QR</Button>{canManage && <><Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => openEdit(event)} aria-label="Editar evento" /><Button variant="outline" size="sm" icon={<Trash2 size={14} />} onClick={() => remove(event)} aria-label="Eliminar evento" /></>}</div></div></Card>)}</div>}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Editar evento' : 'Nuevo evento'}>
        <form onSubmit={event => { event.preventDefault(); save(); }} style={{ display: 'grid', gap: '1rem' }}>
          <label>Título<input className="form-input" required value={form.title} onChange={event => setForm(prev => ({ ...prev, title: event.target.value }))} /></label>
          <div className="d-grid grid-cols-2 gap-3"><label>Fecha<input className="form-input" required type="date" value={form.date} onChange={event => setForm(prev => ({ ...prev, date: event.target.value }))} /></label><label>Hora<input className="form-input" type="time" value={form.time} onChange={event => setForm(prev => ({ ...prev, time: event.target.value }))} /></label></div>
          <label>Ubicación<input className="form-input" value={form.location} onChange={event => setForm(prev => ({ ...prev, location: event.target.value }))} /></label>
           <label>Descripción<textarea className="form-input" rows="3" value={form.description} onChange={event => setForm(prev => ({ ...prev, description: event.target.value }))} /></label>
           <div style={{ display: 'grid', gap: '.75rem' }}>
             <div className="d-flex justify-between align-center"><strong>Campos de inscripción</strong><Button type="button" variant="outline" size="sm" onClick={addRegistrationField}>Agregar campo</Button></div>
             {form.registrationFields.map((field, index) => <div key={index} style={{ display: 'grid', gap: '.5rem', padding: '.75rem', border: '1px solid var(--color-border)', borderRadius: '.5rem' }}>
               <div className="d-flex gap-2 align-center"><input className="form-input" placeholder="Etiqueta del campo" value={field.label} onChange={event => updateRegistrationField(index, { label: event.target.value })} /><select className="form-input" value={field.type} onChange={event => updateRegistrationField(index, { type: event.target.value })}><option value="text">Texto</option><option value="select">Selección</option><option value="textarea">Texto largo</option></select><Button type="button" variant="outline" size="sm" onClick={() => removeRegistrationField(index)} aria-label="Quitar campo">×</Button></div>
               {field.type === 'select' && <input className="form-input" placeholder="Opciones separadas por coma" value={(field.options || []).join(', ')} onChange={event => updateRegistrationField(index, { options: event.target.value.split(',') })} />}
               <label className="d-flex align-center gap-2"><input type="checkbox" checked={field.required === true} onChange={event => updateRegistrationField(index, { required: event.target.checked })} /> Obligatorio</label>
             </div>)}
             {form.registrationFields.length === 0 && <small style={{ color: 'var(--color-text-muted)' }}>Opcional. Los miembros podrán confirmar directamente si no agregás campos.</small>}
           </div>
           <div className="d-flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button><Button type="submit">Guardar</Button></div>
        </form>
      </Modal>
      <Modal isOpen={Boolean(checkinEvent)} onClose={() => setCheckinEvent(null)} title={checkinEvent ? `Check-in · ${checkinEvent.title}` : 'Check-in'}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="d-flex align-center gap-2"><Search size={16} /><input className="form-input" placeholder="Buscar miembro..." value={checkinSearch} onChange={event => setCheckinSearch(event.target.value)} /></div>
          {checkinLoading ? <p>Cargando miembros...</p> : visibleCheckinMembers.length === 0 ? <p>No se encontraron miembros.</p> : <div style={{ display: 'grid', gap: '.45rem', maxHeight: '55vh', overflowY: 'auto' }}>{visibleCheckinMembers.map(member => <button type="button" key={member.id} className={`event-checkin-member ${attendance[member.id] ? 'is-present' : ''}`} onClick={() => toggleAttendance(member.id)}><span><strong>{member.lastName}, {member.firstName}</strong><small>{member.dni || member.email || 'Sin identificador'}</small></span><span>{attendance[member.id] ? <Check size={18} /> : <Users size={18} />}</span></button>)}</div>}
        </div>
      </Modal>
      <Modal isOpen={Boolean(qrEvent)} onClose={() => setQrEvent(null)} title={qrEvent ? `QR · ${qrEvent.title}` : 'QR del evento'}>
        {qrEvent && <div style={{ display: 'grid', justifyItems: 'center', gap: '1rem', textAlign: 'center' }}><img src={`https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(`${window.location.origin}/dashboard/eventos?checkin=${qrEvent.id}`)}`} alt={`QR para ${qrEvent.title}`} /><p style={{ color: 'var(--color-text-muted)' }}>Escaneá este código para abrir el portal y tomar asistencia.</p></div>}
      </Modal>
      <Modal isOpen={Boolean(registrationEvent)} onClose={() => setRegistrationEvent(null)} title={registrationEvent ? `RSVP · ${registrationEvent.title}` : 'Inscripciones'}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="d-flex align-center gap-2"><Search size={16} /><input className="form-input" placeholder="Buscar miembro..." value={registrationSearch} onChange={event => setRegistrationSearch(event.target.value)} /></div>
          {registrationLoading ? <p>Cargando miembros...</p> : visibleRegistrationMembers.length === 0 ? <p>No se encontraron miembros.</p> : <div style={{ display: 'grid', gap: '.45rem', maxHeight: '55vh', overflowY: 'auto' }}>{visibleRegistrationMembers.map(member => <button type="button" key={member.id} className={`event-checkin-member ${registrations[member.id] ? 'is-present' : ''}`} onClick={() => toggleRegistration(member.id)}><span><strong>{member.lastName}, {member.firstName}</strong><small>{member.dni || member.email || 'Sin identificador'}</small></span><span>{registrations[member.id] ? <Check size={18} /> : <ClipboardList size={18} />}</span></button>)}</div>}
        </div>
      </Modal>
      <Modal isOpen={Boolean(volunteerEvent)} onClose={() => setVolunteerEvent(null)} title={volunteerEvent ? `Voluntarios · ${volunteerEvent.title}` : 'Voluntarios'}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div className="d-flex align-center gap-2"><Search size={16} /><input className="form-input" placeholder="Buscar miembro..." value={volunteerSearch} onChange={event => setVolunteerSearch(event.target.value)} /></div>
          {volunteerLoading ? <p>Cargando miembros...</p> : visibleVolunteerMembers.length === 0 ? <p>No se encontraron miembros.</p> : <div style={{ display: 'grid', gap: '.45rem', maxHeight: '55vh', overflowY: 'auto' }}>{visibleVolunteerMembers.map(member => <button type="button" key={member.id} className={`event-checkin-member ${volunteers[member.id] ? 'is-present' : ''}`} onClick={() => toggleVolunteer(member.id)}><span><strong>{member.lastName}, {member.firstName}</strong><small>{volunteers[member.id] || 'Sin asignar'}</small></span><span>{volunteers[member.id] ? <Check size={18} /> : <UserPlus size={18} />}</span></button>)}</div>}
        </div>
      </Modal>
      <Modal isOpen={Boolean(planEvent)} onClose={() => setPlanEvent(null)} title={planEvent ? `Plan de reunión · ${planEvent.title}` : 'Plan de reunión'}>
        <div style={{ display: 'grid', gap: '1rem' }}>
          {planItems.length > 0 && <div style={{ display: 'grid', gap: '.45rem' }}>{planItems.map((item, index) => <div className="event-plan-item" key={item.id}><strong>{index + 1}. {item.title}</strong><span>{item.responsible || 'Sin responsable'}{item.minutes ? ` · ${item.minutes} min` : ''}</span><button type="button" onClick={() => setPlanItems(previous => previous.filter(planItem => planItem.id !== item.id))} aria-label="Quitar bloque">×</button></div>)}</div>}
          <div className="d-grid grid-cols-2 gap-3"><label>Bloque<input className="form-input" value={planForm.title} onChange={event => setPlanForm(previous => ({ ...previous, title: event.target.value }))} placeholder="Bienvenida, música, mensaje..." /></label><label>Responsable<input className="form-input" value={planForm.responsible} onChange={event => setPlanForm(previous => ({ ...previous, responsible: event.target.value }))} placeholder="Nombre o equipo" /></label></div>
          <div className="d-flex gap-2"><input className="form-input" type="number" min="0" value={planForm.minutes} onChange={event => setPlanForm(previous => ({ ...previous, minutes: event.target.value }))} placeholder="Minutos" /><Button type="button" variant="outline" onClick={addPlanItem}>Agregar bloque</Button></div>
          <div className="d-flex justify-end"><Button onClick={savePlan}>Guardar plan</Button></div>
        </div>
      </Modal>
    </div>
  );
};

export default Events;
