import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import Logo from '../components/common/Logo';
import MemberForm from '../components/members/MemberForm';
import BulkUploadModal from '../components/members/BulkUploadModal';
import { Plus, Search, RefreshCw, FileText, Upload, Download, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getMembers, deleteMember, updateMember } from '../services/memberService';
import { useNavigate } from 'react-router-dom';
import { normalizeString, fixSanchezEncoding, migrateGroupName } from '../utils/helpers';

const Members = () => {
  const { userData } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [filterBaptism, setFilterBaptism] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [memberToEdit, setMemberToEdit] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const canAddMember = ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'].includes(userData?.role);

  const loadMembers = async () => {
    setLoading(true);
    const data = await getMembers();
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();

    // Hotfix: Migrate specific group names and encoding issues
    const autoMigrate = async () => {
       const data = await getMembers();
       let madeChanges = false;
       
       for (let m of data) {
           let updated = false;
           
           const newGroup = migrateGroupName(m.group);
           if (newGroup !== m.group) {
               m.group = newGroup;
               updated = true;
           }
           
           const fixedLast = fixSanchezEncoding(m.lastName);
           if (fixedLast !== m.lastName) {
               m.lastName = fixedLast;
               updated = true;
           }
           
           const fixedFirst = fixSanchezEncoding(m.firstName);
           if (fixedFirst !== m.firstName) {
               m.firstName = fixedFirst;
               updated = true;
           }
           
           if (updated) {
               await updateMember(m.id, { group: m.group, lastName: m.lastName, firstName: m.firstName });
               madeChanges = true;
           }
       }
       if (madeChanges) loadMembers();
    };
    autoMigrate();
  }, [userData]);

  const handleMemberAdded = () => {
    setShowModal(false);
    loadMembers(); // reload list
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
    if(window.confirm("¿Seguro que deseas eliminar definitivamente a este miembro?")) {
        await deleteMember(id);
        loadMembers();
    }
  };



  const handleExportCSV = () => {
      const headers = ['DNI', 'Nombres', 'Apellidos', 'Celular', 'Email', 'Domicilio', 'Activo', 'Bautismo', 'Grupo_de_Amistad', 'ID'];
      let csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + '\n';

      sortedMembers.forEach(m => {
          const row = [
              m.dni,
              m.firstName,
              m.lastName,
              m.phone,
              m.email,
              m.address,
              m.extraData?.active,
              m.extraData?.baptism,
              m.group,
              m.id
          ].map(val => {
              let v = val || '';
              v = normalizeString(v); // Removes accents and Ñ
              return `"${v.replace(/"/g, '""')}"`;
          });
          csvContent += row.join(";") + "\n";
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "base_de_datos_miembros.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const sortedMembers = [...members].sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

  const filteredMembers = sortedMembers.filter(m => {
    const matchSearch = (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
                        m.dni?.includes(searchTerm) ||
                        m.group?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGroup = filterGroup ? m.group === filterGroup : true;
    const matchActive = filterActive ? m.extraData?.active === filterActive : true;
    const matchBaptism = filterBaptism ? m.extraData?.baptism === filterBaptism : true;
    return matchSearch && matchGroup && matchActive && matchBaptism;
  });

  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(filteredMembers.length / ITEMS_PER_PAGE);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterGroup, filterActive, filterBaptism]);

  const uniqueGroups = [...new Set(members.map(m => m.group).filter(Boolean))].sort();

  const renderGrowthPaths = (growthPath) => {
    if (!growthPath) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
    
    let activePaths = [];
    if (Array.isArray(growthPath)) {
      activePaths = growthPath.map(p => ({ id: p, text: p, variant: p }));
    } else {
      activePaths = Object.keys(growthPath)
        .filter(k => growthPath[k]?.status && growthPath[k].status !== 'Sin información')
        .map(p => ({ 
          id: p, 
          text: p === 'IETE' && growthPath[p].year ? `${p} (${growthPath[p].year})` : p,
          variant: p 
        }));
    }

    if (activePaths.length === 0) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
    return activePaths.map(p => (
      <Badge key={p.id} variant={p.variant} style={{ marginRight: '4px', marginBottom: '4px' }}>
        {p.text}
      </Badge>
    ));
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-between align-center mb-4">
        <h1>Gestión de Miembros</h1>
        {canAddMember && (
          <div className="d-flex gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button variant="outline" icon={<Download size={16} />} onClick={handleExportCSV}>Exportar BD (CSV)</Button>
            <Button variant="outline" icon={<Upload size={16} />} onClick={() => setShowBulkUpload(true)}>Carga Masiva (CSV)</Button>
            <Button icon={<Plus size={16} />} onClick={handleAddNew}>Nuevo Miembro</Button>
          </div>
        )}
      </div>

      <Card>
        <div className="d-flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '200px', margin: 0 }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <Search size={18} />
              </span>
              <input 
                type="text" 
                className="form-input" 
                style={{ width: '100%', paddingLeft: '3rem' }} 
                placeholder="Buscar por nombre, DNI o grupo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <select className="form-input" style={{ flex: '1 1 150px' }} value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
             <option value="">Grupo: Todos</option>
             {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select className="form-input" style={{ flex: '1 1 150px' }} value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
             <option value="">Estado: Todos</option>
             <option value="Activo">Activo</option>
             <option value="Inactivo">Inactivo</option>
             <option value="Baja">Baja</option>
          </select>

          <select className="form-input" style={{ flex: '1 1 150px' }} value={filterBaptism} onChange={(e) => setFilterBaptism(e.target.value)}>
             <option value="">Bautismo: Todos</option>
             <option value="Sí">Bautizado</option>
             <option value="No">No Bautizado</option>
          </select>

          <Button variant="outline" style={{ flex: '1 1 150px' }} icon={<RefreshCw size={16} />} onClick={loadMembers}>Recargar</Button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando miembros...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="responsive-table data-table">
              <thead>
                <tr>
                  <th className="th-cell">Nombre</th>
                  <th className="th-cell">Contacto</th>
                  <th className="th-cell">Ruta de Crecimiento</th>
                  <th className="th-cell">Grupo / Ministerio</th>
                  <th className="th-cell">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="td-cell text-center" style={{ color: 'var(--color-text-muted)' }}>
                           No se encontraron miembros registrados.
                        </td>
                    </tr>
                ) : (
                  paginatedMembers.map((member) => (
                    <tr key={member.id} className="table-row-hover">
                      <td data-label="Nombre" className="td-cell">
                        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                              {member.lastName}, {member.firstName}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                             <span>DNI: {member.dni}</span>
                             <div className="d-flex gap-1 flex-wrap">
                               {(Array.isArray(member.role) ? member.role : [member.role || 'Member']).map(r => (
                                 <Badge key={r} variant="gray">{settings?.roles?.[r] || r}</Badge>
                               ))}
                             </div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Contacto" className="td-cell">
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.875rem' }}>{member.phone}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{member.email}</div>
                        </div>
                      </td>
                      <td data-label="Crecimiento" className="td-cell flex-wrap">
                        <div style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {renderGrowthPaths(member.growthPath)}
                        </div>
                      </td>
                      <td data-label="Grupo" className="td-cell" style={{ fontSize: '0.875rem' }}>
                        <div style={{ textAlign: 'right' }}>
                          {member.group || 'Sin Grupo'}
                        </div>
                      </td>
                      <td data-label="Acciones" className="td-cell">
                        <div className="d-flex gap-2" style={{ justifyContent: 'flex-end' }}>
                          <Button variant="outline" size="sm" icon={<FileText size={14} />} onClick={() => navigate(`/dashboard/miembros/${member.id}`)} title="Ver Perfil" />
                          {canAddMember && (
                            <>
                              <Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => handleEdit(member)} title="Editar Datos" />
                              <Button variant="outline" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(member.id)} title="Eliminar" />
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="d-flex justify-between align-center mt-4" style={{ padding: '0 1rem 1rem' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, filteredMembers.length)} de {filteredMembers.length}
                </span>
                <div className="d-flex gap-2 align-center">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>Anterior</Button>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>Siguiente</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={memberToEdit ? "Editar Miembro" : "Registrar Miembro"}>
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
