import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import { Save, Palette, Layers, Shield, Key, Calendar, ClipboardX, Lock, User, Trash2 } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getHolidays, addHoliday, updateHoliday, deleteHoliday, seedArgentineHolidays } from '../services/holidayService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';

const Settings = () => {
  const { currentUser, userData } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [appUsers, setAppUsers] = useState([]);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: userData?.name || '',
    phone: userData?.phone || '',
    email: userData?.email || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Holidays state
  const [holidays, setHolidays] = useState([]);
  const [loadingHolidays, setLoadingHolidays] = useState(true);
  const [newHoliday, setNewHoliday] = useState({ date: '', description: '' });

  const loadUsers = async () => {
     try {
       // Load all documents from 'users' collection (real users and pre-assignments)
       const userSnap = await getDocs(collection(db, 'users'));
       const allUserDocs = userSnap.docs.map(d => ({ id: d.id, ...d.data() }));
       
       // Deduplicate by email, prioritizing real UID over 'pre-' docs
       const consolidatedUsersMap = new Map();
       
       allUserDocs.forEach(u => {
         if (!u.email) return;
         const emailKey = u.email.toLowerCase().trim();
         
         // If it's a pre-doc that was already migrated, ignore it unless there's no real user yet
         if (u.id.startsWith('pre-') && u.migratedTo) return;

         const existing = consolidatedUsersMap.get(emailKey);
         // Prioritization: 
         // 1. Real UID (non-pre)
         // 2. Pre-doc (if no real UID yet)
         if (!existing || (existing.id.startsWith('pre-') && !u.id.startsWith('pre-'))) {
           consolidatedUsersMap.set(emailKey, u);
         }
       });

       // Now load members to find those without ANY record in 'users' collection
       const memberSnap = await getDocs(collection(db, 'members'));
       const membersWithEmail = memberSnap.docs
         .map(d => ({id: d.id, ...d.data()}))
         .filter(m => m.email && m.email.includes('@'));

       const finalUsers = Array.from(consolidatedUsersMap.values());
       
       membersWithEmail.forEach(m => {
         const emailKey = m.email.toLowerCase().trim();
         if (!consolidatedUsersMap.has(emailKey)) {
           finalUsers.push({
             id: `pending-${m.id}`,
             email: m.email,
             name: `${m.firstName} ${m.lastName}`,
             role: ['Member'],
             isMemberOnly: true
           });
         }
       });

       setAppUsers(finalUsers.sort((a, b) => (a.name || '').localeCompare(b.name || '')));
     } catch(e) {
       console.error("Error loading combined users:", e);
     }
  };

  const loadHolidays = async () => {
      setLoadingHolidays(true);
      const data = await getHolidays();
      setHolidays(data);
      setLoadingHolidays(false);
  };

  // Sync state when context loads initially
  useEffect(() => {
    setFormData(settings);
    loadUsers();
    loadHolidays();
  }, [settings]);

  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name || '',
        phone: userData.phone || '',
        email: userData.email || ''
      });
    }
  }, [userData]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSavingProfile(true);
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        name: profileData.name,
        phone: profileData.phone
      }, { merge: true });
      alert('Perfil actualizado correctamente.');
    } catch (e) {
      console.error(e);
      alert('Error actualizando perfil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChange = (section, key, value) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(formData);
      alert('Configuración guardada correctamente.');
    } catch(e) {
      alert('Error al guardar la configuración.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRole = async (userId, currentRoles, roleToggled) => {
     try {
       let arr = Array.isArray(currentRoles) ? currentRoles : (currentRoles ? [currentRoles] : []);
       let newRoles = arr.includes(roleToggled) ? arr.filter(r => r !== roleToggled) : [...arr, roleToggled];
       if (newRoles.length === 0) newRoles = ['Member'];
       
       if (userId.startsWith('pending-')) {
          // It's a member without user account. We'll use their email to create a pre-assignment.
          const userObj = appUsers.find(u => u.id === userId);
          if (!userObj || !userObj.email) return;
          
          await setDoc(doc(db, 'users', `pre-${userObj.email.toLowerCase()}`), {
            name: userObj.name,
            email: userObj.email.toLowerCase(),
            role: newRoles,
            isPending: true,
            needsPasswordChange: true
          }, { merge: true });
       } else {
          await updateDoc(doc(db, 'users', userId), { role: newRoles });
       }
       
       loadUsers();
     } catch(e) {
       console.error(e);
       alert("Error actualizando permisos.");
     }
  };

  const handleForceAllPasswordChange = async () => {
     if(!window.confirm("¿Seguro que deseas obligar a TODOS los usuarios registrados a cambiar su clave en su próximo ingreso?")) return;
     setSaving(true);
     try {
       const userSnap = await getDocs(collection(db, 'users'));
       for (const d of userSnap.docs) {
          if (!d.id.startsWith('pre-')) {
             await updateDoc(doc(db, 'users', d.id), { needsPasswordChange: true });
          }
       }
       alert("Operación completada.");
       loadUsers();
     } catch(e) {
       alert("Error: " + e.message);
     } finally {
       setSaving(false);
     }
  };

  const handleDeleteUser = async (userId, userEmail) => {
    if (userId === currentUser.uid) {
      return alert('No puedes eliminar tu propio usuario administrador.');
    }

    if (!window.confirm(`¿Estás seguro de eliminar a ${userEmail}? Esta acción quitará sus roles y acceso al portal. No elimina la cuenta de autenticación pero le impide entrar.`)) {
      return;
    }

    try {
      // Delete from 'users' or 'pre-'
      const docId = userId.startsWith('pending-') ? `pre-${userEmail.toLowerCase()}` : userId;
      // Note: we can't delete from auth with client SDK, but deleting from firestore kills their access
      // because ProtectedRoute and AuthContext won't find the user record/roles.
      
      const { deleteDoc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'users', docId));
      
      alert('Registro eliminado correctamente.');
      loadUsers();
    } catch (e) {
      console.error(e);
      alert('Error eliminando registro: ' + e.message);
    }
  };

  // Holiday handlers
  const handleAddHoliday = async () => {
      if (!newHoliday.date || !newHoliday.description) return alert('Completa fecha y descripción');
      try {
          await addHoliday(newHoliday);
          setNewHoliday({ date: '', description: '' });
          loadHolidays();
      } catch (e) {
          alert('Error agregando feriado');
      }
  };

  const handleDeleteHoliday = async (id) => {
      if (!window.confirm('¿Eliminar feriado?')) return;
      try {
          await deleteHoliday(id);
          loadHolidays();
      } catch (e) {
          alert('Error eliminando feriado');
      }
  };

  const handleSeedHolidays = async () => {
      if (!window.confirm('¿Cargar feriados nacionales argentinos por defecto?')) return;
      setLoadingHolidays(true);
      try {
          await seedArgentineHolidays();
          loadHolidays();
      } catch (e) {
          alert('Error cargando feriados');
          setLoadingHolidays(false);
      }
  };

  const [activeTab, setActiveTab] = useState('profile');

  if(!formData || !formData.theme || !formData.modules || !formData.roles) return <div className="p-4 text-center">Cargando ajustes...</div>;

  const tabStyle = (id) => ({
    padding: '0.75rem 1.5rem',
    cursor: 'pointer',
    borderBottom: activeTab === id ? '3px solid var(--color-primary)' : '3px solid transparent',
    color: activeTab === id ? 'var(--color-primary)' : 'var(--color-text-muted)',
    fontWeight: activeTab === id ? 700 : 500,
    transition: 'all 0.2s'
  });

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-between align-center mb-4">
         <h1>Ajustes y Perfil</h1>
         <div className="d-flex gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>Recargar Todo</Button>
            <Button onClick={handleSave} disabled={saving} id="save-settings-btn" icon={<Save size={18} />}>
                {saving ? 'Guardando...' : 'Guardar Global'}
            </Button>
         </div>
      </div>

      {/* Tabs Navigation */}
      <div className="d-flex gap-2 mb-4" style={{ borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap' }}>
        <div onClick={() => setActiveTab('profile')} style={tabStyle('profile')}>Mi Perfil</div>
        <div onClick={() => setActiveTab('system')} style={tabStyle('system')}>Configuración del Sistema</div>
        <div onClick={() => setActiveTab('roles')} style={tabStyle('roles')}>Administrar Roles</div>
        <div onClick={() => setActiveTab('groups')} style={tabStyle('groups')}>Configuración de Grupos</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '1.5rem' }}>
        
        {/* TAB: PERFIL */}
        {activeTab === 'profile' && (
          <Card title={
              <div className="d-flex align-center gap-2">
                  <User size={20} color="var(--color-primary-light)" /> Mi Perfil de Usuario
              </div>
          } className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: '1.5rem' }}>
                  <div className="form-group">
                      <label className="form-label">Tu Nombre</label>
                      <input className="form-input" value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                      <label className="form-label">Teléfono de contacto</label>
                      <input className="form-input" value={profileData.phone} onChange={e => setProfileData({...profileData, phone: e.target.value})} />
                  </div>
                  <div className="form-group">
                      <label className="form-label">E-mail (No editable)</label>
                      <input className="form-input" value={profileData.email} disabled style={{ backgroundColor: 'var(--color-surface-hover)', cursor: 'not-allowed' }} />
                  </div>
              </div>
              <div className="d-flex justify-end mt-2">
                  <Button size="sm" onClick={handleSaveProfile} disabled={savingProfile}>
                      {savingProfile ? 'Actualizando...' : 'Actualizar mis datos'}
                  </Button>
              </div>
          </Card>
        )}

        {/* TAB: SISTEMA */}
        {activeTab === 'system' && (
          <>
            <Card title={
              <div className="d-flex align-center gap-2">
                <Palette size={20} color="var(--color-primary-light)" /> Apariencia
              </div>
            }>
              <div className="form-group mb-4">
                <label className="form-label" htmlFor="primary-color-picker">Color Primario (Énfasis)</label>
                <div className="d-flex align-center gap-2">
                  <input 
                    id="primary-color-picker"
                    type="color" 
                    value={formData.theme.primaryColor} 
                    onChange={(e) => handleChange('theme', 'primaryColor', e.target.value)} 
                    style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  />
                  <input 
                    id="primary-color-text"
                    className="form-input" 
                    value={formData.theme.primaryColor} 
                    onChange={(e) => handleChange('theme', 'primaryColor', e.target.value)} 
                  />
                </div>
              </div>
            </Card>

            <Card title={
              <div className="d-flex align-center gap-2">
                <Layers size={20} color="var(--color-primary-light)" /> Módulos del Sistema
              </div>
            }>
              <p style={{color: 'var(--color-text-muted)', marginBottom: '1.5rem'}}>Activa o desactiva las funcionalidades que tu congregación usa:</p>
              
              <div className="d-flex flex-column gap-3 mb-2">
                <label htmlFor="mod-fin" className="toggle-switch">
                  <input type="checkbox" className="toggle-input" checked={formData.modules.finances} onChange={(e) => handleChange('modules', 'finances', e.target.checked)} id="mod-fin" />
                  <span className="toggle-slider"></span>
                  <span style={{ marginLeft: '1rem', cursor: 'pointer' }}>Módulo de Finanzas (Solo Admin y Pastores)</span>
                </label>
                
                <label htmlFor="mod-news" className="toggle-switch">
                  <input type="checkbox" className="toggle-input" checked={formData.modules.news} onChange={(e) => handleChange('modules', 'news', e.target.checked)} id="mod-news" />
                  <span className="toggle-slider"></span>
                  <span style={{ marginLeft: '1rem', cursor: 'pointer' }}>Noticias y Avisos Internos</span>
                </label>
                
                <label htmlFor="mod-live" className="toggle-switch">
                  <input type="checkbox" className="toggle-input" checked={formData.modules.live} onChange={(e) => handleChange('modules', 'live', e.target.checked)} id="mod-live" />
                  <span className="toggle-slider"></span>
                  <span style={{ marginLeft: '1rem', cursor: 'pointer' }}>Transmisiones en Vivo (Streaming)</span>
                </label>
              </div>
            </Card>
          </>
        )}

        {/* TAB: ROLES */}
        {activeTab === 'roles' && (
          <>
            <Card title={
              <div className="d-flex align-center gap-2">
                <Shield size={20} color="var(--color-primary-light)" /> Personalizar Nombres de Roles
              </div>
            } className="lg:col-span-2">
              <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Administrador General</label>
                  <input className="form-input" value={formData.roles.Admin} onChange={(e) => handleChange('roles', 'Admin', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Nivel Pastor/Director</label>
                  <input className="form-input" value={formData.roles.Pastor} onChange={(e) => handleChange('roles', 'Pastor', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Líder Principal / Ministerio</label>
                  <input className="form-input" value={formData.roles.MinistryLeader} onChange={(e) => handleChange('roles', 'MinistryLeader', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Miembro Regular</label>
                  <input className="form-input" value={formData.roles.Member} onChange={(e) => handleChange('roles', 'Member', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Facilitador / Líder de Grupo</label>
                  <input className="form-input" value={formData.roles.Facilitator} onChange={(e) => handleChange('roles', 'Facilitator', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Co-Facilitador / Ayudante</label>
                  <input className="form-input" value={formData.roles.CoFacilitator} onChange={(e) => handleChange('roles', 'CoFacilitator', e.target.value)} />
                </div>
              </div>
            </Card>

            <Card title={
              <div className="d-flex align-center gap-2">
                <Lock size={20} color="var(--color-primary-light)" /> Control de Acceso (Matriz de Permisos)
              </div>
            } className="lg:col-span-2">
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                    <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Módulo / Área</th>
                      {Object.keys(formData.roles).map(roleKey => (
                        <th key={roleKey} style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>{formData.roles[roleKey]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { id: 'miembros', label: 'Miembros' },
                      { id: 'eventos', label: 'Eventos' },
                      { id: 'crecimiento', label: 'Grupos de Amistad' },
                      { id: 'noticias', label: 'Noticias' },
                      { id: 'transmisiones', label: 'Transmisiones' },
                      { id: 'finanzas', label: 'Finanzas' },
                      { id: 'grupos', label: 'Gestor de Grupos' },
                      { id: 'configuracion', label: 'Configuración' }
                    ].map(area => (
                      <tr key={area.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{area.label}</td>
                        {Object.keys(formData.roles).map(roleKey => {
                          const isChecked = (formData.rolePermissions?.[roleKey] || []).includes(area.id);
                          return (
                            <td key={roleKey} style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={() => {
                                  const currentPerms = formData.rolePermissions?.[roleKey] || [];
                                  const newPerms = isChecked ? currentPerms.filter(p => p !== area.id) : [...currentPerms, area.id];
                                  setFormData(prev => ({ ...prev, rolePermissions: { ...(prev.rolePermissions || {}), [roleKey]: newPerms } }));
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card title={
              <div className="d-flex align-center gap-2 justify-between w-full">
                <div className="d-flex align-center gap-2">
                   <Key size={20} color="var(--color-primary-light)" /> Gestión de Usuarios y Roles
                </div>
                <Button size="sm" variant="outline" onClick={handleForceAllPasswordChange}>OBLIGAR CAMBIO DE CLAVE (TODOS)</Button>
              </div>
            } className="lg:col-span-2">
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                    <tr>
                      <th style={{ padding: '0.75rem 1rem' }}>Usuario</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Roles Asignados</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appUsers.map(u => (
                      <tr key={u.id} className="table-row-hover">
                        <td style={{ padding: '0.75rem 1rem' }}>
                           <div style={{ fontWeight: 600 }}>{u.name}</div>
                           <div style={{fontSize:'0.75rem', color:'var(--color-text-muted)'}}>{u.email}</div>
                           {u.isMemberOnly && <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>Solo en BD</span>}
                           {u.needsPasswordChange && <span className="badge badge-gold" style={{ fontSize: '0.65rem', marginLeft: '0.5rem' }}>Cambio Clave Pend.</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.2rem', flexWrap: 'wrap' }}>
                            {(Array.isArray(u.role) ? u.role : [u.role || 'Member']).map(r => (
                              <span key={r} className="badge badge-gray">{formData.roles[r] || r}</span>
                            ))}
                          </div>
                          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {Object.keys(formData.roles).map(r => (
                               <label key={r} style={{fontSize:'0.65rem', display:'flex', alignItems:'center', gap:'0.2rem', background: '#f8fafc', padding: '2px 4px', borderRadius: '4px'}}>
                                 <input type="checkbox" checked={(Array.isArray(u.role) ? u.role : [u.role || 'Member']).includes(r)} onChange={() => handleToggleRole(u.id, u.role, r)} /> {formData.roles[r]}
                               </label>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {!u.isMemberOnly && (
                               <>
                                 <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={async () => {
                                       if(window.confirm(`¿Enviar correo de restablecimiento a ${u.email}?`)) {
                                          try {
                                             await sendPasswordResetEmail(auth, u.email);
                                             await updateDoc(doc(db, 'users', u.id), { needsPasswordChange: true });
                                             alert('Correo enviado y bandera de cambio de clave activada.');
                                             loadUsers();
                                          } catch(e) { alert('Error: ' + e.message); }
                                       }
                                    }}
                                 >
                                    Reset Clave
                                 </Button>
                                   <Button 
                                      size="sm" 
                                      variant={u.needsPasswordChange ? 'primary' : 'outline'}
                                      onClick={async () => {
                                         try {
                                            await updateDoc(doc(db, 'users', u.id), { needsPasswordChange: !u.needsPasswordChange });
                                            loadUsers();
                                         } catch(e) { alert('Error: ' + e.message); }
                                      }}
                                   >
                                      {u.needsPasswordChange ? 'Quitar Req.' : 'Forzar Cambio'}
                                   </Button>
                                   <Button 
                                      size="sm" 
                                      style={{ backgroundColor: '#ef4444', color: 'white' }}
                                      onClick={() => handleDeleteUser(u.id, u.email)}
                                      icon={<Trash2 size={14} />}
                                   >
                                      Eliminar
                                   </Button>
                                 </>
                              )}
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* TAB: GRUPOS */}
        {activeTab === 'groups' && (
          <>
            <Card title={
              <div className="d-flex align-center gap-2">
                <ClipboardX size={20} color="var(--color-primary-light)" /> Motivos de Ausencia
              </div>
            }>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {(formData.absenceReasons || []).map((reason, i) => (
                  <div key={i} className="badge badge-gray">{reason} <button onClick={() => setFormData(prev => ({ ...prev, absenceReasons: prev.absenceReasons.filter((_, idx) => idx !== i) }))} style={{border:'none', background:'none', cursor:'pointer'}}>×</button></div>
                ))}
              </div>
              <div className="d-flex gap-2">
                <input id="new-reason" className="form-input" placeholder="Añadir motivo..." />
                <Button onClick={() => {
                  const val = document.getElementById('new-reason').value.trim();
                  if(val) { setFormData(prev => ({ ...prev, absenceReasons: [...prev.absenceReasons, val] })); document.getElementById('new-reason').value = ''; }
                }}>Añadir</Button>
              </div>
            </Card>

            <Card title={
              <div className="d-flex align-center gap-2">
                <Calendar size={20} color="var(--color-primary-light)" /> Gestión de Feriados
              </div>
            } className="lg:col-span-2">
              <div className="d-flex gap-2 mb-4">
                <input type="date" className="form-input" id="holiday-date" />
                <input type="text" className="form-input" placeholder="Descripción" id="holiday-desc" style={{flex:1}} />
                <Button onClick={() => {
                  const d = document.getElementById('holiday-date').value;
                  const desc = document.getElementById('holiday-desc').value;
                  if(d && desc) { handleAddHoliday({date: d, description: desc}); document.getElementById('holiday-date').value = ''; document.getElementById('holiday-desc').value = ''; }
                }}>Agregar</Button>
              </div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                <table style={{ width: '100%', fontSize: '0.85rem' }}>
                   <tbody>
                      {holidays.map(h => (
                        <tr key={h.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.5rem' }}>{h.date}</td>
                          <td style={{ padding: '0.5rem' }}>{h.description}</td>
                          <td style={{ padding: '0.5rem' }}><button onClick={() => handleDeleteHoliday(h.id)} style={{color:'var(--color-danger)', border:'none', background:'none'}}>Eliminar</button></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default Settings;
