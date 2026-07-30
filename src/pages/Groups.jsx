import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import { Plus, Users, Edit, Trash2, Search, Clock, CalendarDays, UserCheck } from 'lucide-react';
import { getGroups, createGroup, deleteGroup, updateGroup } from '../services/groupService';
import { getMembers, updateMember } from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { normalizeString } from '../utils/helpers';
import { useDebounce } from '../utils/useDebounce';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/Skeleton';
import './Groups.css';

const getArray = (val) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') return val.split(',').map(s => s.trim());
  return [];
};

const getFacilitatorEmails = (group, members) => {
  const leaders = [...getArray(group.facilitators), ...getArray(group.coFacilitators)];
  return [...new Set(leaders.map(value => {
    const normalized = String(value).trim().toLowerCase();
    const member = members.find(item => item.id === value || `${item.firstName} ${item.lastName}`.trim().toLowerCase() === normalized || `${item.lastName}, ${item.firstName}`.trim().toLowerCase() === normalized);
    return member?.email?.trim().toLowerCase();
  }).filter(Boolean))].sort();
};

const Groups = () => {
  const { currentUser, hasRole } = useAuth();
  const isAdmin = hasRole(['Admin', 'Pastor']);
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [membersList, setMembersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);

  const [groupId, setGroupId] = useState(null);
  const [groupName, setGroupName] = useState('');
  const [groupType, setGroupType] = useState('Grupo de Amistad');
  const [groupDay, setGroupDay] = useState('');
  const [groupTime, setGroupTime] = useState('');
  const [facilitators, setFacilitators] = useState([]);
  const [coFacilitators, setCoFacilitators] = useState([]);
  const [creating, setCreating] = useState(false);

  const resolveMemberName = (idOrName) => {
    if (!idOrName) return '';
    const member = membersList.find(m => m.id === idOrName);
    if (member) return `${member.lastName}, ${member.firstName}`;
    return idOrName;
  };

  const isGroupLeader = (group) => {
    const currentMember = membersList.find(member => member.email?.trim().toLowerCase() === currentUser?.email?.trim().toLowerCase());
    if (!currentMember) return false;
    const leaders = [...getArray(group.facilitators), ...getArray(group.coFacilitators)];
    const names = [`${currentMember.firstName} ${currentMember.lastName}`, `${currentMember.lastName}, ${currentMember.firstName}`].map(name => name.toLowerCase());
    return leaders.some(leader => leader === currentMember.id || names.includes(String(leader).trim().toLowerCase()));
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [data, mems] = await Promise.all([getGroups(), getMembers()]);
      if (!mounted) return;
      setMembersList(mems.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')));

      let madeChanges = false;
      if (isAdmin) {
        for (let g of data) {
          const changes = {};
          let newName = g.name;
          if (g.name === '8. Perez, Pereira (La Tribu) - Viernes') newName = 'LA TRIBU';
          if (typeof g.name === 'string' && g.name.includes('5. Quaresima')) newName = 'QUARESIMA';
          if (typeof g.name === 'string' && g.name.includes('4. Ortiz')) newName = 'ORTIZ-HARDOY (MARTES)';
          if (typeof g.name === 'string' && g.name.includes('3. T')) newName = 'TEVEZ-DIAZ';
          if (typeof g.name === 'string' && g.name.includes('10. Sanchez')) newName = 'SANCHEZ';
          if (newName !== g.name) changes.name = newName;
          if (newName === 'TEVEZ-DIAZ' && g.scheduleDay !== 'Jueves') changes.scheduleDay = 'Jueves';
          const facilitatorEmails = getFacilitatorEmails(g, mems);
          if (JSON.stringify(g.facilitatorEmails || []) !== JSON.stringify(facilitatorEmails)) changes.facilitatorEmails = facilitatorEmails;
          if (Object.keys(changes).length > 0) {
            await updateGroup(g.id, changes);
            madeChanges = true;
          }
        }
      }
      if (madeChanges) {
        const freshData = await getGroups();
        setGroups(freshData);
      } else {
        setGroups(data);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  const refresh = async () => {
    const data = await getGroups();
    setGroups(data);
  };

  const filtered = groups.filter(g => {
    if (!debouncedSearch) return true;
    const q = normalizeString(debouncedSearch).toLowerCase();
    const name = normalizeString(g.name || '').toLowerCase();
    const facils = getArray(g.facilitators).map(resolveMemberName).join(' ');
    const coFacils = getArray(g.coFacilitators).map(resolveMemberName).join(' ');
    return name.includes(q) || normalizeString(facils).toLowerCase().includes(q) || normalizeString(coFacils).toLowerCase().includes(q);
  });
  const visibleGroups = isAdmin ? filtered : filtered.filter(isGroupLeader);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        name: groupName,
        type: groupType,
        facilitators,
        coFacilitators,
        facilitatorEmails: getFacilitatorEmails({ facilitators, coFacilitators }, membersList)
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
        let m = membersList.find(x => x.id === idOrName);
        if (m) return m;
        const normSearch = idOrName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        m = membersList.find(x => {
          const fullName = `${x.lastName}, ${x.firstName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          const reverseName = `${x.firstName} ${x.lastName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
          return fullName === normSearch || reverseName === normSearch;
        });
        return m;
      };

      const syncMemberPromises = [];
      const updateRoleForMember = (memberId, targetRole) => {
        const m = membersList.find(x => x.id === memberId);
        if (!m) return;
        const toUpdate = {};
        if (m.group !== groupName) toUpdate.group = groupName;
        let currentRoles = Array.isArray(m.role) ? m.role : [m.role || 'Member'];
        const eliteRoles = ['Admin', 'Pastor', 'MinistryLeader'];
        const isElite = currentRoles.some(r => eliteRoles.includes(r));
        if (!isElite && !currentRoles.includes(targetRole)) {
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
        setMembersList(data.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || '')));
      }

      resetForm();
      setShowModal(false);
      refresh();
    } catch (e) {
      console.error(e);
      alert('Hubo un error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este grupo?")) {
      await deleteGroup(id);
      refresh();
    }
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

  const resetForm = () => {
    setGroupId(null);
    setGroupName('');
    setGroupType('Grupo de Amistad');
    setGroupDay('');
    setGroupTime('');
    setFacilitators([]);
    setCoFacilitators([]);
  };

  const addFacilitator = (val) => { if (val && !facilitators.includes(val)) setFacilitators([...facilitators, val]); };
  const removeFacilitator = (val) => { setFacilitators(facilitators.filter(f => f !== val)); };
  const addCoFacilitator = (val) => { if (val && !coFacilitators.includes(val)) setCoFacilitators([...coFacilitators, val]); };
  const removeCoFacilitator = (val) => { setCoFacilitators(coFacilitators.filter(f => f !== val)); };

  return (
    <div className="groups-page">
      <div className="groups-header">
        <h1>Grupos</h1>
        {isAdmin && <Button icon={<Plus size={16} />} onClick={() => { resetForm(); setShowModal(true); }}>Nuevo grupo</Button>}
      </div>

      <div className="groups-filters">
        <div className="groups-search-wrap">
          <span className="groups-search-icon"><Search size={16} /></span>
          <input
            className="form-input groups-search-input"
            placeholder="Buscar por nombre o facilitador..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <Card><SkeletonTable rows={6} /></Card>
      ) : visibleGroups.length === 0 ? (
        <Card><EmptyState icon={Users} title="Sin grupos" message="No se encontraron grupos con los filtros actuales." /></Card>
      ) : (
        <div className="groups-grid">
          {visibleGroups.map(group => {
            const groupMembers = membersList.filter(m => m.group === group.name);
            const count = groupMembers.length;
            return (
              <Card key={group.id} className="groups-card">
                <div className="groups-card-header">
                  <div className="groups-card-title">
                    <Users size={16} />
                    <span>{group.name}</span>
                  </div>
                  <span className="groups-card-type">{group.type}</span>
                </div>

                <div className="groups-card-body">
                  {group.type === 'Grupo de Amistad' && group.scheduleDay && group.scheduleTime ? (
                    <div className="groups-card-meta">
                      <span><CalendarDays size={13} /> {group.scheduleDay}</span>
                      <span><Clock size={13} /> {group.scheduleTime} hs</span>
                      <span><UserCheck size={13} /> {count} miembros</span>
                    </div>
                  ) : (
                    <div className="groups-card-meta">
                      <span><UserCheck size={13} /> {count} miembros</span>
                    </div>
                  )}

                  {(getArray(group.facilitators).length > 0 || getArray(group.coFacilitators).length > 0) && (
                    <div className="groups-card-leaders">
                      {getArray(group.facilitators).length > 0 && (
                        <div className="groups-leader-section">
                          <span className="groups-leader-label">Facilitador</span>
                          <span className="groups-leader-name">{getArray(group.facilitators).map(resolveMemberName).join(', ')}</span>
                        </div>
                      )}
                      {getArray(group.coFacilitators).length > 0 && (
                        <div className="groups-leader-section">
                          <span className="groups-leader-label">Co-facilitador</span>
                          <span className="groups-leader-name groups-leader-co">{getArray(group.coFacilitators).map(resolveMemberName).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="groups-card-actions">
                    <Button variant="outline" size="sm" onClick={() => navigate(`/dashboard/grupos/${group.id}`)}>
                      <Users size={13} /> Miembros
                    </Button>
                    {isAdmin && (
                      <>
                        <button className="groups-action-btn" onClick={() => handleEdit(group)} title="Editar">
                          <Edit size={14} />
                        </button>
                        <button className="groups-action-btn groups-action-delete" onClick={() => handleDelete(group.id)} title="Eliminar">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={groupId ? 'Editar Grupo' : 'Nuevo Grupo'}>
        <form onSubmit={handleCreate}>
          <div className="form-group mb-4">
            <label className="form-label">Nombre del grupo</label>
            <input required className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Ej. Jóvenes Semillas" />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Tipo</label>
            <select className="form-input" value={groupType} onChange={e => setGroupType(e.target.value)}>
              <option value="Grupo de Amistad">Grupo de Amistad</option>
              <option value="Ministerio Administrativo">Ministerio Administrativo</option>
              <option value="Grupo de Apoyo">Grupo de Apoyo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {groupType === 'Grupo de Amistad' && (
            <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
              <div className="form-group m-0">
                <label className="form-label">Día</label>
                <select required className="form-input" value={groupDay} onChange={e => setGroupDay(e.target.value)}>
                  <option value="">Seleccionar</option>
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
                <label className="form-label">Horario</label>
                <input type="time" required className="form-input" value={groupTime} onChange={e => setGroupTime(e.target.value)} />
              </div>
            </div>
          )}

          <div className="form-group mb-4">
            <label className="form-label">Facilitadores</label>
            <select className="form-input" defaultValue="" onChange={e => { addFacilitator(e.target.value); e.target.value = ''; }}>
              <option value="" disabled>Agregar facilitador...</option>
              {membersList.map(m => (
                <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
              ))}
            </select>
            {facilitators.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mt-2">
                {facilitators.map(f => (
                  <span key={f} className="groups-badge">
                    {resolveMemberName(f)} <span className="groups-badge-remove" onClick={() => removeFacilitator(f)}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Co-facilitadores</label>
            <select className="form-input" defaultValue="" onChange={e => { addCoFacilitator(e.target.value); e.target.value = ''; }}>
              <option value="" disabled>Agregar co-facilitador...</option>
              {membersList.map(m => (
                <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
              ))}
            </select>
            {coFacilitators.length > 0 && (
              <div className="d-flex flex-wrap gap-1 mt-2">
                {coFacilitators.map(f => (
                  <span key={f} className="groups-badge">
                    {resolveMemberName(f)} <span className="groups-badge-remove" onClick={() => removeCoFacilitator(f)}>×</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={creating}>
            {creating ? 'Guardando...' : groupId ? 'Guardar cambios' : 'Crear grupo'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default Groups;
