import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MemberForm from '../components/members/MemberForm';
import { Plus, Search, Filter, RefreshCw, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getMembers } from '../services/memberService';
import { useNavigate } from 'react-router-dom';

const Members = () => {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const canAddMember = ['Admin', 'Pastor', 'Facilitador', 'Co-facilitador'].includes(userData?.role);

  const loadMembers = async () => {
    setLoading(true);
    // If Facilitator, they can only load their group, but we do this simply first
    const data = await getMembers();
    setMembers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadMembers();
  }, [userData]);

  const handleMemberAdded = () => {
    setShowModal(false);
    loadMembers(); // reload list
  };

  const filteredMembers = members.filter(m => 
    (m.firstName + ' ' + m.lastName).toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.dni?.includes(searchTerm) ||
    m.group?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderGrowthPaths = (growthPath) => {
    if (!growthPath) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
    
    // Legacy array format
    if (Array.isArray(growthPath)) {
      if (growthPath.length === 0) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
      return growthPath.map(p => <span key={p} className="badge badge-gray" style={{ marginRight: '4px' }}>{p}</span>);
    }
    
    // New object format
    const activePaths = Object.keys(growthPath).filter(k => growthPath[k]?.status && growthPath[k].status !== 'Sin información');
    if (activePaths.length === 0) return <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>-</span>;
    return activePaths.map(p => {
        let text = p;
        if (p === 'IETE' && growthPath[p].year) text += ` (${growthPath[p].year})`;
        return <span key={p} className="badge badge-gray" style={{ marginRight: '4px', marginBottom: '4px' }}>{text}</span>
    });
  };

  return (
    <div>
      <div className="d-flex justify-between align-center mb-4">
        <h1>Gestión de Miembros</h1>
        {canAddMember && (
          <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Nuevo Miembro</Button>
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
                  filteredMembers.map((member) => (
                    <tr key={member.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ fontWeight: 500 }}>{member.firstName} {member.lastName}</div>
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
                        <Button variant="outline" size="sm" icon={<FileText size={14} />} onClick={() => navigate(`/miembros/${member.id}`)}>Ver Perfil</Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Registrar Miembro">
         <MemberForm onSuccess={handleMemberAdded} />
      </Modal>
    </div>
  );
};

export default Members;
