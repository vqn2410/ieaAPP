import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import MemberForm from '../../components/portal/members/MemberForm';
import { getMember, deleteMember, updateMember, linkFamilyMembers, unlinkFamilyMembers } from '../../services/memberService';
import { getMembers } from '../../services/memberService';
import { getGroups, updateGroup } from '../../services/groupService';
import { ArrowLeft, User, Phone, Mail, MapPin, Hash, Shield, BookOpen, Trash2, Edit, MessageSquare, Plus, CheckCircle, Clock, AlertCircle, Flame, MoreHorizontal, QrCode, Users, GraduationCap, HeartHandshake, Wallet, Download, FileText, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { SkeletonCard } from '../../components/common/Skeleton';
import { useSettings } from '../../context/SettingsContext';
import { createFollowUp, getFollowUpsByMember, updateFollowUp, deleteFollowUp } from '../../services/followUpService';
import { getMemberAttendanceStats } from '../../services/attendanceService';
import { getAssignedGroups } from '../../services/assignedGroupService';
import { isBaptised } from '../../utils/helpers';
import { getMemberFinanceHistory } from '../../services/financeIntegrationService';
import { generateFollowUpPdf, downloadDataUrl } from '../../utils/followUpPdf';
import { collection, getDocs, query, where, updateDoc, doc as firestoreDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './MemberProfile.css';

const initialAvatar = (firstName, lastName) => {
  const f = (firstName || '?')[0];
  const l = (lastName || '?')[0];
  return `${f}${l}`.toUpperCase();
};

const FAMILY_RELATIONSHIPS = ['Padre/madre', 'Hijo/a', 'Cónyuge', 'Hermano/a', 'Tutor', 'Tutelado/a'];

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
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [assignedGroups, setAssignedGroups] = useState([]);
  const [profileTab, setProfileTab] = useState('groups');
  const [financeHistory, setFinanceHistory] = useState(null);
  const [financeHistoryError, setFinanceHistoryError] = useState('');
  const [financeHistoryLoading, setFinanceHistoryLoading] = useState(false);
  const [familySearch, setFamilySearch] = useState('');
  const [familyMemberId, setFamilyMemberId] = useState('');
  const [familyRelationship, setFamilyRelationship] = useState('Hijo/a');
  const [familySaving, setFamilySaving] = useState(false);
  const [downloadingFupId, setDownloadingFupId] = useState(null);

  const currentRoles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const canTransfer = currentRoles.some(role => ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'].includes(role));
  const isAdmin = currentRoles.includes('Admin');

  useEffect(() => {
    if (profileTab !== 'finance' || !member?.id) return;
    let cancelled = false;
    setFinanceHistoryLoading(true);
    getMemberFinanceHistory(member.id)
      .then(data => { if (!cancelled) { setFinanceHistory(data); setFinanceHistoryError(''); } })
      .catch(error => { if (!cancelled) { setFinanceHistory(null); setFinanceHistoryError(error.message); } })
      .finally(() => { if (!cancelled) setFinanceHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [profileTab, member?.id]);

  useEffect(() => {
    const load = async () => {
      try {
        const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
        const isPrivileged = roles.some(r => ['Admin', 'Pastor'].includes(r));
        const isFacilitator = roles.some(role => ['Facilitator', 'CoFacilitator', 'MinistryLeader'].includes(role));
        const assignedData = isFacilitator && !isPrivileged ? await getAssignedGroups() : null;

        const m = await getMember(id);
        if (!m) {
          navigate('/dashboard/miembros', { replace: true });
          return;
        }

        const [members, fups, attendance, allGroups] = await Promise.all([
          isPrivileged ? getMembers() : Promise.resolve(assignedData?.members || []),
          getFollowUpsByMember(id),
          getMemberAttendanceStats(id, m?.groupId),
          isPrivileged ? getGroups() : Promise.resolve(assignedData?.groups || []),
        ]);

        if (userData?.email && !isPrivileged) {
          const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();
          const selfEmail = userData?.email?.trim().toLowerCase();
          const self = members.find(x => x.email?.trim().toLowerCase() === selfEmail);
          const isSelf = (m.email && m.email.trim().toLowerCase() === selfEmail) || m.id === userData?.id || (self && self.id === m.id);
          const isAssignedMember = (assignedData?.members || []).some(mem => mem.id === m.id);
          const targetGroup = norm(m.group);
          const isAssignedGroup = (allGroups || []).some(g => {
            const gName = norm(g.name);
            return g.id === m.groupId || (targetGroup && (targetGroup === gName || gName.includes(targetGroup)));
          });
          const leaderNames = (allGroups || []).filter(g => {
            if (!self) return false;
            const vals = [...(Array.isArray(g.facilitators) ? g.facilitators : [g.facilitators]), ...(Array.isArray(g.coFacilitators) ? g.coFacilitators : [g.coFacilitators])].filter(Boolean);
            return vals.some(v => v === self.id || norm(v) === norm(`${self.lastName}, ${self.firstName}`) || norm(v) === norm(`${self.firstName} ${self.lastName}`));
          }).map(g => norm(g.name));
          const allowed = isSelf || isAssignedMember || isAssignedGroup || leaderNames.some(n => targetGroup && (targetGroup === n || n.includes(targetGroup)));
          if (!allowed) {
            navigate('/dashboard/miembros', { replace: true });
            return;
          }
        }
        setMember(m);
        setNewGroup(m?.group || '');
        setAllMembers(members.filter(other => other.id !== id));
        setFollowUps(fups);
        setAttendanceStats(attendance);
        const normalizedEmail = m?.email?.trim().toLowerCase();
        const normalizedName = `${m?.firstName || ''} ${m?.lastName || ''}`.trim().toLowerCase();
        const normalizedReverseName = `${m?.lastName || ''}, ${m?.firstName || ''}`.trim().toLowerCase();
        const groupsAssignedToMember = (allGroups || []).filter(group => {
          const leaders = [
            ...(Array.isArray(group.facilitators) ? group.facilitators : [group.facilitators]),
            ...(Array.isArray(group.coFacilitators) ? group.coFacilitators : [group.coFacilitators]),
            ...(Array.isArray(group.facilitatorEmails) ? group.facilitatorEmails : []),
          ].filter(Boolean).map(value => String(value).trim().toLowerCase());
          return leaders.some(value => value === id || value === normalizedEmail || value === normalizedName || value === normalizedReverseName);
        });
        setAssignedGroups(groupsAssignedToMember);

        // Reparación única: los grupos antiguos pueden tener facilitadores por
        // nombre, pero las reglas necesitan el email para autorizar el acceso.
        if (isPrivileged && normalizedEmail) {
          await Promise.all(groupsAssignedToMember.map(group => {
            const emails = Array.isArray(group.facilitatorEmails) ? group.facilitatorEmails : [];
            if (emails.includes(normalizedEmail)) return null;
            return updateGroup(group.id, { facilitatorEmails: [...new Set([...emails, normalizedEmail])] });
          }));
        }
      } catch (err) {
        console.error('Error cargando perfil del miembro:', err);
        navigate('/dashboard/miembros');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate, userData]);

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

  const handleDownloadReportPdf = async (fup) => {
    setDownloadingFupId(fup.id);
    try {
      if (fup.pdfDataUrl) {
        const safeName = `${member?.lastName || ''}_${member?.firstName || ''}`.replace(/\s+/g, '_');
        downloadDataUrl(fup.pdfDataUrl, `informe_seguimiento_${safeName || 'miembro'}.pdf`);
        return;
      }
      const memberGroup = (assignedGroups || []).find(g => g.id === member?.groupId || g.name === member?.group) || { name: member?.group };
      const facilitatorName = fup.facilitatorName || fup.createdByName || userData?.displayName || userData?.name || userData?.email || 'Facilitador';
      const { pdfDataUrl, fileName } = await generateFollowUpPdf({
        member,
        group: memberGroup,
        description: fup.content || '',
        facilitatorName,
        performanceValues: fup.performanceValues || null,
        date: fup.createdAt?.toDate ? fup.createdAt.toDate() : new Date(),
      });
      downloadDataUrl(pdfDataUrl, fileName);
    } catch (err) {
      console.error('Error al descargar el informe:', err);
      alert('No se pudo descargar el informe en PDF.');
    } finally {
      setDownloadingFupId(null);
    }
  };

  const handleLinkFamily = async () => {
    if (!familyMemberId) return;
    setFamilySaving(true);
    try {
      await linkFamilyMembers(id, familyMemberId, familyRelationship);
      const updated = await getMember(id);
      setMember(updated);
      setFamilyMemberId('');
      setFamilySearch('');
    } finally {
      setFamilySaving(false);
    }
  };

  const handleUnlinkFamily = async (relatedMemberId) => {
    if (!window.confirm('¿Desvincular este familiar?')) return;
    await unlinkFamilyMembers(id, relatedMemberId);
    setMember(prev => ({
      ...prev,
      familyLinks: (prev.familyLinks || []).filter(link => link.memberId !== relatedMemberId),
    }));
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
  const isAreaLeader = roles.some(r => {
    const label = settings?.roles?.[r] || r;
    return /arealeader|encargado/i.test(String(r)) || /encargado|área|area/i.test(String(label));
  });
  const growthPaths = member.growthPath || {};
  const availablePaths = ['Bautismo', 'Discipulado', 'IETE', 'Otros estudios teológicos'];
  const qrValue = encodeURIComponent(`${window.location.origin}/dashboard/miembros/${id}`);
  const memberRoles = roles.map(role => settings?.roles?.[role] || role);
  const growthStages = [
    { label: 'Nuevo', active: true },
    { label: 'Conectado', active: Boolean(member.email || member.phone) },
    { label: 'Bautizado', active: isBaptised(member) },
    { label: 'En Grupo', active: Boolean(member.group) },
    { label: 'Servidor', active: roles.some(role => ['Facilitator', 'CoFacilitator', 'MinistryLeader'].includes(role)) },
    { label: 'Líder', active: roles.some(role => ['Admin', 'Pastor', 'MinistryLeader'].includes(role)) },
  ];
  const familyLinks = Array.isArray(member.familyLinks) ? member.familyLinks : [];
  const familyCandidates = allMembers
    .filter(candidate => !familyLinks.some(link => link.memberId === candidate.id))
    .filter(candidate => {
      const query = familySearch.trim().toLowerCase();
      if (!query) return true;
      return `${candidate.firstName || ''} ${candidate.lastName || ''} ${candidate.dni || ''} ${candidate.email || ''}`.toLowerCase().includes(query);
    })
    .slice(0, 8);

  return (
    <div className="profile animate-fade-in">
      <div className="profile-header profile-modern-header">
        <div className="profile-modern-identity"><div className="profile-avatar profile-modern-avatar">{initialAvatar(member.firstName, member.lastName)}</div><div><h1>{member.firstName} {member.lastName}</h1><div className="profile-modern-meta"><span className="profile-active-pill">Activo</span>{memberRoles.map(role => <span key={role}>{role}</span>)}</div></div></div>
        <div className="profile-modern-actions"><Button variant="outline" size="sm" icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/miembros')}>Volver</Button>{canTransfer && <Button size="sm" icon={<Edit size={14} />} onClick={() => setShowEditModal(true)}>Editar</Button>}<button className="profile-more-button" aria-label="Más opciones"><MoreHorizontal size={18} /></button></div>
      </div>

      <Card className="profile-personal-card">
        <div className="profile-modern-card-title"><div><h2><User size={17} /> Información personal</h2><p>Carnet con QR, datos de contacto y crecimiento espiritual</p></div></div>
        <div className="profile-personal-grid">
          <div className="profile-qr-block"><div className="profile-subtitle"><QrCode size={14} /> Carnet QR</div><img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrValue}`} alt="Código QR del miembro" /><small>Escaneá en grupos o eventos.</small><Button variant="outline" size="sm">Imprimir / Guardar PDF</Button></div>
          <div className="profile-contact-block"><div className="profile-subtitle">Datos y contacto</div><div className="profile-contact-person"><div className="profile-avatar">{initialAvatar(member.firstName, member.lastName)}</div><strong>{member.firstName} {member.lastName}</strong></div><ProfileField icon={Mail} label="Email" value={member.email} /><ProfileField icon={Phone} label="Teléfono" value={member.phone} /><ProfileField icon={MapPin} label="Dirección" value={member.address} /><ProfileField icon={Hash} label="DNI" value={member.dni} /></div>
          <div className="profile-growth-block"><div className="profile-subtitle"><HeartHandshake size={14} /> Crecimiento espiritual</div><p className="profile-growth-label">Etapas de crecimiento</p><div className="profile-growth-stages">{growthStages.map((stage, index) => <div className={`profile-growth-stage ${stage.active ? 'active' : ''}`} key={stage.label}><span>{index + 1}</span>{stage.label}</div>)}</div><div className="profile-active-roles"><small>Perfiles activos</small><strong>{memberRoles.join(' · ')}</strong></div></div>
        </div>
      </Card>

      <Card className="profile-family-card"><div className="profile-modern-card-title"><div><h2><Users size={17} /> Gestión familiar</h2><p>Vinculá personas ya registradas para construir el grupo familiar.</p></div></div>{familyLinks.length > 0 ? <div className="profile-family-links">{familyLinks.map(link => { const relative = allMembers.find(candidate => candidate.id === link.memberId); return <div className="profile-tab-item" key={link.memberId}><strong>{relative ? `${relative.firstName} ${relative.lastName}` : 'Miembro no disponible'}</strong><span>{link.relationship}</span>{canTransfer && <Button variant="outline" size="sm" onClick={() => handleUnlinkFamily(link.memberId)}>Desvincular</Button>}</div>; })}</div> : <div className="profile-tab-empty"><Users size={28} /><strong>Sin vínculos familiares</strong><span>Agregá padres, hijos, cónyuge o hermanos.</span></div>}{canTransfer && <div className="profile-family-editor"><label className="profile-family-label">Buscar persona<input className="form-input" value={familySearch} onChange={event => setFamilySearch(event.target.value)} placeholder="Nombre, DNI o email..." /></label><label className="profile-family-label">Relación<select className="form-input" value={familyRelationship} onChange={event => setFamilyRelationship(event.target.value)}>{FAMILY_RELATIONSHIPS.map(relation => <option key={relation}>{relation}</option>)}</select></label>{familySearch && <div className="profile-family-candidates">{familyCandidates.map(candidate => <button type="button" key={candidate.id} className={familyMemberId === candidate.id ? 'selected' : ''} onClick={() => setFamilyMemberId(candidate.id)}>{candidate.firstName} {candidate.lastName}<small>{candidate.dni || candidate.email || 'Sin identificador'}</small></button>)}</div>}<Button variant="outline" size="sm" disabled={!familyMemberId || familySaving} onClick={handleLinkFamily}>{familySaving ? 'Vinculando...' : 'Vincular familiar'}</Button></div>}</Card>

      {assignedGroups.length > 0 && <Card className="profile-family-card"><div className="profile-modern-card-title"><div><h2><Users size={17} /> Grupos a cargo</h2><p>Grupos en los que esta persona figura como facilitador o cofacilitador.</p></div></div><div className="profile-family-links">{assignedGroups.map(group => <button type="button" className="profile-assigned-group" key={group.id} onClick={() => navigate(`/dashboard/grupos/${group.id}`)}><span><strong>{group.name}</strong><small>{group.scheduleDay || 'Horario no definido'}{group.scheduleTime ? ` · ${group.scheduleTime}` : ''}</small></span><Users size={16} /></button>)}</div></Card>}

      <div className="profile-tabs"><button className={profileTab === 'groups' ? 'active' : ''} onClick={() => setProfileTab('groups')}><Users size={14} /> Grupos ({member.group ? 1 : 0})</button><button className={profileTab === 'ministries' ? 'active' : ''} onClick={() => setProfileTab('ministries')}><HeartHandshake size={14} /> Ministerios ({roles.includes('MinistryLeader') ? 1 : 0})</button><button className={profileTab === 'schools' ? 'active' : ''} onClick={() => setProfileTab('schools')}><GraduationCap size={14} /> Escuelas ({growthPaths.IETE?.status && growthPaths.IETE.status !== 'Sin información' ? 1 : 0})</button><button className={profileTab === 'finance' ? 'active' : ''} onClick={() => setProfileTab('finance')}><Wallet size={14} /> Aportes</button></div>
      <Card className="profile-tab-card">{profileTab === 'groups' && <><div className="profile-tab-heading"><Users size={16} /><strong>Grupos</strong></div>{member.group ? <div className="profile-tab-item"><strong>{member.group}</strong><span>Grupo de pertenencia</span></div> : <div className="profile-tab-empty"><Users size={32} /><strong>Sin grupos</strong><span>No estás en ningún grupo actualmente.</span></div>}</>}{profileTab === 'ministries' && <><div className="profile-tab-heading"><HeartHandshake size={16} /><strong>Ministerios</strong></div>{roles.includes('MinistryLeader') ? <div className="profile-tab-item"><strong>Liderazgo de ministerio</strong><span>{memberRoles.join(', ')}</span></div> : <div className="profile-tab-empty"><HeartHandshake size={32} /><strong>Sin ministerios</strong><span>No hay ministerios registrados para esta persona.</span></div>}</>}{profileTab === 'schools' && <><div className="profile-tab-heading"><GraduationCap size={16} /><strong>Escuelas</strong></div>{growthPaths.IETE?.status && growthPaths.IETE.status !== 'Sin información' ? <div className="profile-tab-item"><strong>IETE</strong><span>{growthPaths.IETE.status}</span></div> : <div className="profile-tab-empty"><GraduationCap size={32} /><strong>Sin escuelas</strong><span>No hay escuelas registradas para esta persona.</span></div>}</>}{profileTab === 'finance' && <><div className="profile-tab-heading"><Wallet size={16} /><strong>Aportes registrados en IEA Finanzas</strong></div>{financeHistoryLoading ? <p>Cargando historial autorizado…</p> : financeHistoryError ? <p>{financeHistoryError}</p> : financeHistory?.linked ? <><p>Total: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(financeHistory.summary.total)} · {financeHistory.summary.count} movimientos</p>{financeHistory.contributions.map(row => <div className="profile-tab-item" key={row.id}><strong>{new Date(row.date).toLocaleDateString('es-AR')} · {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(row.amount)}</strong><span>{row.category || row.description}</span></div>)}</> : <div className="profile-tab-empty"><Wallet size={32} /><strong>Sin vínculo financiero</strong><span>El registro debe vincularse manualmente desde IEA Finanzas.</span></div>}</>}</Card>

      <div className="profile-grid profile-legacy-grid">
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

          <Card>
            <div className="profile-section-header">
              <Flame size={16} strokeWidth={1.5} />
              <span>Asistencia y constancia</span>
            </div>
            {attendanceStats === null ? (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0' }}>
                <div className="skeleton" style={{ flex: 1, height: '48px' }}></div>
                <div className="skeleton" style={{ flex: 1, height: '48px' }}></div>
              </div>
            ) : attendanceStats.total === 0 ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8125rem', padding: '0.5rem 0', margin: 0 }}>
                Sin registros de asistencia todavía.
              </p>
            ) : (
              <div className="profile-attendance-grid">
                <div className="profile-att-card">
                  <span className="profile-att-value">
                    <Flame size={13} /> {attendanceStats.currentStreak}
                  </span>
                  <span className="profile-att-label">Racha actual</span>
                </div>
                <div className="profile-att-card">
                  <span className="profile-att-value">{attendanceStats.bestStreak}</span>
                  <span className="profile-att-label">Mejor racha</span>
                </div>
                <div className="profile-att-card">
                  <span className="profile-att-value">{attendanceStats.percentage}%</span>
                  <span className="profile-att-label">Asistencia</span>
                </div>
                <div className="profile-att-card">
                  <span className="profile-att-value">{attendanceStats.present}<small>/{attendanceStats.total}</small></span>
                  <span className="profile-att-label">Encuentros</span>
                </div>
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
                {(settings?.roles ? Object.keys(settings.roles) : ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'AreaLeader', 'Maestro', 'Member']).map(role => {
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

              {isAreaLeader && (
                <div className="profile-area-picker">
                  <span className="profile-area-picker-label">Áreas a cargo (Encargado de área)</span>
                  <div className="member-area-picker">
                    {(settings?.serviceAreas || []).map(area => {
                      const checked = (member.managedAreas || []).includes(area);
                      return (
                        <label key={area}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={async () => {
                              const next = checked
                                ? (member.managedAreas || []).filter(a => a !== area)
                                : [...(member.managedAreas || []), area];
                              await updateMember(id, { managedAreas: next });
                              setMember(prev => ({ ...prev, managedAreas: next }));
                              if (member.email) {
                                try {
                                  const snap = await getDocs(query(collection(db, 'users'), where('email', '==', member.email.toLowerCase())));
                                  await Promise.all(snap.docs.map(d => updateDoc(firestoreDoc(db, 'users', d.id), { managedAreas: next })));
                                } catch (e) {
                                  console.error('No se pudo sincronizar el área con el usuario', e);
                                }
                              }
                            }}
                          />
                          <span>{area}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
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
                      {(settings.followUpTypes || []).find(t => t.id === fup.type)?.label || (fup.type === 'reporte' ? 'Informe de seguimiento' : fup.type)}
                    </span>
                    {(fup.pdfDataUrl || fup.hasPdf || fup.type === 'reporte') && (
                      <span className="profile-fup-pdf-badge">
                        <FileText size={11} strokeWidth={1.5} /> PDF
                      </span>
                    )}
                  </div>
                  <div className="profile-fup-actions">
                    {(fup.pdfDataUrl || fup.hasPdf || fup.type === 'reporte') && (
                      <button
                        className="profile-fup-action"
                        onClick={() => handleDownloadReportPdf(fup)}
                        title="Descargar informe en PDF"
                        disabled={downloadingFupId === fup.id}
                      >
                        {downloadingFupId === fup.id ? (
                          <Loader2 size={14} className="animate-spin" strokeWidth={1.5} />
                        ) : (
                          <Download size={14} strokeWidth={1.5} />
                        )}
                      </button>
                    )}
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
