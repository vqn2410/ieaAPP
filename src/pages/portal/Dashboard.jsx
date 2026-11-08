import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import Badge from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';
import { useCampus } from '../../context/CampusContext';
import { useSettings } from '../../context/SettingsContext';
import { getMembers } from '../../services/memberService';
import { getGroups } from '../../services/groupService';
import { getEvents } from '../../services/eventService';
import { getPendingFollowUps } from '../../services/followUpService';
import { getAssignedGroups } from '../../services/assignedGroupService';
import { getBirthdays, syncAllBirthdaysFromMembers } from '../../services/birthdayService';
import { getNotes } from '../../services/noteService';
import { isBaptised } from '../../utils/helpers';
import {
  Users,
  Calendar,
  Activity,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  BookOpen,
  MessageSquare,
  Cake,
  Search,
  Plus,
  MapPin,
  StickyNote,
  Sparkles,
  Clock,
  CheckCircle2,
  Layers
} from 'lucide-react';
import EmptyState from '../../components/common/EmptyState';
import './Dashboard.css';

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const fullMonths = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const normDashboard = value =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[,.;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.065,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 24,
    },
  },
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
  if (member?.day && member?.month) {
    return { month: Number(member.month), day: Number(member.day) };
  }
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

/**
 * Componente StatsCard inspirado en el snippet de Framer Motion + Lucide
 */
const StatsCard = ({ title, value, change, subtitle, icon: Icon, onClick, loading }) => {
  return (
    <Motion.div
      variants={itemVariants}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.985 }}
      className="v15-stats-card"
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="v15-stats-card-inner">
        <div className="v15-stats-card-info">
          <p className="v15-stats-card-title">{title}</p>
          {loading ? (
            <div className="skeleton" style={{ width: '64px', height: '30px', borderRadius: '8px', margin: '4px 0' }} />
          ) : (
            <h2 className="v15-stats-card-value">{value}</h2>
          )}
          <div className="v15-stats-card-meta">
            {change !== undefined && (
              <span className="v15-stats-card-trend">
                <ArrowUpRight size={14} /> {change}%
              </span>
            )}
            {subtitle && <span className="v15-stats-card-sub">{subtitle}</span>}
          </div>
        </div>
        {Icon && (
          <div className="v15-stats-card-icon">
            <Icon size={20} strokeWidth={1.75} />
          </div>
        )}
      </div>
    </Motion.div>
  );
};

/**
 * Medidor semicircular animado (estilo Dashboard V15)
 */
const SemiCircleGauge = ({ percentage = 0, label = 'del censo', valueText = '0%' }) => {
  const clamped = Math.max(0, Math.min(100, percentage));
  const radius = 76;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="v15-gauge-wrap">
      <svg viewBox="0 0 200 115" className="v15-gauge-svg" aria-label={`Medidor ${valueText}`}>
        <path
          d="M 24 98 A 76 76 0 0 1 176 98"
          fill="none"
          className="v15-gauge-track"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <Motion.path
          d="M 24 98 A 76 76 0 0 1 176 98"
          fill="none"
          className="v15-gauge-fill"
          strokeWidth="22"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className="v15-gauge-center">
        <strong>{valueText}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
};

