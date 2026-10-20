import React, { useState, useEffect } from 'react';
import Button from '../../common/Button';
import { createMember, updateMember } from '../../../services/memberService';
import { syncUserByEmail } from '../../../services/userService';
import { useCampus } from '../../../context/CampusContext';
import { useAuth } from '../../../context/AuthContext';
import { getGroups } from '../../../services/groupService';
import { getAssignedGroups } from '../../../services/assignedGroupService';
import { useSettings } from '../../../context/SettingsContext';
import { useToast } from '../../common/toastContext';
import './MemberForm.css';

const emptyGrowthPath = {
  Bautismo: { status: '' },
  Discipulado: { status: '' },
  IETE: { status: '', year: '', modality: 'Online' },
  'Otros estudios teológicos': { status: '', detail: '' }
};

const dateInputValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const MemberForm = ({ onSuccess, initialData, fixedGroup, fixedGroupId, fixedCampusId }) => {
  const { activeCampusId } = useCampus();
  const { hasRole } = useAuth();
  const { settings } = useSettings();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [groups, setGroups] = useState([]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialData ? {
    ...initialData,
    campusId: fixedCampusId || initialData.campusId || '',
    serviceAreas: Array.isArray(initialData.serviceAreas) ? initialData.serviceAreas : (initialData.serviceArea ? [initialData.serviceArea] : []),
  } : {
    firstName: '',
    lastName: '',
    dni: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    serviceAreas: [],
    managedAreas: [],
    group: fixedGroup || '',
    campusId: fixedCampusId || '',
    role: ['Member'],
    growthPath: emptyGrowthPath,
  });
  const isAreaLeader = Array.isArray(formData.role) && formData.role.some(r => {
    const label = settings?.roles?.[r] || r;
    return /arealeader|encargado/i.test(String(r)) || /encargado|área|area/i.test(String(label));
  });

  useEffect(() => {
    const loadGroups = async () => {
      try {
        if (hasRole(['Admin', 'Pastor'])) setGroups(await getGroups());
        else if (hasRole(['CampusAdmin'])) setGroups(await getGroups(activeCampusId || null));
        else if (hasRole(['Facilitator', 'CoFacilitator', 'MinistryLeader'])) setGroups((await getAssignedGroups()).groups || []);
        else setGroups([]);
      } catch {
        setGroups([]);
      }
    };
    loadGroups();
  }, [activeCampusId, hasRole]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        campusId: fixedCampusId || initialData.campusId || '',
        birthDate: dateInputValue(initialData.birthDate || initialData.birthday || initialData.birthdate || initialData.dateOfBirth),
        serviceAreas: Array.isArray(initialData.serviceAreas) ? initialData.serviceAreas : (initialData.serviceArea ? [initialData.serviceArea] : []),
        managedAreas: Array.isArray(initialData.managedAreas) ? initialData.managedAreas : [],
        role: Array.isArray(initialData.role) ? initialData.role : (initialData.role ? [initialData.role] : ['Member']),
        growthPath: { ...emptyGrowthPath, ...(initialData.growthPath || {}) }
      });
    } else {
      setFormData({
        firstName: '', lastName: '', dni: '', email: '', phone: '', address: '', birthDate: '', serviceAreas: [], managedAreas: [], group: fixedGroup || '', campusId: fixedCampusId || '', role: ['Member'], growthPath: emptyGrowthPath
      });
    }
  }, [initialData, fixedGroup, fixedCampusId]);

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

  const handleGrowthPathChange = (path, field, value) => {
    setFormData(prev => ({
      ...prev,
      growthPath: { ...prev.growthPath, [path]: { ...prev.growthPath?.[path], [field]: value } }
    }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es obligatorio';
    if (!formData.lastName.trim()) newErrors.lastName = 'Los apellidos son obligatorios';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'El email no tiene un formato válido';
    }
    if (formData.dni && !/^\d{7,8}$/.test(formData.dni.replace(/\./g, ''))) {
      newErrors.dni = 'El DNI debe tener 7 u 8 dígitos';
    }
    if (formData.phone && !/^[\d\s\-+()]{7,20}$/.test(formData.phone)) {
      newErrors.phone = 'El teléfono no tiene un formato válido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (step === 1) {
      setStep(2);
      return;
    }
    setLoading(true);
    try {
      if (initialData && initialData.id) {
        await updateMember(initialData.id, { ...formData, campusId: fixedCampusId || formData.campusId || activeCampusId || null });
        toast('Miembro actualizado correctamente', 'success');
      } else {
        await createMember({ ...formData, group: fixedGroup || formData.group, campusId: fixedCampusId || activeCampusId || null, ...(fixedGroupId && { groupId: fixedGroupId }) });
        toast('Miembro creado correctamente', 'success');
      }
      if (formData.email) {
        await syncUserByEmail(formData.email, {
          role: Array.isArray(formData.role) ? formData.role : [formData.role || 'Member'],
          serviceAreas: formData.serviceAreas || [],
          managedAreas: formData.managedAreas || [],
        });
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error(error);
      toast('Hubo un error al guardar al miembro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={`member-editor-form member-editor-step-${step}`} onSubmit={handleSubmit}>
      <div className="member-editor-stepper">
        <div className={`member-editor-step-marker ${step >= 1 ? 'active' : ''}`}>
          <span>1</span>
          <div>
            <strong>Datos Personales</strong>
            <small>Información básica</small>
          </div>
        </div>
        <div className="member-editor-step-line" />
        <div className={`member-editor-step-marker ${step >= 2 ? 'active' : ''}`}>
          <span>2</span>
          <div>
            <strong>Perfil Congregacional</strong>
            <small>Rol y grupos</small>
          </div>
        </div>
      </div>

      <div className="member-editor-personal">
        <div className="member-form-grid">
          {/* Fila 1: Nombre y Apellidos */}
          <div className="form-group member-form-col-6">
            <label className="form-label">Nombre <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input
              required
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              className={`form-input ${errors.firstName ? 'input-error' : ''}`}
              placeholder="Nombre completo"
            />
            {errors.firstName && <small className="form-error-msg">{errors.firstName}</small>}
          </div>

          <div className="form-group member-form-col-6">
            <label className="form-label">Apellidos <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input
              required
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              className={`form-input ${errors.lastName ? 'input-error' : ''}`}
              placeholder="Apellidos"
            />
            {errors.lastName && <small className="form-error-msg">{errors.lastName}</small>}
          </div>

          {/* Fila 2: DNI, Teléfono y Cumpleaños */}
          <div className="form-group member-form-col-4">
            <label className="form-label">DNI (Opcional)</label>
            <input
              name="dni"
              value={formData.dni || ''}
              onChange={handleChange}
              className={`form-input ${errors.dni ? 'input-error' : ''}`}
              placeholder="DNI sin puntos"
            />
            {errors.dni && <small className="form-error-msg">{errors.dni}</small>}
          </div>

          <div className="form-group member-form-col-4">
            <label className="form-label">Teléfono (Opcional)</label>
            <input
              name="phone"
              value={formData.phone || ''}
              onChange={handleChange}
              className={`form-input ${errors.phone ? 'input-error' : ''}`}
              placeholder="+54 9 11..."
            />
            {errors.phone && <small className="form-error-msg">{errors.phone}</small>}
          </div>

          <div className="form-group member-form-col-4">
            <label className="form-label">Cumpleaños (Opcional)</label>
            <input
              type="date"
              name="birthDate"
              value={formData.birthDate || ''}
              onChange={handleChange}
              className="form-input"
            />
          </div>

          {/* Fila 3: Email y Dirección */}
          <div className="form-group member-form-col-6">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`form-input ${errors.email ? 'input-error' : ''}`}
              placeholder="correo@ejemplo.com"
            />
            {errors.email && <small className="form-error-msg">{errors.email}</small>}
          </div>

          <div className="form-group member-form-col-6">
            <label className="form-label">Dirección (Opcional)</label>
            <input
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              className="form-input"
              placeholder="Domicilio"
            />
          </div>

          {/* Fila 4: Área de servicio (Opcional) - Ancho completo */}
          <div className="form-group member-form-col-12">
            <label className="form-label">Área de servicio (Opcional)</label>
            <div className="member-area-picker">
              {(settings?.serviceAreas || []).map(area => (
                <label key={area}>
                  <input
                    type="checkbox"
                    checked={(formData.serviceAreas || []).includes(area)}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      serviceAreas: (prev.serviceAreas || []).includes(area)
                        ? prev.serviceAreas.filter(item => item !== area)
                        : [...(prev.serviceAreas || []), area]
                    }))}
                  />
                  <span>{area}</span>
                </label>
              ))}
            </div>
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
              Podés seleccionar más de un área.
            </small>
            {(formData.serviceAreas || []).length > 0 && (
              <div className="member-selected-areas">
                {(formData.serviceAreas || []).map(area => (
                  <span key={area}>
                    {area}
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        serviceAreas: (prev.serviceAreas || []).filter(item => item !== area)
                      }))}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="member-editor-congregational">
        {fixedGroup ? (
          <div className="form-group mb-3">
            <label className="form-label">Grupo asignado</label>
            <div className="member-assigned-group-box">
              {fixedGroup}
            </div>
          </div>
        ) : (
          <div className="form-group mb-3">
            <label className="form-label">Grupo / Ministerio (Opcional)</label>
            <select
              name="group"
              value={formData.group}
              onChange={handleChange}
              className="form-input"
              style={{ width: '100%', height: '42px', backgroundColor: 'var(--color-surface)' }}
            >
              <option value="">Sin Grupo / Se asignará luego</option>
              {groups.map(g => (
                <option key={g.id} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group mb-3">
          <label className="form-label">Ruta de crecimiento (Opcional)</label>
          <div className="member-growth-grid">
            {Object.entries(formData.growthPath || emptyGrowthPath).map(([path, data]) => (
              <div key={path} className="member-growth-card">
                <label className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{path}</label>
                <select
                  className="form-input"
                  value={data.status || ''}
                  onChange={event => handleGrowthPathChange(path, 'status', event.target.value)}
                >
                  <option value="">Sin información</option>
                  <option value="Cursando">Cursando</option>
                  <option value="Completo">Completo</option>
                  <option value="Pausado">Pausado</option>
                </select>
                {path === 'IETE' && ['Cursando', 'Completo'].includes(data.status) && (
                  <div className="d-flex gap-2 mt-2">
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={data.year || ''}
                      onChange={event => handleGrowthPathChange(path, 'year', event.target.value)}
                      placeholder="Año"
                    />
                    <select
                      className="form-input"
                      value={data.modality || 'Online'}
                      onChange={event => handleGrowthPathChange(path, 'modality', event.target.value)}
                    >
                      <option value="Online">Online</option>
                      <option value="Presencial">Presencial</option>
                      <option value="Híbrido">Híbrido</option>
                    </select>
                  </div>
                )}
                {path === 'Otros estudios teológicos' && ['Cursando', 'Completo'].includes(data.status) && (
                  <input
                    className="form-input mt-2"
                    value={data.detail || ''}
                    onChange={event => handleGrowthPathChange(path, 'detail', event.target.value)}
                    placeholder="¿Cuáles estudios?"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {!fixedGroup && (
          <div className="form-group mb-3">
            <label className="form-label">Roles en la Iglesia</label>
            <div className="member-roles-picker">
              {settings && settings.roles ? Object.entries(settings.roles).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={Array.isArray(formData.role) && formData.role.includes(key)}
                    onChange={() => toggleRole(key)}
                  />
                  <span>{label}</span>
                </label>
              )) : (
                ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member'].map(key => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Array.isArray(formData.role) && formData.role.includes(key)}
                      onChange={() => toggleRole(key)}
                    />
                    <span>{key}</span>
                  </label>
                ))
              )}
            </div>
          </div>
        )}

        {isAreaLeader && (
          <div className="form-group mb-3" style={{ marginTop: '1rem' }}>
            <label className="form-label">Áreas a cargo (Encargado de área)</label>
            <div className="member-area-picker">
              {(settings?.serviceAreas || []).map(area => (
                <label key={area}>
                  <input
                    type="checkbox"
                    checked={(formData.managedAreas || []).includes(area)}
                    onChange={() => setFormData(prev => ({
                      ...prev,
                      managedAreas: (prev.managedAreas || []).includes(area)
                        ? (prev.managedAreas || []).filter(item => item !== area)
                        : [...(prev.managedAreas || []), area],
                    }))}
                  />
                  <span>{area}</span>
                </label>
              ))}
            </div>
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', marginTop: '0.35rem', display: 'block' }}>
              Podés elegir más de un área. Son distintas de las áreas de servicio.
            </small>
          </div>
        )}
      </div>

      <div className="member-editor-actions">
        <Button
          type="button"
          variant="outline"
          onClick={() => step === 1 ? onSuccess?.() : setStep(1)}
        >
          ← {step === 1 ? 'Cancelar' : 'Anterior'}
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={loading}
        >
          {step === 1 ? 'Siguiente →' : (loading ? 'Guardando...' : (initialData?.id ? 'Guardar Cambios' : 'Crear Miembro'))}
        </Button>
      </div>
    </form>
  );
};
export default MemberForm;
