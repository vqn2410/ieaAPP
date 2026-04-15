import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useSettings } from '../context/SettingsContext';
import { Save, Palette, Layers, Shield, Key } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [appUsers, setAppUsers] = useState([]);

  const loadUsers = async () => {
     try {
       const snap = await getDocs(collection(db, 'users'));
       setAppUsers(snap.docs.map(d => ({id: d.id, ...d.data()})));
     } catch(e) {
       console.error(e);
     }
  };

  // Sync state when context loads initially
  useEffect(() => {
    setFormData(settings);
    loadUsers();
  }, [settings]);

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

  const handleRoleChange = async (userId, newRole) => {
     try {
       await updateDoc(doc(db, 'users', userId), { role: newRole });
       loadUsers();
       alert("Rol actualizado correctamente.");
     } catch(e) {
       alert("Error al cambiar el rol del usuario.");
     }
  };

  if(!formData || !formData.theme || !formData.modules || !formData.roles) return <div className="p-4 text-center">Cargando ajustes...</div>;

  return (
    <div className="animate-fade-in">
      <div className="d-flex justify-between align-center mb-4">
         <h1>Configuración General</h1>
         <Button onClick={handleSave} disabled={saving} id="save-settings-btn" icon={<Save size={18} />}>
           {saving ? 'Guardando...' : 'Guardar Cambios'}
         </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <Card title={
          <div className="d-flex align-center gap-2">
            <Palette size={20} color="var(--color-primary-light)" /> Apariencia Institucional
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
            <p style={{fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--color-text-muted)'}}>Recomendado: oscuro para alto contraste con textos blancos.</p>
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

        <Card title={
          <div className="d-flex align-center gap-2">
            <Shield size={20} color="var(--color-primary-light)" /> Personalización de Nombres de Roles
          </div>
        } className="lg:col-span-2">
          <p style={{color: 'var(--color-text-muted)', marginBottom: '1rem'}}>Modifica cómo se llaman estos niveles de autoridad o acceso en tu iglesia.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: '1rem' }}>
            <div className="form-group">
               <label className="form-label" htmlFor="role-admin">Administrador General</label>
               <input id="role-admin" className="form-input" value={formData.roles.Admin} onChange={(e) => handleChange('roles', 'Admin', e.target.value)} />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="role-pastor">Nivel Pastor/Director</label>
               <input id="role-pastor" className="form-input" value={formData.roles.Pastor} onChange={(e) => handleChange('roles', 'Pastor', e.target.value)} />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="role-min-leader">Líder Principal / Ministerio</label>
               <input id="role-min-leader" className="form-input" value={formData.roles.MinistryLeader} onChange={(e) => handleChange('roles', 'MinistryLeader', e.target.value)} />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="role-member">Miembro Regular</label>
               <input id="role-member" className="form-input" value={formData.roles.Member} onChange={(e) => handleChange('roles', 'Member', e.target.value)} />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="role-facilitator">Facilitador / Líder de Grupo</label>
               <input id="role-facilitator" className="form-input" value={formData.roles.Facilitator} onChange={(e) => handleChange('roles', 'Facilitator', e.target.value)} />
            </div>
            <div className="form-group">
               <label className="form-label" htmlFor="role-co-facilitator">Co-Facilitador / Ayudante</label>
               <input id="role-co-facilitator" className="form-input" value={formData.roles.CoFacilitator} onChange={(e) => handleChange('roles', 'CoFacilitator', e.target.value)} />
            </div>
          </div>
        </Card>

        <Card title={
          <div className="d-flex align-center gap-2">
            <Key size={20} color="var(--color-primary-light)" /> Gestión de Accesos
          </div>
        } className="lg:col-span-2">
          <p style={{color: 'var(--color-text-muted)', marginBottom: '1rem'}}>
             Asigna roles y permisos al personal de la iglesia. Por defecto todo nuevo usuario inicia como "Miembro" (rol sin permisos de edición).
          </p>
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Usuario (Email)</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Rol Actual</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Cambiar Permisos</th>
                </tr>
              </thead>
              <tbody>
                {appUsers.map(u => (
                  <tr key={u.id} className="table-row-hover" style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ fontWeight: 500 }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{u.email}</div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span className="badge badge-gray">{formData.roles[u.role] || u.role}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <select 
                         className="form-input" 
                         value={u.role}
                         onChange={(e) => handleRoleChange(u.id, e.target.value)}
                         style={{ padding: '0.25rem 0.5rem', height: 'auto', backgroundColor: 'var(--color-surface)', fontSize: '0.875rem' }}
                      >
                         <option value="Admin">Administrador (Total)</option>
                         <option value="Pastor">Pastor / Director</option>
                         <option value="MinistryLeader">Líder Ministerio</option>
                         <option value="Facilitator">Facilitador</option>
                         <option value="CoFacilitator">Co-Facilitador</option>
                         <option value="Member">Miembro Básico</option>
                      </select>
                    </td>
                  </tr>
                ))}
                {appUsers.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No hay usuarios para mostrar.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
