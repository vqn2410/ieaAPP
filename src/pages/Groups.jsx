import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { getGroups, createGroup, deleteGroup, updateGroup } from '../services/groupService';
import { getMembers, updateMember } from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Groups = () => {
  const { userData, hasRole } = useAuth();
  const isAdmin = hasRole(['Admin', 'Pastor']);
  const navigate = useNavigate();
  
  const [groups, setGroups] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('Grupo de Amistad');
  const [groupDay, setGroupDay] = useState('');
  const [groupTime, setGroupTime] = useState('');
  const [facilitators, setFacilitators] = useState([]);
  const [coFacilitators, setCoFacilitators] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
     loadGroups();
     getMembers().then(data => setMembersList(data.sort((a,b) => (a.lastName||'').localeCompare(b.lastName||''))));
  }, []);

  const loadGroups = async () => {
      setLoading(true);
      const data = await getGroups();
      
      let madeChanges = false;
      for (let g of data) {
          let updated = false;
          let newName = g.name;

          if (g.name === '8. Perez, Pereira (La Tribu) - Viernes') {
              newName = 'LA TRIBU';
              updated = true;
          }
          if (typeof g.name === 'string' && g.name.includes('5. Quaresima')) {
              newName = 'QUARESIMA';
              updated = true;
          }
          if (typeof g.name === 'string' && g.name.includes('4. Ortiz')) {
              newName = 'ORTIZ-HARDOY (MARTES)';
              updated = true;
          }
          if (typeof g.name === 'string' && g.name.includes('3. T')) {
              newName = 'TEVEZ-DIAZ';
              updated = true;
          }
          if (typeof g.name === 'string' && g.name.includes('10. Sanchez')) {
              newName = 'SANCHEZ';
              updated = true;
          }
          
          if (updated) {
               await updateGroup(g.id, { name: newName });
               madeChanges = true;
          }
      }

      if (madeChanges) {
          const freshData = await getGroups();
          setGroups(freshData);
      } else {
          setGroups(data);
      }
      setLoading(false);
  };

  const handleCreate = async (e) => {
      e.preventDefault();
      setCreating(true);
      try {
          const payload = { 
              name: groupName, 
              type: groupType,
              facilitators: facilitators,
              coFacilitators: coFacilitators
          };
          if (groupType === 'Grupo de Amistad') {
              payload.scheduleDay = groupDay;
              payload.scheduleTime = groupTime;
          }
          
          if (groupId) {
              await updateGroup(groupId, payload);
          } else {
              await createGroup(payload);
          }

          const findMember = (idOrName) => {
              // 1. Exact ID
              let m = membersList.find(x => x.id === idOrName);
              if (m) return m;

              // 2. Exact Name Match (Normalized)
              const normSearch = idOrName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
              m = membersList.find(x => {
                  const fullName = `${x.lastName}, ${x.firstName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                  const reverseName = `${x.firstName} ${x.lastName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                  return fullName === normSearch || reverseName === normSearch;
              });
              return m;
          };

          // Registrar roles automáticamente
          const syncMemberPromises = [];
          
          const updateRoleForMember = (memberId, targetRole) => {
              const m = membersList.find(x => x.id === memberId);
              if (!m) return;

              const toUpdate = {};
              if (m.group !== groupName) toUpdate.group = groupName;
              
              // Handle role as array
              let currentRoles = Array.isArray(m.role) ? m.role : [m.role || 'Member'];
              
              const eliteRoles = ['Admin', 'Pastor', 'MinistryLeader'];
              const isElite = currentRoles.some(r => eliteRoles.includes(r));
              
              if (!isElite && !currentRoles.includes(targetRole)) {
                  // If adding Facilitator, and it was just 'Member', replace or add?
                  // Let's add and keep Member if they want, or just replace Member with the higher role
                  let newRoles = [...currentRoles, targetRole];
                  if (targetRole !== 'Member' && newRoles.includes('Member')) {
                      newRoles = newRoles.filter(r => r !== 'Member');
                  }
                  toUpdate.role = newRoles;
              }

              if (Object.keys(toUpdate).length > 0) {
                  syncMemberPromises.push(updateMember(memberId, toUpdate));
              }
          };

          for (let fId of facilitators) {
              const m = findMember(fId);
              if (m) updateRoleForMember(m.id, 'Facilitator');
          }

          for (let cfId of coFacilitators) {
              const m = findMember(cfId);
              if (m) updateRoleForMember(m.id, 'CoFacilitator');
          }

          if (syncMemberPromises.length > 0) {
              await Promise.all(syncMemberPromises);
              const data = await getMembers();
              setMembersList(data.sort((a,b) => (a.lastName||'').localeCompare(b.lastName||'')));
          }

          resetForm();
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
  };

  const getArray = (val) => {
      if(Array.isArray(val)) return val;
      if(typeof val === 'string' && val.trim() !== '') return val.split(',').map(s=>s.trim());
      return [];
  };

  const resolveMemberName = (idOrName) => {
      if(!idOrName) return '';
      const member = membersList.find(m => m.id === idOrName);
      if (member) return `${member.lastName}, ${member.firstName}`;
      return idOrName;
  };

  const handleEdit = (group) => {
      setGroupId(group.id);
      setGroupName(group.name || '');
      setGroupType(group.type || 'Grupo de Amistad');
      setGroupDay(group.scheduleDay || '');
      setGroupTime(group.scheduleTime || '');
      setFacilitators(getArray(group.facilitators));
      setCoFacilitators(getArray(group.coFacilitators));
      setShowModal(true);
  };

  const handleAddNew = () => {
      resetForm();
      setShowModal(true);
  };

  const resetForm = () => {
      setGroupId(null);
      setGroupName('');
      setGroupType('Grupo de Amistad');
      setGroupDay('');
      setGroupTime('');
      setFacilitators([]);
      setCoFacilitators([]);
  };

  const addFacilitator = (val) => {
     if(val && !facilitators.includes(val)) setFacilitators([...facilitators, val]);
  };
  const removeFacilitator = (val) => {
     setFacilitators(facilitators.filter(f => f !== val));
  };
  const addCoFacilitator = (val) => {
     if(val && !coFacilitators.includes(val)) setCoFacilitators([...coFacilitators, val]);
  };
  const removeCoFacilitator = (val) => {
     setCoFacilitators(coFacilitators.filter(f => f !== val));
  };

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-between align-center mb-4">
         <h1>Grupos y Ministerios</h1>
         {isAdmin && (
             <Button icon={<Plus size={16} />} onClick={handleAddNew}>Nuevo Grupo</Button>
         )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
         {loading ? <p>Cargando grupos...</p> : (
             groups.length === 0 ? <p>No hay grupos creados.</p> :
             groups.map(group => {
                const groupMembers = membersList.filter(m => m.group === group.name);
                const count = groupMembers.length;
                return (
                 <Card key={group.id} className="mb-2">
                    <div className="d-flex justify-between align-center mb-2">
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Users size={18} color="var(--color-primary-light)" /> 
                            {group.name}
                        </h3>
                        <span className="badge badge-gray">{group.type}</span>
                    </div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', marginBottom: '1rem' }}>
                        {group.type === 'Grupo de Amistad' && group.scheduleDay && group.scheduleTime ? (
                            <div className="d-flex align-center gap-2 mb-2">
                                <span>📅 {group.scheduleDay}</span>
                                <span>🕒 {group.scheduleTime} hs</span>
                                <span style={{ marginLeft: '1rem' }}>👥 {count} miembros</span>
                            </div>
                        ) : (
                            <div className="d-flex align-center gap-2 mb-2">
                                <span>👥 {count} miembros</span>
                                <span style={{ marginLeft: '1rem' }}>Agrupación habilitada para cargar miembros.</span>
                            </div>
                        )}
                        
                        {(group.facilitators?.length > 0 || group.coFacilitators?.length > 0) && (
                            <div style={{ padding: '0.75rem', backgroundColor: 'var(--color-bg)', borderRadius: '8px', marginBottom: '1rem' }}>
                                {group.facilitators?.length > 0 && (
                                    <div style={{ marginBottom: '0.5rem' }}>
                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>Facilitador/es</div>
                                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>{Array.isArray(group.facilitators) ? group.facilitators.map(resolveMemberName).join(' / ') : resolveMemberName(group.facilitators)}</div>
                                    </div>
                                )}
                                {group.coFacilitators?.length > 0 && (
                                    <div>
                                        <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.1rem' }}>Co-Facilitador/es</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{Array.isArray(group.coFacilitators) ? group.coFacilitators.map(resolveMemberName).join(' / ') : resolveMemberName(group.coFacilitators)}</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="d-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/grupos/${group.id}`)} style={{ color: 'var(--color-primary-light)', borderColor: 'var(--color-primary-light)' }} icon={<Users size={14} />}>Ver Miembros</Button>
                        {isAdmin && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => handleEdit(group)} style={{ color: '#2563eb', borderColor: '#2563eb' }} icon={<Edit size={14} />}>Editar</Button>
                            <Button variant="outline" size="sm" onClick={() => handleDelete(group.id)} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} icon={<Trash2 size={14} />}>Eliminar</Button>
                          </>
                        )}
                    </div>
                 </Card>
                );
             })
         )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={groupId ? "Editar Grupo" : "Crear Nuevo Grupo"}>
          <form onSubmit={handleCreate}>
              <div className="form-group mb-4">
                  <label className="form-label">Nombre de la agrupación</label>
                  <input required className="form-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej. Jóvenes Semillas" />
              </div>
              <div className="form-group mb-4">
                  <label className="form-label">Tipo de agrupación</label>
                  <select className="form-input" value={groupType} onChange={(e) => setGroupType(e.target.value)} style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}>
                      <option value="Grupo de Amistad">Grupo de Amistad</option>
                      <option value="Ministerio Administrativo">Ministerio Administrativo</option>
                      <option value="Grupo de Apoyo">Grupo de Apoyo</option>
                      <option value="Otro">Otro</option>
                  </select>
              </div>
              
              {groupType === 'Grupo de Amistad' && (
                  <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                      <div className="form-group m-0">
                          <label className="form-label">Día de reunión *</label>
                          <select required className="form-input" value={groupDay} onChange={(e) => setGroupDay(e.target.value)} style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}>
                              <option value="">Seleccionar día</option>
                              <option value="Lunes">Lunes</option>
                              <option value="Martes">Martes</option>
                              <option value="Miércoles">Miércoles</option>
                              <option value="Jueves">Jueves</option>
                              <option value="Viernes">Viernes</option>
                              <option value="Sábado">Sábado</option>
                              <option value="Domingo">Domingo</option>
                          </select>
                      </div>
                      <div className="form-group m-0">
                          <label className="form-label">Horario *</label>
                          <input type="time" required className="form-input" value={groupTime} onChange={(e) => setGroupTime(e.target.value)} style={{ width: '100%' }} />
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                  <div className="form-group m-0">
                      <label className="form-label">Líder / Facilitador/es</label>
                      <select className="form-input" defaultValue="" onChange={(e) => { addFacilitator(e.target.value); e.target.value=''; }} style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}>
                          <option value="" disabled>Agregar facilitador...</option>
                          {membersList.map(m => (
                              <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
                          ))}
                      </select>
                      {facilitators.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mt-2">
                             {facilitators.map(f => (
                                <span key={f} className="badge badge-gray" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                   {resolveMemberName(f)} <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => removeFacilitator(f)}>×</span>
                                </span>
                             ))}
                          </div>
                      )}
                  </div>
                  <div className="form-group m-0" style={{ marginTop: '0.5rem' }}>
                      <label className="form-label">Co-Facilitador/es</label>
                      <select className="form-input" defaultValue="" onChange={(e) => { addCoFacilitator(e.target.value); e.target.value=''; }} style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}>
                          <option value="" disabled>Agregar co-facilitador...</option>
                          {membersList.map(m => (
                              <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
                          ))}
                      </select>
                      {coFacilitators.length > 0 && (
                          <div className="d-flex flex-wrap gap-1 mt-2">
                             {coFacilitators.map(f => (
                                <span key={f} className="badge badge-gray" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                   {resolveMemberName(f)} <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => removeCoFacilitator(f)}>×</span>
                                </span>
                             ))}
                          </div>
                      )}
                  </div>
              </div>

              <Button type="submit" variant="primary" style={{ width: '100%' }} disabled={creating}>
                 {creating ? 'Guardando...' : (groupId ? 'Guardar Cambios' : 'Crear Grupo')}
              </Button>
          </form>
      </Modal>
    </div>
  );
};
export default Groups;
