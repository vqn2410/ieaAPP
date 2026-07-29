import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import MemberForm from '../components/members/MemberForm';
import BulkUploadModal from '../components/members/BulkUploadModal';
import { Plus, Search, RefreshCw, FileText, Upload, Download, Edit, Trash2, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getMembers, deleteMember } from '../services/memberService';
import { useNavigate } from 'react-router-dom';
import { normalizeString } from '../utils/helpers';
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
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterBaptism, setFilterBaptism] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const canEdit = ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'].includes(userData?.role);

  const loadMembers = async () => {
    setLoading(true);
    const data = await getMembers();
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      await loadMembers();
      const madeChanges = await runMemberMigration();
      if (madeChanges) loadMembers();
    })();
  }, [userData]);

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
    const matchBaptism = filterBaptism ? m.extraData?.baptism === filterBaptism : true;
    return matchSearch && matchGroup && matchActive && matchBaptism;
  });

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const uniqueGroups = [...new Set(members.map(m => m.group).filter(Boolean))].sort();

  return (
    <div className="animate-fade-in">
      <div className="members-header">
        <h1>Miembros</h1>
        {canEdit && (
          <div className="d-flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button variant="outline" size="sm" icon={<Download size={14} />} onClick={handleExportCSV}>Exportar CSV</Button>
            <Button variant="outline" size="sm" icon={<Upload size={14} />} onClick={() => setShowBulkUpload(true)}>Carga Masiva</Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={handleAddNew}>Nuevo</Button>
          </div>
        )}
      </div>

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
          <Button variant="outline" size="sm" icon={<RefreshCw size={14} />} onClick={loadMembers}>Recargar</Button>
        </div>

        {loading ? (
          <div style={{ padding: '1rem' }}><SkeletonTable rows={8} cols={5} /></div>
        ) : (
          <div className="members-table-wrap">
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

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={memberToEdit ? 'Editar Miembro' : 'Registrar Miembro'}>
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
