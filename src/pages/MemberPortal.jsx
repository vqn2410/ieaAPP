import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { User, Mail, Phone, MapPin, BookOpen, Users, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMembers, updateMember } from '../services/memberService';
import { getGroups } from '../services/groupService';
import { getArray } from '../utils/helpers';
import './MemberPortal.css';

const initialAvatar = (firstName, lastName) => {
  const f = (firstName || '?')[0];
  const l = (lastName || '?')[0];
  return `${f}${l}`;
};

const MemberPortal = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [member, setMember] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [members, gs] = await Promise.all([getMembers(), getGroups()]);
      if (!mounted) return;
      setGroups(gs);
      const me = members.find(m =>
        m.email && currentUser?.email &&
        m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase()
      );
      if (me) {
        setMember(me);
        setFormData({ phone: me.phone || '', address: me.address || '' });
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [currentUser]);

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    await updateMember(member.id, { phone: formData.phone, address: formData.address });
    setMember(prev => ({ ...prev, phone: formData.phone, address: formData.address }));
    setSaving(false);
    setEditing(false);
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
      <div className="portal-header">
        <h1>Mi Perfil</h1>
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
                  <div key={g.id} className="portal-group-item" onClick={() => navigate('/dashboard/crecimiento')}>
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
    </div>
  );
};

export default MemberPortal;
