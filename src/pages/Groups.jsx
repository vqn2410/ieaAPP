import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Plus, Users } from 'lucide-react';
import { getGroups, createGroup, deleteGroup } from '../services/groupService';
import { useAuth } from '../context/AuthContext';

const Groups = () => {
  const { userData } = useAuth();
  const isAdmin = ['Admin', 'Pastor'].includes(userData?.role);
  
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('Grupo de Crecimiento');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
     loadGroups();
  }, []);

  const loadGroups = async () => {
      setLoading(true);
      const data = await getGroups();
      setGroups(data);
      setLoading(false);
  };

  const handleCreate = async (e) => {
      e.preventDefault();
      setCreating(true);
      try {
          await createGroup({ name: groupName, type: groupType });
          setGroupName('');
          setShowModal(false);
          loadGroups();
      } catch (e) {
          alert('Hubo un error');
      } finally {
          setCreating(false);
      }
  };

  const handleDelete = async (id) => {
      if(window.confirm("¿Seguro que deseas eliminar este grupo?")) {
          await deleteGroup(id);
          loadGroups();
      }
  }

  return (
    <div>
      <div className="d-flex justify-between align-center mb-4">
         <h1>Grupos y Ministerios</h1>
         {isAdmin && (
             <Button icon={<Plus size={16} />} onClick={() => setShowModal(true)}>Nuevo Grupo</Button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
         {loading ? <p>Cargando grupos...</p> : (
             groups.length === 0 ? <p>No hay grupos creados.</p> :
             groups.map(group => (
                <Card key={group.id} className="mb-2">
                   <div className="d-flex justify-between align-center mb-2">
                       <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <Users size={18} color="var(--color-primary-light)" /> 
                           {group.name}
                       </h3>
                       <span className="badge badge-gray">{group.type}</span>
                   </div>
                   <p style={{ color: 'var(--color-text-muted)' }}>Agrupación habilitada para cargar miembros.</p>
                   {isAdmin && (
                       <Button variant="outline" size="sm" onClick={() => handleDelete(group.id)} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>Eliminar</Button>
                   )}
                </Card>
             ))
         )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Crear Nuevo Grupo">
          <form onSubmit={handleCreate}>
              <div className="form-group mb-4">
                  <label className="form-label">Nombre de la agrupación</label>
                  <input required className="form-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej. Jóvenes Semillas" />
              </div>
              <div className="form-group mb-4">
                  <label className="form-label">Tipo de agrupación</label>
                  <select className="form-input" value={groupType} onChange={(e) => setGroupType(e.target.value)} style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}>
                      <option>Grupo de Crecimiento</option>
                      <option>Ministerio Administrativo</option>
                      <option>Grupo de Apoyo</option>
                      <option>Otro</option>
                  </select>
              </div>
              <Button type="submit" variant="primary" style={{ width: '100%' }} disabled={creating}>
                 {creating ? 'Creando...' : 'Crear Grupo'}
              </Button>
          </form>
      </Modal>
    </div>
  );
};
export default Groups;
