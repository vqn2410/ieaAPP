import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import Button from '../common/Button';
import EmptyState from '../common/EmptyState';
import { ArrowLeftRight, Search, Check, X, Send } from 'lucide-react';
import { getTransferRequests, createTransferRequest, updateTransferRequest } from '../../services/transferRequestService';
import { getMembers, updateMember } from '../../services/memberService';

const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();

const TransferRequests = ({ myGroups = [], allMembers = [], currentUser, myMemberProfile, isAdmin }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [toGroupId, setToGroupId] = useState(myGroups.length > 0 ? myGroups[0].id : '');
    const [reason, setReason] = useState('');
    const [saving, setSaving] = useState(false);
    const [actingId, setActingId] = useState('');

    const myGroupIds = new Set(myGroups.map(g => g.id));
    const requesterEmail = currentUser?.email?.trim().toLowerCase();
    const requesterName = myMemberProfile
        ? `${myMemberProfile.firstName} ${myMemberProfile.lastName}`
        : (currentUser?.email || 'Facilitador');

    const load = async () => {
        setLoading(true);
        const data = await getTransferRequests();
        setRequests(data);
        setLoading(false);
    };

    useEffect(() => { load(); }, []);

    const destGroup = myGroups.find(g => g.id === toGroupId);
    const searchNorm = norm(search);
    const searchResults = search && destGroup
        ? allMembers
            .filter(m => {
                if (!m.group) return false;
                if (norm(m.group) === norm(destGroup.name)) return false;
                if (myGroups.some(g => norm(g.name) === norm(m.group))) return false;
                if (!searchNorm) return false;
                const hay = norm(`${m.firstName} ${m.lastName} ${m.dni || ''}`);
                return hay.includes(searchNorm);
            })
            .slice(0, 8)
        : [];
    const selectedMember = allMembers.find(m => m.id === selectedId);

    const pendingFor = (memberId, groupId) => requests.some(r =>
        r.status === 'pending' && r.memberId === memberId && r.toGroupId === groupId);

    const handleCreate = async () => {
        if (!selectedMember || !destGroup || !reason.trim() || saving) return;
        if (pendingFor(selectedMember.id, destGroup.id)) {
            alert('Ya existe una solicitud pendiente para esta persona y grupo.');
            return;
        }
        setSaving(true);
        try {
            await createTransferRequest({
                memberId: selectedMember.id,
                memberName: `${selectedMember.lastName}, ${selectedMember.firstName}`,
                fromGroupId: null,
                fromGroupName: selectedMember.group,
                toGroupId: destGroup.id,
                toGroupName: destGroup.name,
                reason: reason.trim(),
                requestedByEmail: requesterEmail,
                requestedByName: requesterName,
            });
            setSearch('');
            setSelectedId('');
            setReason('');
            await load();
        } catch {
            alert('No se pudo enviar la solicitud.');
        } finally {
            setSaving(false);
        }
    };

    const incoming = requests.filter(r =>
        r.status === 'pending' && (isAdmin || myGroups.some(g => norm(g.name) === norm(r.fromGroupName))));
    const outgoing = requests.filter(r =>
        r.status === 'pending' && !isAdmin && r.requestedByEmail === requesterEmail);
    const history = requests.filter(r =>
        r.status !== 'pending' && (isAdmin || r.requestedByEmail === requesterEmail ||
            myGroups.some(g => norm(g.name) === norm(r.fromGroupName) || norm(g.name) === norm(r.toGroupName))));

    const handleAccept = async (req) => {
        if (actingId) return;
        if (!window.confirm(`¿Aceptar el traslado de ${req.memberName} a ${req.toGroupName}?`)) return;
        setActingId(req.id);
        try {
            const fresh = await getMembers();
            const member = fresh.find(m => m.id === req.memberId);
            if (!member) {
                alert('La persona ya no existe.');
                await updateTransferRequest(req.id, { status: 'rejected', resolvedBy: requesterEmail, resolveNote: 'Miembro no encontrado' });
            } else if (norm(member.group) !== norm(req.fromGroupName)) {
                alert('La persona ya no pertenece al grupo de origen. Se marca la solicitud como rechazada.');
                await updateTransferRequest(req.id, { status: 'rejected', resolvedBy: requesterEmail, resolveNote: 'Ya no pertenece al grupo de origen' });
            } else {
                const dest = myGroups.find(g => norm(g.name) === norm(req.toGroupName)) || myGroups.find(g => g.id === req.toGroupId);
                await updateMember(member.id, { group: req.toGroupName, groupId: dest?.id || req.toGroupId || null });
                await updateTransferRequest(req.id, { status: 'accepted', resolvedBy: requesterEmail });
            }
            await load();
        } catch {
            alert('No se pudo procesar la solicitud.');
        } finally {
            setActingId('');
        }
    };

    const handleReject = async (req) => {
        if (actingId) return;
        if (!window.confirm(`¿Rechazar el traslado de ${req.memberName}?`)) return;
        setActingId(req.id);
        try {
            await updateTransferRequest(req.id, { status: 'rejected', resolvedBy: requesterEmail });
            await load();
        } catch {
            alert('No se pudo procesar la solicitud.');
        } finally {
            setActingId('');
        }
    };

    const statusLabel = { pending: 'Pendiente', accepted: 'Aceptada', rejected: 'Rechazada' };

    return (
        <div className="d-flex flex-column gap-3">
            <Card>
                <h3 style={{ margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Send size={18} style={{ color: 'var(--color-primary)' }} /> Solicitar traslado
                </h3>
                <p style={{ margin: '0 0 1rem', color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                    Si la persona pertenece a otro grupo, pedí el traslado a su facilitador. Te avisaremos aquí cuando responda.
                </p>
                <div className="d-flex flex-column gap-2">
                    <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        Grupo destino (uno de tus grupos)
                        <select className="form-input" value={toGroupId} onChange={e => { setToGroupId(e.target.value); setSelectedId(''); }}>
                            {myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </label>
                    <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        Buscar persona de otro grupo
                        <span style={{ position: 'relative', display: 'block' }}>
                            <Search size={15} style={{ position: 'absolute', left: '0.7rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                            <input className="form-input" style={{ width: '100%', paddingLeft: '2.2rem' }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Nombre o DNI..." />
                        </span>
                    </label>
                    {searchResults.length > 0 && (
                        <div style={{ border: '1px solid var(--color-border)', borderRadius: '8px', overflow: 'hidden' }}>
                            {searchResults.map(m => (
                                <button
                                    key={m.id}
                                    type="button"
                                    onClick={() => setSelectedId(m.id)}
                                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0.8rem', border: 'none', borderBottom: '1px solid var(--color-border)', background: selectedId === m.id ? 'var(--color-surface-hover)' : 'var(--color-surface)', cursor: 'pointer', textAlign: 'left' }}
                                >
                                    <span><strong>{m.lastName}, {m.firstName}</strong></span>
                                    <small style={{ color: 'var(--color-text-muted)' }}>{m.group}</small>
                                </button>
                            ))}
                        </div>
                    )}
                    {selectedMember && (
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>
                            Seleccionado: <strong>{selectedMember.lastName}, {selectedMember.firstName}</strong> ({selectedMember.group} → {destGroup?.name})
                        </p>
                    )}
                    <label style={{ display: 'grid', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600 }}>
                        Motivo del pedido
                        <textarea className="form-input" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ej: la persona vive cerca de nuestro punto de encuentro..." />
                    </label>
                    <div>
                        <Button size="sm" icon={<Send size={14} />} onClick={handleCreate} disabled={!selectedMember || !destGroup || !reason.trim() || saving}>
                            {saving ? 'Enviando...' : 'Enviar solicitud'}
                        </Button>
                    </div>
                </div>
            </Card>

            <Card>
                <h3 style={{ margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ArrowLeftRight size={18} style={{ color: 'var(--color-primary)' }} /> Solicitudes recibidas
                </h3>
                {loading ? <p style={{ color: 'var(--color-text-muted)' }}>Cargando...</p>
                    : incoming.length === 0 ? <EmptyState icon={ArrowLeftRight} title="Sin pendientes" message="No tenés pedidos de traslado por responder." />
                    : incoming.map(r => (
                        <div key={r.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border)' }}>
                            <div>
                                <div><strong>{r.memberName}</strong> <span style={{ color: 'var(--color-text-muted)' }}>· {r.fromGroupName} → {r.toGroupName}</span></div>
                                <small style={{ color: 'var(--color-text-muted)' }}>Pide: {r.requestedByName} · {r.reason}</small>
                            </div>
                            <div className="d-flex gap-2">
                                <Button size="sm" icon={<Check size={14} />} onClick={() => handleAccept(r)} disabled={!!actingId}>Aceptar</Button>
                                <Button variant="outline" size="sm" icon={<X size={14} />} onClick={() => handleReject(r)} disabled={!!actingId}>Rechazar</Button>
                            </div>
                        </div>
                    ))}
            </Card>

            {!isAdmin && (
                <Card>
                    <h3 style={{ margin: '0 0 0.75rem' }}>Mis solicitudes enviadas</h3>
                    {outgoing.length === 0 ? <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Todavía no enviaste pedidos.</p>
                        : outgoing.map(r => (
                            <div key={r.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.9rem' }}>
                                <strong>{r.memberName}</strong> <span style={{ color: 'var(--color-text-muted)' }}>· {r.fromGroupName} → {r.toGroupName} · Pendiente</span>
                            </div>
                        ))}
                </Card>
            )}

            {history.length > 0 && (
                <Card>
                    <h3 style={{ margin: '0 0 0.75rem' }}>Historial</h3>
                    {history.slice(0, 10).map(r => (
                        <div key={r.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '0.85rem' }}>
                            <strong>{r.memberName}</strong> <span style={{ color: 'var(--color-text-muted)' }}>· {r.fromGroupName} → {r.toGroupName} · {statusLabel[r.status] || r.status}{r.resolveNote ? ` (${r.resolveNote})` : ''}</span>
                        </div>
                    ))}
                </Card>
            )}
        </div>
    );
};

export default TransferRequests;
