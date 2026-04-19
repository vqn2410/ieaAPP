import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import MemberForm from '../components/members/MemberForm';
import { getMember, deleteMember, updateMember } from '../services/memberService';
import { getGroups } from '../services/groupService';
import { useAuth } from '../context/AuthContext';
import { Trash2, ArrowLeft, Mail, Phone, Hash, Edit, ShieldCheck, UserPlus, Lock } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useSettings } from '../context/SettingsContext';

const MemberProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { userData } = useAuth();
    const canTransfer = ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'].includes(userData?.role);
    const [member, setMember] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingPath, setSavingPath] = useState(false);
    const [savingGroup, setSavingGroup] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    const { settings } = useSettings();
    const [associatedUser, setAssociatedUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(false);

    const availablePaths = ['Bautizado', 'Encuentro', 'Discipulado', 'IETE', 'Otros estudios'];
    const pathStatuses = ['Sin información', 'En proceso', 'Finalizado'];
    const ieteYears = ['1°', '2°', '3°', '4°', '5°', '6°'];
    const ieteModalities = ['Presencial', 'Virtual', 'Libre'];

    useEffect(() => {
        const fetchMember = async () => {
            const data = await getMember(id);
            setMember(data);
            setLoading(false);
            if (data?.email) {
                fetchAssociatedUser(data.email);
            }
        };
        fetchMember();
        getGroups().then(setGroups);
    }, [id]);

    const fetchAssociatedUser = async (email) => {
        if (!email) return;
        setLoadingUser(true);
        try {
            const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase().trim()));
            const snap = await getDocs(q);
            if (!snap.empty) {
                // Priority to non-pre docs
                const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                const realUser = docs.find(d => !d.id.startsWith('pre-')) || docs[0];
                setAssociatedUser(realUser);
            } else {
                setAssociatedUser(null);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingUser(false);
        }
    };

    const handleToggleRole = async (roleKey) => {
        if (!member?.email || !userData) return;
        const isAdmin = userData.role.includes('Admin');
        if (!isAdmin) return alert('Solo administradores pueden cambiar roles.');

        try {
            let currentRoles = associatedUser ? (Array.isArray(associatedUser.role) ? associatedUser.role : [associatedUser.role]) : ['Member'];
            let newRoles = currentRoles.includes(roleKey) ? currentRoles.filter(r => r !== roleKey) : [...currentRoles, roleKey];
            if (newRoles.length === 0) newRoles = ['Member'];

            if (associatedUser) {
                await updateDoc(doc(db, 'users', associatedUser.id), { role: newRoles });
            } else {
                // Create pre-assignment if user record doesn't exist
                const docId = `pre-${member.email.toLowerCase().trim()}`;
                await setDoc(doc(db, 'users', docId), {
                    name: `${member.firstName} ${member.lastName}`,
                    email: member.email.toLowerCase().trim(),
                    role: newRoles,
                    isPending: true,
                    needsPasswordChange: true,
                    memberId: id
                });
            }
            fetchAssociatedUser(member.email);
            alert('Permisos actualizados.');
        } catch (e) {
            console.error(e);
            alert('Error actualizando permisos: ' + e.message);
        }
    };

    const handleDelete = async () => {
        if(window.confirm("¿Seguro que deseas eliminar definitivamente a este miembro?")) {
            await deleteMember(id);
            navigate('/miembros');
        }
    };

    const handleMemberUpdated = async () => {
        setShowEditModal(false);
        setLoading(true);
        const data = await getMember(id);
        setMember(data);
        setLoading(false);
    };

    const getNormalizedGrowthPath = () => {
        let gp = member?.growthPath;
        if (!gp) return {};
        if (Array.isArray(gp)) {
            let obj = {};
            gp.forEach(p => { obj[p] = { status: 'Finalizado' }; });
            return obj;
        }
        return gp;
    };

    const handleUpdatePath = async (path, field, value) => {
        if(!member) return;
        setSavingPath(true);
        
        const currentPaths = getNormalizedGrowthPath();
        const pathData = currentPaths[path] || { status: 'Sin información' };
        
        const newPaths = {
            ...currentPaths,
            [path]: {
                ...pathData,
                [field]: value
            }
        };
        
        try {
            await updateMember(id, { growthPath: newPaths });
            setMember({ ...member, growthPath: newPaths });
        } catch (e) {
            console.error(e);
            alert("No se pudo actualizar la ruta");
        } finally {
            setSavingPath(false);
        }
    };

    const handleGroupChange = async (e) => {
        const newGroup = e.target.value;
        if(!window.confirm(`¿Estás seguro de transferir a este miembro a: ${newGroup || 'Sin Grupo'}?`)) return;
        
        setSavingGroup(true);
        try {
            await updateMember(id, { group: newGroup });
            setMember(prev => ({ ...prev, group: newGroup }));
        } catch(err) {
            console.error(err);
            alert("Hubo un error al intentar cambiar de grupo.");
        } finally {
            setSavingGroup(false);
        }
    };

    if (loading) return <div>Cargando perfil...</div>;
    if (!member) return <div>Miembro no encontrado.</div>;

    return (
        <div className="animate-fade-in">
            <div className="d-flex align-center justify-between mb-4">
               <div className="d-flex align-center gap-2">
                 <h1 style={{ margin: 0 }}>Perfil del Miembro</h1>
               </div>
               <Button variant="outline" icon={<Edit size={16} />} onClick={() => setShowEditModal(true)}>Editar Datos</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2">
                <Card>
                   <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                      <div style={{ width: 100, height: 100, borderRadius: '50%', backgroundColor: 'var(--color-secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', margin: '0 auto 1rem' }}>
                         {member.firstName.charAt(0)}{member.lastName?.charAt(0)}
                      </div>
                      <h2>{member.firstName} {member.lastName}</h2>
                      <div className="d-flex align-center justify-center gap-2 mt-2">
                         <span className="badge badge-gray">{member.group || 'Sin Grupo'}</span>
                         {canTransfer && (
                             <select 
                               className="form-input" 
                               style={{ padding: '0.25rem 0.5rem', height: 'auto', fontSize: '0.75rem', width: 'auto', display: 'inline-block', backgroundColor: 'var(--color-surface)', cursor: 'pointer' }}
                               value={member.group || ''}
                               onChange={handleGroupChange}
                               disabled={savingGroup}
                             >
                                <option value="" disabled>Transferir...</option>
                                <option value="">Remover del Grupo (Sin Grupo)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.name}>{g.name}</option>
                                ))}
                             </select>
                         )}
                      </div>
                   </div>

                   <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }} />

                   <div className="d-flex flex-column gap-3">
                       <div className="d-flex align-center gap-2">
                           <Hash size={18} color="var(--color-text-muted)" />
                           <span><strong>DNI:</strong> {member.dni}</span>
                       </div>
                       <div className="d-flex align-center gap-2">
                           <Phone size={18} color="var(--color-text-muted)" />
                           <span><strong>Teléfono:</strong> {member.phone}</span>
                       </div>
                       <div className="d-flex align-center gap-2">
                           <Mail size={18} color="var(--color-text-muted)" />
                           <span><strong>Email:</strong> {member.email || '-'}</span>
                       </div>
                   </div>

                   <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                       <Button variant="outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)', width: '100%' }} icon={<Trash2 size={16} />} onClick={handleDelete}>
                          Eliminar Miembro
                       </Button>
                   </div>
                </Card>



                {/* Role Management Card (Only for Admins) */}
                {userData?.role?.includes('Admin') && (
                    <Card title={
                        <div className="d-flex align-center gap-2">
                             <ShieldCheck size={20} color="var(--color-primary-light)" /> Permisos y Acceso al Portal
                        </div>
                    } className="lg:col-span-2">
                        {!member.email ? (
                            <div className="alert alert-warning">
                                No se puede asignar acceso al portal porque este miembro no tiene un correo electrónico registrado.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="user-access-info">
                                    <h4 className="mb-2">Estado de Cuenta</h4>
                                    {loadingUser ? (
                                        <p>Buscando vinculación...</p>
                                    ) : associatedUser ? (
                                        <div className="d-flex flex-column gap-2">
                                            <div className="d-flex align-center gap-2">
                                                {associatedUser.id.startsWith('pre-') ? (
                                                    <><div style={{width:10, height:10, borderRadius:'50%', background:'#f59e0b'}}></div> Pendiente de registro</>
                                                ) : (
                                                    <><div style={{width:10, height:10, borderRadius:'50%', background:'#10b981'}}></div> Usuario activo</>
                                                )}
                                            </div>
                                            <p style={{fontSize: '0.85rem', color: 'var(--color-text-muted)'}}>
                                                Registrado como: <strong>{associatedUser.email}</strong>
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="d-flex align-center gap-2 text-muted">
                                            <UserPlus size={18} /> 
                                            <span>Sin acceso al portal todavía.</span>
                                        </div>
                                    )}
                                </div>
                                <div className="roles-assignment">
                                    <h4 className="mb-2">Roles Asignados</h4>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                                        {(associatedUser ? (Array.isArray(associatedUser.role) ? associatedUser.role : [associatedUser.role]) : []).map(r => (
                                            <span key={r} className="badge badge-gray">{settings?.roles?.[r] || r}</span>
                                        ))}
                                        {(!associatedUser || (Array.isArray(associatedUser.role) && associatedUser.role.length === 0)) && <span className="text-muted" style={{fontSize: '0.8rem'}}>Ningún rol especial</span>}
                                    </div>
                                    <div className="d-flex gap-2 flex-wrap">
                                        {Object.keys(settings?.roles || {}).map(roleKey => (
                                            <button 
                                                key={roleKey}
                                                onClick={() => handleToggleRole(roleKey)}
                                                className={`btn btn-sm ${ (associatedUser ? (Array.isArray(associatedUser.role) ? associatedUser.role : [associatedUser.role]) : []).includes(roleKey) ? 'btn-primary' : 'btn-outline' }`}
                                                style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}
                                            >
                                                {settings.roles[roleKey]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                <Card title="Ruta de Crecimiento y Actividad">
                    <p style={{ color: 'var(--color-text-muted)' }}>Administra los niveles y estado de cada módulo.</p>
                    
                    <div className="d-flex flex-column gap-3 mb-4">
                        {availablePaths.map(path => {
                            const pathsObj = getNormalizedGrowthPath();
                            const pathData = pathsObj[path] || { status: 'Sin información' };
                            const isActive = pathData.status && pathData.status !== 'Sin información';
                            
                            return (
                                <div key={path} style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: isActive ? 'var(--color-surface)' : 'transparent' }}>
                                    <div className="d-flex justify-between align-center mb-2" style={{ flexWrap: 'wrap', gap: '1rem' }}>
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>{path}</h3>
                                        <select 
                                            className="form-input" 
                                            value={pathData.status || 'Sin información'} 
                                            onChange={(e) => handleUpdatePath(path, 'status', e.target.value)}
                                            disabled={savingPath}
                                            style={{ width: 'auto', minWidth: '150px' }}
                                        >
                                            {pathStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </div>
                                    
                                    {isActive && path === 'IETE' && (
                                        <div className="d-flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                                            <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Año</label>
                                                <select 
                                                    className="form-input" 
                                                    value={pathData.year || ''} 
                                                    onChange={(e) => handleUpdatePath(path, 'year', e.target.value)}
                                                    disabled={savingPath}
                                                >
                                                    <option value="">Seleccionar</option>
                                                    {ieteYears.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group" style={{ flex: 1, minWidth: '100px', margin: 0 }}>
                                                <label className="form-label" style={{ fontSize: '0.75rem' }}>Modalidad</label>
                                                <select 
                                                    className="form-input" 
                                                    value={pathData.modalidad || ''} 
                                                    onChange={(e) => handleUpdatePath(path, 'modalidad', e.target.value)}
                                                    disabled={savingPath}
                                                >
                                                    <option value="">Seleccionar</option>
                                                    {ieteModalities.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    {isActive && path === 'Otros estudios' && (
                                        <div className="form-group mt-2" style={{ margin: 0 }}>
                                            <label className="form-label" style={{ fontSize: '0.75rem' }}>Detalle de estudios</label>
                                            <input 
                                                className="form-input" 
                                                placeholder="Ej. Seminario Teológico..." 
                                                value={pathData.detail || ''}
                                                onChange={(e) => handleUpdatePath(path, 'detail', e.target.value)}
                                                disabled={savingPath}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Datos del Miembro">
                <MemberForm onSuccess={handleMemberUpdated} initialData={member} />
            </Modal>
        </div>
    );
};

export default MemberProfile;
