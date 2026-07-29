import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import MemberForm from '../components/members/MemberForm';
import { getMember, deleteMember, updateMember } from '../services/memberService';
import { getMembers } from '../services/memberService';
import { ArrowLeft, User, Phone, Mail, MapPin, Hash, Shield, BookOpen, Trash2, Edit, MessageSquare, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SkeletonCard } from '../components/common/Skeleton';
import { useSettings } from '../context/SettingsContext';
import { createFollowUp, getFollowUpsByMember, updateFollowUp, deleteFollowUp } from '../services/followUpService';
import './MemberProfile.css';

const initialAvatar = (firstName, lastName) => {
  const f = (firstName || '?')[0];
  const l = (lastName || '?')[0];
  return `${f}${l}`.toUpperCase();
};

const ProfileField = ({ icon: Icon, label, value }) => (
  <div className="profile-field">
    <div className="profile-field-icon">{Icon && <Icon size={16} strokeWidth={1.5} />}</div>
    <div className="profile-field-content">
      <span className="profile-field-label">{label}</span>
      <span className="profile-field-value">{value || <span className="profile-field-empty">-</span>}</span>
    </div>
  </div>
);

const MemberProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { settings } = useSettings();
  const [member, setMember] = useState(null);
  const [allMembers, setAllMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newGroup, setNewGroup] = useState('');
  const [followUps, setFollowUps] = useState([]);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpType, setFollowUpType] = useState('note');
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const canTransfer = ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'].includes(userData?.role);
  const isAdmin = userData?.role?.includes('Admin');

  useEffect(() => {
    const load = async () => {
      try {
        const [m, members, fups] = await Promise.all([getMember(id), getMembers(), getFollowUpsByMember(id)]);
        setMember(m);
        setNewGroup(m?.group || '');
        setAllMembers(members.filter(other => other.id !== id));
        setFollowUps(fups);
      } catch {
        navigate('/dashboard/miembros');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleTransfer = async (newGroupName) => {
    setNewGroup(newGroupName);
    await updateMember(id, { group: newGroupName });
    setMember(prev => ({ ...prev, group: newGroupName }));
  };

  const handleAutoAssign = async () => {
    if (!member?.email || !userData) return;
    const isAdminRole = userData.role.includes('Admin');
    const existingUser = allMembers.find(m =>
      m.email?.toLowerCase() === member.email.toLowerCase() && m.id !== id
    );
    if (existingUser && !isAdminRole) {
      alert('Ya existe un miembro con este email.');
      return;
    }
    await deleteMember(id);
    alert('Miembro eliminado correctamente.');
    navigate('/dashboard/miembros');
  };

  const handleDelete = async () => {
    if (!window.confirm('¿Seguro que deseas eliminar permanentemente a este miembro?')) return;
    await deleteMember(id);
    navigate('/dashboard/miembros');
  };

  const handleEditSuccess = async () => {
    setShowEditModal(false);
    const updated = await getMember(id);
    setMember(updated);
  };

  const handleAddFollowUp = async () => {
    if (!followUpText.trim()) return;
    await createFollowUp({
      memberId: id,
      type: followUpType,
      content: followUpText.trim(),
      status: 'pending',
      createdBy: userData?.email || 'unknown'
    });
    setFollowUpText('');
    setShowFollowUpForm(false);
    const updated = await getFollowUpsByMember(id);
    setFollowUps(updated);
  };

  const handleCompleteFollowUp = async (fup) => {
    await updateFollowUp(fup.id, { status: 'completed' });
    setFollowUps(prev => prev.map(f => f.id === fup.id ? { ...f, status: 'completed' } : f));
  };

  const handleDeleteFollowUp = async (fup) => {
    if (!window.confirm('¿Eliminar este registro?')) return;
    await deleteFollowUp(fup.id);
    setFollowUps(prev => prev.filter(f => f.id !== fup.id));
  };

  const followUpStatusIcon = (status) => {
    if (status === 'completed') return <CheckCircle size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />;
    if (status === 'pending') return <Clock size={14} strokeWidth={1.5} style={{ color: 'var(--color-text-muted)' }} />;
    return <AlertCircle size={14} strokeWidth={1.5} />;
  };

  if (loading) {
    return <div style={{ padding: '1rem' }}><SkeletonCard /></div>;
  }

  if (!member) {
    return (
      <div className="profile-empty">
        <p>Miembro no encontrado.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/miembros')}>
          <ArrowLeft size={16} /> Volver
        </Button>
      </div>
    );
  }

  const roles = Array.isArray(member.role) ? member.role : [member.role || 'Member'];
  const growthPaths = member.growthPath || {};
  const availablePaths = ['Bautismo', 'Discipulado', 'IETE', 'Otros estudios teológicos'];

  return (
    <div className="profile animate-fade-in">
      <div className="profile-header">
        <Button variant="outline" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/miembros')}>
          Volver
        </Button>
        {canTransfer && (
          <div className="profile-header-actions">
            <Button size="sm" icon={<Edit size={14} />} onClick={() => setShowEditModal(true)}>Editar</Button>
          </div>
        )}
      </div>

      <div className="profile-grid">
        <div className="profile-sidebar">
          <Card>
            <div className="profile-avatar-section">
              <div className="profile-avatar">{initialAvatar(member.firstName, member.lastName)}</div>
              <h2 className="profile-name">{member.firstName} {member.lastName}</h2>
              <div className="profile-badges">
                {roles.map(r => (
                  <Badge key={r}>{settings?.roles?.[r] || r}</Badge>
                ))}
              </div>
            </div>

            <div className="profile-divider" />

            <ProfileField icon={Hash} label="DNI" value={member.dni} />
            <ProfileField icon={Phone} label="Teléfono" value={member.phone} />
            <ProfileField icon={Mail} label="Email" value={member.email} />
            <ProfileField icon={MapPin} label="Dirección" value={member.address} />

            <div className="profile-divider" />

            <div className="profile-field">
              <div className="profile-field-icon"><User size={16} strokeWidth={1.5} /></div>
              <div className="profile-field-content">
                <span className="profile-field-label">Grupo</span>
                {canTransfer ? (
                  <select
                    className="form-input"
                    value={newGroup}
                    onChange={(e) => handleTransfer(e.target.value)}
                    style={{ marginTop: '0.25rem', fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                  >
                    <option value="">Sin grupo</option>
                    {[...new Set(allMembers.map(m => m.group).filter(Boolean))].sort().map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                ) : (
                  <span className="profile-field-value">{member.group || <span className="profile-field-empty">Sin grupo</span>}</span>
                )}
              </div>
            </div>

            {canTransfer && (
              <div style={{ marginTop: '1rem' }}>
                <Button variant="outline" size="sm" style={{ width: '100%' }} onClick={handleAutoAssign}>
                  Eliminar duplicados por email
                </Button>
              </div>
            )}
          </Card>

          {isAdmin && (
            <Card>
              <div className="profile-section-header">
                <Shield size={16} strokeWidth={1.5} />
                <span>Roles y permisos</span>
              </div>
              <div className="profile-roles">
                {['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member'].map(role => {
                  const active = roles.includes(role);
                  return (
                    <button
                      key={role}
                      className={`profile-role-btn ${active ? 'profile-role-active' : ''}`}
                      onClick={async () => {
                        const newRoles = active
                          ? roles.filter(r => r !== role)
                          : [...roles, role];
                        if (newRoles.length === 0) newRoles.push('Member');
                        await updateMember(id, { role: newRoles });
                        setMember(prev => ({ ...prev, role: newRoles }));
                      }}
                    >
                      {settings?.roles?.[role] || role}
                    </button>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        <div className="profile-main">
          <Card>
            <div className="profile-section-header">
              <BookOpen size={16} strokeWidth={1.5} />
              <span>Ruta de Crecimiento</span>
            </div>
            <div className="profile-paths">
              {availablePaths.map(path => {
                const pathData = growthPaths[path] || {};
                const status = pathData?.status || 'Sin información';

                return (
                  <div key={path} className="profile-path-item">
                    <div className="profile-path-header">
                      <span className="profile-path-name">{path}</span>
                      <span className={`profile-path-status profile-path-${status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {status}
                      </span>
                    </div>
                    {path === 'IETE' && (pathData?.status === 'Cursando' || pathData?.status === 'Completo') && (
                      <div className="profile-path-extras">
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Año</label>
                          <input
                            type="number"
                            className="form-input"
                            value={pathData?.year || ''}
                            onChange={async (e) => {
                              const updated = { ...member, growthPath: { ...growthPaths, [path]: { ...pathData, year: e.target.value } } };
                              await updateMember(id, { growthPath: updated.growthPath });
                              setMember(updated);
                            }}
                            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                          />
                        </div>
                        <div className="form-group" style={{ margin: 0, flex: 1 }}>
                          <label className="form-label" style={{ fontSize: '0.75rem' }}>Modalidad</label>
                          <select
                            className="form-input"
                            value={pathData?.modality || 'Online'}
                            onChange={async (e) => {
                              const updated = { ...member, growthPath: { ...growthPaths, [path]: { ...pathData, modality: e.target.value } } };
                              await updateMember(id, { growthPath: updated.growthPath });
                              setMember(updated);
                            }}
                            style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                          >
                            <option value="Online">Online</option>
                            <option value="Presencial">Presencial</option>
                            <option value="Híbrido">Híbrido</option>
                          </select>
                        </div>
                      </div>
                    )}
                    {path === 'Otros estudios teológicos' && (pathData?.status === 'Cursando' || pathData?.status === 'Completo') && (
                      <div className="form-group" style={{ margin: '0.5rem 0 0' }}>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="¿Cuáles estudios?"
                          value={pathData?.detail || ''}
                          onChange={async (e) => {
                            const updated = { ...member, growthPath: { ...growthPaths, [path]: { ...pathData, detail: e.target.value } } };
                            await updateMember(id, { growthPath: updated.growthPath });
                            setMember(updated);
                          }}
                          style={{ fontSize: '0.8125rem', padding: '0.375rem 0.5rem' }}
                        />
                      </div>
                    )}
                      <div className="profile-path-status-select">
                        {['Sin información', 'Cursando', 'Completo', 'Pausado'].map(s => (
                          <button
                            key={s}
                            className={`profile-path-opt ${status === s ? `profile-path-opt-active profile-path-opt-${s.toLowerCase().replace(/\s+/g, '-')}` : ''}`}
                            onClick={async () => {
                              const updated = { ...member, growthPath: { ...growthPaths, [path]: { ...pathData, status: s } } };
                              await updateMember(id, { growthPath: updated.growthPath });
                              setMember(updated);
                            }}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {canTransfer && (
        <Card style={{ marginTop: '1rem' }}>
          <div className="profile-section-header">
            <MessageSquare size={16} strokeWidth={1.5} />
            <span>Seguimiento pastoral</span>
            <button className="profile-fup-add" onClick={() => setShowFollowUpForm(true)}>
              <Plus size={14} strokeWidth={1.5} />
            </button>
          </div>

          {showFollowUpForm && (
            <div className="profile-fup-form">
              <select
                className="form-input"
                value={followUpType}
                onChange={(e) => setFollowUpType(e.target.value)}
                style={{ fontSize: '0.75rem', marginBottom: '0.5rem', padding: '0.375rem 0.5rem' }}
              >
                {(settings.followUpTypes || []).map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <textarea
                className="form-input"
                placeholder="Escribí una nota de seguimiento..."
                value={followUpText}
                onChange={(e) => setFollowUpText(e.target.value)}
                rows={3}
                style={{ fontSize: '0.8125rem', marginBottom: '0.5rem', resize: 'vertical' }}
              />
              <div className="d-flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => { setShowFollowUpForm(false); setFollowUpText(''); }}>Cancelar</Button>
                <Button size="sm" onClick={handleAddFollowUp}>Guardar</Button>
              </div>
            </div>
          )}

          <div className="profile-fup-list">
            {followUps.length === 0 && !showFollowUpForm && (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                Sin registros de seguimiento.
              </div>
            )}
            {followUps.map(fup => (
              <div key={fup.id} className="profile-fup-item">
                <div className="profile-fup-header">
                  <div className="profile-fup-type">
                    {followUpStatusIcon(fup.status)}
                    <span className={`profile-fup-status ${fup.status}`}>
                      {(settings.followUpTypes || []).find(t => t.id === fup.type)?.label || fup.type}
                    </span>
                  </div>
                  <div className="profile-fup-actions">
                    {fup.status === 'pending' && (
                      <button className="profile-fup-action" onClick={() => handleCompleteFollowUp(fup)} title="Completar">
                        <CheckCircle size={14} strokeWidth={1.5} />
                      </button>
                    )}
                    <button className="profile-fup-action" onClick={() => handleDeleteFollowUp(fup)} title="Eliminar">
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                <div className="profile-fup-content">{fup.content}</div>
                <div className="profile-fup-date">
                  {fup.createdAt?.toDate?.().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) || ''}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Miembro">
        <MemberForm onSuccess={handleEditSuccess} initialData={member} />
      </Modal>

      {canTransfer && (
        <div className="profile-delete-section">
          <Button variant="outline" size="sm" icon={<Trash2 size={14} />} onClick={handleDelete}>
            Eliminar miembro
          </Button>
        </div>
      )}
    </div>
  );
};

export default MemberProfile;