const BirthdayCalendar = ({ members, onMemberClick, canClickMember = false }) => {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstDay = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) * 7 }, (_, index) => {
    const day = index - firstDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });
  const birthdayMap = (members || []).reduce((map, member) => {
    const parts = getBirthdayParts(member);
    if (parts?.month === monthIndex + 1) {
      map[parts.day] = [...(map[parts.day] || []), member];
    }
    return map;
  }, {});
  const today = new Date();

  return (
    <div className="dash-mini-calendar">
      <div className="dash-mini-cal-hd">
        <button type="button" onClick={() => setMonth(new Date(year, monthIndex - 1, 1))} aria-label="Mes anterior">
          <ChevronLeft size={13} />
        </button>
        <strong>{months[monthIndex]} {year}</strong>
        <button type="button" onClick={() => setMonth(new Date(year, monthIndex + 1, 1))} aria-label="Mes siguiente">
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="dash-mini-cal-weekdays">
        {weekDays.map(day => <span key={day}>{day.slice(0, 2)}</span>)}
      </div>
      <div className="dash-mini-cal-grid">
        {cells.map((day, index) => {
          const people = day ? birthdayMap[day] || [] : [];
          const hasBirthdays = people.length > 0;
          const isToday = day === today.getDate() && monthIndex === today.getMonth() && year === today.getFullYear();
          const tooltipNames = people
            .map(p => p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || 'Miembro')
            .join(', ');
          const firstPerson = people[0];

          return (
            <button
              type="button"
              key={`${year}-${monthIndex}-${index}`}
              disabled={!day || (!hasBirthdays && !canClickMember)}
              title={hasBirthdays ? `🎂 ${day} ${months[monthIndex]}: ${tooltipNames}` : undefined}
              onClick={() => {
                if (hasBirthdays && canClickMember && firstPerson) {
                  onMemberClick(firstPerson.memberId || firstPerson.id);
                }
              }}
              className={`dash-mini-cal-day ${!day ? 'empty' : ''} ${isToday ? 'today' : ''} ${hasBirthdays ? 'has-bday' : ''}`}
            >
              <span>{day}</span>
              {hasBirthdays && <i className="dash-mini-cal-dot" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const DASH_CACHE_PREFIX = 'portal-iea-dash-stats:';

const readCachedDashStats = (campusKey) => {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`${DASH_CACHE_PREFIX}${campusKey || 'default'}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedDashStats = (campusKey, data) => {
  if (typeof sessionStorage === 'undefined' || !data) return;
  try {
    sessionStorage.setItem(`${DASH_CACHE_PREFIX}${campusKey || 'default'}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
};

const Dashboard = () => {
  const { currentUser, userData, hasRole } = useAuth();
  const { activeCampusId, activeCampus, activeCampusSlug, campuses, selectCampusBySlug } = useCampus();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const initialCache = useMemo(
    () => readCachedDashStats(activeCampusId || activeCampusSlug),
    [activeCampusId, activeCampusSlug]
  );

  const [stats, setStats] = useState(() => initialCache || {
    members: 0,
    groups: 0,
    events: 0,
    baptised: 0,
    upcomingEvents: [],
    recentMembers: [],
    allMembers: [],
    birthdays: [],
    pendingFollowUps: [],
    notes: [],
  });
  const [loading, setLoading] = useState(() => !initialCache);
  const [announcementIndex, setAnnouncementIndex] = useState(0);
  const [quickFilter, setQuickFilter] = useState('');
  const [activeBottomTab, setActiveBottomTab] = useState('birthdays');
  const [scheduleOffset, setScheduleOffset] = useState(0);
  const [showFullBirthdayCalendar, setShowFullBirthdayCalendar] = useState(true);

  const campusPrefix = `/${activeCampusSlug || 'sedecentral'}`;
  const isMemberView = hasRole(['Member'])
    && !hasRole(['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'AreaLeader', 'Facilitator', 'CoFacilitator']);
  const canClickMember = !isMemberView && hasRole(['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Maestro']);

  useEffect(() => {
    const load = async () => {
      try {
        const centralLegacy = hasRole(['Admin', 'Pastor']) && /central/i.test(activeCampus?.name || '');
        const isAdminOrPastor = hasRole(['Admin', 'Pastor']);
        const isScopedUser = !isAdminOrPastor && !isMemberView;

        const [assignedData, directMembers, directGroups, events, pendingFups, birthdaysData, userNotes] = await Promise.all([
          isScopedUser ? getAssignedGroups().catch(() => ({ members: [], groups: [] })) : Promise.resolve(null),
          (isScopedUser || isMemberView) ? Promise.resolve([]) : (centralLegacy ? getMembers() : getMembers(null, activeCampusId || null)),
          (isMemberView || isScopedUser) ? Promise.resolve([]) : (centralLegacy ? getGroups() : getGroups(activeCampusId || null)),
          getEvents().catch(() => []),
          (!isMemberView && !isScopedUser) ? getPendingFollowUps() : Promise.resolve([]),
          getBirthdays(centralLegacy ? null : (activeCampusId || null)).catch(() => []),
          currentUser?.uid ? getNotes(currentUser.uid, userData?.role).catch(() => []) : Promise.resolve([]),
        ]);

        const members = isScopedUser ? assignedData.members || [] : directMembers;
        const groups = isScopedUser ? assignedData.groups || [] : directGroups;

        if (birthdaysData.length === 0 && directMembers.length > 0 && isAdminOrPastor) {
          void syncAllBirthdaysFromMembers(directMembers).catch(() => {});
        }

        const currentMember = members.find(member =>
          member.email && currentUserEmail(userData) &&
          member.email.trim().toLowerCase() === currentUserEmail(userData).trim().toLowerCase()
        );
        const matchesLeader = (group, member) => [
          ...(Array.isArray(group.facilitators) ? group.facilitators : [group.facilitators]),
          ...(Array.isArray(group.coFacilitators) ? group.coFacilitators : [group.coFacilitators])
        ]
          .filter(Boolean)
          .some(value =>
            value === member?.id ||
            normDashboard(value) === normDashboard(`${member?.lastName}, ${member?.firstName}`) ||
            normDashboard(value) === normDashboard(`${member?.firstName} ${member?.lastName}`)
          );

        const visibleGroups = isScopedUser || isAdminOrPastor || isMemberView || !currentMember
          ? groups
          : groups.filter(group => matchesLeader(group, currentMember));
        const visibleGroupIds = new Set(visibleGroups.map(group => group.id));
        const visibleGroupNames = new Set(visibleGroups.map(group => normDashboard(group.name)));

        const visibleMembers = isScopedUser || isAdminOrPastor || isMemberView || !currentMember
          ? members
          : members.filter(member => visibleGroups.some(group => {
              const memberGroup = normDashboard(member.group);
              const groupName = normDashboard(group.name);
              return memberGroup && (memberGroup === groupName || groupName.includes(memberGroup));
            }));

        const visibleEvents = isAdminOrPastor || isMemberView || !currentMember
          ? events
          : events.filter(event => visibleGroupIds.has(event.groupId) || visibleGroupNames.has(normDashboard(event.group)));

        const visibleFollowUps = isAdminOrPastor || isMemberView || !currentMember
          ? pendingFups
          : pendingFups.filter(followUp => visibleMembers.some(member => member.id === followUp.memberId));

        const now = new Date();
        const upcoming = visibleEvents
          .filter(e => e.date && new Date(e.date + 'T12:00:00') >= now)
          .sort((a, b) => new Date(a.date + 'T12:00:00') - new Date(b.date + 'T12:00:00'))
          .slice(0, 6);

        const recent = [...visibleMembers]
          .filter(m => m.createdAt)
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
          .slice(0, 6);

        const baptised = visibleMembers.filter(isBaptised).length;

        const memberMap = {};
        members.forEach(m => { memberMap[m.id] = m; });

        const nextStats = {
          members: visibleMembers.length,
          groups: visibleGroups.length,
          events: visibleEvents.filter(e => e.date && new Date(e.date + 'T12:00:00') >= now).length,
          baptised,
          upcomingEvents: upcoming,
          recentMembers: recent,
          allMembers: members,
          birthdays: birthdaysData.length > 0 ? birthdaysData : members,
          pendingFollowUps: visibleFollowUps.map(f => ({
            ...f,
            memberName: memberMap[f.memberId]
              ? `${memberMap[f.memberId].firstName} ${memberMap[f.memberId].lastName}`
              : 'Miembro'
          })),
          notes: (userNotes || []).slice(0, 4),
        };
        setStats(nextStats);
        writeCachedDashStats(activeCampusId || activeCampusSlug, nextStats);
      } catch {
        console.error('Error loading dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hasRole, userData, currentUser?.uid, activeCampusId, activeCampusSlug, activeCampus?.name, isMemberView]);

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

  const firstName = userData?.name && userData.name !== 'Usuario'
    ? userData.name.split(' ')[0]
    : null;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';

  const baptisedPct = stats.members > 0 ? Math.round((stats.baptised / stats.members) * 100) : 0;
  const announcement = announcements[announcementIndex];
  const currentMonthIndex = now.getMonth();
  const currentMonthName = fullMonths[currentMonthIndex];
  const currentMonthCap = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  const weeklyBirthdays = useMemo(() => {
    const list = stats.birthdays || stats.allMembers || [];
    const today = new Date();
    const weekStart = getWeekStart(today);
    const weekKeys = Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + index);
      return `${day.getMonth() + 1}-${day.getDate()}`;
    });
    return list
      .map(member => ({ member, key: birthdayKey(member) }))
      .filter(item => item.key && weekKeys.includes(item.key))
      .sort((a, b) => weekKeys.indexOf(a.key) - weekKeys.indexOf(b.key));
  }, [stats.birthdays, stats.allMembers]);

  const monthlyBirthdays = useMemo(() => {
    const list = stats.birthdays || stats.allMembers || [];
    const today = new Date();
    const targetMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    return list
      .map(member => {
        const parts = getBirthdayParts(member);
        if (!parts || parts.month !== targetMonth) return null;
        const isToday = parts.day === todayDay;
        const isUpcoming = parts.day >= todayDay;
        const daysDiff = parts.day - todayDay;
        return { member, parts, isToday, isUpcoming, daysDiff };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Priorizar hoy y próximos del mes primero, luego los ya pasados del mes
        if (a.isUpcoming !== b.isUpcoming) return a.isUpcoming ? -1 : 1;
        return a.parts.day - b.parts.day;
      });
  }, [stats.birthdays, stats.allMembers]);

  const todayBirthdays = useMemo(
    () => monthlyBirthdays.filter(item => item.isToday),
    [monthlyBirthdays]
  );

  const handleQuickSearch = (e) => {
    e.preventDefault();
    const q = quickFilter.trim();
    if (q) {
      navigate(`${campusPrefix}/miembros?search=${encodeURIComponent(q)}`);
    } else {
      navigate(`${campusPrefix}/miembros`);
    }
  };

  const showAnnouncement = (direction) => {
    setAnnouncementIndex(current => (current + direction + announcements.length) % announcements.length);
  };

  const campusList = campuses?.length > 0 ? campuses : [
    { id: 'central', name: 'Sede Central', slug: 'sedecentral', province: 'Buenos Aires' },
    { id: 'apostoles', name: 'Apóstoles', slug: 'apostoles', province: 'Misiones' },
    { id: 'las-heras', name: 'Las Heras', slug: 'las-heras', province: 'Santa Cruz' },
  ];

  return (
    <Motion.div
      className="v15-dash"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Top Bar V15: Editorial Title + Large Typographic KPIs */}
      <Motion.header className="v15-header" variants={itemVariants}>
        <div className="v15-header-left">
          <div className="v15-title-row">
            <div>
              <span className="v15-eyebrow">
                {greeting}{firstName ? `, ${firstName}` : ''} · {roleName}
              </span>
              <h1 className="v15-main-title">Dashboard</h1>
            </div>
            <Motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              type="button"
              className="v15-icon-circle"
              onClick={() => navigate(`${campusPrefix}/miembros`)}
              title="Buscar miembros"
              aria-label="Buscar miembros"
            >
              <Search size={18} />
            </Motion.button>
          </div>
          <p className="v15-date-label">
            {now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {!isMemberView && (
          <div className="v15-header-actions" aria-label="Accesos rápidos">
            {hasRole(['Admin', 'Pastor']) && (
              <button
                type="button"
                className="v15-header-pill primary"
                onClick={() => navigate(`${campusPrefix}/miembros?nuevo=1`)}
              >
                <UserPlus size={14} />
                <span>Nuevo miembro</span>
              </button>
            )}
            <button
              type="button"
              className="v15-header-pill"
              onClick={() => navigate(`${campusPrefix}/grupos`)}
            >
              <Users size={14} />
              <span>Grupos</span>
            </button>
            <button
              type="button"
              className="v15-header-pill"
              onClick={() => navigate(`${campusPrefix}/eventos`)}
            >
              <Calendar size={14} />
              <span>Agenda</span>
            </button>
          </div>
        )}
      </Motion.header>

      {/* Fila de StatsCards con Framer Motion priorizando Cumpleaños del Mes */}
      {!isMemberView && (
        <div className="v15-stats-grid">
          <StatsCard
            title={`Cumpleaños de ${currentMonthName}`}
            value={monthlyBirthdays.length}
            subtitle={
              todayBirthdays.length > 0
                ? `${todayBirthdays.length} cumple hoy 🎂`
                : `${weeklyBirthdays.length} esta semana`
            }
            icon={Cake}
            loading={loading}
            onClick={() => {
              setActiveBottomTab('birthdays');
              setShowFullBirthdayCalendar(true);
            }}
          />
          <StatsCard
            title="Censo general"
            value={stats.members}
            change={baptisedPct}
            subtitle="bautizados"
            icon={Users}
            loading={loading}
            onClick={() => navigate(`${campusPrefix}/miembros`)}
          />
          <StatsCard
            title="Grupos de crecimiento"
            value={stats.groups}
            change={100}
            subtitle="activos en sede"
            icon={Activity}
            loading={loading}
            onClick={() => navigate(`${campusPrefix}/grupos`)}
          />
          <StatsCard
            title="Próximos eventos"
            value={stats.events}
            subtitle="en agenda"
            icon={Calendar}
            loading={loading}
            onClick={() => navigate(`${campusPrefix}/eventos`)}
          />
        </div>
      )}

      {/* Bento Grid Principal (Estilo Dashboard V15 - 4 tarjetas con Cumpleaños del Mes como protagonista) */}
      <div className="v15-bento-row">
        {/* 1. Tarjeta Destacada Protagonista: Cumpleaños del Mes */}
        <Motion.section
          className="v15-bento-card v15-card-accent"
          variants={itemVariants}
          whileHover={{ y: -5 }}
        >
          <div className="v15-card-top">
            <h2 className="v15-accent-heading">
              Cumpleaños de<br />{currentMonthCap}
            </h2>
            <Motion.button
              whileHover={{ scale: 1.08, x: 2, y: -2 }}
              whileTap={{ scale: 0.94 }}
              type="button"
              className="v15-accent-arrow"
              onClick={() => {
                setActiveBottomTab('birthdays');
                setShowFullBirthdayCalendar(true);
              }}
              aria-label="Ver cumpleaños del mes"
              title="Ver calendario del mes"
            >
              <Cake size={18} />
            </Motion.button>
          </div>

          <Motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            className="v15-accent-pill-btn"
            onClick={() => {
              setActiveBottomTab('birthdays');
              setShowFullBirthdayCalendar(v => !v);
            }}
          >
            <Sparkles size={14} />
            <span>
              {monthlyBirthdays.length} en {currentMonthName}
              {weeklyBirthdays.length > 0 ? ` · ${weeklyBirthdays.length} esta semana` : ''}
            </span>
          </Motion.button>

          <div className="v15-accent-footer v15-accent-bday-list">
            {monthlyBirthdays.length === 0 ? (
              <div className="v15-accent-preview">
                <span className="v15-accent-preview-label">Calendario mensual</span>
                <p>Sin cumpleaños registrados</p>
                <small>en {currentMonthName}</small>
              </div>
            ) : (
              <>
                <span className="v15-accent-preview-label">
                  {todayBirthdays.length > 0 ? '🎂 ¡Cumplen años hoy!' : 'Próximos a celebrar este mes'}
                </span>
                <div className="v15-accent-bday-items">
                  {monthlyBirthdays.slice(0, 3).map(({ member, parts, isToday }) => {
                    const displayName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Miembro';
                    return (
                      <button
                        key={member.id}
                        type="button"
                        className="v15-accent-bday-row"
                        onClick={() => canClickMember && navigate(`${campusPrefix}/miembros/${member.memberId || member.id}`)}
                        style={!canClickMember ? { cursor: 'default' } : undefined}
                      >
                        <span className="v15-accent-bday-day">{parts.day} {months[parts.month - 1]}</span>
                        <span className="v15-accent-bday-name">{displayName}</span>
                        {isToday && <span className="v15-accent-bday-now">¡Hoy! 🎂</span>}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </Motion.section>

        {/* 2. Tarjeta Medidor / Censo y Bautismos */}
        <Motion.section
          className="v15-bento-card v15-card-gauge"
          variants={itemVariants}
          whileHover={{ y: -4 }}
        >
          <div className="v15-card-top">
            <div>
              <h2 className="v15-card-heading">
                Censo &<br />Bautismos
              </h2>
              <p className="v15-card-sub">
                {stats.baptised} bautizados de {stats.members}
              </p>
            </div>
            {hasRole(['Admin', 'Pastor']) && (
              <Motion.button
                whileHover={{ rotate: 90, scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                type="button"
                className="v15-circle-btn"
                onClick={() => navigate(`${campusPrefix}/miembros?nuevo=1`)}
                title="Agregar miembro"
                aria-label="Agregar miembro"
              >
                <Plus size={16} />
              </Motion.button>
            )}
          </div>

          <form className="v15-mini-search" onSubmit={handleQuickSearch}>
            <Search size={14} />
            <input
              type="text"
              value={quickFilter}
              onChange={(e) => setQuickFilter(e.target.value)}
              placeholder="Buscar miembro o grupo..."
              aria-label="Buscar miembro o grupo"
            />
          </form>

          <div className="v15-gauge-centered">
            <SemiCircleGauge
              percentage={baptisedPct}
              valueText={`${baptisedPct}%`}
              label="Bautizados"
            />
          </div>

          <button
            type="button"
            className="v15-notes-bottom-pill"
            onClick={() => navigate(`${campusPrefix}/grupos`)}
          >
            <span>Grupos & IBRP ({stats.groups} activos)</span>
            <ArrowUpRight size={14} />
          </button>
        </Motion.section>

        {/* 3. Tarjeta Seguimientos y Anotaciones (Estilo "Meeting Notes" V15) */}
        <Motion.section
          className="v15-bento-card v15-card-notes"
          variants={itemVariants}
          whileHover={{ y: -4 }}
        >
          <div className="v15-card-top">
            <div>
              <h2 className="v15-card-heading">
                Seguimientos<br />& Notas
              </h2>
              <p className="v15-card-sub">
                {(stats.pendingFollowUps || []).length} seguimientos pendientes
              </p>
            </div>
            <Motion.button
              whileHover={{ rotate: 90, scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              type="button"
              className="v15-circle-btn"
              onClick={() => navigate(`${campusPrefix}/notas`)}
              title="Ir a anotaciones"
              aria-label="Ir a anotaciones"
            >
              <Plus size={16} />
            </Motion.button>
          </div>

          <div className="v15-notes-body">
            {(stats.pendingFollowUps || []).length > 0 && (
              <button
                type="button"
                className="v15-note-chip"
                onClick={() => navigate(`${campusPrefix}/grupos?section=seguimientos`)}
              >
                <span className="v15-note-dot" style={{ background: 'var(--v15-accent)' }} />
                <div className="v15-note-text">
                  <strong>{stats.pendingFollowUps[0].memberName}</strong>
                  <small>Seguimiento pendiente · Ver todos ({stats.pendingFollowUps.length})</small>
                </div>
              </button>
            )}
            {loading ? (
              <div className="skeleton" style={{ width: '100%', height: '54px', borderRadius: '12px' }} />
            ) : stats.notes.length === 0 && (stats.pendingFollowUps || []).length === 0 ? (
              <div className="v15-notes-empty" onClick={() => navigate(`${campusPrefix}/notas`)}>
                <StickyNote size={18} />
                <span>Crear nota pastoral o de reunión</span>
              </div>
            ) : (
              stats.notes.slice(0, (stats.pendingFollowUps || []).length > 0 ? 1 : 2).map(note => (
                <button
                  key={note.id}
                  type="button"
                  className="v15-note-chip"
                  onClick={() => navigate(`${campusPrefix}/notas`)}
                >
                  <span className="v15-note-dot" style={{ background: note.color || 'var(--v15-accent)' }} />
                  <div className="v15-note-text">
                    <strong>{note.title || 'Nota'}</strong>
                    <small>{note.category || 'Reuniones'}</small>
                  </div>
                </button>
              ))
            )}
          </div>

          <button
            type="button"
            className="v15-notes-bottom-pill"
            onClick={() => navigate(`${campusPrefix}/grupos?section=seguimientos`)}
          >
            <span>Gestión de seguimientos ({(stats.pendingFollowUps || []).length})</span>
            <ArrowUpRight size={14} />
          </button>
        </Motion.section>

        {/* 4. Tarjeta Mapa / Sedes y Extensiones (Estilo "Most Clients by Country" Map Card V15) */}
        <Motion.section
          className="v15-bento-card v15-card-map"
          variants={itemVariants}
          whileHover={{ y: -4 }}
        >
          <svg className="v15-map-bg" viewBox="0 0 260 300" fill="none" aria-hidden="true">
            <path d="M-20 45 C 60 55, 140 20, 280 65" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
            <path d="M-10 155 C 80 130, 170 185, 275 150" stroke="currentColor" strokeWidth="9" strokeLinecap="round" />
            <path d="M 65 -10 C 85 95, 55 190, 95 310" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
            <path d="M 185 -10 C 165 110, 205 200, 175 310" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            <rect x="92" y="88" width="32" height="40" rx="4" stroke="currentColor" strokeWidth="2.5" />
            <rect x="138" y="195" width="46" height="32" rx="4" stroke="currentColor" strokeWidth="2.5" />
          </svg>

          <div className="v15-map-content">
            <div className="v15-card-top">
              <div>
                <h2 className="v15-card-heading">
                  Sedes &<br />Extensiones
                </h2>
                <p className="v15-card-sub">{activeCampus?.name || 'Sede Central'}</p>
              </div>
              <span className="v15-map-pin-badge">
                <MapPin size={15} />
              </span>
            </div>

            <div className="v15-campus-pills">
              {campusList.slice(0, 3).map((c) => {
                const isActive = c.slug === activeCampusSlug || (!activeCampusSlug && c.slug === 'sedecentral');
                return (
                  <button
                    key={c.id || c.slug}
                    type="button"
                    className={`v15-campus-pill ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      selectCampusBySlug(c.slug);
                      navigate(`/${c.slug}/dashboard`);
                    }}
                  >
                    <span className="v15-campus-pulse" />
                    <span className="v15-campus-name">{c.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Motion.section>
      </div>

      {/* Fila Inferior Bento (2 Columnas Anchas: Cumpleaños del Mes/Actividad/Anuncios + Cronograma de Eventos) */}
      <div className="v15-bottom-row">
        {/* Columna Izquierda: Cumpleaños del Mes (por defecto) / Actividad Reciente / Anuncios */}
        <Motion.section className="v15-bento-card v15-bottom-left" variants={itemVariants}>
          <div className="v15-bottom-hd">
            <div className="v15-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeBottomTab === 'birthdays'}
                className={`v15-tab ${activeBottomTab === 'birthdays' ? 'active' : ''}`}
                onClick={() => setActiveBottomTab('birthdays')}
              >
                <Cake size={14} />
                <span>Cumpleaños de {currentMonthCap} ({monthlyBirthdays.length})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeBottomTab === 'activity'}
                className={`v15-tab ${activeBottomTab === 'activity' ? 'active' : ''}`}
                onClick={() => setActiveBottomTab('activity')}
              >
                <Users size={14} />
                <span>Actividad</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeBottomTab === 'announcements'}
                className={`v15-tab ${activeBottomTab === 'announcements' ? 'active' : ''}`}
                onClick={() => setActiveBottomTab('announcements')}
              >
                <MessageSquare size={14} />
                <span>Anuncios</span>
              </button>
            </div>

            {activeBottomTab === 'birthdays' && (
              <button
                type="button"
                className="v15-text-btn"
                onClick={() => setShowFullBirthdayCalendar(v => !v)}
              >
                {showFullBirthdayCalendar ? 'Ocultar calendario' : 'Mini calendario'}
              </button>
            )}
            {activeBottomTab === 'activity' && !isMemberView && (
              <button
                type="button"
                className="v15-text-btn"
                onClick={() => navigate(`${campusPrefix}/miembros`)}
              >
                Ver padrón <ArrowUpRight size={13} />
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {activeBottomTab === 'birthdays' && (
              <Motion.div
                key="birthdays"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="v15-tab-panel"
              >
                <div className={`v15-bday-panel-split ${showFullBirthdayCalendar ? 'with-mini-cal' : ''}`}>
                  {showFullBirthdayCalendar && (
                    <BirthdayCalendar
                      members={stats.birthdays || stats.allMembers}
                      onMemberClick={id => navigate(`${campusPrefix}/miembros/${id}`)}
                      canClickMember={canClickMember}
                    />
                  )}

                  <div className="v15-bday-panel-list">
                    {monthlyBirthdays.length === 0 ? (
                      <EmptyState
                        icon={Cake}
                        title={`Sin cumpleaños en ${currentMonthName}`}
                        message="Podés navegar otros meses desde el mini calendario."
                        compact
                      />
                    ) : (
                      <div className="v15-member-list v15-monthly-bday-scroll">
                        {monthlyBirthdays.map(({ member, parts, isToday, isUpcoming, daysDiff }) => {
                          const initials = member.firstName && member.lastName
                            ? `${member.firstName[0]}${member.lastName[0]}`
                            : (member.name ? member.name.split(' ').map(p => p[0]).slice(0, 2).join('') : '?');
                          const displayName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim() || 'Miembro';
                          const statusLabel = isToday
                            ? '¡Hoy! 🎂'
                            : isUpcoming
                              ? (daysDiff === 1 ? 'Mañana' : `En ${daysDiff} días`)
                              : `Día ${parts.day}`;
                          return (
                            <Motion.button
                              whileHover={{ x: 4 }}
                              key={member.id}
                              type="button"
                              className={`v15-list-row ${isToday ? 'v15-list-row-today' : ''}`}
                              onClick={() => canClickMember && navigate(`${campusPrefix}/miembros/${member.memberId || member.id}`)}
                              style={!canClickMember ? { cursor: 'default' } : undefined}
                            >
                              <span className="v15-avatar-chip v15-bday-day-chip">
                                <strong>{parts.day}</strong>
                                <small>{months[parts.month - 1]}</small>
                              </span>
                              <span className="v15-list-main">
                                <strong>{displayName}</strong>
                                <small>{birthdayLabel(member)}{member.group ? ` · ${member.group}` : ''}</small>
                              </span>
                              <span className={`v15-bday-status-pill ${isToday ? 'today' : isUpcoming ? 'upcoming' : 'past'}`}>
                                {statusLabel}
                              </span>
                              <span className="v15-avatar-chip" style={{ width: 28, height: 28, fontSize: '0.65rem' }}>
                                {initials}
                              </span>
                            </Motion.button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Motion.div>
            )}

            {activeBottomTab === 'activity' && (
              <Motion.div
                key="activity"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="v15-tab-panel"
              >
                {loading ? (
                  [1, 2, 3].map(i => (
                    <div key={i} className="v15-list-row">
                      <div className="skeleton" style={{ width: '36px', height: '36px', borderRadius: '10px' }} />
                      <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ width: '55%', height: '14px', marginBottom: '5px' }} />
                        <div className="skeleton" style={{ width: '35%', height: '11px' }} />
                      </div>
                    </div>
                  ))
                ) : stats.recentMembers.length === 0 ? (
                  <div className="v15-summary-pills">
                    <div className="v15-stat-pill-row" onClick={() => navigate(`${campusPrefix}/miembros`)}>
                      <span>Miembros activos en sede</span>
                      <strong>{stats.members}</strong>
                    </div>
                    <div className="v15-stat-pill-row" onClick={() => navigate(`${campusPrefix}/grupos`)}>
                      <span>Grupos de amistad y discipulado</span>
                      <strong>{stats.groups}</strong>
                    </div>
                    <div className="v15-stat-pill-row" onClick={() => navigate(`${campusPrefix}/eventos`)}>
                      <span>Próximas actividades programadas</span>
                      <strong>{stats.events}</strong>
                    </div>
                  </div>
                ) : (
                  <div className="v15-member-list">
                    {stats.recentMembers.slice(0, 5).map((m) => {
                      const initials = `${m.firstName?.[0] || ''}${m.lastName?.[0] || ''}`.toUpperCase() || 'M';
                      return (
                        <Motion.button
                          whileHover={{ x: 4 }}
                          key={m.id}
                          type="button"
                          className="v15-list-row"
                          onClick={() => canClickMember && navigate(`${campusPrefix}/miembros/${m.id}`)}
                        >
                          <span className="v15-avatar-chip">{initials}</span>
                          <span className="v15-list-main">
                            <strong>{m.firstName} {m.lastName}</strong>
                            <small>{m.group || 'Miembro registrado'}</small>
                          </span>
                          <span className="v15-list-time">{timeAgo(m.createdAt) || 'Reciente'}</span>
                        </Motion.button>
                      );
                    })}
                  </div>
                )}
              </Motion.div>
            )}

            {activeBottomTab === 'announcements' && (
              <Motion.div
                key="announcements"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="v15-tab-panel"
              >
                <div className="dash-announcement-slide v15-announcement-box">
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
                    <ChevronLeft size={18} />
                  </button>
                  <button className="dash-announcement-control dash-announcement-next" onClick={() => showAnnouncement(1)} aria-label="Anuncio siguiente">
                    <ChevronRight size={18} />
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
              </Motion.div>
            )}
          </AnimatePresence>
        </Motion.section>

        {/* Columna Derecha: Agenda & Cronograma (Estilo "Meeting Schedule" V15) */}
        <Motion.section className="v15-bento-card v15-bottom-right" variants={itemVariants}>
          <div className="v15-bottom-hd">
            <div>
              <h2 className="v15-card-heading">Agenda & Reuniones</h2>
              <p className="v15-card-sub">Cronograma de próximas actividades</p>
            </div>
            <div className="v15-schedule-nav">
              <button
                type="button"
                className="v15-nav-circle"
                onClick={() => setScheduleOffset(o => Math.max(0, o - 1))}
                aria-label="Anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                className="v15-nav-circle"
                onClick={() => setScheduleOffset(o => o + 1)}
                aria-label="Siguiente"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="v15-timeline">
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="v15-timeline-slot">
                  <span className="v15-slot-hour">0{i + 8}:00</span>
                  <div className="skeleton" style={{ flex: 1, height: '48px', borderRadius: '14px' }} />
                </div>
              ))
            ) : stats.upcomingEvents.length === 0 ? (
              <div className="v15-timeline-empty">
                <Calendar size={20} />
                <div>
                  <strong>Sin reuniones próximas</strong>
                  <p>Programá nuevas actividades desde la sección Eventos.</p>
                </div>
                <button
                  type="button"
                  className="v15-text-btn"
                  onClick={() => navigate(`${campusPrefix}/eventos`)}
                >
                  Ir a Eventos <ArrowUpRight size={13} />
                </button>
              </div>
            ) : (
              stats.upcomingEvents.slice(scheduleOffset, scheduleOffset + 4).map((event, idx) => {
                const d = new Date(event.date + 'T12:00:00');
                const timeStr = event.time || `${18 + (idx % 3)}:00 hs`;
                return (
                  <Motion.div
                    key={event.id || idx}
                    whileHover={{ x: 4 }}
                    className="v15-timeline-slot"
                    onClick={() => navigate(`${campusPrefix}/eventos`)}
                  >
                    <span className="v15-slot-hour">
                      <strong>{d.getDate()} {months[d.getMonth()]}</strong>
                      <small>{timeStr}</small>
                    </span>
                    <div className="v15-slot-card">
                      <div className="v15-slot-card-main">
                        <strong>{event.title}</strong>
                        <span>{event.location || 'Templo Central'}{event.category ? ` · ${event.category}` : ''}</span>
                      </div>
                      <ArrowUpRight size={15} className="v15-slot-arrow" />
                    </div>
                  </Motion.div>
                );
              })
            )}
          </div>
        </Motion.section>
      </div>
    </Motion.div>
  );
};

export default Dashboard;
