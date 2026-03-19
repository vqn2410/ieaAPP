import React from 'react';
import Card from '../components/common/Card';
import { Youtube, MonitorPlay } from 'lucide-react';

const Live = () => {
  return (
    <div>
      <h1 className="mb-4">Transmisiones en Vivo</h1>
      <div className="grid grid-cols-1 mb-4">
        <Card>
          <div className="d-flex align-center flex-column justify-center" style={{ minHeight: '300px', backgroundColor: '#000', borderRadius: 'var(--radius-md)' }}>
            <MonitorPlay size={48} color="#fff" />
            <p style={{ color: '#fff', marginTop: '1rem' }}>No hay transmisiones activas en este momento</p>
          </div>
        </Card>
      </div>
    </div>
  );
};
export default Live;
