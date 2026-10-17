import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Badge from '../../components/common/Badge';
import {
  Search,
  MessageSquare,
  Check,
  Trash2,
  Filter,
  User,
  Plus,
  Download,
  FileText,
  Clock,
  Users,
  Loader2,
  LifeBuoy
} from 'lucide-react';
import { createFollowUp, getAllFollowUps, updateFollowUp, deleteFollowUp } from '../../services/followUpService';
import { getMembers } from '../../services/memberService';
import { getGroups } from '../../services/groupService';
import { getAssignedGroups } from '../../services/assignedGroupService';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useToast } from '../../components/common/toastContext';
import { normalizeString } from '../../utils/helpers';
import { useDebounce } from '../../utils/useDebounce';
import EmptyState from '../../components/common/EmptyState';
import { SkeletonTable } from '../../components/common/Skeleton';
import RadarChart from '../../components/common/RadarChart';
import { formatGroupSchedule, generateFollowUpPdf, downloadDataUrl, PERFORMANCE_DIMENSIONS } from '../../utils/followUpPdf';
import './FollowUps.css';


const timeAgo = (date) => {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  const secs = Math.floor((Date.now() - d) / 1000);
  if (secs < 60) return 'ahora';
  if (secs < 3600) return `${Math.floor(secs / 60)}m`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`;
  if (secs < 2592000) return `${Math.floor(secs / 86400)}d`;
  return d.toLocaleDateString('es-AR');
};

const FollowUps = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();

  const [followUps, setFollowUps] = useState([]);
  const [members, setMembers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // Modal de nuevo informe
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [description, setDescription] = useState('');
  const [performanceValues, setPerformanceValues] = useState(() =>
    Object.fromEntries(PERFORMANCE_DIMENSIONS.map(d => [d.key, 7]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Nombre del facilitador obtenido de forma automática a partir del usuario creador
  const autoFacilitatorName = React.useMemo(() => {
    if (userData?.email) {
      const self = members.find(m => m.email?.trim().toLowerCase() === userData.email.trim().toLowerCase());
      if (self) {
        const full = `${self.firstName || ''} ${self.lastName || ''}`.trim();
        if (full) return full;
      }
    }
    if (userData?.firstName || userData?.lastName) {
      return `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    }
    if (userData?.name) return userData.name;
    if (userData?.displayName) return userData.displayName;
    if (userData?.email) {
      const alias = userData.email.split('@')[0];
      return alias.charAt(0).toUpperCase() + alias.slice(1);
    }
    return 'Facilitador';
  }, [userData, members]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
      const facilitatorScope = roles.some(role => ['Facilitator', 'CoFacilitator', 'MinistryLeader', 'CampusAdmin'].includes(role));
      let fups;
      let mems;
      let allGroups;

      if (facilitatorScope) {
        const assigned = await getAssignedGroups();
        [fups, mems, allGroups] = await Promise.all([
          getAllFollowUps(),
          Promise.resolve(assigned.members || []),
          Promise.resolve(assigned.groups || [])
        ]);
      } else {
        [fups, mems, allGroups] = await Promise.all([
          getAllFollowUps(),
          getMembers(),
          getGroups()
        ]);
      }

      if (!mounted) return;

      setGroups(allGroups || []);

      const isPrivileged = roles.some(r => ['Admin', 'Pastor'].includes(r));
      if (!isPrivileged) {
        // Para facilitadores y roles acotados, mems ya contiene los miembros asignados
        // desde getAssignedGroups(). Los seguimientos visibles son los de sus miembros o los creados por él.
        const allowedMemberIds = new Set(mems.map(m => m.id));
        const userEmail = userData?.email?.trim().toLowerCase();
        const visibleFollowUps = fups.filter(f =>
          allowedMemberIds.has(f.memberId) || (userEmail && f.createdBy?.trim().toLowerCase() === userEmail)
        );

        setFollowUps(visibleFollowUps);
        setMembers(mems);
      } else {
        setFollowUps(fups);
        setMembers(mems);
      }
      setLoading(false);
    })();

    return () => { mounted = false; };
  }, [userData]);

  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  const filtered = followUps.filter(f => {
    if (filterStatus !== 'all' && f.status !== filterStatus) return false;
    if (filterAssignee === 'mine' && f.createdBy !== userData?.email) return false;
    if (debouncedSearch) {
      const q = normalizeString(debouncedSearch).toLowerCase();
      const content = normalizeString(f.content || '').toLowerCase();
      const member = memberMap[f.memberId];
      const name = member ? normalizeString(`${member.firstName} ${member.lastName}`).toLowerCase() : '';
      if (!content.includes(q) && !name.includes(q)) return false;
    }
    return true;
  });

  const refresh = async () => {
    const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
    let mems;
    let fups;
    let allGroups;
    if (roles.some(role => ['Facilitator', 'CoFacilitator', 'MinistryLeader', 'CampusAdmin'].includes(role))) {
      const assigned = await getAssignedGroups();
      [fups, mems, allGroups] = await Promise.all([
        getAllFollowUps(),
        Promise.resolve(assigned.members || []),
        Promise.resolve(assigned.groups || [])
      ]);
    } else {
      [fups, mems, allGroups] = await Promise.all([
        getAllFollowUps(),
        getMembers(),
        getGroups()
      ]);
    }
    setGroups(allGroups || []);
    if (roles.some(role => ['Facilitator', 'CoFacilitator', 'MinistryLeader', 'CampusAdmin'].includes(role))) {
      const allowedMemberIds = new Set(mems.map(m => m.id));
      const userEmail = userData?.email?.trim().toLowerCase();
      setFollowUps(fups.filter(f =>
        allowedMemberIds.has(f.memberId) || (userEmail && f.createdBy?.trim().toLowerCase() === userEmail)
      ));
    } else {
      setFollowUps(fups);
    }
    setMembers(mems);
  };

  const handleComplete = async (f) => {
    try {
      await updateFollowUp(f.id, { status: 'completed' });
      refresh();
      toast('Seguimiento marcado como completado', 'success');
    } catch {
      toast('No se pudo actualizar el estado', 'error');
    }
  };

  const handleDelete = async (f) => {
    if (!window.confirm('¿Deseas eliminar este seguimiento?')) return;
    try {
      await deleteFollowUp(f.id);
      refresh();
      toast('Seguimiento eliminado correctamente', 'success');
    } catch {
      toast('No se pudo eliminar el seguimiento', 'error');
    }
  };

  // Abre el modal de creación
  const handleOpenCreateModal = () => {
    setSelectedMemberId('');
    setDescription('');
    setPerformanceValues(Object.fromEntries(PERFORMANCE_DIMENSIONS.map(d => [d.key, 7])));
    setShowCreateModal(true);
  };

  // Miembro seleccionado para el modal
  const selectedMember = selectedMemberId ? memberMap[selectedMemberId] : null;
  const selectedGroup = selectedMember
    ? groups.find(g => g.id === selectedMember.groupId || g.name === selectedMember.group)
    : null;
  const resolvedGroupName = selectedGroup?.name || selectedMember?.group || 'Sin grupo asignado';
  const resolvedSchedule = formatGroupSchedule(selectedGroup);

  // Promedio actual de desempeño de la rueda de vida
  const performanceAverage = React.useMemo(() => {
    const scores = PERFORMANCE_DIMENSIONS.map(d => Number(performanceValues[d.key] ?? 5));
    return (scores.reduce((a, b) => a + b, 0) / (scores.length || 1)).toFixed(1);
  }, [performanceValues]);

  // Enviar y generar PDF
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!selectedMember) {
      toast('Debes seleccionar un miembro para el informe.', 'error');
      return;
    }
    if (!description.trim()) {
      toast('Por favor ingresa la descripción del seguimiento.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const { pdf, pdfDataUrl, fileName } = await generateFollowUpPdf({
        member: selectedMember,
        groupName: resolvedGroupName,
        groupSchedule: resolvedSchedule,
        facilitatorName: autoFacilitatorName,
        description: description.trim(),
        performanceValues,
        date: new Date()
      });

      const payload = {
        memberId: selectedMember.id,
        memberName: `${selectedMember.lastName || ''}, ${selectedMember.firstName || ''}`.replace(/^,\s*|,\s*$/g, '').trim(),
        memberLastName: selectedMember.lastName || '',
        memberFirstName: selectedMember.firstName || '',
        groupId: selectedGroup?.id || selectedMember.groupId || null,
        groupName: resolvedGroupName,
        groupSchedule: resolvedSchedule,
        facilitatorName: autoFacilitatorName,
        facilitatorRole: 'Facilitador',
        content: description.trim(),
        performanceValues,
        performanceAverage: Number(performanceAverage),
        type: 'reporte',
        status: 'completed',
        reportDate: new Date().toISOString().slice(0, 10),
        createdBy: userData?.email || '',
        createdByName: autoFacilitatorName,
        pdfDataUrl: (pdfDataUrl && pdfDataUrl.length < 800000) ? pdfDataUrl : null,
        hasPdf: true,
        fileName
      };

      await createFollowUp(payload);

      // Descargar el PDF directamente en el cliente
      pdf.save(fileName);

      toast('Informe de seguimiento y PDF guardados correctamente.', 'success');
      setShowCreateModal(false);
      await refresh();
    } catch (error) {
      console.error('Error al generar informe:', error);
      toast('Ocurrió un error al guardar el informe o generar el PDF.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Descarga de PDF existente o regeneración al vuelo
  const handleDownloadPdf = async (f, e) => {
    e?.stopPropagation?.();
    setDownloadingId(f.id);
    try {
      if (f.pdfDataUrl) {
        const name = f.fileName || `informe-seguimiento-${f.id}.pdf`;
        downloadDataUrl(f.pdfDataUrl, name);
        toast('PDF descargado correctamente.', 'success');
      } else {
        // Regenerar si es un seguimiento previo sin PDF
        const member = memberMap[f.memberId];
        const gName = f.groupName || member?.group || 'Sin grupo asignado';
        const groupObj = groups.find(g => g.name === gName || g.id === member?.groupId);
        const sched = f.groupSchedule || formatGroupSchedule(groupObj);

        const { pdf, fileName } = await generateFollowUpPdf({
          member: member || { lastName: f.memberLastName || '', firstName: f.memberFirstName || f.memberName || '' },
          groupName: gName,
          groupSchedule: sched,
          facilitatorName: f.facilitatorName || f.createdByName || 'Facilitador',
          description: f.content || '',
          performanceValues: f.performanceValues || null,
          date: f.reportDate || f.createdAt || new Date()
        });
        pdf.save(fileName);
        toast('PDF generado y descargado correctamente.', 'success');
      }
    } catch (err) {
      console.error('Error al descargar PDF:', err);
      toast('No se pudo descargar el archivo PDF.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Miembros ordenados alfabéticamente para el select
  const sortedMembers = [...members].sort((a, b) => {
    const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
    const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="fups-page">
      <div className="fups-header">
        <div className="fups-header-info">
          <h1>Seguimientos</h1>
          <p className="fups-subtitle">Registro de acompañamiento, discipulado e informes pastorales con PDF</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal}>
          <Plus size={16} /> Crear seguimiento
        </Button>
      </div>

      <div className="fups-filters">
        <div className="fups-search-wrap">
          <span className="fups-search-icon"><Search size={16} /></span>
          <input
            className="form-input fups-search-input"
            placeholder="Buscar por miembro o contenido..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="fups-filter-select">
          <span className="fups-filter-icon"><Filter size={14} /></span>
          <select
            className="form-input"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="pending">Pendientes</option>
            <option value="completed">Completados</option>
          </select>
        </div>
        <div className="fups-filter-select">
          <span className="fups-filter-icon"><User size={14} /></span>
          <select
            className="form-input"
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
          >
            <option value="all">Todos</option>
            <option value="mine">Mis seguimientos</option>
          </select>
        </div>
      </div>

      <Card>
        {loading ? (
          <SkeletonTable rows={6} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MessageSquare} title="Sin seguimientos" message="No se encontraron seguimientos con los filtros actuales." />
        ) : (
          <div className="fups-table-wrap">
            <table className="fups-table">
              <thead>
                <tr>
                  <th>Miembro</th>
                  <th>Contenido</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(f => {
                  const member = memberMap[f.memberId];
                  const hasPdf = Boolean(f.pdfDataUrl || f.type === 'reporte');
                  return (
                    <tr key={f.id} className="fups-row" onClick={() => f.memberId && navigate(`/dashboard/miembros/${f.memberId}`)}>
                      <td data-label="Miembro">
                        <div className="fups-member">
                          <div className="fups-avatar">
                            {member ? `${(member.firstName || '?')[0]}${(member.lastName || '?')[0]}` : '??'}
                          </div>
                          <div>
                            <span>{member ? `${member.firstName} ${member.lastName}` : (f.memberName || 'Miembro')}</span>
                            <div className="fups-type-label">
                              {(settings.followUpTypes || []).find(t => t.id === f.type)?.label || f.type || 'Seguimiento'}
                            </div>
                            {hasPdf && (
                              <span className="fups-pdf-pill">
                                <FileText size={10} /> PDF
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td data-label="Contenido" className="fups-content-cell">
                        <span className="fups-content">{f.content}</span>
                      </td>
                      <td data-label="Estado">
                        <Badge variant={f.status === 'completed' ? 'secondary' : 'primary'}>
                          {f.status === 'completed' ? 'Completado' : 'Pendiente'}
                        </Badge>
                      </td>
                      <td data-label="Fecha" className="fups-date-cell">{timeAgo(f.createdAt)}</td>
                      <td data-label="Acciones">
                        <div className="fups-actions" onClick={e => e.stopPropagation()}>
                          <button
                            className="fups-action-btn fups-action-pdf"
                            onClick={(e) => handleDownloadPdf(f, e)}
                            title="Descargar Informe PDF"
                            disabled={downloadingId === f.id}
                          >
                            {downloadingId === f.id ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                          </button>
                          {f.status === 'pending' && (
                            <button className="fups-action-btn" onClick={() => handleComplete(f)} title="Completar">
                              <Check size={14} />
                            </button>
                          )}
                          <button className="fups-action-btn fups-action-delete" onClick={() => handleDelete(f)} title="Eliminar">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal para Crear Seguimiento con Informe PDF */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => !submitting && setShowCreateModal(false)}
        title="Crear Informe de Seguimiento"
      >
        <form onSubmit={handleSubmitReport} className="fups-form">
          <div className="fups-form-group">
            <label className="fups-label" htmlFor="member-select">
              Miembro del informe <span className="fups-required">*</span>
            </label>
            <select
              id="member-select"
              className="form-input"
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              required
            >
              <option value="">-- Selecciona un miembro --</option>
              {sortedMembers.map(m => (
                <option key={m.id} value={m.id}>
                  {m.lastName || ''}, {m.firstName || ''} {m.group ? `(${m.group})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedMember && (
            <div className="fups-member-preview">
              <div className="fups-preview-head">
                <div className="fups-preview-avatar">
                  {`${(selectedMember.firstName || '?')[0]}${(selectedMember.lastName || '?')[0]}`}
                </div>
                <div>
                  <div className="fups-preview-name">
                    {selectedMember.lastName}, {selectedMember.firstName}
                  </div>
                  <div className="fups-preview-email">
                    {selectedMember.email || selectedMember.phone || 'Sin datos de contacto'}
                  </div>
                </div>
              </div>

              <div className="fups-preview-grid">
                <div className="fups-preview-item">
                  <span className="fups-preview-label">
                    <Users size={12} /> Grupo
                  </span>
                  <span className="fups-preview-value">
                    {resolvedGroupName}
                  </span>
                </div>
                <div className="fups-preview-item">
                  <span className="fups-preview-label">
                    <Clock size={12} /> Día y Horario
                  </span>
                  <span className="fups-preview-value">
                    {resolvedSchedule}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sección Rueda de Vida del Desempeño */}
          <div className="fups-wheel-section">
            <div className="fups-wheel-header">
              <h3 className="fups-wheel-title">
                <LifeBuoy size={16} style={{ color: 'var(--color-primary)' }} />
                Rueda de Vida · Desempeño del Miembro
              </h3>
              <span className="fups-wheel-avg-badge">
                Promedio: {performanceAverage} / 10
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', margin: '0 0 0.75rem 0' }}>
              Calificá cada aspecto del 1 al 10. La rueda de vida se incorporará visualmente al PDF generado.
            </p>

            <div className="fups-wheel-grid">
              <div className="fups-wheel-sliders">
                {PERFORMANCE_DIMENSIONS.map(dim => (
                  <div key={dim.key} className="fups-dim-control-row">
                    <div className="fups-dim-info">
                      <span className="fups-dim-name">{dim.label}</span>
                      <span className="fups-dim-sub">{dim.description}</span>
                    </div>
                    <div className="fups-dim-slider-wrap">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={performanceValues[dim.key] ?? 7}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setPerformanceValues(prev => ({ ...prev, [dim.key]: val }));
                        }}
                        className="fups-dim-slider"
                      />
                      <span className="fups-dim-score">
                        {performanceValues[dim.key] ?? 7}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="fups-wheel-radar-preview">
                <RadarChart dimensions={PERFORMANCE_DIMENSIONS} values={performanceValues} size={200} />
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                  Vista previa en PDF
                </span>
              </div>
            </div>
          </div>

          <div className="fups-form-group">
            <label className="fups-label" htmlFor="fup-description">
              Descripción del seguimiento <span className="fups-required">*</span>
            </label>
            <textarea
              id="fup-description"
              className="form-input fups-textarea"
              placeholder="Detalla aquí la situación observada, motivos de oración, acuerdos, acompañamiento pastoral o avances en el discipulado..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              rows={5}
            />
          </div>

          <div className="fups-form-group">
            <label className="fups-label">
              Facilitador que firma el informe
            </label>
            <div className="fups-readonly-box">
              <div className="fups-readonly-icon">
                <User size={16} />
              </div>
              <div className="fups-readonly-info">
                <span className="fups-readonly-name">{autoFacilitatorName}</span>
                <span className="fups-readonly-role">Cargo: Facilitador &bull; Usuario creador</span>
              </div>
            </div>
            <span className="fups-subtitle" style={{ fontSize: '0.75rem', marginTop: '0.125rem' }}>
              El informe se firma automáticamente con el usuario creador y el cargo: <strong>Facilitador</strong>.
            </span>
          </div>

          <div className="fups-modal-footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || !selectedMemberId || !description.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spin" /> Guardando y generando PDF...
                </>
              ) : (
                <>
                  <FileText size={16} /> Generar y Guardar Informe
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default FollowUps;
