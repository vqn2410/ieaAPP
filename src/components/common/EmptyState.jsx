import React from 'react';
import { Inbox } from 'lucide-react';

const EmptyState = ({ icon: Icon, title = 'Sin datos', message = 'No hay información disponible.', action }) => {
  const IconComponent = Icon || Inbox;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 1rem', textAlign: 'center',
    }}>
      <IconComponent size={48} color="var(--color-border)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
      <h3 style={{ margin: '0 0 0.5rem', color: 'var(--color-text-muted)', fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.875rem', maxWidth: '300px' }}>{message}</p>
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
