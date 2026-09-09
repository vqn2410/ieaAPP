import React, { useState } from 'react';
import {
  Activity,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  ClipboardCheck,
  FileBarChart,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Search,
  Settings,
  Users,
  X,
} from 'lucide-react';
import './IeaMockup.css';

const navItems = [
  { label: 'Inicio', icon: LayoutDashboard },
  { label: 'Miembros', icon: Users },
  { label: 'Grupos de Amistad', icon: HeartHandshake },
  { label: 'Consolidación', icon: Activity, badge: '4' },
  { label: 'Reuniones', icon: CalendarDays },
  { label: 'Ministerios', icon: ClipboardCheck },
  { label: 'Reportes', icon: FileBarChart },
];

const meetings = [
  { day: '18', month: 'JUN', title: 'Grupo de Amistad', meta: 'Casa de familia · 20:00', tone: 'blue' },
  { day: '20', month: 'JUN', title: 'Celebración IEA', meta: 'Templo principal · 19:00', tone: 'purple' },
  { day: '22', month: 'JUN', title: 'Reunión de líderes', meta: 'Salón 2 · 10:30', tone: 'orange' },
];

const followUps = [
  { initials: 'ML', name: 'María López', detail: 'Primera visita · hace 2 días', status: 'Contactar' },
  { initials: 'JT', name: 'Juan Torres', detail: 'Grupo de Amistad · hace 4 días', status: 'Pendiente' },
  { initials: 'AG', name: 'Ana González', detail: 'Camino de crecimiento · hace 6 días', status: 'Coordinar' },
];

function StatCard({ icon: Icon, label, value, note, color }) {
  return (
    <article className="iea-mockup-stat">
      <div className={`iea-mockup-stat-icon ${color}`}><Icon size={19} /></div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{note}</span>
      </div>
    </article>
  );
}

