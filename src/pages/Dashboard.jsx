import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { getMembers } from '../services/memberService';
import { getGroups } from '../services/groupService';
import { getEvents } from '../services/eventService';
import { getPendingFollowUps } from '../services/followUpService';
import { isBaptised } from '../utils/helpers';
import { Users, Calendar, Activity, ListTodo, ArrowRight, ChevronLeft, ChevronRight, UserPlus, BookOpen, Target, Clock, MessageSquare, Cake } from 'lucide-react';
import EmptyState from '../components/common/EmptyState';
import './Dashboard.css';

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fullMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const normDashboard = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[,.;]/g, ' ').replace(/\s+/g, ' ').trim();
const currentUserEmail = userData => userData?.email || '';
const announcements = [
  { title: 'Reunión de oración', image: '/anuncios/ORACI%C3%93N.jpg' },
  { title: 'Generosidad', image: '/anuncios/OFRENDA.jpg' },
  { title: 'Merendero', image: '/anuncios/MERENDERO.jpg' },
  { title: 'La Tribu adolescentes', image: '/anuncios/LA-TRIBU.jpg' },
  { title: 'I.E.T.E.', image: '/anuncios/iete.jpg' },
  { title: 'Grupos de amistad', image: '/anuncios/GRUPOS-DE-AMISTAD.jpg' },
  { title: 'Cena navideña: colaboración', image: '/anuncios/DONACIONES-CENA-NAVIDE%C3%91A.jpg' },
];

const StatWidget = ({ title, value, icon: Icon, to, loading, subtitle }) => {
  const navigate = useNavigate();
  return (
    <div className="dash-stat" onClick={() => to && navigate(to)}>
      <div className="dash-stat-icon">{Icon && <Icon size={20} strokeWidth={1.5} />}</div>
      <div className="dash-stat-body">
        {loading ? (
          <div className="skeleton" style={{ width: '40px', height: '24px' }}></div>
        ) : (
          <div className="dash-stat-value">{value}</div>
        )}
        <div className="dash-stat-label">{title}</div>
        {subtitle && <div className="dash-stat-sub">{subtitle}</div>}
      </div>
    </div>
  );
};

const ActivityItem = ({ icon: Icon, text, time, onClick }) => (
  <div className="dash-activity-item" onClick={onClick}>
    {Icon && (
      <div className="dash-activity-icon">
        <Icon size={14} strokeWidth={1.5} />
      </div>
    )}
    <div className="dash-activity-body">
      <span className="dash-activity-text">{text}</span>
      {time && <span className="dash-activity-time">{time}</span>}
    </div>
  </div>
);

const EventWidget = ({ events, loading }) => {
  if (loading) {
    return [1, 2, 3].map(i => (
      <div key={i} className="dash-event">
        <div className="skeleton" style={{ width: '40px', height: '48px', borderRadius: '8px', flexShrink: 0 }}></div>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ width: '60%', height: '14px', marginBottom: '6px' }}></div>
          <div className="skeleton" style={{ width: '40%', height: '12px' }}></div>
        </div>
      </div>
    ));
  }

  if (events.length === 0) {
    return <EmptyState icon={Calendar} title="Sin actividades" message="No hay eventos próximos." />;
  }

  return events.map((event, idx) => {
    const d = new Date(event.date + 'T12:00:00');
    return (
      <div key={event.id || idx} className="dash-event" style={{ animationDelay: `${idx * 0.04}s` }}>
        <div className="dash-event-badge">
          <span className="dash-event-day">{d.getDate()}</span>
          <span className="dash-event-month">{months[d.getMonth()]}</span>
        </div>
        <div className="dash-event-info">
          <div className="dash-event-title">{event.title}</div>
          <div className="dash-event-meta">
            <span>{event.location || 'Templo'}</span>
            {event.category && (
              <>
                <span className="dash-meta-dot">·</span>
                <span>{event.category}</span>
              </>
            )}
          </div>
        </div>
      </div>
    );
  });
};

