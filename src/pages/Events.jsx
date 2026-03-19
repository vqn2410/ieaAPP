import React from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { Plus, Calendar as CalIcon } from 'lucide-react';

const Events = () => {
  return (
    <div>
      <div className="d-flex justify-between align-center mb-4">
        <h1>Calendario de Actividades</h1>
        <Button icon={<Plus size={16} />}>Nuevo Evento</Button>
      </div>

      <Card>
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>
          <CalIcon size={48} style={{ marginBottom: '1rem', color: '#10b981' }} />
          <h3>No hay eventos próximos registrados</h3>
          <p>Los eventos aparecerán aquí, sincronizados con las reuniones generales y de grupos.</p>
        </div>
      </Card>
    </div>
  );
};

export default Events;
