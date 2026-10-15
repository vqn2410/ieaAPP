import React, { useEffect, useState } from 'react';
import Card from '../../components/common/Card';
import { getAuditLogs } from '../../services/auditService';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuditLogs().then(setLogs).finally(() => setLoading(false));
  }, []);

  return <div className="animate-fade-in"><div className="mb-4"><p className="eyebrow">Seguridad</p><h1>Auditoría</h1><p style={{ color: 'var(--color-text-muted)' }}>Historial inmutable de cambios sensibles.</p></div><Card>{loading ? <p>Cargando auditoría...</p> : logs.length === 0 ? <p style={{ color: 'var(--color-text-muted)' }}>Todavía no hay acciones registradas.</p> : <div style={{ display: 'grid', gap: '.5rem' }}>{logs.slice(0, 100).map(log => <div key={log.id} style={{ display: 'grid', gridTemplateColumns: '130px 100px 1fr', gap: '.75rem', padding: '.65rem 0', borderBottom: '1px solid var(--color-border)', fontSize: '.78rem' }}><strong>{log.action}</strong><span>{log.entity}</span><span>{log.actorEmail || log.actorId} · {log.entityId || '-'}</span></div>)}</div>}</Card></div>;
}
