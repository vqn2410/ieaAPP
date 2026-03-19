import React from 'react';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { Users, Calendar as CalendarIcon, DollarSign, Activity } from 'lucide-react';

const Dashboard = () => {
  const { userData } = useAuth();
  const role = userData?.role || 'Miembro';

  return (
    <div>
      <div className="mb-4">
        <h1 style={{ marginBottom: '0.5rem' }}>Bienvenido nuevamente</h1>
        <p className="subtitle" style={{ color: 'var(--color-text-muted)' }}>
          Panel de control general. Tu rol actual es: <strong>{role}</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 mb-4">
        {/* KPI Cards */}
        <Card className="d-flex align-center gap-3">
          <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#111111' }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>1,204</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Miembros</span>
          </div>
        </Card>
        
        <Card className="d-flex align-center gap-3">
          <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#111111' }}>
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>5</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Eventos próximos</span>
          </div>
        </Card>

        <Card className="d-flex align-center gap-3">
          <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#111111' }}>
            <Activity size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>45</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Grupos activos</span>
          </div>
        </Card>

        {['Admin', 'Pastor'].includes(role) && (
          <Card className="d-flex align-center gap-3">
            <div style={{ padding: '1rem', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#374151' }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Finanzas</h3>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Mes actual: OK</span>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-2" style={{ gap: '1.5rem', display: 'flex', flexDirection: window.innerWidth < 1024 ? 'column' : 'row' }}>
        <div style={{ flex: 2 }}>
          <Card title="Próximas Actividades">
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }} className="d-flex justify-between align-center">
                <div>
                  <h4 style={{ margin: 0 }}>Reunión General - Domingo</h4>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Domingo 10:00 AM • Templo Principal</span>
                </div>
                <span className="badge badge-gray">General</span>
              </li>
              <li style={{ padding: '1rem 0', borderBottom: '1px solid var(--color-border)' }} className="d-flex justify-between align-center">
                <div>
                  <h4 style={{ margin: 0 }}>Encuentro de Jóvenes</h4>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Sábado 19:00 PM • Salón Anexo</span>
                </div>
                <span className="badge badge-gray">Jóvenes</span>
              </li>
              <li style={{ padding: '1rem 0' }} className="d-flex justify-between align-center">
                <div>
                  <h4 style={{ margin: 0 }}>Clase de Discipulado</h4>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Miércoles 20:00 PM • Aula 2</span>
                </div>
                <span className="badge badge-gray">Enseñanza</span>
              </li>
            </ul>
          </Card>
        </div>
        
        <div style={{ flex: 1 }}>
          <Card title="Comunicados Rápidos">
             <div className="alert alert-warning mb-2">
               <strong>Aviso:</strong> Este viernes no habrá ensayo del ministerio de música.
             </div>
             <div style={{ padding: '1rem', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
               <h4 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--color-primary-dark)' }}>Lectura de la Semana</h4>
               <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                 Salmos 23. Dedicaremos la próxima reunión a reflexionar sobre nuestra dependencia de Dios.
               </p>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
