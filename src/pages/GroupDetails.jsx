import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { getGroup } from '../services/groupService';
import { getMembers } from '../services/memberService';

const GroupDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [membersList, setMembersList] = useState([]);
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando información del grupo...</div>;
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
            <div className="d-flex align-center gap-3 mb-4">
                <Button variant="outline" icon={<ArrowLeft size={16} />} onClick={() => navigate('/dashboard/grupos')}>Volver</Button>
                <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Users size={24} color="var(--color-primary)" />
                    Integrantes de {group.name}
                </h1>
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
        </div>
    );
};

export default GroupDetails;
