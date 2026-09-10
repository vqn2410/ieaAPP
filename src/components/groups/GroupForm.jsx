import React, { useState } from 'react';
import Button from '../common/Button';
import { createGroup, updateGroup } from '../../services/groupService';
import { updateMember } from '../../services/memberService';
import { addUserRoleByEmail } from '../../services/userService';
import './GroupForm.css';

const GroupForm = ({ initialData, onSuccess, membersList }) => {
    const [groupName, setGroupName] = useState(initialData?.name || '');
    const initialType = initialData?.type?.trim();
    const [groupType, setGroupType] = useState(initialType === 'Grupo de Crecimiento' ? 'Grupo de Amistad' : (initialType || 'Grupo de Amistad'));
    const [groupDay, setGroupDay] = useState(initialData?.scheduleDay || '');
    const [groupTime, setGroupTime] = useState(initialData?.scheduleTime || '');
    const [description, setDescription] = useState(initialData?.description || '');
    const [zone, setZone] = useState(initialData?.zone || '');
    const [capacity, setCapacity] = useState(initialData?.capacity || '');
    const [meetingAddress, setMeetingAddress] = useState(initialData?.meetingAddress || '');
    const [initialMembers, setInitialMembers] = useState(Array.isArray(initialData?.initialMemberIds) ? initialData.initialMemberIds : []);
    const [facilitators, setFacilitators] = useState(Array.isArray(initialData?.facilitators) ? initialData.facilitators : (initialData?.facilitators ? [initialData.facilitators] : []));
    const [coFacilitators, setCoFacilitators] = useState(Array.isArray(initialData?.coFacilitators) ? initialData.coFacilitators : (initialData?.coFacilitators ? [initialData.coFacilitators] : []));
    const [saving, setSaving] = useState(false);
    const isScheduledGroup = groupType === 'Grupo de Amistad' || Boolean(initialData?.scheduleDay || initialData?.scheduleTime);


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
                coFacilitators: coFacilitators,
                description,
                zone,
                capacity: capacity ? Number(capacity) : null,
                meetingAddress,
                initialMemberIds: initialMembers.filter(memberId =>
                    ![...facilitators, ...coFacilitators].some(idOrName => {
                        const member = membersList.find(item =>
                            item.id === idOrName ||
                            `${item.lastName}, ${item.firstName}`.toLowerCase() === String(idOrName).toLowerCase()
                        );
                        return member?.id === memberId;
                    })
                ),
                facilitatorEmails: [...new Set([...facilitators, ...coFacilitators].map(idOrName => {
                    const member = membersList.find(member => member.id === idOrName || `${member.lastName}, ${member.firstName}`.toLowerCase() === String(idOrName).toLowerCase());
                    return member?.email?.trim().toLowerCase();
                }).filter(Boolean))]
            };
            if (isScheduledGroup) {
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
                    // La responsabilidad no cambia el grupo de pertenencia.
                    await updateMember(memberId, { role: newRoles });
                    await addUserRoleByEmail(m.email, targetRole);
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
            const responsibleIds = new Set([...facilitators, ...coFacilitators].map(idOrName => findMember(idOrName)?.id).filter(Boolean));
            for (const memberId of initialMembers) {
                if (responsibleIds.has(memberId)) continue;
                const member = membersList.find(item => item.id === memberId);
                if (member && member.group !== groupName) await updateMember(memberId, { group: groupName });
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
        <form className="group-editor-form" onSubmit={handleSubmit}>
            <section className="group-form-section">
            <h2>Información básica</h2>
            <div className="form-group mb-4">
                <label className="form-label">Nombre de la agrupación</label>
                <input required className="form-input" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Ej. Jóvenes Semillas" />
            </div>
            <div className="form-group mb-4">
                <label className="form-label">Descripción</label>
                <textarea className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describí el propósito y características del grupo..." rows={3} />
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
            </section>
            
            <section className="group-form-section">
            <h2>Liderazgo</h2>
            {isScheduledGroup && (
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

            <div className="grid grid-cols-2 group-form-leadership-grid" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
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
            </section>

            <section className="group-form-section">
            <h2>Ubicación y horario</h2>
            <div className="grid grid-cols-2 group-form-grid">
                <label className="form-label">Zona / Sector<input className="form-input" value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Ej. Zona Norte" /></label>
                <label className="form-label">Capacidad máxima<input className="form-input" type="number" min="1" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Ej. 15" /></label>
                <label className="form-label group-form-wide">Dirección de reunión<input className="form-input" value={meetingAddress} onChange={(e) => setMeetingAddress(e.target.value)} placeholder="Dirección donde se reúne el grupo" /></label>
            </div>
            </section>

            <section className="group-form-section">
            <h2>Miembros iniciales <small>(opcional)</small></h2>
            <label className="form-label">Buscar personas para agregar<select className="form-input" value="" onChange={(e) => e.target.value && !initialMembers.includes(e.target.value) && setInitialMembers([...initialMembers, e.target.value])}><option value="">Seleccionar miembro...</option>{membersList.filter(member => !initialMembers.includes(member.id)).map(member => <option key={member.id} value={member.id}>{member.lastName}, {member.firstName}</option>)}</select></label>
            <div className="group-form-chips">{initialMembers.map(memberId => { const member = membersList.find(item => item.id === memberId); return <span key={memberId}>{member ? `${member.lastName}, ${member.firstName}` : memberId}<button type="button" onClick={() => setInitialMembers(initialMembers.filter(id => id !== memberId))}>×</button></span>; })}</div>
            </section>

            <Button type="submit" variant="primary" style={{ width: '100%' }} disabled={saving}>
               {saving ? 'Guardando...' : (initialData?.id ? 'Guardar Cambios' : 'Crear Grupo')}
            </Button>
        </form>
    );
};

export default GroupForm;
