import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import GroupForm from '../components/groups/GroupForm';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getGroups, deleteGroup } from '../services/groupService';
import { getMembers, updateMember } from '../services/memberService';
import { saveAttendance, getAttendance, getAttendanceForDateRange } from '../services/attendanceService';
import { getHolidays } from '../services/holidayService';
import { Heart, Users, CheckSquare, BookOpen, Save, Download, ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getDayNumber = (dayStr) => {
    if (!dayStr) return null;
    const s = dayStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (s.includes('dom')) return 0;
    if (s.includes('lun')) return 1;
    if (s.includes('mar')) return 2;
    if (s.includes('mie')) return 3;
    if (s.includes('jue')) return 4;
    if (s.includes('vie')) return 5;
    if (s.includes('sab')) return 6;
    return null;
};

const getAvailableDatesForDay = (scheduleDay, count = 12, holidayDates = []) => {
    const dates = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    
    let currentMatch = null;

    if (!scheduleDay) {
        currentMatch = today;
    } else {
        const targetDay = getDayNumber(scheduleDay);
        if (targetDay === null) {
            currentMatch = today;
        } else {
            const currentDay = today.getDay();
            let diff = currentDay - targetDay;
            if (diff < 0) diff += 7;
            currentMatch = new Date(today);
            currentMatch.setDate(today.getDate() - diff);
        }
    }

    let found = 0;
    let step = 0;
    const isWeekly = scheduleDay && getDayNumber(scheduleDay) !== null;

    while (found < count && step < 50) {
        const d = new Date(currentMatch);
        d.setDate(currentMatch.getDate() - (step * (isWeekly ? 7 : 1)));
        const dStr = d.toISOString().split('T')[0];
        
        if (!holidayDates.includes(dStr)) {
            dates.push(dStr);
            found++;
        }
        step++;
    }
    
    if (dates.length === 0) {
        dates.push(currentMatch.toISOString().split('T')[0]);
    }
    
    return dates;
};

const GrowthGroups = () => {
    const { currentUser, userData, hasRole } = useAuth();
    const isAdmin = hasRole(['Admin', 'Pastor']);
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(null);
    
    const [myMemberProfile, setMyMemberProfile] = useState(null);
    const [myGroups, setMyGroups] = useState([]);
    const [myMembers, setMyMembers] = useState([]);
    const [allMembers, setAllMembers] = useState([]); // Added for the form
    const [loading, setLoading] = useState(true);

    // Group CRUD state
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [editingGroup, setEditingGroup] = useState(null);

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

    const load = async () => {
        setLoading(true);
        const members = await getMembers();
        setAllMembers(members);
        const groups = await getGroups();
        
        const me = members.find(m => m.email && currentUser?.email && m.email.trim().toLowerCase() === currentUser.email.trim().toLowerCase());
        setMyMemberProfile(me);

        if (isAdmin) {
            setMyGroups(groups);
            const groupNames = groups.map(g => g.name);
            const mM = members.filter(m => m.group && groupNames.includes(m.group));
            setMyMembers(mM);
        } else if (me) {
            const myG = groups.filter(g => {
                const facils = getArray(g.facilitators);
                const coFacils = getArray(g.coFacilitators);
                return isLegacyMatch(facils, me) || isLegacyMatch(coFacils, me);
            });
            setMyGroups(myG);
            const groupNames = myG.map(g => g.name);
            const mM = members.filter(m => m.group && groupNames.includes(m.group));
            setMyMembers(mM);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (currentUser) {
           load();
        } else {
           setLoading(false);
        }
    }, [currentUser, isAdmin]);

    const handleDeleteGroup = async (id) => {
        if(window.confirm("¿Seguro que deseas eliminar este grupo?")) {
            await deleteGroup(id);
            load();
        }
    };

    if (loading) return <div className="p-4 text-center">Cargando tu área de ministerio...</div>;

    if (!myMemberProfile && !isAdmin) {
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

    const navigationCards = [
        { id: 'grupos', title: 'Mis Grupos', icon: <Heart size={32} color="var(--color-primary)" />, description: 'Gestiona tus agrupaciones asignadas y consulta sus horarios.' },
        { id: 'miembros', title: 'Mis Miembros', icon: <Users size={32} color="var(--color-primary)" />, description: 'Listado completo y fichas de contacto de tus integrantes.' },
        { id: 'asistencia', title: 'Asistencia y Reportes', icon: <CheckSquare size={32} color="var(--color-primary)" />, description: 'Toma asistencia y descarga informes mensuales o trimestrales.' }
    ];

    const resolveMemberName = (idOrName) => {
        if(!idOrName) return '';
        const member = allMembers.find(m => m.id === idOrName);
        if (member) return `${member.lastName}, ${member.firstName}`;
        return idOrName;
    };

    return (
        <div className="animate-fade-in">
            <div className="d-flex justify-between align-center mb-4">
                <div className="d-flex align-center gap-3">
                    {activeTab && (
                        <button className="btn btn-outline btn-sm" onClick={() => setActiveTab(null)} style={{ padding: '0.4rem' }}>
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <h1 style={{ margin: 0 }}>Grupos de Amistad {activeTab ? ` / ${navigationCards.find(c => c.id === activeTab)?.title}` : ''}</h1>
                </div>
                {isAdmin && !activeTab && (
                    <Button icon={<Plus size={16} />} onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}>Nuevo Grupo</Button>
                )}
            </div>

            {!activeTab ? (
                <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem', marginTop: '1rem' }}>
                    {navigationCards.map(card => (
                        <div 
                            key={card.id} 
                            onClick={() => setActiveTab(card.id)}
                            style={{ cursor: 'pointer', transition: 'transform 0.2s', transform: 'scale(1)' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                                <div style={{ 
                                    backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)', 
                                    width: '80px', 
                                    height: '80px', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    borderRadius: '50%', 
                                    marginBottom: '1.5rem',
                                    flexShrink: 0
                                }}>
                                    {card.icon}
                                </div>
                                <h2 style={{ marginBottom: '0.75rem', fontSize: '1.5rem' }}>{card.title}</h2>
                                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.925rem', lineHeight: '1.5' }}>{card.description}</p>
                            </Card>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="animate-slide-up">
                    {activeTab === 'grupos' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '1rem' }}>
                            {myGroups.length === 0 ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>No tienes grupos asignados a tu cargo actualmente.</p>
                            ) : (
                                myGroups.map(g => {
                                    const facils = getArray(g.facilitators);
                                    const coFacils = getArray(g.coFacilitators);
                                    
                                    return (
                                        <Card key={g.id}>
                                            <div className="d-flex justify-between align-start mb-3">
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--color-primary)' }}>{g.name}</h3>
                                                    <span className="badge badge-gray" style={{ fontSize: '0.7rem', marginTop: '0.25rem' }}>{g.type}</span>
                                                </div>
                                                {g.scheduleDay && <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>📅 {g.scheduleDay}<br/>🕒 {g.scheduleTime} hs</div>}
                                            </div>

                                            <div style={{ marginBottom: '1.5rem' }}>
                                                {facils.length > 0 && (
                                                    <div style={{ marginBottom: '0.5rem' }}>
                                                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Facilitador/es</div>
                                                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--color-text)' }}>
                                                            {facils.map(resolveMemberName).join(' / ')}
                                                        </div>
                                                    </div>
                                                )}
                                                {coFacils.length > 0 && (
                                                    <div>
                                                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: '0.15rem' }}>Co-Facilitador/es</div>
                                                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                                                            {coFacils.map(resolveMemberName).join(' / ')}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                            <div className="d-flex justify-between align-center">
                                                    <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>👥 {myMembers.filter(m => m.group === g.name).length} Miembros</div>
                                                    <div className="d-flex gap-2">
                                                        <Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => { setEditingGroup(g); setShowGroupModal(true); }}>Editar</Button>
                                                        {isAdmin && (
                                                            <Button variant="outline" size="sm" icon={<Trash2 size={14} />} style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleDeleteGroup(g.id)}>Eliminar</Button>
                                                        )}
                                                    </div>
                                            </div>
                                            </div>
                                        </Card>
                                    );
                                })
                            )}
                        </div>
                    )}

                    {activeTab === 'miembros' && (
                        /* (rest of the members tab code remains the same as before my latest change, effectively kept in-sync) */
                        <div className="d-flex flex-column gap-4">
                            {myGroups.length === 0 ? (
                                <Card><p style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay grupos ni miembros vinculados a tu cargo.</p></Card>
                            ) : myGroups.sort((a,b)=>a.name.localeCompare(b.name)).map(group => {
                                const membersOfGroup = myMembers.filter(m => m.group === group.name).sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||''));
                                if (membersOfGroup.length === 0 && !isAdmin) return null;
                                return (
                                    <div key={group.id} className="animate-slide-up">
                                        <div className="d-flex align-center gap-2 mb-2 ml-1">
                                            <Heart size={16} color="var(--color-primary)" />
                                            <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{group.name}</h3>
                                            <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{membersOfGroup.length} miembros</span>
                                        </div>
                                        <Card style={{ padding: 0 }}>
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                                    <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                                                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                            <th style={{ padding: '0.875rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Miembro</th>
                                                            <th style={{ padding: '0.875rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>Contacto</th>
                                                            <th style={{ padding: '0.875rem 1.25rem', color: 'var(--color-text-muted)', fontWeight: 600, textAlign: 'right' }}>Vínculo</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {membersOfGroup.length === 0 ? (
                                                            <tr><td colSpan="3" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>Sin miembros registrados en este grupo.</td></tr>
                                                        ) : (
                                                            membersOfGroup.map(m => (
                                                                <tr key={m.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                                    <td style={{ padding: '0.875rem 1.25rem' }}>
                                                                        <div style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)' }} onMouseOver={e=>e.currentTarget.style.color='var(--color-primary)'} onMouseOut={e=>e.currentTarget.style.color='var(--color-text)'} onClick={() => navigate(`/miembros/${m.id}`)}>
                                                                            {m.lastName}, {m.firstName}
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '0.875rem 1.25rem' }}>{m.phone || m.email || '-'}</td>
                                                                    <td style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
                                                                        <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>Miembro</span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </Card>
                                    </div>
                                );
                            })}
                        </div>
                    )}


                    {activeTab === 'asistencia' && (
                        <AttendanceTab 
                            myGroups={myGroups} 
                            myMembers={myMembers} 
                            isAdmin={isAdmin} 
                        />
                    )}
                </div>
            )}
            <Modal isOpen={showGroupModal} onClose={() => setShowGroupModal(false)} title={editingGroup ? "Editar Grupo" : "Crear Nuevo Grupo"}>
                <GroupForm 
                    initialData={editingGroup} 
                    membersList={allMembers} 
                    onSuccess={() => {
                        setShowGroupModal(false);
                        load();
                    }} 
                />
            </Modal>
        </div>
    );
};

const AttendanceTab = ({ myGroups, myMembers, isAdmin }) => {
    const { settings } = useSettings();
    const absenceReasonsPool = settings?.absenceReasons || ['Salud', 'Laboral', 'Estudios', 'Actividad de la Iglesia', 'Otros'];
    
    const [selectedGroupId, setSelectedGroupId] = useState(myGroups.length > 0 ? myGroups[0].id : '');
    const [availableDates, setAvailableDates] = useState([]);
    const [attendanceDate, setAttendanceDate] = useState('');
    const [presentIds, setPresentIds] = useState([]);
    const [absentDetails, setAbsentDetails] = useState({});
    const [holidays, setHolidays] = useState([]);
    
    useEffect(() => {
        const loadHolidays = async () => {
            const data = await getHolidays();
            setHolidays(data.map(h => h.date));
        };
        loadHolidays();
    }, []);
    
    const [loadingRecord, setLoadingRecord] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reportPeriod, setReportPeriod] = useState('mensual');

    const selectedGroup = myGroups.find(g => g.id === selectedGroupId);
    const groupMembers = myMembers.filter(m => selectedGroup && m.group === selectedGroup.name).sort((a,b) => (a.lastName||'').localeCompare(b.lastName||''));

    useEffect(() => {
        if (selectedGroup) {
            const dates = getAvailableDatesForDay(selectedGroup.scheduleDay, 12, holidays);
            setAvailableDates(dates);
            if (!dates.includes(attendanceDate)) {
                setAttendanceDate(dates[0]);
            }
        }
    }, [selectedGroupId, selectedGroup?.scheduleDay, holidays]);

    useEffect(() => {
        const fetchExisting = async () => {
            if (!selectedGroupId || !attendanceDate) return;
            setLoadingRecord(true);
            const record = await getAttendance(selectedGroupId, attendanceDate);
            if (record) {
                setPresentIds(record.presentMembers || []);
                setAbsentDetails(record.absentDetails || {});
            } else {
                setPresentIds([]);
                setAbsentDetails({});
            }
            setLoadingRecord(false);
        };
        fetchExisting();
    }, [selectedGroupId, attendanceDate]);

    const toggleMember = (id) => {
        if (presentIds.includes(id)) {
            setPresentIds(presentIds.filter(pid => pid !== id));
        } else {
            setPresentIds([...presentIds, id]);
        }
    };

    const handleSave = async () => {
        if (!selectedGroupId || !attendanceDate) return;
        const cleanedAbsentDetails = { ...absentDetails };
        presentIds.forEach(id => { delete cleanedAbsentDetails[id]; });
        setSaving(true);
        try {
            await saveAttendance(selectedGroupId, attendanceDate, presentIds, cleanedAbsentDetails);
            alert('¡Asistencia guardada con éxito!');
        } catch (e) {
            alert('Hubo un error al guardar la asistencia.');
        } finally {
            setSaving(false);
        }
    };

    const exportReport = async () => {
        const end = new Date();
        const start = new Date();
        if (reportPeriod === 'diario') start.setDate(end.getDate() - 1);
        if (reportPeriod === 'semanal') start.setDate(end.getDate() - 7);
        if (reportPeriod === 'mensual') start.setMonth(end.getMonth() - 1);
        if (reportPeriod === 'trimestral') start.setMonth(end.getMonth() - 3);
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];
        let groupsToFetch = [];
        if (!isAdmin) groupsToFetch = myGroups.map(g => g.id);
        const records = await getAttendanceForDateRange(groupsToFetch, startStr, endStr);
        if (records.length === 0) {
             alert(`No se encontraron registros de asistencia para el período ${reportPeriod}.`);
             return;
        }
        let csv = 'Fecha,Grupo,ID Grupo,Asistentes Totales\n';
        records.forEach(r => {
             const gDetails = myGroups.find(gr => gr.id === r.groupId);
             const gName = gDetails ? gDetails.name : r.groupId;
             csv += `"${r.date}","${gName}","${r.groupId}","${r.presentMembers.length}"\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Reporte_Asistencia_${reportPeriod}_${endStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (myGroups.length === 0) {
        return <Card><p style={{ color: 'var(--color-text-muted)' }}>No tienes grupos para tomar lista.</p></Card>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: '1rem' }}>
            <div className="lg:col-span-2">
                <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={20} color="var(--color-primary)" /> Cargar Asistencia</div>}>
                    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                        <div className="form-group m-0">
                            <label className="form-label">Agrupación</label>
                            <select 
                                className="form-input" 
                                value={selectedGroupId} 
                                onChange={e => setSelectedGroupId(e.target.value)}
                                style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}
                            >
                                {myGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group m-0">
                            <label className="form-label">Fecha del Encuentro</label>
                            <select 
                                className="form-input" 
                                value={attendanceDate}
                                onChange={e => setAttendanceDate(e.target.value)}
                                style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}
                            >
                                {availableDates.map(dateStr => {
                                    const dObj = new Date(dateStr + "T12:00:00");
                                    const label = dObj.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                                    return <option key={dateStr} value={dateStr}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                                })}
                            </select>
                        </div>
                    </div>

                    {selectedGroup && (
                        <div>
                            <div className="d-flex justify-between align-center mb-3">
                                <div>
                                    <span style={{ fontWeight: 600 }}>Miembros Totales: {groupMembers.length}</span>
                                    <span style={{ color: 'var(--color-primary)', marginLeft: '1rem', fontWeight: 600 }}>Presentes: {presentIds.length}</span>
                                </div>
                                <button className="btn btn-outline btn-sm" onClick={() => setPresentIds(groupMembers.map(m => m.id))}>
                                    Marcar todos
                                </button>
                            </div>

                            {loadingRecord ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>Buscando registros...</p>
                            ) : (
                                <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                                    {groupMembers.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay integrantes en este grupo.</div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                                            <tbody>
                                                {groupMembers.map(m => {
                                                    const isPresent = presentIds.includes(m.id);
                                                    return (
                                                        <tr key={m.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: isPresent ? 'rgba(76, 175, 80, 0.05)' : 'transparent' }}>
                                                            <td style={{ padding: '0.75rem 1rem', width: '40px' }}>
                                                                <input type="checkbox" checked={isPresent} onChange={() => toggleMember(m.id)} style={{ cursor: 'pointer', width: '18px', height: '18px', accentColor: 'var(--color-primary)' }} />
                                                            </td>
                                                            <td style={{ padding: '0.75rem 1rem' }}>
                                                                <div style={{ fontWeight: isPresent ? 600 : 500, cursor: 'pointer' }} onClick={() => toggleMember(m.id)}>{m.lastName}, {m.firstName}</div>
                                                                {!isPresent && (
                                                                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                                        <select 
                                                                            value={absentDetails[m.id]?.reason || ''} 
                                                                            onChange={e => setAbsentDetails(prev => ({ ...prev, [m.id]: { ...prev[m.id], reason: e.target.value } }))}
                                                                            style={{ padding: '0.25rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)', flex: 1, minWidth: '120px', backgroundColor: 'var(--color-surface)' }}
                                                                        >
                                                                            <option value="">-- Indicar Motivo --</option>
                                                                            {absenceReasonsPool.map(r => <option key={r} value={r}>{r}</option>)}
                                                                        </select>
                                                                        {absentDetails[m.id]?.reason === 'Otros' && (
                                                                            <input 
                                                                                type="text" placeholder="¿Cuál?" value={absentDetails[m.id]?.detail || ''} 
                                                                                onChange={e => setAbsentDetails(prev => ({ ...prev, [m.id]: { ...prev[m.id], detail: e.target.value } }))}
                                                                                style={{ padding: '0.25rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--color-border)', flex: 1, minWidth: '100px', backgroundColor: 'var(--color-surface)' }}
                                                                            />
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            <div className="mt-4">
                                <button className="btn btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem' }} onClick={handleSave} disabled={saving || loadingRecord}>
                                    <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Asistencia'}
                                </button>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            <div className="lg:col-span-1">
                <Card title={<div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BookOpen size={20} color="var(--color-primary-light)" /> Reportes y Exportación</div>}>
                    <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        Descarga el consolidado de asistencia de {isAdmin ? 'todos los grupos de amistad de la iglesia' : 'tus grupos asignados'} en formato Excel/CSV.
                    </p>
                    <div className="form-group mb-4">
                        <label className="form-label">Período de extracción</label>
                        <select className="form-input" value={reportPeriod} onChange={e => setReportPeriod(e.target.value)} style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}>
                            <option value="diario">Diario (Últimas 24hs)</option>
                            <option value="semanal">Semanal (Últimos 7 días)</option>
                            <option value="mensual">Mensual (Últimos 30 días)</option>
                            <option value="trimestral">Trimestral (Últimos 90 días)</option>
                        </select>
                    </div>
                    <button className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem' }} onClick={exportReport}>
                        <Download size={18} /> Generar y Descargar Reporte
                    </button>
                </Card>
            </div>
        </div>
    );
};

export default GrowthGroups;
