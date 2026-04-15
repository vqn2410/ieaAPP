import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import { getMembers, updateMember } from '../../services/memberService';
import { createGroup, updateGroup } from '../../services/groupService';

const GroupForm = ({ initialData, onSuccess, membersList }) => {
    const [groupName, setGroupName] = useState(initialData?.name || '');
    const [groupType, setGroupType] = useState(initialData?.type || 'Grupo de Amistad');
    const [groupDay, setGroupDay] = useState(initialData?.scheduleDay || '');
    const [groupTime, setGroupTime] = useState(initialData?.scheduleTime || '');
    const [facilitators, setFacilitators] = useState(Array.isArray(initialData?.facilitators) ? initialData.facilitators : (initialData?.facilitators ? [initialData.facilitators] : []));
    const [coFacilitators, setCoFacilitators] = useState(Array.isArray(initialData?.coFacilitators) ? initialData.coFacilitators : (initialData?.coFacilitators ? [initialData.coFacilitators] : []));
    const [saving, setSaving] = useState(false);

    const getArray = (val) => {
        if(Array.isArray(val)) return val;
        if(typeof val === 'string' && val.trim() !== '') return val.split(',').map(s=>s.trim());
        return [];
    };

    const resolveMemberName = (idOrName) => {
        if(!idOrName) return '';
        const member = membersList.find(m => m.id === idOrName);
        if (member) return `${member.lastName}, ${member.firstName}`;
        return idOrName;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const payload = { 
                name: groupName, 
                type: groupType,
                facilitators: facilitators,
                coFacilitators: coFacilitators
            };
            if (groupType === 'Grupo de Crecimiento') {
                payload.scheduleDay = groupDay;
                payload.scheduleTime = groupTime;
            }
            
            if (initialData?.id) {
                await updateGroup(initialData.id, payload);
            } else {
                await createGroup(payload);
            }

            // Sync roles... (simplified version for now, matching groups.jsx logic)
            const findMember = (idOrName) => {
                let m = membersList.find(x => x.id === idOrName);
                if (m) return m;
                const normSearch = idOrName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                return membersList.find(x => {
                    const fullName = `${x.lastName}, ${x.firstName}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    return fullName === normSearch;
                });
            };

            const eliteRoles = ['Admin', 'Pastor', 'MinistryLeader'];
            const updateRole = async (memberId, targetRole) => {
                const m = membersList.find(x => x.id === memberId);
                if (!m) return;
                let currentRoles = Array.isArray(m.role) ? m.role : [m.role || 'Member'];
                if (currentRoles.some(r => eliteRoles.includes(r))) return;
                
                let newRoles = [...currentRoles];
                if (!newRoles.includes(targetRole)) {
                    newRoles.push(targetRole);
                    if (newRoles.includes('Member')) newRoles = newRoles.filter(r => r !== 'Member');
                    await updateMember(memberId, { role: newRoles, group: groupName });
                } else if (m.group !== groupName) {
                    await updateMember(memberId, { group: groupName });
                }
            };

            for (let fId of facilitators) {
                const m = findMember(fId);
                if (m) await updateRole(m.id, 'Facilitator');
            }
            for (let cfId of coFacilitators) {
                const m = findMember(cfId);
                if (m) await updateRole(m.id, 'CoFacilitator');
            }

            onSuccess();
        } catch (e) {
            console.error(e);
            alert('Error al procesar el grupo');
        } finally {
            setSaving(false);
        }
    };

    const addFacilitator = (val) => {
       if(val && !facilitators.includes(val)) setFacilitators([...facilitators, val]);
    };
    const addCoFacilitator = (val) => {
       if(val && !coFacilitators.includes(val)) setCoFacilitators([...coFacilitators, val]);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
                <label className="form-label">Nombre de la agrupación</label>
                <input required className="form-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej. Jóvenes Semillas" />
            </div>
            <div className="form-group mb-4">
                <label className="form-label">Tipo de agrupación</label>
                <select className="form-input" value={groupType} onChange={(e) => setGroupType(e.target.value)} style={{ width: '100%' }}>
                    <option value="Grupo de Amistad">Grupo de Amistad</option>
                    <option value="Ministerio Administrativo">Ministerio Administrativo</option>
                    <option value="Grupo de Apoyo">Grupo de Apoyo</option>
                    <option value="Otro">Otro</option>
                </select>
            </div>
            
            {groupType === 'Grupo de Amistad' && (
                <div className="grid grid-cols-2" style={{ gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group m-0">
                        <label className="form-label">Día de reunión *</label>
                        <select required className="form-input" value={groupDay} onChange={(e) => setGroupDay(e.target.value)} style={{ width: '100%' }}>
                            <option value="">Seleccionar día</option>
                            <option value="Lunes">Lunes</option>
                            <option value="Martes">Martes</option>
                            <option value="Miércoles">Miércoles</option>
                            <option value="Jueves">Jueves</option>
                            <option value="Viernes">Viernes</option>
                            <option value="Sábado">Sábado</option>
                            <option value="Domingo">Domingo</option>
                        </select>
                    </div>
                    <div className="form-group m-0">
                        <label className="form-label">Horario *</label>
                        <input type="time" required className="form-input" value={groupTime} onChange={(e) => setGroupTime(e.target.value)} style={{ width: '100%' }} />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group m-0">
                    <label className="form-label">Líder / Facilitador/es</label>
                    <select className="form-input" defaultValue="" onChange={(e) => { addFacilitator(e.target.value); e.target.value=''; }} style={{ width: '100%' }}>
                        <option value="" disabled>Agregar facilitador...</option>
                        {membersList.map(m => (
                            <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
                        ))}
                    </select>
                    {facilitators.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-2">
                           {facilitators.map(f => (
                              <span key={f} className="badge badge-gray" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 {resolveMemberName(f)} <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setFacilitators(facilitators.filter(x=>x!==f))}>×</span>
                              </span>
                           ))}
                        </div>
                    )}
                </div>
                <div className="form-group m-0" style={{ marginTop: '0.5rem' }}>
                    <label className="form-label">Co-Facilitador/es</label>
                    <select className="form-input" defaultValue="" onChange={(e) => { addCoFacilitator(e.target.value); e.target.value=''; }} style={{ width: '100%' }}>
                        <option value="" disabled>Agregar co-facilitador...</option>
                        {membersList.map(m => (
                            <option key={m.id} value={m.id}>{m.lastName}, {m.firstName}</option>
                        ))}
                    </select>
                    {coFacilitators.length > 0 && (
                        <div className="d-flex flex-wrap gap-1 mt-2">
                           {coFacilitators.map(f => (
                              <span key={f} className="badge badge-gray" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                 {resolveMemberName(f)} <span style={{ cursor: 'pointer', fontWeight: 'bold' }} onClick={() => setCoFacilitators(coFacilitators.filter(x=>x!==f))}>×</span>
                              </span>
                           ))}
                        </div>
                    )}
                </div>
            </div>

            <Button type="submit" variant="primary" style={{ width: '100%' }} disabled={saving}>
               {saving ? 'Guardando...' : (initialData?.id ? 'Guardar Cambios' : 'Crear Grupo')}
            </Button>
        </form>
    );
};

export default GroupForm;
