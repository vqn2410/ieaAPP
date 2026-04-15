import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getMembers } from '../services/memberService';
import { getGroups } from '../services/groupService';
import { getEvents } from '../services/eventService';
import { Users, Calendar as CalendarIcon, DollarSign, Activity, Bell, ListTodo } from 'lucide-react';

const Dashboard = () => {
  const { userData, hasRole } = useAuth();
  const { settings } = useSettings();
  const [stats, setStats] = useState({
    members: 0,
    groups: 0,
    events: 0,
    upcomingEvents: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        try {
            const [members, groups, events] = await Promise.all([
                getMembers(),
                getGroups(),
                getEvents()
            ]);
            
            const now = new Date();
            const upcoming = events
                .filter(e => e.date && new Date(e.date) >= now)
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .slice(0, 3);

            setStats({
                members: members.length,
                groups: groups.length,
                events: events.filter(e => e.date && new Date(e.date) >= now).length,
                upcomingEvents: upcoming
            });
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
  }, []);

  const roleKey = userData?.role || 'Member';
  const roleName = Array.isArray(roleKey) ? roleKey.map(r => settings?.roles?.[r] || r).join(', ') : (settings?.roles?.[roleKey] || roleKey);
  const isAdmin = hasRole(['Admin', 'Pastor']);

  return (
    <div className="animate-fade-in">
      <div className="mb-4">
        <h1 style={{ marginBottom: '0.5rem' }}>¡Bienvenido{userData?.name && userData?.name !== 'Usuario' ? ` ${userData.name.split(' ')[0]}` : ''}!</h1>
        <p className="subtitle" style={{ color: 'var(--color-text-muted)' }}>
          Panel de control general. {roleKey !== 'Member' && <span>Tu rol actual es: <strong>{roleName}</strong></span>}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 mb-4">
        {/* KPI Cards */}
        <Card className="d-flex align-center gap-3">
          <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(var(--color-primary-rgb), 0.1)', borderRadius: '50%', color: 'var(--color-primary)', flexShrink: 0 }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{loading ? '...' : stats.members}</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Miembros</span>
          </div>
        </Card>
        
        <Card className="d-flex align-center gap-3">
          <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(var(--color-warning-rgb), 0.1)', borderRadius: '50%', color: 'var(--color-warning)', flexShrink: 0 }}>
            <CalendarIcon size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{loading ? '...' : stats.events}</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Eventos próximos</span>
          </div>
        </Card>

        <Card className="d-flex align-center gap-3">
          <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(var(--color-secondary-rgb), 0.1)', borderRadius: '50%', color: 'var(--color-secondary)', flexShrink: 0 }}>
            <Activity size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.5rem' }}>{loading ? '...' : stats.groups}</h3>
            <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Grupos activos</span>
          </div>
        </Card>

        {isAdmin && (
          <Card className="d-flex align-center gap-3">
            <div className="d-flex align-center justify-center" style={{ width: '50px', height: '50px', backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: '50%', color: '#4CAF50', flexShrink: 0 }}>
              <DollarSign size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.5rem' }}>Finanzas</h3>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>Módulo activo</span>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 mb-4">
        <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Card title={<div className="d-flex align-center gap-2"><ListTodo size={20} color="var(--color-primary)" /> Próximas Actividades</div>}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {loading ? (
                  <p style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>Cargando actividades...</p>
              ) : stats.upcomingEvents.length === 0 ? (
                  <p style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>No hay eventos próximos registrados.</p>
              ) : stats.upcomingEvents.map((event, idx) => (
                  <li key={event.id || idx} className="d-flex justify-between align-center interactive-list-item" style={{ borderBottom: idx === stats.upcomingEvents.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{event.title}</h4>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        {event.date ? new Date(event.date + "T12:00:00").toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Sin fecha'} • {event.location || 'Templo'}
                      </span>
                    </div>
                    <span className="badge badge-blue">{event.category || 'General'}</span>
                  </li>
              ))}
            </ul>
          </Card>
        </div>
        
        <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Card title={<div className="d-flex align-center gap-2"><Bell size={20} color="var(--color-warning)" /> Comunicados Rápidos</div>}>
             <div className="d-flex flex-column align-center justify-center p-4 text-center">
                <Bell size={40} color="var(--color-border)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No hay comunicados recientes para mostrar en este momento.</p>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
