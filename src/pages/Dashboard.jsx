import React from 'react';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Users, Calendar as CalendarIcon, DollarSign, Activity, Bell, ListTodo } from 'lucide-react';

const Dashboard = () => {
  const { userData } = useAuth();
  const { settings } = useSettings();
  const roleKey = userData?.role || 'Member';
  const roleName = settings?.roles?.[roleKey] || roleKey;

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h1 style={{ marginBottom: '0.5rem' }}>Bienvenido{userData?.name && userData?.name !== 'Usuario' ? `, ${userData.name.split(' ')[0]}` : ' nuevamente'}</h1>
        <p className="subtitle" style={{ color: 'var(--color-text-muted)' }}>
          Panel de control general. {roleKey !== 'Member' && <span>Tu rol actual es: <strong>{roleName}</strong></span>}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 mb-4">
        {/* KPI Cards */}
        <Card className="d-flex align-center gap-3">
          <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#111111', flexShrink: 0 }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>1,204</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Miembros</span>
          </div>
        </Card>
        
        <Card className="d-flex align-center gap-3">
          <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#111111', flexShrink: 0 }}>
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>5</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Eventos próximos</span>
          </div>
        </Card>

        <Card className="d-flex align-center gap-3">
          <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#111111', flexShrink: 0 }}>
            <Activity size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>45</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Grupos activos</span>
          </div>
        </Card>

        {['Admin', 'Pastor'].includes(roleKey) && (
          <Card className="d-flex align-center gap-3">
            <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: '#f3f4f6', borderRadius: '50%', color: '#374151', flexShrink: 0 }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Finanzas</h3>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Mes actual: OK</span>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 mb-4">
        <div className="lg:col-span-2">
          <Card title={<div className="d-flex align-center gap-2"><ListTodo size={20} color="var(--color-primary-light)" /> Próximas Actividades</div>}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li className="d-flex justify-between align-center interactive-list-item" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <h4 style={{ margin: 0 }}>Reunión General - Domingo</h4>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Domingo 10:00 AM • Templo Principal</span>
                </div>
                <span className="badge badge-gray">General</span>
              </li>
              <li className="d-flex justify-between align-center interactive-list-item" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <h4 style={{ margin: 0 }}>Encuentro de Jóvenes</h4>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Sábado 19:00 PM • Salón Anexo</span>
                </div>
                <span className="badge badge-gray">Jóvenes</span>
              </li>
              <li className="d-flex justify-between align-center interactive-list-item">
                <div>
                  <h4 style={{ margin: 0 }}>Clase de Discipulado</h4>
                  <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Miércoles 20:00 PM • Aula 2</span>
                </div>
                <span className="badge badge-gray">Enseñanza</span>
              </li>
            </ul>
          </Card>
        </div>
        
        <div>
          <Card title={<div className="d-flex align-center gap-2"><Bell size={20} color="var(--color-warning)" /> Comunicados Rápidos</div>}>
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