const timeAgo = (date) => {
  if (!date) return null;
  const diff = Date.now() - new Date(date.seconds ? date.seconds * 1000 : date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
};

const getBirthDate = (member) => member?.birthDate || member?.birthday || member?.birthdate || member?.dateOfBirth || '';

const getBirthdayParts = (member) => {
  const value = getBirthDate(member);
  if (!value) return null;
  if (typeof value === 'string') {
    const iso = value.match(/^\d{4}[-/](\d{1,2})[-/](\d{1,2})/);
    if (iso) return { month: Number(iso[1]), day: Number(iso[2]) };
    const local = value.match(/^(\d{1,2})[-/](\d{1,2})/);
    if (local) return { month: Number(local[2]), day: Number(local[1]) };
  }
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return { month: date.getMonth() + 1, day: date.getDate() };
};

const birthdayKey = (member) => {
  const parts = getBirthdayParts(member);
  return parts ? `${parts.month}-${parts.day}` : null;
};

const birthdayLabel = (member) => {
  const parts = getBirthdayParts(member);
  return parts ? `${parts.day} de ${fullMonths[parts.month - 1]}` : '';
};

const getWeekStart = (date) => {
  const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (result.getDay() + 6) % 7;
  result.setDate(result.getDate() - day);
  return result;
};

const BirthdayWeek = ({ members, loading, onMemberClick }) => {
  const today = new Date();
  const weekStart = getWeekStart(today);
  const weekKeys = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    return `${day.getMonth() + 1}-${day.getDate()}`;
  });
  const birthdays = members
    .map(member => ({ member, key: birthdayKey(member) }))
    .filter(item => item.key && weekKeys.includes(item.key))
    .sort((a, b) => weekKeys.indexOf(a.key) - weekKeys.indexOf(b.key));

  return (
    <Card>
      <div className="dash-side-card-hd">
        <Cake size={16} className="birthday-icon" />
        <span>Cumpleaños de la semana</span>
        {birthdays.length > 0 && <Badge variant="secondary" style={{ marginLeft: 'auto' }}>{birthdays.length}</Badge>}
      </div>
      <div className="dash-card-bd dash-birthday-week">
        {loading ? [1, 2].map(item => <div className="dash-birthday-row" key={item}><div className="skeleton" style={{ width: '30px', height: '30px', borderRadius: '50%' }} /><div style={{ flex: 1 }}><div className="skeleton" style={{ width: '65%', height: '12px', marginBottom: '4px' }} /><div className="skeleton" style={{ width: '35%', height: '10px' }} /></div></div>) : birthdays.length === 0 ? (
          <EmptyState icon={Cake} title="Sin cumpleaños" message="No hay cumpleaños registrados esta semana." compact />
        ) : birthdays.map(({ member }) => (
          <button className="dash-birthday-row" key={member.id} onClick={() => onMemberClick(member.id)}>
            <span className="dash-birthday-avatar">{`${(member.firstName || '?')[0]}${(member.lastName || '?')[0]}`}</span>
            <span className="dash-birthday-person"><strong>{member.firstName} {member.lastName}</strong><small>{birthdayLabel(member)}</small></span>
            <span className="dash-birthday-cake">🎂</span>
          </button>
        ))}
      </div>
    </Card>
  );
};

const BirthdayCalendar = ({ members, onMemberClick }) => {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const birthdayMap = members.reduce((map, member) => {
    const parts = getBirthdayParts(member);
    if (parts?.month === monthIndex + 1) {
      map[parts.day] = [...(map[parts.day] || []), member];
    }
    return map;
  }, {});
  const today = new Date();
  const monthBirthdays = members
    .map(member => ({ member, parts: getBirthdayParts(member) }))
    .filter(({ parts }) => parts?.month === monthIndex + 1)
    .sort((a, b) => a.parts.day - b.parts.day);

  return (
    <Card className="dash-birthday-calendar-card">
      <div className="dash-card-hd">
        <div className="dash-card-title"><Cake size={16} strokeWidth={1.5} /><span>Calendario de cumpleaños</span></div>
        <div className="dash-calendar-controls"><button onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Mes anterior"><ChevronLeft size={15} /></button><strong>{fullMonths[monthIndex]} {year}</strong><button onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Mes siguiente"><ChevronRight size={15} /></button></div>
      </div>
      <div className="dash-birthday-calendar">
        <div className="dash-calendar-weekdays">{weekDays.map(day => <span key={day}>{day}</span>)}</div>
        <div className="dash-calendar-grid">{cells.map((day, index) => {
          const people = day ? birthdayMap[day] || [] : [];
          const isToday = day === today.getDate() && monthIndex === today.getMonth() && year === today.getFullYear();
          return <div className={`dash-calendar-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''}`} key={`${year}-${monthIndex}-${index}`}><span className="dash-calendar-number">{day}</span>{people.map(person => <button className="dash-calendar-person" key={person.id} title={`${person.firstName} ${person.lastName}`} onClick={() => onMemberClick(person.id)}>{`${(person.firstName || '?')[0]}${(person.lastName || '?')[0]}`}</button>)}</div>;
        })}</div>
      </div>
      <div className="dash-calendar-list">
        <div className="dash-calendar-list-hd">{monthBirthdays.length > 0 ? `${monthBirthdays.length} cumpleaños en ${fullMonths[monthIndex]}` : `Sin cumpleaños en ${fullMonths[monthIndex]}`}</div>
        {monthBirthdays.map(({ member, parts }) => (
          <button key={member.id} className="dash-calendar-list-item" onClick={() => onMemberClick(member.id)}>
            <span className="dash-calendar-list-day">{parts.day}</span>
            <span className="dash-calendar-list-name">{member.lastName}, {member.firstName}</span>
            <Cake size={14} strokeWidth={1.5} />
          </button>
        ))}
      </div>
      <div className="dash-calendar-legend"><span className="dash-calendar-dot" /> Seleccioná un nombre para ver el perfil.</div>
    </Card>
  );
};

