import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useSettings } from '../context/SettingsContext';

const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const [formData, setFormData] = useState(settings);
  const [saving, setSaving] = useState(false);

  // Sync state when context loads initially
  useEffect(() => {
    setFormData(settings);
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

  if(!formData || !formData.theme) return <div>Cargando ajustes...</div>;

  return (
    <div>
      <div className="d-flex justify-between align-center mb-4">
         <h1>Configuración General</h1>
         <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Cambios'}</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2">
        <Card title="Apariencia Institucional">
          <div className="form-group mb-4">
            <label className="form-label">Color Primario (Énfasis)</label>
            <div className="d-flex align-center gap-2">
               <input 
                 type="color" 
                 value={formData.theme.primaryColor} 
                 onChange={(e) => handleChange('theme', 'primaryColor', e.target.value)} 
                 style={{ width: '40px', height: '40px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer' }}
               />
               <input 
                 className="form-input" 
                 value={formData.theme.primaryColor} 
                 onChange={(e) => handleChange('theme', 'primaryColor', e.target.value)} 
               />
            </div>
            <p style={{fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--color-text-muted)'}}>Recomendado: oscuro para alto contraste con textos blancos.</p>
          </div>
        </Card>

        <Card title="Módulos del Sistema">
          <p style={{color: 'var(--color-text-muted)', marginBottom: '1rem'}}>Activa o desactiva las funcionalidades que tu congregación usa:</p>
          <div className="d-flex align-center gap-2 mb-2">
            <input type="checkbox" checked={formData.modules.finances} onChange={(e) => handleChange('modules', 'finances', e.target.checked)} id="mod-fin" style={{ cursor: 'pointer' }}/>
            <label htmlFor="mod-fin" style={{ cursor: 'pointer' }}>Módulo de Finanzas (Solo Administradores y Pastores)</label>
          </div>
          <div className="d-flex align-center gap-2 mb-2">
            <input type="checkbox" checked={formData.modules.news} onChange={(e) => handleChange('modules', 'news', e.target.checked)} id="mod-news" style={{ cursor: 'pointer' }}/>
            <label htmlFor="mod-news" style={{ cursor: 'pointer' }}>Noticias y Avisos Internos</label>
          </div>
          <div className="d-flex align-center gap-2 mb-2">
            <input type="checkbox" checked={formData.modules.live} onChange={(e) => handleChange('modules', 'live', e.target.checked)} id="mod-live" style={{ cursor: 'pointer' }} />
            <label htmlFor="mod-live" style={{ cursor: 'pointer' }}>Transmisiones en Vivo (Streaming)</label>
          </div>
        </Card>

        <Card title="Personalización de Nombres de Roles" style={{ gridColumn: 'span 1' }}>
          <p style={{color: 'var(--color-text-muted)', marginBottom: '1rem'}}>Modifica cómo se llaman estos niveles de autoridad o acceso en tu iglesia.</p>
          
          <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
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
      </div>
    </div>
  );
};

export default Settings;
