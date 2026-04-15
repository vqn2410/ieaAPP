import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import { createMember, updateMember } from '../../services/memberService';
import { getGroups } from '../../services/groupService';
import { useSettings } from '../../context/SettingsContext';

const MemberForm = ({ onSuccess, initialData }) => {
  const { settings } = useSettings();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState(initialData || {
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    group: '',
    role: ['Member'],
  });

  useEffect(() => {
    getGroups().then(setGroups);
  }, []);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        role: Array.isArray(initialData.role) ? initialData.role : (initialData.role ? [initialData.role] : ['Member'])
      });
    } else {
      setFormData({
        firstName: '', lastName: '', dni: '', email: '', phone: '', group: '', role: ['Member']
      });
    }
  }, [initialData]);

  const toggleRole = (roleValue) => {
    setFormData(prev => {
        const currentRoles = Array.isArray(prev.role) ? prev.role : [prev.role || 'Member'];
        const newRoles = currentRoles.includes(roleValue) 
            ? currentRoles.filter(r => r !== roleValue) 
            : [...currentRoles, roleValue];
        return { ...prev, role: newRoles.length > 0 ? newRoles : ['Member'] };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (initialData && initialData.id) {
        await updateMember(initialData.id, formData);
      } else {
        await createMember({ ...formData, growthPath: {} });
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      alert("Hubo un error al guardar al miembro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
        <div className="form-group mb-2">
          <label className="form-label">Nombre</label>
          <input required name="firstName" value={formData.firstName} onChange={handleChange} className="form-input" placeholder="Nombre completo" />
        </div>
        <div className="form-group mb-2">
          <label className="form-label">Apellidos</label>
          <input required name="lastName" value={formData.lastName} onChange={handleChange} className="form-input" placeholder="Apellidos" />
        </div>
        <div className="form-group mb-2">
          <label className="form-label">DNI (Opcional)</label>
          <input name="dni" value={formData.dni || ''} onChange={handleChange} className="form-input" placeholder="DNI sin puntos" />
        </div>
        <div className="form-group mb-2">
          <label className="form-label">Teléfono (Opcional)</label>
          <input name="phone" value={formData.phone || ''} onChange={handleChange} className="form-input" placeholder="+54 9 11..." />
        </div>
        <div className="form-group mb-2" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" placeholder="correo@ejemplo.com" />
        </div>
        <div className="form-group mb-2" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Grupo / Ministerio (Opcional)</label>
          <select name="group" value={formData.group} onChange={handleChange} className="form-input" style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}>
            <option value="">Sin Grupo / Se asignará luego</option>
            {groups.map(g => (
              <option key={g.id} value={g.name}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group mb-2" style={{ gridColumn: 'span 2' }}>
          <label className="form-label">Roles en la Iglesia</label>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', padding: '0.75rem', border: '1px solid var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface)' }}>
             {settings && settings.roles ? Object.entries(settings.roles).map(([key, label]) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input 
                        type="checkbox" 
                        checked={Array.isArray(formData.role) && formData.role.includes(key)}
                        onChange={() => toggleRole(key)}
                    />
                    {label}
                </label>
             )) : (
                ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member'].map(key => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                        <input 
                            type="checkbox" 
                            checked={Array.isArray(formData.role) && formData.role.includes(key)}
                            onChange={() => toggleRole(key)}
                        />
                        {key}
                    </label>
                ))
             )}
          </div>
        </div>
      </div>
      
      <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
        {loading ? 'Guardando...' : (initialData?.id ? 'Actualizar Datos' : 'Crear Miembro')}
      </Button>
    </form>
  );
};
export default MemberForm;
