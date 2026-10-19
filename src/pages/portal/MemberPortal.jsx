import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { CalendarDays, User, Mail, Phone, MapPin, BookOpen, Users, Save, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCampus } from '../../context/CampusContext';
import { getMemberByEmail, updateMember } from '../../services/memberService';
import { getGroups } from '../../services/groupService';
import { getAssignedGroups } from '../../services/assignedGroupService';
import { getEvents, setEventRegistration } from '../../services/eventService';
import { getArray } from '../../utils/helpers';
import './MemberPortal.css';

const initialAvatar = (firstName, lastName) => {
  const f = (firstName || '?')[0];
  const l = (lastName || '?')[0];
  return `${f}${l}`;
};

const MemberPortal = () => {
  const navigate = useNavigate();
  const { currentUser, hasRole, logout } = useAuth();
  const { activeCampusId, activeCampusSlug } = useCampus();
  const campusPrefix = `/${activeCampusSlug || 'sedecentral'}`;
  const [member, setMember] = useState(null);
  const [groups, setGroups] = useState([]);
  const [events, setEvents] = useState([]);
  const [rsvp, setRsvp] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ phone: '', address: '' });
  const [saving, setSaving] = useState(false);
  const [rsvpEvent, setRsvpEvent] = useState(null);
  const [rsvpData, setRsvpData] = useState({});
  const [rsvpSaving, setRsvpSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const canSeeAllGroups = hasRole(['Admin', 'Pastor']);
      const isCampusAdmin = hasRole(['CampusAdmin']);
      const isFacilitator = hasRole(['Facilitator', 'CoFacilitator']);
      let me;
      let gs;
      if (isFacilitator && !canSeeAllGroups) {
        const assigned = await getAssignedGroups();
        me = assigned.ownMember;
        gs = assigned.groups || [];
      } else {
        [me, gs] = await Promise.all([
          getMemberByEmail(currentUser?.email),
          canSeeAllGroups ? getGroups() : isCampusAdmin ? getGroups(activeCampusId || null) : Promise.resolve([]),
        ]);
      }
      const upcomingEvents = await getEvents();
      if (!mounted) return;
      setGroups(gs);
      setEvents(upcomingEvents.filter(event => event.date && event.date >= new Date().toISOString().slice(0, 10)).sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`)).slice(0, 5));
      if (me) {
        setMember(me);
        setFormData({ phone: me.phone || '', address: me.address || '' });
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [currentUser, hasRole, activeCampusId]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    await updateMember(member.id, { phone: formData.phone, address: formData.address });
    setMember(prev => ({ ...prev, phone: formData.phone, address: formData.address }));
    setSaving(false);
    setEditing(false);
  };

  const confirmRsvp = async (event, data = {}) => {
    if (!member) return;
    const registered = !rsvp[event.id];
    await setEventRegistration(event.id, member.id, registered, data);
    setRsvp(previous => ({ ...previous, [event.id]: registered }));
  };

  const toggleRsvp = async event => {
    if (rsvp[event.id]) {
      await confirmRsvp(event);
      return;
    }
    const fields = Array.isArray(event.registrationFields) ? event.registrationFields : [];
    if (fields.length === 0) {
      await confirmRsvp(event);
      return;
    }
    setRsvpEvent(event);
    setRsvpData({});
  };

  const submitRsvp = async submitEvent => {
    setRsvpSaving(true);
    try {
      await confirmRsvp(submitEvent, rsvpData);
      setRsvpEvent(null);
    } finally {
      setRsvpSaving(false);
    }
  };

  const myGroups = groups.filter(g => {
    if (!member) return false;
    const facils = getArray(g.facilitators);
    const coFacils = getArray(g.coFacilitators);
    const memberName = `${member.firstName} ${member.lastName}`.toLowerCase();
    return [...facils, ...coFacils].some(f => f.toLowerCase() === memberName);
  });

  if (loading) {
    return (
      <div className="portal">
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Cargando...</div>
        </Card>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="portal">
        <Card>
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <p>No se encontró tu perfil de miembro. Contactá al administrador.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="portal">
      <div className="portal-header d-flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Mi Perfil</h1>
        <Button
          variant="outline"
          size="sm"
          icon={<LogOut size={16} />}
          onClick={async () => {
            try {
              await logout();
              navigate('/login');
            } catch (err) {
              console.error('Error al cerrar sesión', err);
            }
          }}
          style={{ borderColor: 'rgba(244, 63, 94, 0.4)', color: 'var(--color-danger)' }}
        >
          Cerrar Sesión
        </Button>
      </div>

      <div className="portal-grid">
        <div className="portal-sidebar">
          <Card>
            <div className="portal-avatar-section">
              <div className="portal-avatar">{initialAvatar(member.firstName, member.lastName)}</div>
              <h2 className="portal-name">{member.firstName} {member.lastName}</h2>
              {member.group && <div className="portal-group-badge">{member.group}</div>}
            </div>
          </Card>

          <Card>
            <div className="portal-section-title">
              <User size={16} />
              <span>Información</span>
            </div>
            <div className="portal-info-list">
              <div className="portal-info-item">
                <Mail size={14} />
                <span>{member.email || '-'}</span>
              </div>
              <div className="portal-info-item">
                <Phone size={14} />
                <span>{member.phone || '-'}</span>
              </div>
              <div className="portal-info-item">
                <MapPin size={14} />
                <span>{member.address || '-'}</span>
              </div>
            </div>
            {editing ? (
              <div className="portal-edit-form">
                <input
                  className="form-input"
                  placeholder="Teléfono"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                />
                <input
                  className="form-input"
                  placeholder="Dirección"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
                <div className="d-flex gap-2">
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" size="sm" className="w-full" onClick={() => setEditing(true)}>
                <Save size={14} /> Editar datos
              </Button>
            )}
          </Card>

          {myGroups.length > 0 && (
            <Card>
              <div className="portal-section-title">
                <Users size={16} />
                <span>Mis grupos</span>
              </div>
              <div className="portal-groups-list">
                {myGroups.map(g => (
                  <div key={g.id} className="portal-group-item" onClick={() => navigate(`${campusPrefix}/grupos`)}>
                    <span>{g.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="portal-main">
          <Card>
            <div className="portal-section-title">
              <CalendarDays size={16} />
              <span>Próximas reuniones</span>
            </div>
            {events.length === 0 ? <p style={{ color: 'var(--color-text-muted)', fontSize: '.8125rem' }}>No hay reuniones próximas registradas.</p> : <div className="portal-events-list">{events.map(event => <div className="portal-event-item" key={event.id}><button type="button" className="portal-event-link" onClick={() => navigate(`${campusPrefix}/eventos`)}><span><strong>{event.title}</strong><small>{event.date}{event.time ? ` · ${event.time}` : ''}</small></span><CalendarDays size={15} /></button><Button size="sm" variant={rsvp[event.id] ? 'primary' : 'outline'} onClick={() => toggleRsvp(event)}>{rsvp[event.id] ? 'Anotado' : 'Me anoto'}</Button></div>)}</div>}
          </Card>
          <Card>
            <div className="portal-section-title">
              <BookOpen size={16} />
              <span>Mis caminos de crecimiento</span>
            </div>
            <div className="portal-paths">
              {member.growthPath && Object.entries(member.growthPath).length > 0 ? (
                Object.entries(member.growthPath).map(([path, data]) => (
                  <div key={path} className="portal-path-item">
                    <div className="portal-path-name">{path}</div>
                    <div className="portal-path-info">
                      <span className={`portal-path-status portal-path-${(data.status || '').toLowerCase().replace(/\s+/g, '-')}`}>
                        {data.status || 'Sin información'}
                      </span>
                      {data.year && <span className="portal-path-year">{data.year}</span>}
                      {data.modality && <span className="portal-path-modality">{data.modality}</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                  Sin caminos de crecimiento registrados.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
      <Modal isOpen={Boolean(rsvpEvent)} onClose={() => { if (!rsvpSaving) setRsvpEvent(null); }} title={rsvpEvent ? `Inscripción · ${rsvpEvent.title}` : 'Inscripción'}>
        {rsvpEvent && <form onSubmit={event => { event.preventDefault(); submitRsvp(rsvpEvent); }} style={{ display: 'grid', gap: '1rem' }}>
          {rsvpEvent.registrationFields.map((field, index) => <label key={`${field.label}-${index}`}>{field.label}{field.type === 'textarea' ? <textarea className="form-input" rows="3" required={field.required === true} value={rsvpData[field.label] || ''} onChange={event => setRsvpData(previous => ({ ...previous, [field.label]: event.target.value }))} /> : field.type === 'select' ? <select className="form-input" required={field.required === true} value={rsvpData[field.label] || ''} onChange={event => setRsvpData(previous => ({ ...previous, [field.label]: event.target.value }))}><option value="">Seleccioná una opción</option>{(field.options || []).map(option => <option key={option} value={option}>{option}</option>)}</select> : <input className="form-input" required={field.required === true} value={rsvpData[field.label] || ''} onChange={event => setRsvpData(previous => ({ ...previous, [field.label]: event.target.value }))} />}</label>)}
          <div className="d-flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setRsvpEvent(null)} disabled={rsvpSaving}>Cancelar</Button><Button type="submit" disabled={rsvpSaving}>{rsvpSaving ? 'Guardando...' : 'Confirmar inscripción'}</Button></div>
        </form>}
      </Modal>
    </div>
  );
};

export default MemberPortal;
