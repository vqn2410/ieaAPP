import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Baby,
  Calendar,
  LayoutDashboard,
  Settings,
  LogOut,
  ChevronDown,
  TrendingUp,
  MessageSquare,
  ArrowLeft,
  Menu,
  X,
  Radio,
  DollarSign,
  UserPlus,
  FileText,
  Moon,
  Sun,
  StickyNote,
  Timer,
  Search,
  SlidersHorizontal,
  Bell
} from 'lucide-react';
import Logo from '../../common/Logo';
import SeoHead from '../../common/SeoHead';
import Onboarding, { HelpButton } from '../../common/Onboarding';
import { useAuth } from '../../../context/AuthContext';
import { useSettings } from '../../../context/SettingsContext';
import { useCampus } from '../../../context/CampusContext';
import CampusSwitcher from '../campus/CampusSwitcher';
import { getEvents, syncPendingEventAttendance } from '../../../services/eventService';
import { getNotifications, markNotificationRead } from '../../../services/notificationService';
import './MainLayout.css';

const sidebarListVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.035,
      delayChildren: 0.04,
    },
  },
};

const sidebarItemVariants = {
  hidden: { opacity: 0, x: -10 },
  show: {
    opacity: 1,
    x: 0,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
};

const MainLayout = () => {
  const { currentUser, userData, logout, hasRole } = useAuth();
  const { settings, userPreferences, updateUserPreference } = useSettings();
  const { campuses, activeCampusSlug } = useCampus();
  const campusPrefix = `/${activeCampusSlug || 'sedecentral'}`;
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openMenu, setOpenMenu] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);

  const isDarkMode = userPreferences
    ? userPreferences.theme === 'dark'
    : (localStorage.getItem('portal-iea-theme') === 'dark');

  // Close mobile menu on route change
  useEffect(() => {
    const t = setTimeout(() => setShowMobileMenu(false), 0);
    return () => clearTimeout(t);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = showMobileMenu ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showMobileMenu]);

  // Los próximos eventos alimentan el centro de recordatorios del portal.
  useEffect(() => {
    let mounted = true;
    getEvents().then(events => {
      if (!mounted) return;
      const today = new Date().toISOString().slice(0, 10);
      setUpcomingEvents(events
        .filter(event => event.date && event.date >= today)
        .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`))
        .slice(0, 3));
    }).catch(() => {});
    return () => { mounted = false; };
  }, [currentUser?.uid]);

  useEffect(() => {
    if (currentUser?.uid && navigator.onLine) void syncPendingEventAttendance();
  }, [currentUser?.uid]);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!currentUser?.uid) {
      return () => { mounted = false; };
    }

    getNotifications(currentUser.uid)
      .then(items => {
        if (mounted) setNotifications(items);
      })
      .catch(() => {
        if (mounted) setNotifications([]);
      });

    return () => { mounted = false; };
  }, [currentUser?.uid]);

  const unreadNotifications = notifications.filter(notification => notification.read !== true);
  const notificationItems = notifications.length > 0 ? notifications : upcomingEvents;

  const handleNotificationClick = async notification => {
    if (notification.userId && notification.read !== true) {
      try {
        await markNotificationRead(notification.id);
        setNotifications(items => items.map(item => item.id === notification.id
          ? { ...item, read: true }
          : item));
      } catch (error) {
        console.error('Error marcando notificación como leída', error);
      }
    }
    setShowNotifications(false);
    if (notification.link) navigate(notification.link);
  };

  const toggleTheme = () => updateUserPreference({ theme: isDarkMode ? 'light' : 'dark' });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out', error);
    }
  };

  const submitGlobalSearch = (event) => {
    event.preventDefault();
    const term = globalSearch.trim();
    navigate(term ? `${campusPrefix}/miembros?search=${encodeURIComponent(term)}` : `${campusPrefix}/miembros`);
  };

  const menuItems = [
    { name: 'Dashboard', path: `${campusPrefix}/dashboard`, icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member'] },
    {
      name: 'Miembros',
      path: `${campusPrefix}/miembros`,
      icon: <Users size={20} />,
      roles: ['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Maestro'],
      children: [
        { name: 'Listado de Miembros', path: `${campusPrefix}/miembros`, icon: <Users size={18} />, roles: ['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator'] },
        { name: 'Agregar Miembros', path: `${campusPrefix}/miembros?nuevo=1`, icon: <UserPlus size={18} />, roles: ['Admin', 'Pastor'] },
        { name: 'Kids', path: `${campusPrefix}/kids`, icon: <Baby size={18} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Maestro'] },
      ]
    },
    { name: 'Grupos', path: `${campusPrefix}/grupos`, icon: <TrendingUp size={20} />, roles: ['Admin', 'Pastor', 'CampusAdmin', 'Facilitator', 'CoFacilitator'] },
    { name: 'Asignados IBRP', path: `${campusPrefix}/ibrp`, icon: <img className="ibrp-menu-icon" src="/img/ibrp-logo.svg" alt="" />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'AreaLeader'] },
    { name: 'Eventos', path: `${campusPrefix}/eventos`, icon: <Calendar size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Member'] },
    { name: 'Finanzas', path: `${campusPrefix}/finanzas`, icon: <DollarSign size={20} />, roles: ['Admin', 'Pastor'] },
    { name: 'Transmisiones', path: `${campusPrefix}/transmisiones`, icon: <Radio size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Member'] },
    { name: 'Visitantes', path: `${campusPrefix}/visitantes`, icon: <UserPlus size={20} />, roles: ['Admin', 'Pastor', 'CampusAdmin', 'Facilitator', 'CoFacilitator', 'Maestro'] },
    { name: 'Noticias', path: `${campusPrefix}/noticias`, icon: <MessageSquare size={20} />, roles: ['Admin', 'Pastor', 'Member'] },
    { name: 'Anotaciones', path: `${campusPrefix}/notas`, icon: <StickyNote size={20} />, roles: ['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member'] },
    { name: 'Enfoque', path: `${campusPrefix}/enfoque`, icon: <Timer size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Member'] },
    { name: 'Reportes', path: `${campusPrefix}/reportes`, icon: <FileText size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader'] },
    { name: 'Configuración', path: `${campusPrefix}/configuracion`, icon: <Settings size={20} />, roles: ['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'AreaLeader', 'Facilitator', 'CoFacilitator', 'Maestro', 'Member'] },
    { name: 'Auditoría', path: `${campusPrefix}/auditoria`, icon: <FileText size={20} />, roles: ['Admin', 'Pastor'] },
  ].filter(item => hasRole(item.roles));

  const mobilePrimaryItems = menuItems
    .filter(item => item.path !== `${campusPrefix}/mi-perfil`)
    .slice(0, 4);

  const isRouteActive = (itemPath) => {
    if (itemPath === `${campusPrefix}/dashboard`) {
      return location.pathname === itemPath;
    }
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div className="layout-container v15-portal-root">
      <SeoHead title="Portal IEA" noindex />
      <aside className="sidebar">
        <div className="sidebar-header d-flex justify-center">
          <Logo size="medium" showText={false} />
        </div>

        <nav className="sidebar-nav">
          <Motion.ul variants={sidebarListVariants} initial="hidden" animate="show">
            {menuItems.map((item) => {
              const active = isRouteActive(item.path) || (item.children && item.children.some(c => location.pathname === c.path.split('?')[0]));
              return (
                <Motion.li key={item.path} variants={sidebarItemVariants}>
                  {item.children ? (
                    <>
                      <Motion.button
                        whileHover={{ x: 3 }}
                        whileTap={{ scale: 0.98 }}
                        className={`nav-item nav-dropdown-trigger ${active ? 'active' : ''} ${openMenu === item.name ? 'is-open' : ''}`}
                        onClick={() => setOpenMenu(openMenu === item.name ? '' : item.name)}
                      >
                        {active && (
                          <Motion.span
                            layoutId="sidebar-active-pill"
                            className="nav-active-pill"
                            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                          />
                        )}
                        <span className="nav-item-icon">{item.icon}</span>
                        <span className="nav-item-label">{item.name}</span>
                        <ChevronDown size={15} className={`nav-dropdown-chevron ${openMenu === item.name ? 'open' : ''}`} />
                      </Motion.button>
                      <AnimatePresence initial={false}>
                        {openMenu === item.name && (
                          <Motion.div
                            className="nav-submenu"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                          >
                            {item.children
                              .filter(child => !child.roles || hasRole(child.roles))
                              .map(child => (
                                <NavLink key={child.path} to={child.path} className="nav-subitem">
                                  {child.name}
                                </NavLink>
                              ))}
                          </Motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : item.external ? (
                    <a href={item.path} className="nav-item">
                      <span className="nav-item-icon">{item.icon}</span>
                      <span className="nav-item-label">{item.name}</span>
                    </a>
                  ) : (
                    <NavLink
                      to={item.path}
                      end={item.path === `${campusPrefix}/dashboard`}
                      className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <Motion.span
                              layoutId="sidebar-active-pill"
                              className="nav-active-pill"
                              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                            />
                          )}
                          <Motion.span
                            className="nav-item-icon"
                            animate={isActive ? { scale: 1.08 } : { scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          >
                            {item.icon}
                          </Motion.span>
                          <span className="nav-item-label">{item.name}</span>
                        </>
                      )}
                    </NavLink>
                  )}
                </Motion.li>
              );
            })}
          </Motion.ul>
        </nav>

        <div className="sidebar-footer">
          <Motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            className="user-info"
            onClick={() => navigate(`${campusPrefix}/mi-perfil`)}
            title="Mi perfil"
            style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >
            <div className="avatar">
              {userData?.name?.charAt(0) || currentUser?.email?.charAt(0)}
            </div>
            <div>
              <div className="user-name">{userData?.name || 'Usuario'}</div>
              <div className="badge badge-gray">{settings?.roles?.[userData?.role] || userData?.role}</div>
            </div>
          </Motion.button>
          <Motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="theme-toggle"
            onClick={toggleTheme}
          >
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
          </Motion.button>
          <HelpButton style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.7rem', fontSize: '0.78rem' }} />
          <Motion.button
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="btn-logout"
          >
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </Motion.button>
        </div>
      </aside>

      <main className="main-content">
        <Motion.header
          className="desktop-topbar"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <form className="desktop-search" onSubmit={submitGlobalSearch}>
            <Search size={15} />
            <input
              aria-label="Buscar"
              value={globalSearch}
              onChange={event => setGlobalSearch(event.target.value)}
              placeholder="Buscar miembros, grupos, reuniones"
            />
            <button type="button" onClick={() => navigate(`${campusPrefix}/miembros`)}>
              <SlidersHorizontal size={13} /> Filtros
            </button>
            <kbd>⌘K</kbd>
          </form>

          <div className="desktop-account">
            <CampusSwitcher />

            <div className="desktop-notification-wrap">
              <Motion.button
                whileHover={{ rotate: [0, -12, 12, -6, 0], scale: 1.05 }}
                whileTap={{ scale: 0.93 }}
                type="button"
                className="desktop-bell"
                aria-label="Notificaciones"
                onClick={() => setShowNotifications(value => !value)}
              >
                <Bell size={16} />
                {(unreadNotifications.length || (!notifications.length && upcomingEvents.length)) > 0 && (
                  <span className="desktop-bell-count">{unreadNotifications.length || upcomingEvents.length}</span>
                )}
              </Motion.button>
              <AnimatePresence>
                {showNotifications && (
                  <Motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.96 }}
                    transition={{ duration: 0.18 }}
                    className="desktop-notification-panel"
                  >
                    <strong>{notifications.length > 0 ? 'Notificaciones' : 'Próximos eventos'}</strong>
                    {notificationItems.length === 0 ? (
                      <p>No hay notificaciones ni próximos eventos.</p>
                    ) : (
                      notificationItems.map(item => (
                        <button
                          type="button"
                          className={`desktop-notification-item ${item.read === false ? 'unread' : ''}`}
                          key={item.id}
                          onClick={() =>
                            item.userId
                              ? handleNotificationClick(item)
                              : handleNotificationClick({ ...item, link: `${campusPrefix}/eventos` })
                          }
                        >
                          <span>{item.title}</span>
                          <small>{item.message || `${item.date}${item.time ? ` · ${item.time}` : ''}`}</small>
                        </button>
                      ))
                    )}
                  </Motion.div>
                )}
              </AnimatePresence>
            </div>

            <Motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="desktop-profile-trigger"
              onClick={() => navigate(`${campusPrefix}/mi-perfil`)}
            >
              <div className="desktop-account-avatar">{userData?.name?.slice(0, 1) || 'N'}</div>
              <div>
                <strong>{userData?.name || 'Nicolás'}</strong>
                <small>{settings?.roles?.[userData?.role] || 'Administrador de la cuenta'}</small>
              </div>
              <ChevronDown size={14} />
            </Motion.button>
          </div>
        </Motion.header>

        {/* Top Header for Mobile */}
        <header className="mobile-header">
          <div className="mobile-header-left">
            {location.pathname !== `${campusPrefix}/dashboard` && (
              <button onClick={() => navigate(-1)} className="mobile-menu-btn">
                <ArrowLeft size={24} />
              </button>
            )}
          </div>

          <div className="mobile-header-center">
            <Logo size="small" />
          </div>

          <div className="mobile-header-right">
            <button
              className="mobile-theme-toggle"
              onClick={toggleTheme}
              aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
              title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              className="mobile-user-avatar"
              onClick={() => navigate(`${campusPrefix}/mi-perfil`)}
              aria-label="Ir a mi perfil"
              title="Mi perfil"
            >
              {userData?.name?.charAt(0) || 'U'}
            </button>
            <button
              className="mobile-logout-btn"
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>

        {campuses.length > 0 && (
          <div className="mobile-campus-bar">
            <span>Campus</span>
            <CampusSwitcher compact />
          </div>
        )}

        {/* Dynamic Navigation for Mobile (Bottom Bar) */}
        <nav className="bottom-nav">
          {mobilePrimaryItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `${campusPrefix}/dashboard`}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <Motion.span
                      layoutId="mobile-bottom-pill"
                      className="mobile-bottom-active-pill"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {item.icon}
                  <span>{item.name}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            className={`bottom-nav-item ${showMobileMenu ? 'active' : ''}`}
            onClick={() => setShowMobileMenu(!showMobileMenu)}
          >
            {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
            <span>Menú</span>
          </button>
        </nav>

        {/* Full Screen Menu Overlay for Mobile */}
        <AnimatePresence>
          {showMobileMenu && (
            <Motion.div
              className="mobile-menu-overlay"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="mobile-menu-header">
                <div className="mobile-menu-user">
                  <h2>Hola, {userData?.name?.split(' ')[0]}</h2>
                  <p className="badge badge-gray">{settings?.roles?.[userData?.role] || userData?.role}</p>
                </div>
                <button onClick={handleLogout} className="btn-logout mobile-header-logout" title="Cerrar sesión">
                  <LogOut size={16} />
                  <span>Salir</span>
                </button>
              </div>

              <div className="mobile-menu-grid">
                {menuItems.filter(item => item.path !== `${campusPrefix}/mi-perfil`).map((item) => (
                  item.children ? (
                    <div key={item.path} className="mobile-nav-group">
                      <div className="nav-item mobile-nav-card mobile-nav-heading">
                        {React.cloneElement(item.icon, { size: 24 })}
                        <span>{item.name}</span>
                      </div>
                      {item.children.filter(child => !child.roles || hasRole(child.roles)).map(child => (
                        <NavLink key={child.path} to={child.path} className="nav-item mobile-nav-card mobile-nav-subitem">
                          {child.icon && React.cloneElement(child.icon, { size: 24 })}
                          <span>{child.name}</span>
                        </NavLink>
                      ))}
                    </div>
                  ) : item.external ? (
                    <a key={item.path} href={item.path} className="nav-item mobile-nav-card">
                      {React.cloneElement(item.icon, { size: 24 })}
                      <span>{item.name}</span>
                    </a>
                  ) : (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === `${campusPrefix}/dashboard`}
                      className={({ isActive }) => `nav-item mobile-nav-card ${isActive ? 'active' : ''}`}
                    >
                      {React.cloneElement(item.icon, { size: 24 })}
                      <span>{item.name}</span>
                    </NavLink>
                  )
                ))}
              </div>

              <div className="mobile-menu-footer">
                <button onClick={handleLogout} className="btn-logout mobile-full-logout">
                  <LogOut size={18} />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </Motion.div>
          )}
        </AnimatePresence>

        <div className={`content-wrapper ${campuses.length > 0 ? 'has-campus-bar' : ''}`}>
          {isOffline && (
            <div className="offline-banner" role="status">
              Sin conexión. Los check-ins se guardarán y sincronizarán al volver online.
            </div>
          )}
          <Motion.div
            key={location.pathname}
            className="v15-page-stage"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          >
            <Outlet />
          </Motion.div>
        </div>
      </main>
      <Onboarding />
    </div>
  );
};

export default MainLayout;
