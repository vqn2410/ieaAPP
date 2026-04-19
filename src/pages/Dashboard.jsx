import React, { useState, useEffect } from 'react';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getMembers } from '../services/memberService';
import { getGroups } from '../services/groupService';
import { getEvents } from '../services/eventService';
import { Users, Calendar as CalendarIcon, DollarSign, Activity, Bell, ListTodo } from 'lucide-react';
import { formatDate } from '../utils/helpers';

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
        <h1 style={{ marginBottom: '0.5rem' }}>¡Bienvenido{userData?.name && userData?.name !== 'Usuario' ? ` ${userData.name.split(' ')[0]}` : ''}! 👋</h1>
        <p className="subtitle" style={{ color: 'var(--color-text-muted)' }}>
          {loading ? 'Preparando tu panel...' : `Todo listo por hoy. ${roleKey !== 'Member' ? `Tu rol actual es: ${roleName}` : ''}`}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 mb-4">
        <StatCard 
          title="Miembros" 
          value={stats.members} 
          icon={Users} 
          loading={loading}
          iconColor="var(--color-primary)"
        />
        
        <StatCard 
          title="Próximos" 
          value={stats.events} 
          icon={CalendarIcon} 
          loading={loading}
          iconColor="var(--color-warning)"
        />

        <StatCard 
          title="G. de Amistad" 
          value={stats.groups} 
          icon={Activity} 
          loading={loading}
          iconColor="var(--color-secondary)"
        />

        {isAdmin && (
          <StatCard 
            title="Finanzas" 
            value="Activo" 
            icon={DollarSign} 
            iconColor="var(--color-primary)"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 mb-4">
        <div className="lg:col-span-2 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <Card title={<div className="d-flex align-center gap-2"><ListTodo size={20} color="var(--color-primary)" /> Próximas Actividades</div>}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {loading ? (
                  [1, 2, 3].map(i => (
                    <li key={i} className="d-flex justify-between align-center p-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ width: '60%', height: '20px', marginBottom: '8px' }}></div>
                        <div className="skeleton" style={{ width: '40%', height: '14px' }}></div>
                      </div>
                      <div className="skeleton" style={{ width: '80px', height: '24px', borderRadius: '12px' }}></div>
                    </li>
                  ))
              ) : stats.upcomingEvents.length === 0 ? (
                  <p style={{ padding: '1rem', color: 'var(--color-text-muted)' }}>No hay eventos próximos registrados.</p>
              ) : stats.upcomingEvents.map((event, idx) => (
                  <li key={event.id || idx} className="d-flex justify-between align-center interactive-list-item" style={{ borderBottom: idx === stats.upcomingEvents.length - 1 ? 'none' : '1px solid var(--color-border)' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{event.title}</h4>
                      <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                        {formatDate(event.date)} • {event.location || 'Templo'}
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
