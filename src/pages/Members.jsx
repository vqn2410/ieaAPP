import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MemberForm from '../components/members/MemberForm';
import BulkUploadModal from '../components/members/BulkUploadModal';
import { Plus, Search, RefreshCw, FileText, Upload, Download, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMembers, deleteMember } from '../services/memberService';
import { useNavigate } from 'react-router-dom';

const Members = () => {
  const { userData } = useAuth();
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

    // TEMPORARY HOTFIX: Migrate specific group name
    const autoMigrateGroup = async () => {
       const data = await getMembers();
       
       let madeChanges = false;
       for (let m of data) {
           let updated = false;
           
           if (m.group === '8. Perez, Pereira (La Tribu) - Viernes') {
               m.group = 'LA TRIBU';
               updated = true;
           }
           if (typeof m.group === 'string' && (m.group.includes('5. Quaresima') || m.group.includes('5. Quaresima'))) {
               m.group = 'QUARESIMA';
               updated = true;
           }
           if (typeof m.group === 'string' && m.group.includes('4. Ortiz')) {
               m.group = 'ORTIZ-HARDOY (MARTES)';
               updated = true;
           }
           if (typeof m.group === 'string' && m.group.includes('3. T')) {
               m.group = 'TEVEZ-DIAZ';
               updated = true;
           }
           if (typeof m.group === 'string' && m.group.includes('10. Sanchez')) {
               m.group = 'SANCHEZ';
               updated = true;
           }
           
           // Fix broken Sánchez encodings everywhere (lastName, firstName)
           const fixSanchez = (str) => {
               if(typeof str !== 'string') return str;
               return str.replace(/S[^\w]?nchez/gi, (match) => {
                   return match.charAt(0) === 'S' ? 'Sánchez' : 'sánchez';
               });
           };
           
           const fixedLast = fixSanchez(m.lastName);
           if (fixedLast !== m.lastName) {
               m.lastName = fixedLast;
               updated = true;
           }
           const fixedFirst = fixSanchez(m.firstName);
           if (fixedFirst !== m.firstName) {
               m.firstName = fixedFirst;
               updated = true;
           }
           
           if (updated) {
               await import('../services/memberService').then(s => s.updateMember(m.id, { group: m.group, lastName: m.lastName, firstName: m.firstName }));
               madeChanges = true;
           }
       }
       if (madeChanges) {
           loadMembers();
       }
    };
    autoMigrateGroup();
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

  const normalizeString = (str) => {
      if (!str) return '';
      // Normalizes characters to Base Character + Combining Diacritical Mark, then removes Diacritical Marks (accents, tildes, etc.)
      return String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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

  const getPathBadgeClass = (pathName) => {
      const p = (pathName || '').toLowerCase();
      if(p.includes('encuentro')) return 'badge-path-encuentro';
      if(p.includes('discipulado')) return 'badge-path-discipulado';
      if(p.includes('bautizado')) return 'badge-path-bautizado';
      if(p.includes('iete')) return 'badge-path-iete';
      return 'badge-gray';
  };

  const getStatusBadge = (rawStatus) => {
      if(rawStatus === undefined || rawStatus === null || rawStatus === '') return null;
      
      let status = String(rawStatus).trim();
      const sUpper = status.toUpperCase();
      if(sUpper === 'VERDADERO' || sUpper === 'TRUE' || sUpper === '1') status = 'Activo';
      if(sUpper === 'FALSO' || sUpper === 'FALSE' || sUpper === '0') status = 'Inactivo';

      let badgeClass = 'badge-gray';
      if(status === 'Activo') badgeClass = 'badge-status-active';
      else if(status === 'Inactivo') badgeClass = 'badge-status-inactive';
      else if(status === 'Baja') badgeClass = 'badge-status-baja';
      return <span className={`badge ${badgeClass}`} style={{ marginLeft: '8px' }}>{status}</span>;
  };

  const renderGrowthPaths = (growthPath) => {
    if (!growthPath) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
    
    // Legacy array format
    if (Array.isArray(growthPath)) {
      if (growthPath.length === 0) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
      return growthPath.map(p => <span key={p} className={`badge ${getPathBadgeClass(p)}`} style={{ marginRight: '4px' }}>{p}</span>);
    }
    
    // New object format
    const activePaths = Object.keys(growthPath).filter(k => growthPath[k]?.status && growthPath[k].status !== 'Sin información');
    if (activePaths.length === 0) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
    return activePaths.map(p => {
        let text = p;
        if (p === 'IETE' && growthPath[p].year) text += ` (${growthPath[p].year})`;
        return <span key={p} className={`badge ${getPathBadgeClass(p)}`} style={{ marginRight: '4px', marginBottom: '4px' }}>{text}</span>
    });
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
          
          <select className="form-input" style={{ width: 'auto', height: '42px', backgroundColor: 'var(--color-surface)' }} value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
             <option value="">Grupo: Todos</option>
             {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          <select className="form-input" style={{ width: 'auto', height: '42px', backgroundColor: 'var(--color-surface)' }} value={filterActive} onChange={(e) => setFilterActive(e.target.value)}>
             <option value="">Estado: Todos</option>
             <option value="Activo">Activo</option>
             <option value="Inactivo">Inactivo</option>
             <option value="Baja">Baja</option>
          </select>

          <select className="form-input" style={{ width: 'auto', height: '42px', backgroundColor: 'var(--color-surface)' }} value={filterBaptism} onChange={(e) => setFilterBaptism(e.target.value)}>
             <option value="">Bautismo: Todos</option>
             <option value="Sí">Bautizado</option>
             <option value="No">No Bautizado</option>
          </select>

          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={loadMembers}>Recargar</Button>
        </div>

        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando miembros...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}>
                  <th style={{ padding: '1rem' }}>Nombre</th>
                  <th style={{ padding: '1rem' }}>Contacto</th>
                  <th style={{ padding: '1rem' }}>Ruta de Crecimiento</th>
                  <th style={{ padding: '1rem' }}>Grupo / Ministerio</th>
                  <th style={{ padding: '1rem' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.length === 0 ? (
                    <tr>
                        <td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                           No se encontraron miembros registrados.
                        </td>
                    </tr>
                ) : (
                  paginatedMembers.map((member) => (
                    <tr key={member.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                            {member.lastName}, {member.firstName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>DNI: {member.dni}</div>
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontSize: '0.875rem' }}>{member.phone}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{member.email}</div>
                      </td>
                      <td style={{ padding: '1rem', flexWrap: 'wrap' }}>
                        {renderGrowthPaths(member.growthPath)}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{member.group || 'Sin Grupo'}</td>
                      <td style={{ padding: '1rem' }}>
                        <div className="d-flex gap-2">
                          <Button variant="outline" size="sm" icon={<FileText size={14} />} onClick={() => navigate(`/miembros/${member.id}`)} title="Ver Perfil" style={{ color: 'var(--color-primary-light)', borderColor: 'var(--color-primary-light)' }} />
                          {canAddMember && (
                            <>
                              <Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => handleEdit(member)} title="Editar Datos" style={{ color: '#2563eb', borderColor: '#2563eb' }} />
                              <Button variant="outline" size="sm" icon={<Trash2 size={14} />} onClick={() => handleDelete(member.id)} title="Eliminar" style={{ color: '#dc2626', borderColor: '#dc2626' }} />
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
