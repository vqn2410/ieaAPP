import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import MemberForm from '../components/members/MemberForm';
import BulkUploadModal from '../components/members/BulkUploadModal';
import { Plus, Search, RefreshCw, FileText, Upload, Download, Edit, Trash2, Users, ChevronLeft, ChevronRight, UserRoundX, SlidersHorizontal, MoreVertical, Mail, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getMembers, deleteMember, updateMember } from '../services/memberService';
import { getGroups } from '../services/groupService';
import { useNavigate, useLocation } from 'react-router-dom';
import { normalizeString, isBaptised } from '../utils/helpers';
import { useDebounce } from '../utils/useDebounce';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/Skeleton';
import { runMemberMigration } from '../services/migrationService';
import './Members.css';

const initialAvatar = (firstName, lastName) => {
  const f = (firstName || '?')[0];
  const l = (lastName || '?')[0];
  return `${f}${l}`;
};

const Members = () => {
  const { userData } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterBaptism, setFilterBaptism] = useState('');
  const [viewStatus, setViewStatus] = useState('active');
  const [openActionId, setOpenActionId] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const roles = Array.isArray(userData?.role) ? userData.role : [userData?.role];
  const canEdit = roles.some(role => ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'].includes(role));
  const canCreate = roles.some(role => ['Admin', 'Pastor'].includes(role));

  const loadMembers = async () => {
    setLoading(true);
    const data = await getMembers();
    const isAdminOrPastor = roles.some(role => ['Admin', 'Pastor'].includes(role));
    if (isAdminOrPastor) {
      setMembers(data);
    } else {
      const groups = await getGroups();
      const currentEmail = userData?.email?.trim().toLowerCase();
      const currentMember = data.find(member => member.email?.trim().toLowerCase() === currentEmail);
      const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();
      const isLeader = group => [...(Array.isArray(group.facilitators) ? group.facilitators : [group.facilitators]), ...(Array.isArray(group.coFacilitators) ? group.coFacilitators : [group.coFacilitators])]
        .filter(Boolean)
        .some(value => value === currentMember?.id || normalize(value) === normalize(`${currentMember?.lastName}, ${currentMember?.firstName}`) || normalize(value) === normalize(`${currentMember?.firstName} ${currentMember?.lastName}`));
      const groupNames = groups.filter(isLeader).map(group => normalize(group.name));
      setMembers(data.filter(member => groupNames.some(groupName => normalize(member.group) === groupName || groupName.includes(normalize(member.group)))));
    }
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await loadMembers();
      const madeChanges = await runMemberMigration();
      if (madeChanges) loadMembers();
    })();
  }, [userData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('nuevo') === '1' && canCreate) {
      setMemberToEdit(null);
      setShowModal(true);
      navigate('/dashboard/miembros', { replace: true });
      return;
    }
    const initialSearch = params.get('search');
    if (initialSearch) setSearchTerm(initialSearch);
  }, [location.search, canCreate, navigate]);

  const handleMemberAdded = () => {
    setShowModal(false);
    loadMembers();
  };

  const handleAddNew = () => {
    setMemberToEdit(null);
    setShowModal(true);
  };

  const handleEdit = (member) => {
    setMemberToEdit(member);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Seguro que deseas eliminar definitivamente a este miembro?')) {
      await deleteMember(id);
      loadMembers();
    }
  };

  const handleStatusChange = async (member) => {
    const current = member.extraData?.active;
    const next = current === 'Inactivo' ? 'Activo' : 'Inactivo';
    const action = next === 'Inactivo' ? 'dar de baja' : 'reactivar';
    if (!window.confirm(`¿Querés ${action} a ${member.firstName} ${member.lastName}?`)) return;
    await updateMember(member.id, { extraData: { ...(member.extraData || {}), active: next } });
    loadMembers();
  };

  const handleExportCSV = () => {
    const headers = ['DNI', 'Nombres', 'Apellidos', 'Celular', 'Email', 'Domicilio', 'Activo', 'Bautismo', 'Grupo_de_Amistad', 'ID'];
    let csvContent = 'data:text/csv;charset=utf-8,' + headers.join(';') + '\n';

    sortedMembers.forEach(m => {
      const row = [
        m.dni, m.firstName, m.lastName, m.phone, m.email,
        m.address, m.extraData?.active, m.extraData?.baptism, m.group, m.id
      ].map(val => {
        let v = normalizeString(val || '');
        return `"${v.replace(/"/g, '""')}"`;
      });
      csvContent += row.join(';') + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'base_de_datos_miembros.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sortedMembers = [...members].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

  const filteredMembers = sortedMembers.filter(m => {
    const matchSearch = (m.firstName + ' ' + m.lastName).toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      m.dni?.includes(debouncedSearch) ||
      m.group?.toLowerCase().includes(debouncedSearch.toLowerCase());
    const matchGroup = filterGroup ? m.group === filterGroup : true;
    const matchActive = filterActive ? m.extraData?.active === filterActive : true;
    const memberStatus = m.extraData?.active;
    const matchViewStatus = viewStatus === 'active'
      ? !['Inactivo', 'Baja'].includes(memberStatus)
      : viewStatus === 'inactive' ? ['Inactivo', 'Baja'].includes(memberStatus) : true;
    const matchBaptism = filterBaptism
      ? filterBaptism === 'Sí' ? isBaptised(m) : !isBaptised(m)
      : true;
    return matchSearch && matchGroup && matchActive && matchViewStatus && matchBaptism;
  });

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const uniqueGroups = [...new Set(members.map(m => m.group).filter(Boolean))].sort();

  return (
    <div className="members-page animate-fade-in">
      <div className="members-header">
        <div><p className="members-eyebrow">Pastoral</p><h1>Miembros</h1><p className="members-subtitle">Administra miembros y líderes</p></div>
        {canEdit && (
          <div className="d-flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canCreate && <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>Exportar CSV</Button>}
            {canCreate && <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setShowBulkUpload(true)}>Carga Masiva</Button>}
            {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={handleAddNew}>Nuevo</Button>}
          </div>
        )}
      </div>

      <div className="members-summary">
        {[
          ['Total', members.length, 'members'],
          ['Activos', members.filter(m => m.extraData?.active !== 'Inactivo' && m.extraData?.active !== 'Baja').length, 'active'],
          ['Dados de baja', members.filter(m => ['Inactivo', 'Baja'].includes(m.extraData?.active)).length, 'inactive'],
          ['En grupo', members.filter(m => m.group).length, 'group'],
          ['Líderes', members.filter(m => (Array.isArray(m.role) ? m.role : [m.role]).some(role => ['Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'].includes(role))).length, 'leaders'],
          ['Bautizados', members.filter(isBaptised).length, 'baptised'],
        ].map(([label, value, tone]) => <div className={`members-summary-card ${tone}`} key={label}><strong>{value}</strong><span>{label}</span><ChevronRight size={14} /></div>)}
      </div>

      <div className="members-quality-card"><div><strong>Acciones de calidad documental</strong><span>{members.filter(m => !m.dni || !m.email).length} sin documento o contacto completo</span></div><Button variant="outline" size="sm">Completar documentos</Button><Button variant="outline" size="sm">Revisar duplicados</Button></div>

      <Card>
          <div className="members-filters">
          <div className="members-search-wrap">
            <span className="members-search-icon"><Search size={16} /></span>
            <input
              type="text"
              className="form-input members-search-input"
              placeholder="Buscar por nombre, DNI o grupo..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          <select className="form-input members-filter-select" value={filterGroup} onChange={(e) => { setFilterGroup(e.target.value); setCurrentPage(1); }}>
            <option value="">Grupo: Todos</option>
            {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="form-input members-filter-select" value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setCurrentPage(1); }}>
            <option value="">Estado: Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Baja">Baja</option>
          </select>
          <select className="form-input members-filter-select" value={filterBaptism} onChange={(e) => { setFilterBaptism(e.target.value); setCurrentPage(1); }}>
            <option value="">Bautismo: Todos</option>
            <option value="Sí">Bautizado</option>
            <option value="No">No Bautizado</option>
          </select>
           <Button variant="outline" size="sm" icon={<SlidersHorizontal size={14} />}>Filtros</Button><Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadMembers}>Recargar</Button>
          </div>

        {loading ? (
          <div style={{ padding: '1rem' }}><SkeletonTable rows={8} cols={5} /></div>
        ) : (
          <div className="members-table-wrap">
            <div className="members-results-head"><h2><Users size={18} /> Resultados ({filteredMembers.length})</h2><div className="members-sort"><span>Orden por nombre:</span><button>Nombre A-Z</button><button>Nombre Z-A</button></div></div>
            <div className="members-view-tabs"><span>Ver:</span><button className={viewStatus === 'active' ? 'active' : ''} onClick={() => { setViewStatus('active'); setCurrentPage(1); }}>Activos ({members.filter(m => !['Inactivo', 'Baja'].includes(m.extraData?.active)).length})</button><button className={viewStatus === 'all' ? 'active' : ''} onClick={() => { setViewStatus('all'); setCurrentPage(1); }}>Todas</button><button className={viewStatus === 'inactive' ? 'active' : ''} onClick={() => { setViewStatus('inactive'); setCurrentPage(1); }}>Dados de baja ({members.filter(m => ['Inactivo', 'Baja'].includes(m.extraData?.active)).length})</button></div>
            <div className="members-directory-list">{filteredMembers.length === 0 ? <EmptyState icon={Users} title="Sin resultados" message="No se encontraron miembros con los filtros actuales." /> : paginatedMembers.map(member => <article className="member-directory-card" key={member.id}><div className="member-directory-top"><div className="member-name-cell"><div className="member-avatar">{initialAvatar(member.firstName, member.lastName)}</div><div className="member-name-info"><strong className="member-name">{member.lastName}, {member.firstName}</strong><span>{member.email || 'Sin email'}</span></div></div><div className="member-directory-status"><Badge>{(Array.isArray(member.role) ? member.role : [member.role || 'Member']).map(role => settings?.roles?.[role] || role).join(' · ')}</Badge><span className={`member-status-pill ${['Inactivo', 'Baja'].includes(member.extraData?.active) ? 'inactive' : ''}`}>{['Inactivo', 'Baja'].includes(member.extraData?.active) ? 'Inactivo' : 'Activo'}</span><div className="member-action-menu"><button className="member-more-button" onClick={() => setOpenActionId(openActionId === member.id ? null : member.id)} aria-label={`Acciones de ${member.firstName}`}><MoreVertical size={17} /></button>{openActionId === member.id && <div className="member-action-popover"><button onClick={() => navigate(`/dashboard/miembros/${member.id}`)}>Ver perfil</button>{canEdit && <button onClick={() => { setOpenActionId(null); handleEdit(member); }}>Editar</button>}{canEdit && <button onClick={() => { setOpenActionId(null); handleStatusChange(member); }}>{member.extraData?.active === 'Inactivo' ? 'Reactivar' : 'Dar de baja'}</button>}{canEdit && <button className="danger" onClick={() => { setOpenActionId(null); handleDelete(member.id); }}>Eliminar</button>}</div>}</div></div></div><div className="member-directory-details"><span><Mail />{member.email || 'Sin email'}</span><span><Phone />{member.phone || 'Sin teléfono'}</span><span>Grupo activo: <strong>{member.group || 'Sin grupo'}</strong></span></div></article>)}</div>
            <table className="members-table">
              <thead>
                <tr>
                  <th>Apellido y nombre</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Condición</th>
                  <th>Grupo</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                  <tr className="member-empty">
                    <td colSpan="7">
                      <EmptyState icon={Users} title="Sin resultados" message="No se encontraron miembros con los filtros actuales." />
                    </td>
                  </tr>
                ) : paginatedMembers.map((member) => (
                  <tr key={member.id}>
                    <td data-label="Apellido y nombre">
                      <div className="member-name-cell">
                        <div className="member-avatar">{initialAvatar(member.firstName, member.lastName)}</div>
                        <div className="member-name-info">
                          <div className="member-name">{member.lastName}, {member.firstName}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="DNI">
                      <span className="member-meta-item">{member.dni || '-'}</span>
                    </td>
                    <td data-label="Teléfono">
                      <span className="member-phone">{member.phone || '-'}</span>
                    </td>
                    <td data-label="Email">
                      <span className="member-email">{member.email || '-'}</span>
                    </td>
                    <td data-label="Condición">
                      <div className="member-meta">
                        {(Array.isArray(member.role) ? member.role : [member.role || 'Member']).map(r => (
                          <Badge key={r}>{settings?.roles?.[r] || r}</Badge>
                        ))}
                      </div>
                    </td>
                    <td data-label="Grupo">
                      <span className="member-group">{member.group || <span className="member-meta-item">Sin grupo</span>}</span>
                    </td>
                    <td data-label="Acciones">
                      <div className="member-actions">
                        <Button variant="outline" size="sm" icon={<FileText size={14} />} onClick={() => navigate(`/dashboard/miembros/${member.id}`)} title="Ver Perfil" />
                        {canEdit && (
                          <>
                            <Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => handleEdit(member)} title="Editar" />
                            <Button variant="outline" size="sm" icon={<UserRoundX size={14} />} onClick={() => handleStatusChange(member)} title={member.extraData?.active === 'Inactivo' ? 'Reactivar' : 'Dar de baja'} style={member.extraData?.active === 'Inactivo' ? {} : { color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} />
                            <Button variant="outline" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(member.id)} title="Eliminar" />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="members-pagination">
                <span className="members-pagination-info">
                  {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} de {filteredMembers.length}
                </span>
                <div className="members-pagination-controls">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="members-pagination-current">{currentPage} / {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={memberToEdit ? 'Editar Miembro' : 'Registrar Miembro'} size="lg">
        <MemberForm onSuccess={handleMemberAdded} initialData={memberToEdit} />
      </Modal>

      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onSuccess={() => { setShowBulkUpload(false); loadMembers(); }}
      />
    </div>
  );
};

export default Members;
