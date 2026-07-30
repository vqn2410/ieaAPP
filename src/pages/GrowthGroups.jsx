import React, { useState, useEffect, useEffectEvent } from 'react';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import GroupForm from '../components/groups/GroupForm';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getGroups, deleteGroup, updateGroup } from '../services/groupService';
import { getMembers } from '../services/memberService';
import { saveAttendance, getAttendance, getAttendanceForDateRange } from '../services/attendanceService';
import { getHolidays } from '../services/holidayService';
import { CalendarDays, Heart, Users, CheckSquare, BookOpen, Save, Download, ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import EmptyState from '../components/common/EmptyState';
import { SkeletonCard } from '../components/common/Skeleton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FriendshipClasses from './FriendshipClasses';
import FollowUps from './FollowUps';
import './GrowthGroups.css';

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
    today.setHours(0, 0, 0, 0);

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

const getFacilitatorEmails = (group, members) => {
    const leaders = [...(Array.isArray(group.facilitators) ? group.facilitators : [group.facilitators].filter(Boolean)), ...(Array.isArray(group.coFacilitators) ? group.coFacilitators : [group.coFacilitators].filter(Boolean))];
    return [...new Set(leaders.map(value => {
        const normalized = String(value).trim().toLowerCase();
        const member = members.find(item => item.id === value || `${item.firstName} ${item.lastName}`.trim().toLowerCase() === normalized || `${item.lastName}, ${item.firstName}`.trim().toLowerCase() === normalized);
        return member?.email?.trim().toLowerCase();
    }).filter(Boolean))].sort();
};

const GrowthGroups = () => {
    const { currentUser, hasRole } = useAuth();
    const isAdmin = hasRole(['Admin', 'Pastor']);
    const canManageGroups = hasRole(['Admin', 'Pastor', 'Facilitator', 'CoFacilitator']);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState(searchParams.get('section'));

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
        if (Array.isArray(val)) return val;
        if (typeof val === 'string' && val.trim() !== '') return val.split(',').map(s => s.trim());
        return [];
    };

    const load = async () => {
        setLoading(true);
        const members = await getMembers();
        setAllMembers(members);
        let groups = await getGroups();

        if (isAdmin) {
            const updates = groups.map(async group => {
                const facilitatorEmails = getFacilitatorEmails(group, members);
                if (JSON.stringify(group.facilitatorEmails || []) !== JSON.stringify(facilitatorEmails)) {
                    await updateGroup(group.id, { facilitatorEmails });
                    return { ...group, facilitatorEmails };
                }
                return group;
            });
            groups = await Promise.all(updates);
        }

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser, isAdmin]);

    const handleDeleteGroup = async (id) => {
        if (window.confirm("¿Seguro que deseas eliminar este grupo?")) {
            await deleteGroup(id);
            load();
        }
    };

    if (loading) return <div className="p-4"><SkeletonCard /></div>;

    if (!myMemberProfile && !isAdmin && !['clases', 'seguimientos'].includes(activeTab)) {
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
        { id: 'grupos', title: 'Grupos', icon: <Heart size={32} color="var(--color-primary)" />, description: 'Gestiona tus agrupaciones asignadas y consulta sus horarios.', visible: canManageGroups },
        { id: 'miembros', title: 'Mis Miembros', icon: <Users size={32} color="var(--color-primary)" />, description: 'Listado completo y fichas de contacto de tus integrantes.', visible: canManageGroups },
        { id: 'asistencia', title: 'Asistencia y Reportes', icon: <CheckSquare size={32} color="var(--color-primary)" />, description: 'Toma asistencia y descarga informes mensuales o trimestrales.', visible: canManageGroups },
        { id: 'calendario', title: 'Calendario', icon: <CalendarDays size={32} color="var(--color-primary)" />, description: 'Consultá los días y horarios semanales de cada grupo.', visible: canManageGroups },
        { id: 'clases', title: 'Clases', icon: <BookOpen size={32} color="var(--color-primary)" />, description: 'Materiales y clases disponibles para los grupos.', visible: hasRole(['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member']) },
        { id: 'seguimientos', title: 'Seguimientos', icon: <CheckSquare size={32} color="var(--color-primary)" />, description: 'Gestioná los seguimientos de los miembros.', visible: hasRole(['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator']) }
    ].filter(card => card.visible !== false);

    const resolveMemberName = (idOrName) => {
        if (!idOrName) return '';
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
                    <h1 style={{ margin: 0 }}>Grupos {activeTab ? ` / ${navigationCards.find(c => c.id === activeTab)?.title}` : ''}</h1>
                </div>
                {isAdmin && !activeTab && (
                    <Button icon={<Plus size={16} />} onClick={() => { setEditingGroup(null); setShowGroupModal(true); }}>Nuevo Grupo</Button>
                )}
            </div>

            {!activeTab ? (
                <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: '1.5rem', marginTop: '1rem' }}>
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
                                <EmptyState icon={Users} title="Sin grupos" message="No tienes grupos asignados a tu cargo actualmente." />
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
                                                {g.scheduleDay && <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>📅 {g.scheduleDay}<br />🕒 {g.scheduleTime} hs</div>}
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
                                                        <Button variant="outline" size="sm" icon={<Users size={14} />} onClick={() => navigate(`/dashboard/grupos/${g.id}`)}>Miembros</Button>
                                                        {isAdmin && <Button variant="outline" size="sm" icon={<Edit size={14} />} onClick={() => { setEditingGroup(g); setShowGroupModal(true); }}>Editar</Button>}
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

                    {activeTab === 'calendario' && (
                        <WeeklySchedule groups={myGroups} />
                    )}

                    {activeTab === 'miembros' && (
                        /* (rest of the members tab code remains the same as before my latest change, effectively kept in-sync) */
                        <div className="d-flex flex-column gap-4">
                            {myGroups.length === 0 ? (
                                <Card><EmptyState icon={Users} title="Sin grupos" message="No hay grupos ni miembros vinculados a tu cargo." /></Card>
                            ) : myGroups.sort((a, b) => a.name.localeCompare(b.name)).map(group => {
                                const membersOfGroup = myMembers.filter(m => m.group === group.name).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
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
                                                <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
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
                                                                    <td data-label="Miembro" style={{ padding: '0.875rem 1.25rem' }}>
                                                                        <div style={{ fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)' }} onMouseOver={e => e.currentTarget.style.color = 'var(--color-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-text)'} onClick={() => navigate(`/dashboard/miembros/${m.id}`)}>
                                                                            {m.lastName}, {m.firstName}
                                                                        </div>
                                                                    </td>
                                                                    <td data-label="Contacto" style={{ padding: '0.875rem 1.25rem' }}>{m.phone || m.email || '-'}</td>
                                                                    <td data-label="Vínculo" style={{ padding: '0.875rem 1.25rem', textAlign: 'right' }}>
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
                            currentUser={currentUser}
                        />
                    )}
                    {activeTab === 'clases' && <FriendshipClasses />}
                    {activeTab === 'seguimientos' && <FollowUps />}
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

const WeeklySchedule = ({ groups }) => {
    const weekDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const scheduledGroups = groups.filter(group => group.scheduleDay && group.scheduleTime);

    if (scheduledGroups.length === 0) {
        return <Card><EmptyState icon={CalendarDays} title="Sin horarios" message="No hay grupos con día y horario registrados." /></Card>;
    }

    return (
        <div className="weekly-schedule">
            {weekDays.map(day => {
                const dayGroups = scheduledGroups
                    .filter(group => group.scheduleDay.toLowerCase() === day.toLowerCase())
                    .sort((a, b) => (a.scheduleTime || '').localeCompare(b.scheduleTime || ''));
                return (
                    <section key={day} className={`weekly-schedule-day ${dayGroups.length > 0 ? 'has-groups' : ''}`}>
                        <h3>{day}</h3>
                        {dayGroups.length === 0 ? (
                            <span className="weekly-schedule-empty">Sin grupos</span>
                        ) : (
                            <div className="weekly-schedule-items">
                                {dayGroups.map(group => (
                                    <div key={group.id} className="weekly-schedule-item">
                                        <time>{group.scheduleTime} hs</time>
                                        <div>
                                            <strong>{group.name}</strong>
                                            <span>{group.type || 'Grupo de Amistad'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                );
            })}
        </div>
    );
};

const AttendanceTab = ({ myGroups, myMembers, currentUser }) => {
    const { settings } = useSettings();
    const absenceReasonsPool = settings?.absenceReasons || ['Salud', 'Laboral', 'Estudios', 'Actividad de la Iglesia', 'Otros'];

    const [selectedGroupId, setSelectedGroupId] = useState(myGroups.length > 0 ? myGroups[0].id : '');
    const [availableDates, setAvailableDates] = useState([]);
    const [attendanceDate, setAttendanceDate] = useState('');
    const [presentIds, setPresentIds] = useState([]);
    const [absentDetails, setAbsentDetails] = useState({});
    const [holidays, setHolidays] = useState([]);
    const [isManualDate, setIsManualDate] = useState(false);

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
    const groupMembers = myMembers.filter(m => selectedGroup && m.group === selectedGroup.name).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    const groupMemberIds = groupMembers.map(member => member.id).join(',');

    useEffect(() => {
        if (selectedGroup) {
            const dates = getAvailableDatesForDay(selectedGroup.scheduleDay, 12, holidays);
            setAvailableDates(dates);
            if (!dates.includes(attendanceDate)) {
                setAttendanceDate(dates[0]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGroupId, selectedGroup?.scheduleDay, holidays]);

    const fetchExistingAttendance = useEffectEvent(async () => {
        if (!selectedGroupId || !attendanceDate) return;
        setLoadingRecord(true);
        const record = await getAttendance(selectedGroupId, attendanceDate);
        if (record) {
            setPresentIds(record.presentMembers || []);
            setAbsentDetails(record.absentDetails || {});
        } else {
            // A new attendance list starts with the group present by default.
            setPresentIds(groupMembers.map(member => member.id));
            setAbsentDetails({});
        }
        setLoadingRecord(false);
    });

    useEffect(() => {
        fetchExistingAttendance();
    }, [selectedGroupId, attendanceDate, groupMemberIds]);

    const toggleMember = (id) => {
        if (presentIds.includes(id)) {
            setPresentIds(current => current.filter(pid => pid !== id));
        } else {
            setPresentIds(current => [...current, id]);
            setAbsentDetails(current => {
                const updated = { ...current };
                delete updated[id];
                return updated;
            });
        }
    };

    const handleSave = async () => {
        if (!selectedGroupId || !attendanceDate) return;
        const cleanedAbsentDetails = { ...absentDetails };
        presentIds.forEach(id => { delete cleanedAbsentDetails[id]; });
        setSaving(true);
        try {
            await saveAttendance({
                groupId: selectedGroupId,
                groupName: selectedGroup?.name || '',
                date: attendanceDate,
                presentMembers: presentIds,
                absentDetails: cleanedAbsentDetails,
                members: groupMembers.map(member => ({ id: member.id, firstName: member.firstName, lastName: member.lastName })),
                takenBy: currentUser?.uid || '',
            });
            alert('¡Asistencia guardada con éxito!');
        } catch {
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
        if (!selectedGroupId) return;
        const records = await getAttendanceForDateRange([selectedGroupId], startStr, endStr);
        if (records.length === 0) {
            alert(`No se encontraron registros de asistencia para el período ${reportPeriod}.`);
            return;
        }

        const recordsByGroup = {};
        records.forEach(r => {
            if (!recordsByGroup[r.groupId]) recordsByGroup[r.groupId] = [];
            recordsByGroup[r.groupId].push(r);
        });

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        let logoDataUrl = null;
        try {
            const logoResponse = await fetch('/img/logo-iea.png');
            const logoBlob = await logoResponse.blob();
            logoDataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(logoBlob);
            });
        } catch {
            // The report remains usable if the logo cannot be loaded.
        }

        let groupIndex = 0;
        Object.keys(recordsByGroup).forEach(gId => {
            const groupRecords = recordsByGroup[gId];
            const gDetails = myGroups.find(gr => gr.id === gId);
            const gName = gDetails ? gDetails.name : gId;
            const membersById = new Map();
            groupRecords.forEach(record => {
                (record.members || []).forEach(member => membersById.set(member.id, member));
            });
            const members = (membersById.size > 0 ? [...membersById.values()] : myMembers.filter(m => m.group === gName))
                .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
            if (members.length === 0) return;
            if (groupIndex > 0) pdf.addPage();
            groupIndex++;

            if (logoDataUrl) pdf.addImage(logoDataUrl, 'PNG', 12, 8, 42, 12);
            pdf.setDrawColor(148, 163, 184);
            pdf.line(12, 25, 285, 25);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.text(`Reporte de asistencia - ${gName}`, 12, 33);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.text(`Período: ${reportPeriod.charAt(0).toUpperCase() + reportPeriod.slice(1)} | Emitido: ${new Date().toLocaleDateString('es-AR')}`, 12, 38);

            const uniqueDates = Array.from(new Set(groupRecords.map(record => record.date))).sort();
            const header = ['Miembro', ...uniqueDates.map(date => new Date(`${date}T12:00:00`).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })), '%'];
            const absenceRows = [];
            const body = members.map(member => {
                let attended = 0;
                const statuses = uniqueDates.map(date => {
                    const record = groupRecords.find(item => item.date === date);
                    if (!record) return '-';
                    const present = record.presentMembers.includes(member.id);
                    if (present) {
                        attended++;
                        return 'P';
                    }
                    const detail = record.absentDetails?.[member.id];
                    if (detail?.reason) absenceRows.push([`${member.lastName}, ${member.firstName}`, date, `${detail.reason}${detail.detail ? `: ${detail.detail}` : ''}`]);
                    return 'A';
                });
                const percentage = uniqueDates.length ? `${Math.round((attended / uniqueDates.length) * 100)}%` : '-';
                return [`${member.lastName}, ${member.firstName}`, ...statuses, percentage];
            });

            autoTable(pdf, {
                startY: 43,
                head: [header],
                body,
                margin: { left: 12, right: 12 },
                styles: { fontSize: 7, cellPadding: 2, halign: 'center' },
                headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
                columnStyles: { 0: { halign: 'left', cellWidth: 55 } },
            });

            if (absenceRows.length > 0) {
                const tableEnd = pdf.lastAutoTable.finalY + 8;
                if (tableEnd > 180) pdf.addPage();
                const reasonsY = tableEnd > 180 ? 20 : tableEnd;
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                pdf.text('Motivos de ausencia', 12, reasonsY);
                autoTable(pdf, {
                    startY: reasonsY + 3,
                    head: [['Miembro', 'Fecha', 'Motivo']],
                    body: absenceRows,
                    margin: { left: 12, right: 12 },
                    styles: { fontSize: 7, cellPadding: 2 },
                    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
                });
            }
        });

        pdf.save(`Reporte_Asistencia_${reportPeriod}_${endStr}.pdf`);
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
                            <label className="form-label">Seleccione Grupo de Amistad</label>
                            <select
                                className="form-input"
                                value={selectedGroupId}
                                onChange={e => setSelectedGroupId(e.target.value)}
                                style={{ width: '100%', height: '50px', backgroundColor: 'var(--color-surface)' }}
                            >
                                {myGroups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group m-0">
                            <div className="d-flex justify-between align-center mb-2">
                                <label className="form-label mb-0">Fecha del Encuentro</label>
                                <button type="button" className="btn btn-outline btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }} onClick={() => {
                                    setIsManualDate(!isManualDate);
                                    if (isManualDate && availableDates.length > 0) setAttendanceDate(availableDates[0]);
                                }}>
                                    {isManualDate ? 'Ver Sugeridas' : 'Otra fecha'}
                                </button>
                            </div>
                            {!isManualDate ? (
                                <select
                                    className="form-input"
                                    value={attendanceDate}
                                    onChange={e => setAttendanceDate(e.target.value)}
                                    style={{ width: '100%', height: '50px', backgroundColor: 'var(--color-surface)' }}
                                >
                                    {availableDates.map(dateStr => {
                                        const dObj = new Date(dateStr + "T12:00:00");
                                        const label = dObj.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
                                        return <option key={dateStr} value={dateStr}>{label.charAt(0).toUpperCase() + label.slice(1)}</option>;
                                    })}
                                </select>
                            ) : (
                                <input
                                    type="date"
                                    className="form-input"
                                    max={new Date().toISOString().split('T')[0]}
                                    value={attendanceDate}
                                    onChange={e => setAttendanceDate(e.target.value)}
                                    style={{ width: '100%', height: '50px', backgroundColor: 'var(--color-surface)' }}
                                />
                            )}
                        </div>
                    </div>

                    {selectedGroup && (
                        <div>
                            <div className="attendance-summary-cards">
                                <div><span>Total</span><strong>{groupMembers.length}</strong></div>
                                <div className="attendance-summary-present"><span>Presentes</span><strong>{groupMembers.filter(member => presentIds.includes(member.id)).length}</strong></div>
                                <div className="attendance-summary-absent"><span>Ausentes</span><strong>{groupMembers.filter(member => !presentIds.includes(member.id)).length}</strong></div>
                                <button className="btn btn-outline btn-sm" onClick={() => { setPresentIds(groupMembers.map(member => member.id)); setAbsentDetails({}); }}>
                                    Marcar todos presentes
                                </button>
                            </div>

                            {loadingRecord ? (
                                <p style={{ color: 'var(--color-text-muted)' }}>Buscando registros...</p>
                            ) : (
                                <div className="attendance-list">
                                    {groupMembers.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay integrantes en este grupo.</div>
                                    ) : (
                                        groupMembers.map(member => {
                                            const isPresent = presentIds.includes(member.id);
                                            return (
                                                <div key={member.id} className={`attendance-member ${isPresent ? 'is-present' : 'is-absent'}`}>
                                                    <div className="attendance-member-name">{member.lastName}, {member.firstName}</div>
                                                    <button className="attendance-status-toggle" onClick={() => toggleMember(member.id)}>
                                                        {isPresent ? 'Presente' : 'Ausente'}
                                                    </button>
                                                    {!isPresent && (
                                                        <div className="attendance-absence-fields">
                                                            <select className="form-input" value={absentDetails[member.id]?.reason || ''} onChange={event => setAbsentDetails(current => ({ ...current, [member.id]: { ...current[member.id], reason: event.target.value } }))}>
                                                                <option value="">Indicar motivo</option>
                                                                {absenceReasonsPool.map(reason => <option key={reason} value={reason}>{reason}</option>)}
                                                            </select>
                                                            {absentDetails[member.id]?.reason === 'Otros' && (
                                                                <input className="form-input" type="text" placeholder="¿Cuál?" value={absentDetails[member.id]?.detail || ''} onChange={event => setAbsentDetails(current => ({ ...current, [member.id]: { ...current[member.id], detail: event.target.value } }))} />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
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
                        Descarga el reporte PDF del grupo seleccionado con membrete institucional.
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