const Dashboard = () => {
  const { userData, hasRole } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
     members: 0, groups: 0, events: 0, baptised: 0, upcomingEvents: [], recentMembers: [], allMembers: []
  });
  const [loading, setLoading] = useState(true);
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const [members, groups, events, pendingFups] = await Promise.all([
          getMembers(), getGroups(), getEvents(), getPendingFollowUps()
        ]);
        const isAdminOrPastor = hasRole(['Admin', 'Pastor']);
        const currentMember = members.find(member =>
          member.email && currentUserEmail(userData) &&
          member.email.trim().toLowerCase() === currentUserEmail(userData).trim().toLowerCase()
        );
        const matchesLeader = (group, member) => [...(Array.isArray(group.facilitators) ? group.facilitators : [group.facilitators]), ...(Array.isArray(group.coFacilitators) ? group.coFacilitators : [group.coFacilitators])]
          .filter(Boolean)
          .some(value => value === member?.id || normDashboard(value) === normDashboard(`${member?.lastName}, ${member?.firstName}`) || normDashboard(value) === normDashboard(`${member?.firstName} ${member?.lastName}`));
        const visibleGroups = isAdminOrPastor || !currentMember
          ? groups
          : groups.filter(group => matchesLeader(group, currentMember));
        const visibleGroupIds = new Set(visibleGroups.map(group => group.id));
        const visibleGroupNames = new Set(visibleGroups.map(group => normDashboard(group.name)));
        const visibleMembers = isAdminOrPastor || !currentMember
          ? members
          : members.filter(member => visibleGroups.some(group => {
              const memberGroup = normDashboard(member.group);
              const groupName = normDashboard(group.name);
              return memberGroup && (memberGroup === groupName || groupName.includes(memberGroup));
            }));
        const visibleEvents = isAdminOrPastor || !currentMember
          ? events
          : events.filter(event => visibleGroupIds.has(event.groupId) || visibleGroupNames.has(normDashboard(event.group)));
        const visibleFollowUps = isAdminOrPastor || !currentMember
          ? pendingFups
          : pendingFups.filter(followUp => visibleMembers.some(member => member.id === followUp.memberId));
        const now = new Date();
        const upcoming = visibleEvents
          .filter(e => e.date && new Date(e.date + 'T12:00:00') >= now)
          .sort((a, b) => new Date(a.date + 'T12:00:00') - new Date(b.date + 'T12:00:00'))
          .slice(0, 5);

        const recent = [...visibleMembers]
          .filter(m => m.createdAt)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 5);

        const baptised = visibleMembers.filter(isBaptised).length;

        const memberMap = {};
        members.forEach(m => { memberMap[m.id] = m; });

        setStats({
          members: visibleMembers.length,
          groups: visibleGroups.length,
          events: visibleEvents.filter(e => e.date && new Date(e.date + 'T12:00:00') >= now).length,
          baptised,
          upcomingEvents: upcoming,
          recentMembers: recent,
          allMembers: members,
          pendingFollowUps: visibleFollowUps.map(f => ({ ...f, memberName: memberMap[f.memberId] ? `${memberMap[f.memberId].firstName} ${memberMap[f.memberId].lastName}` : '?' }))
        });
      } catch {
        console.error('Error loading dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasRole, userData]);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIndex(current => (current + 1) % announcements.length);
    }, 7000);
    return () => clearInterval(timer);
  }, []);

  const roleKey = userData?.role || 'Member';
  const roleName = Array.isArray(roleKey)
    ? roleKey.map(r => settings?.roles?.[r] || r).join(', ')
    : (settings?.roles?.[roleKey] || roleKey);

  const name = userData?.name && userData.name !== 'Usuario'
    ? userData.name.split(' ')[0] : null;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const quickLinks = [
    { label: 'Miembros', icon: Users, to: '/dashboard/miembros', show: hasRole(['Admin', 'Pastor', 'MinistryLeader', 'Facilitator']) },
    { label: 'Grupos', icon: Activity, to: '/dashboard/grupos', show: hasRole(['Admin', 'Pastor', 'Facilitator']) },
    { label: 'Eventos', icon: Calendar, to: '/dashboard/eventos', show: hasRole(['Admin', 'Pastor', 'MinistryLeader']) },
  ].filter(a => a.show);

  const baptisedPct = stats.members > 0 ? Math.round((stats.baptised / stats.members) * 100) : 0;
  const announcement = announcements[announcementIndex];

  const showAnnouncement = (direction) => {
    setAnnouncementIndex(current => (current + direction + announcements.length) % announcements.length);
  };

  return (
    <div className="dash">
      <div className="dash-top">
        <div className="dash-greeting">
          {loading ? (
            <>
              <div className="skeleton" style={{ width: '200px', height: '24px', marginBottom: '6px' }}></div>
              <div className="skeleton" style={{ width: '120px', height: '14px' }}></div>
            </>
          ) : (
            <>
              <h1 className="dash-greeting-title">{greeting}{name ? `, ${name}` : ''}</h1>
              <p className="dash-greeting-sub">
                {roleName ? `Panel de ${roleName}` : 'Panel de administración'}
                <span className="dash-greeting-date">
                  {now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
              </p>
            </>
          )}
        </div>
      </div>

      <div className="dash-stats">
        <StatWidget title="Miembros" value={stats.members} icon={Users} to="/dashboard/miembros" loading={loading} />
        <StatWidget title="Próximos" value={stats.events} icon={Calendar} loading={loading} />
        <StatWidget title="Grupos" value={stats.groups} icon={Activity} to="/dashboard/grupos" loading={loading} />
        <StatWidget title="Bautizados" value={stats.baptised} icon={BookOpen} loading={loading} subtitle={`${baptisedPct}% del censo`} />
      </div>

      <div className="dash-featured-row">
        <BirthdayWeek members={stats.allMembers || []} loading={loading} onMemberClick={id => navigate(`/dashboard/miembros/${id}`)} />

      <section className="dash-announcements" aria-label="Anuncios">
        <div className="dash-announcements-header">
          <div className="dash-card-title">
            <MessageSquare size={16} strokeWidth={1.5} />
            <span>Anuncios</span>
          </div>
          <span className="dash-announcements-count">{announcementIndex + 1} / {announcements.length}</span>
        </div>
        <div className="dash-announcement-slide">
          <img
            key={announcement.image}
            className="dash-announcement-image"
            src={announcement.image}
            alt={announcement.title}
            onError={(event) => { event.currentTarget.hidden = true; }}
          />
          <div className="dash-announcement-fallback">
            <span>{announcement.title}</span>
          </div>
          <button className="dash-announcement-control dash-announcement-prev" onClick={() => showAnnouncement(-1)} aria-label="Anuncio anterior">
            <ChevronLeft size={20} />
          </button>
          <button className="dash-announcement-control dash-announcement-next" onClick={() => showAnnouncement(1)} aria-label="Anuncio siguiente">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="dash-announcement-dots">
          {announcements.map((item, index) => (
            <button
              key={item.image}
              className={`dash-announcement-dot ${index === announcementIndex ? 'active' : ''}`}
              onClick={() => setAnnouncementIndex(index)}
              aria-label={`Ver anuncio: ${item.title}`}
            />
          ))}
        </div>
      </section>
      </div>

      <div className="dash-grid">
        <div className="dash-col-main">
          <Card>
            <div className="dash-card-hd">
              <div className="dash-card-title">
                <ListTodo size={16} strokeWidth={1.5} />
                <span>Próximas actividades</span>
              </div>
              {stats.upcomingEvents.length > 0 && (
                <button className="dash-card-more" onClick={() => navigate('/dashboard/eventos')}>
                  Ver todo <ArrowRight size={12} strokeWidth={1.5} />
                </button>
              )}
            </div>
            <div className="dash-card-bd">
              <EventWidget events={stats.upcomingEvents} loading={loading} />
            </div>
          </Card>

          {hasRole(['Admin', 'Pastor']) && <Card>
            <div className="dash-card-hd">
              <div className="dash-card-title">
                <UserPlus size={16} strokeWidth={1.5} />
                <span>Actividad reciente</span>
              </div>
            </div>
            <div className="dash-card-bd">
              {loading ? (
                [1, 2, 3].map(i => (
                  <div key={i} className="dash-activity-item">
                    <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ width: '50%', height: '14px', marginBottom: '4px' }}></div>
                      <div className="skeleton" style={{ width: '30%', height: '11px' }}></div>
                    </div>
                  </div>
                ))
              ) : stats.recentMembers.length === 0 ? (
                <EmptyState icon={UserPlus} title="Sin actividad" message="No hay actividad reciente para mostrar." />
              ) : (
                stats.recentMembers.map(m => (
                  <ActivityItem
                    key={m.id}
                    icon={UserPlus}
                    text={`${m.firstName} ${m.lastName}`}
                    time={timeAgo(m.createdAt)}
                    onClick={() => navigate(`/dashboard/miembros/${m.id}`)}
                  />
                ))
              )}
            </div>
          </Card>}

          <BirthdayCalendar members={stats.allMembers} onMemberClick={id => navigate(`/dashboard/miembros/${id}`)} />
        </div>

        <div className="dash-col-side">
          <Card>
            <div className="dash-side-card-hd">
              <Target size={16} className="quick-icon" />
              <span>Acceso rápido</span>
            </div>
            <div className="dash-card-bd dash-quick-list">
              {quickLinks.map(link => (
                <div key={link.label} className="dash-quick-item" onClick={() => navigate(link.to)}>
                  <div className="dash-quick-icon">
                    <link.icon size={16} strokeWidth={1.5} />
                  </div>
                  <span className="dash-quick-label">{link.label}</span>
                  <ChevronRight size={14} strokeWidth={1.5} className="dash-quick-chevron" />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <div className="dash-side-card-hd">
              <MessageSquare size={16} className="fup-icon" />
              <span>Seguimientos</span>
              {stats.pendingFollowUps?.length > 0 && (
                <Badge variant="secondary" style={{ marginLeft: 'auto' }}>{stats.pendingFollowUps.length}</Badge>
              )}
            </div>
            <div className="dash-card-bd">
              {loading ? (
                [1, 2].map(i => (
                  <div key={i} className="dash-activity-item">
                    <div className="skeleton" style={{ width: '28px', height: '28px', borderRadius: '8px' }}></div>
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ width: '60%', height: '14px', marginBottom: '4px' }}></div>
                      <div className="skeleton" style={{ width: '40%', height: '11px' }}></div>
                    </div>
                  </div>
                ))
              ) : stats.pendingFollowUps?.length === 0 ? (
                <EmptyState icon={MessageSquare} title="Sin seguimientos" message="No hay seguimientos pendientes." compact />
              ) : (
                stats.pendingFollowUps.slice(0, 5).map(f => (
                  <ActivityItem
                    key={f.id}
                    icon={MessageSquare}
                    text={f.content.length > 40 ? f.content.slice(0, 40) + '...' : f.content}
                    time={f.memberName}
                    onClick={() => navigate(`/dashboard/miembros/${f.memberId}`)}
                  />
                ))
              )}
            </div>
          </Card>

          <Card>
            <div className="dash-side-card-hd">
              <Activity size={16} className="summary-icon" />
              <span>Resumen</span>
            </div>
            <div className="dash-card-bd">
              <div className="dash-summary">
                <div className="dash-summary-row">
                  <span className="dash-summary-label"><span className="dash-summary-dot dash-summary-dot-members" />Miembros activos</span>
                  <span className="dash-summary-value">{stats.members}</span>
                </div>
                <div className="dash-summary-row">
                  <span className="dash-summary-label"><span className="dash-summary-dot dash-summary-dot-groups" />Grupos activos</span>
                  <span className="dash-summary-value">{stats.groups}</span>
                </div>
                <div className="dash-summary-row">
                  <span className="dash-summary-label"><span className="dash-summary-dot dash-summary-dot-baptised" />Bautizados</span>
                  <span className="dash-summary-value">{stats.baptised}</span>
                </div>
                <div className="dash-summary-row">
                  <span className="dash-summary-label"><span className="dash-summary-dot dash-summary-dot-events" />Próximos eventos</span>
                  <span className="dash-summary-value">{stats.events}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
