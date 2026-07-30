import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, UserPlus, Users } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MemberForm from '../components/members/MemberForm';
import { SkeletonCard } from '../components/common/Skeleton';
import { getGroup } from '../services/groupService';
import { getMembers, updateMember } from '../services/memberService';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../utils/useDebounce';

const GroupDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser, hasRole } = useAuth();
    const [group, setGroup] = useState(null);
    const [membersList, setMembersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddMember, setShowAddMember] = useState(false);
    const [showCreateMember, setShowCreateMember] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 200);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [gData, mData] = await Promise.all([
                getGroup(id),
                getMembers()
            ]);
            setGroup(gData);
            setMembersList(mData);
            setLoading(false);
        };
        loadData();
    }, [id]);

    if (loading) return <div style={{ padding: '2rem' }}><SkeletonCard /></div>;
    if (!group) return <div style={{ padding: '2rem', textAlign: 'center' }}>Grupo no encontrado.</div>;

    const getArray = (val) => {
        if(Array.isArray(val)) return val;
        if(typeof val === 'string' && val.trim() !== '') return val.split(',').map(s=>s.trim());
        return [];
    };

    const facilitatorsIds = getArray(group.facilitators);
    const coFacilitatorsIds = getArray(group.coFacilitators);

    const isLegacyMatch = (legacyArr, m) => {
        return legacyArr.some(acc => {
            if (m.id === acc) return true;
            const txt = String(acc).toLowerCase();
            const l = String(m.lastName || '').trim().toLowerCase();
            const f = String(m.firstName || '').trim().toLowerCase();
            if (l.length > 2 && txt.includes(l)) return true;
            if (f.length > 2 && txt.includes(f)) return true;
            return false;
        });
    };

    const groupMembers = membersList.filter(m => m.group === group.name);
    const currentMember = membersList.find(member => member.email?.trim().toLowerCase() === currentUser?.email?.trim().toLowerCase());
    const isGroupLeader = currentMember && isLegacyMatch([...facilitatorsIds, ...coFacilitatorsIds], currentMember);
    const canManage = hasRole(['Admin', 'Pastor']) || (hasRole(['Facilitator', 'CoFacilitator']) && isGroupLeader);
    const availableMembers = membersList
        .filter(member => member.group !== group.name)
        .filter(member => `${member.firstName} ${member.lastName} ${member.dni || ''}`.toLowerCase().includes(debouncedSearch.toLowerCase()))
        .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

    const refreshMembers = async () => {
        const data = await getMembers();
        setMembersList(data);
    };

    const handleAddMember = async (member) => {
        if (member.group && !window.confirm(`${member.lastName}, ${member.firstName} pertenece a ${member.group}. ¿Moverlo a ${group.name}?`)) return;
        try {
            await updateMember(member.id, { group: group.name, groupId: group.id });
            await refreshMembers();
            setShowAddMember(false);
            setSearchTerm('');
        } catch (error) {
            console.error('Error adding member to group', error);
            alert('No se pudo asignar la persona al grupo.');
        }
    };

    let groupFacilitators = groupMembers.filter(m => isLegacyMatch(facilitatorsIds, m));
    let groupCoFacilitators = groupMembers.filter(m => !isLegacyMatch(facilitatorsIds, m) && isLegacyMatch(coFacilitatorsIds, m));
    let normalMembers = groupMembers.filter(m => !isLegacyMatch(facilitatorsIds, m) && !isLegacyMatch(coFacilitatorsIds, m));

    const sortFn = (a, b) => (a.lastName||'').localeCompare(b.lastName||'');
    groupFacilitators = groupFacilitators.sort(sortFn);
    groupCoFacilitators = groupCoFacilitators.sort(sortFn);
    normalMembers = normalMembers.sort(sortFn);

    const renderRow = (m) => (
        <tr key={m.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
            <td data-label="Miembro" style={{ padding: '1rem' }}>
                <div style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => navigate(`/dashboard/miembros/${m.id}`)}>
                   {m.lastName}, {m.firstName}
                </div>
            </td>
            <td data-label="DNI" style={{ padding: '1rem' }}>{m.dni || '-'}</td>
            <td data-label="Contacto" style={{ padding: '1rem' }}>{m.phone || '-'}</td>
        </tr>
    );

    return (
        <div className="animate-fade-in">
            <div className="d-flex align-center gap-3 mb-4" style={{ flexWrap: 'wrap' }}>
                <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/grupos')}>Volver</Button>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={24} color="var(--color-primary)" />
                    Integrantes de {group.name}
                </h1>
                {canManage && <Button size="sm" icon={<UserPlus size={15} />} onClick={() => setShowAddMember(true)}>Agregar persona</Button>}
                {canManage && <Button size="sm" variant="outline" icon={<UserPlus size={15} />} onClick={() => setShowCreateMember(true)}>Nuevo miembro</Button>}
            </div>

            <Card className="mb-4">
               <div className="d-flex gap-4" style={{ flexWrap: 'wrap' }}>
                   <div>
                       <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Tipo de grupo</span>
                       <span className="badge badge-gray">{group.type}</span>
                   </div>
                   {group.scheduleDay && group.scheduleTime && (
                       <div>
                           <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Encuentros</span>
                           <span>📅 {group.scheduleDay} a las 🕒 {group.scheduleTime} hs</span>
                       </div>
                   )}
                   <div>
                       <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Total asignados</span>
                       <span style={{ fontWeight: 600 }}>{groupMembers.length} personas</span>
                   </div>
               </div>
            </Card>

            <Card style={{ padding: 0 }}>
                <div style={{ overflowX: 'auto' }}>
                    <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                        <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                <th style={{ padding: '1rem' }}>Miembro</th>
                                <th style={{ padding: '1rem' }}>DNI</th>
                                <th style={{ padding: '1rem' }}>Celular / Teléfono</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupFacilitators.length === 0 && groupCoFacilitators.length === 0 && normalMembers.length === 0 ? (
                                <tr>
                                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                       No hay miembros asignados a esta agrupación.
                                    </td>
                                </tr>
                            ) : (
                                <>
                                    {groupFacilitators.length > 0 && (
                                        <>
                                            <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                                                <td colSpan="3" style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>🌟 Facilitadores</td>
                                            </tr>
                                            {groupFacilitators.map(renderRow)}
                                        </>
                                    )}
                                    {groupCoFacilitators.length > 0 && (
                                        <>
                                            <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                                                <td colSpan="3" style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>⭐ Co-Facilitadores</td>
                                            </tr>
                                            {groupCoFacilitators.map(renderRow)}
                                        </>
                                    )}
                                    {normalMembers.length > 0 && (
                                        <>
                                            <tr style={{ backgroundColor: 'var(--color-bg)' }}>
                                                <td colSpan="3" style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>👥 Miembros Regulares</td>
                                            </tr>
                                            {normalMembers.map(renderRow)}
                                        </>
                                    )}
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title={`Agregar a ${group.name}`}>
                <div className="d-flex flex-column gap-3">
                    <div style={{ position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                        <input className="form-input" style={{ width: '100%', paddingLeft: '2.5rem' }} value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar por nombre o DNI..." autoFocus />
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                        {availableMembers.length === 0 ? (
                            <p style={{ margin: 0, padding: '1rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>No hay personas disponibles.</p>
                        ) : availableMembers.map(member => (
                            <button key={member.id} onClick={() => handleAddMember(member)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', padding: '0.75rem 1rem', border: 'none', borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', textAlign: 'left' }}>
                                <span><strong>{member.lastName}, {member.firstName}</strong><br /><small style={{ color: 'var(--color-text-muted)' }}>{member.dni || 'Sin DNI'}</small></span>
                                <small style={{ color: 'var(--color-text-muted)' }}>{member.group || 'Sin grupo'}</small>
                            </button>
                        ))}
                    </div>
                </div>
            </Modal>
            <Modal isOpen={showCreateMember} onClose={() => setShowCreateMember(false)} title={`Nuevo miembro para ${group.name}`}>
                <MemberForm fixedGroup={group.name} fixedGroupId={group.id} onSuccess={async () => {
                    await refreshMembers();
                    setShowCreateMember(false);
                }} />
            </Modal>
        </div>
    );
};

export default GroupDetails;
