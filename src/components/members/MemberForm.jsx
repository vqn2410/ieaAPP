import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import { createMember, updateMember } from '../../services/memberService';
import { getGroups } from '../../services/groupService';

const MemberForm = ({ onSuccess, initialData }) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [formData, setFormData] = useState(initialData || {
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    group: '',
  });

  useEffect(() => {
    getGroups().then(setGroups);
  }, []);

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
          <label className="form-label">DNI</label>
          <input required name="dni" value={formData.dni} onChange={handleChange} className="form-input" placeholder="DNI sin puntos" />
        </div>
        <div className="form-group mb-2">
          <label className="form-label">Teléfono</label>
          <input required name="phone" value={formData.phone} onChange={handleChange} className="form-input" placeholder="+54 9 11..." />
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
      </div>
      
      <Button type="submit" variant="primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
        {loading ? 'Guardando...' : (initialData?.id ? 'Actualizar Datos' : 'Crear Miembro')}
      </Button>
    </form>
  );
};
export default MemberForm;
