import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { getGroups } from '../services/groupService';
import { getMembers } from '../services/memberService';
import { Heart, Users, CheckSquare, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GrowthGroups = () => {
    const { currentUser, hasRole } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('grupos');
    
    const [myMemberProfile, setMyMemberProfile] = useState(null);
    const [myGroups, setMyGroups] = useState([]);
    const [myMembers, setMyMembers] = useState([]);
    const [loading, setLoading] = useState(true);

    const isLegacyMatch = (legacyArr, m) => {
        if (!legacyArr || !Array.isArray(legacyArr)) return false;
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

    const getArray = (val) => {
        if(Array.isArray(val)) return val;
        if(typeof val === 'string' && val.trim() !== '') return val.split(',').map(s=>s.trim());
        return [];
    };

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const members = await getMembers();
            const groups = await getGroups();
            
            // Link current user to their Member profile via Email
            const me = members.find(m => m.email && currentUser?.email && m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
            setMyMemberProfile(me);

            if (hasRole(['Admin', 'Pastor'])) {
                // Admin and Pastor can see EVERYTHING
                setMyGroups(groups);
                const groupNames = groups.map(g => g.name);
                const mM = members.filter(m => m.group && groupNames.includes(m.group));
                setMyMembers(mM);
            } else if (me) {
                // Normal facilitator: Find groups where this user is a leader
                const myG = groups.filter(g => {
                    const facils = getArray(g.facilitators);
                    const coFacils = getArray(g.coFacilitators);
                    return isLegacyMatch(facils, me) || isLegacyMatch(coFacils, me);
                });
                setMyGroups(myG);

                // Members from all my groups
                const groupNames = myG.map(g => g.name);
                const mM = members.filter(m => m.group && groupNames.includes(m.group));
                setMyMembers(mM);
            }
            setLoading(false);
        };
        
        if (currentUser) {
           load();
        } else {
           setLoading(false);
        }
    }, [currentUser]);

    if (loading) return <div className="p-4 text-center">Cargando tu área de ministerio...</div>;

    const isAdminOrPastor = hasRole(['Admin', 'Pastor']);

    if (!myMemberProfile && !isAdminOrPastor) {
        return (
            <div className="animate-fade-in p-4 text-center mt-4">
                <Card>
                   <h2>No se encontró un perfil de miembro.</h2>
                   <p style={{ color: 'var(--color-text-muted)', marginTop: '1rem' }}>
                       Tu correo electrónico institucional (<strong>{currentUser?.email}</strong>) necesita estar guardado en tu ficha de la Base de Datos de Miembros para que el sistema reconozca tu identidad y despliegue tus Grupos designados.
                   </p>
                </Card>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="d-flex justify-between align-center mb-4">
                <h1>G. de Crecimiento</h1>
            </div>

            <div className="tabs mb-4" style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
                <button 
                  className={`btn ${activeTab === 'grupos' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('grupos')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0.5rem 1rem' }}>
                  <Heart size={16} /> Mis Grupos
                </button>
                <button 
                  className={`btn ${activeTab === 'miembros' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('miembros')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0.5rem 1rem' }}>
                  <Users size={16} /> Mis Miembros
                </button>
                <button 
                  className={`btn ${activeTab === 'asistencia' ? 'btn-primary' : 'btn-outline'}`}
                  onClick={() => setActiveTab('asistencia')}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, padding: '0.5rem 1rem' }}>
                  <CheckSquare size={16} /> Asistencia
                </button>
            </div>

            {activeTab === 'grupos' && (
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '1rem' }}>
                    {myGroups.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)' }}>No tienes grupos asignados a tu cargo actualmente.</p>
                    ) : (
                        myGroups.map(g => (
                            <Card key={g.id}>
                                <div className="d-flex justify-between align-center mb-2">
                                    <h3 style={{ margin: 0 }}>{g.name}</h3>
                                    <span className="badge badge-gray">{g.type}</span>
                                </div>
                                {g.scheduleDay && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>📅 {g.scheduleDay} a las {g.scheduleTime} hs</p>}
                                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                   <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>👥 Total Integrantes: {myMembers.filter(m => m.group === g.name).length}</div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'miembros' && (
                <Card style={{ padding: 0 }}>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                            <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    <th style={{ padding: '1rem' }}>Miembro</th>
                                    <th style={{ padding: '1rem' }}>Agrupación</th>
                                    <th style={{ padding: '1rem' }}>Contacto</th>
                                </tr>
                            </thead>
                            <tbody>
                                {myMembers.length === 0 ? (
                                    <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Aún no hay miembros integrados en tus agrupaciones.</td></tr>
                                ) : (
                                    myMembers.sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||'')).map(m => (
                                        <tr key={m.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => navigate(`/miembros/${m.id}`)}>
                                                    {m.lastName}, {m.firstName}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span className="badge badge-gray">{m.group}</span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{m.phone || '-'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {activeTab === 'asistencia' && (
                <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} color="var(--color-primary-light)" /> Registro de Asistencias</div>}>
                     <p style={{ color: 'var(--color-text-muted)', lineHeight: '1.6' }}>
                         Aquí podrás cargar las asistencias semanales de tus integrantes.<br/>
                         <strong>El formulario se habilitará en la próxima etapa administrativa.</strong>
                     </p>
                </Card>
            )}
        </div>
    );
};

export default GrowthGroups;