export default function IeaMockup() {
  const [active, setActive] = useState('Inicio');
  const [mobileOpen, setMobileOpen] = useState(false);

  const selectSection = (label) => {
    setActive(label);
    setMobileOpen(false);
  };

  return (
    <div className="iea-mockup">
      <aside className={`iea-mockup-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="iea-mockup-brand">
          <div className="iea-mockup-mark">IEA</div>
          <div><strong>Iglesia Extremo Amor</strong><span>Panel pastoral</span></div>
          <button className="iea-mockup-close" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
        </div>

        <div className="iea-mockup-church-switcher">
          <span className="iea-mockup-avatar">IE</span>
          <div><strong>Extremo Amor</strong><small>Remedios de Escalada</small></div>
          <ChevronDown size={16} />
        </div>

        <p className="iea-mockup-nav-label">Cuidado pastoral</p>
        <nav className="iea-mockup-nav" aria-label="Navegación principal">
          {navItems.map(({ label, icon: Icon, badge }) => (
            <button key={label} className={active === label ? 'active' : ''} onClick={() => selectSection(label)}>
              <Icon size={18} /><span>{label}</span>{badge && <b>{badge}</b>}
            </button>
          ))}
        </nav>

        <div className="iea-mockup-sidebar-bottom">
          <button className="iea-mockup-settings"><Settings size={17} /> Configuración</button>
          <div className="iea-mockup-user">
            <span className="iea-mockup-avatar warm">NV</span>
            <div><strong>Nicolás Vergara</strong><small>Administrador</small></div>
            <MoreHorizontal size={17} />
          </div>
        </div>
      </aside>

      {mobileOpen && <button className="iea-mockup-backdrop" onClick={() => setMobileOpen(false)} aria-label="Cerrar menú" />}

      <main className="iea-mockup-main">
        <header className="iea-mockup-topbar">
          <button className="iea-mockup-menu" onClick={() => setMobileOpen(true)} aria-label="Abrir menú"><Menu size={22} /></button>
          <div className="iea-mockup-breadcrumb"><span>IEA</span><i>/</i><strong>{active}</strong></div>
          <div className="iea-mockup-top-actions">
            <button className="iea-mockup-icon-button" aria-label="Buscar"><Search size={18} /></button>
            <button className="iea-mockup-icon-button notification" aria-label="Notificaciones"><Bell size={18} /><b /></button>
            <div className="iea-mockup-top-profile"><span className="iea-mockup-avatar warm">NV</span><ChevronDown size={15} /></div>
          </div>
        </header>

        <div className="iea-mockup-content">
          <div className="iea-mockup-heading">
            <div><p className="eyebrow">Martes 17 de junio, 2025</p><h1>Buen día, Nicolás</h1><p className="muted">Este es el estado de la vida pastoral de IEA.</p></div>
            <button className="iea-mockup-primary"><MessageCircle size={17} /> Nueva acción</button>
          </div>

          <section className="iea-mockup-stats">
            <StatCard icon={Users} label="Miembros" value="248" note="+12 este mes" color="blue" />
            <StatCard icon={HeartHandshake} label="Grupos de Amistad" value="18" note="16 activos" color="violet" />
            <StatCard icon={Activity} label="En consolidación" value="23" note="4 requieren atención" color="orange" />
            <StatCard icon={CalendarDays} label="Próximas reuniones" value="7" note="En los próximos 10 días" color="green" />
          </section>

          <section className="iea-mockup-grid">
            <div className="iea-mockup-card iea-mockup-priority-card">
              <div className="iea-mockup-card-head"><div><p className="eyebrow">Para hoy</p><h2>Acciones pastorales</h2></div><button className="iea-mockup-link">Ver todas <span>→</span></button></div>
              <div className="iea-mockup-followups">
                {followUps.map((item) => <button className="iea-mockup-followup" key={item.name} onClick={() => selectSection('Consolidación')}><span className="iea-mockup-avatar soft">{item.initials}</span><span className="iea-mockup-followup-text"><strong>{item.name}</strong><small>{item.detail}</small></span><em>{item.status}</em><span className="iea-mockup-arrow">→</span></button>)}
              </div>
            </div>

            <div className="iea-mockup-card">
              <div className="iea-mockup-card-head"><div><p className="eyebrow">Agenda</p><h2>Próximas reuniones</h2></div><button className="iea-mockup-link" onClick={() => selectSection('Reuniones')}>Calendario <span>→</span></button></div>
              <div className="iea-mockup-meetings">{meetings.map((meeting) => <button className="iea-mockup-meeting" key={meeting.title} onClick={() => selectSection('Reuniones')}><span className={`iea-mockup-date ${meeting.tone}`}><strong>{meeting.day}</strong><small>{meeting.month}</small></span><span><strong>{meeting.title}</strong><small>{meeting.meta}</small></span><span className="iea-mockup-arrow">→</span></button>)}</div>
            </div>
          </section>

          <section className="iea-mockup-bottom-grid">
            <div className="iea-mockup-card iea-mockup-chart-card">
              <div className="iea-mockup-card-head"><div><p className="eyebrow">Últimos 6 meses</p><h2>Participación en grupos</h2></div><button className="iea-mockup-filter">2025 <ChevronDown size={14} /></button></div>
              <div className="iea-mockup-chart"><div className="iea-mockup-chart-labels"><span>100%</span><span>75%</span><span>50%</span><span>25%</span><span>0%</span></div><div className="iea-mockup-bars">{[['Ene',54],['Feb',62],['Mar',57],['Abr',73],['May',69],['Jun',81]].map(([month, height]) => <div key={month}><span style={{ height: `${height}%` }} /><small>{month}</small></div>)}</div></div>
            </div>
            <div className="iea-mockup-card iea-mockup-quick-card"><div className="iea-mockup-card-head"><div><p className="eyebrow">Acceso rápido</p><h2>Gestión de IEA</h2></div></div><div className="iea-mockup-quick-links"><button onClick={() => selectSection('Miembros')}><Users size={17} /><span>Agregar miembro</span><b>+</b></button><button onClick={() => selectSection('Grupos de Amistad')}><HeartHandshake size={17} /><span>Crear grupo</span><b>+</b></button><button onClick={() => selectSection('Reuniones')}><CalendarDays size={17} /><span>Programar reunión</span><b>+</b></button><button onClick={() => selectSection('Reportes')}><FileBarChart size={17} /><span>Generar reporte</span><b>+</b></button></div></div>
          </section>

          <footer className="iea-mockup-footer"><CircleUserRound size={15} /> Espacio de cuidado pastoral de Iglesia Extremo Amor <span>·</span> Versión de maqueta</footer>
        </div>
      </main>
    </div>
  );
}
