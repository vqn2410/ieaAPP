import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Users, 
  Calendar, 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  User, 
   ChevronRight,
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
   Bot,
   Search, SlidersHorizontal, Bell
} from 'lucide-react';
import Logo from '../common/Logo';
import Onboarding, { HelpButton } from '../common/Onboarding';
import FloatingAssistant from '../common/FloatingAssistant';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './MainLayout.css';

const MainLayout = () => {
  const { currentUser, userData, logout, hasRole } = useAuth();
  const { settings, userPreferences, updateUserPreference } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [openMenu, setOpenMenu] = useState('');
  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
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
    navigate(term ? `/dashboard/miembros?search=${encodeURIComponent(term)}` : '/dashboard/miembros');
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'] },
    { name: 'Miembros', path: '/dashboard/miembros', icon: <Users size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Maestro'], children: [
      { name: 'Listado de Miembros', path: '/dashboard/miembros', roles: ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'] },
      { name: 'Agregar Miembros', path: '/dashboard/miembros?nuevo=1', roles: ['Admin', 'Pastor'] },
      { name: 'Kids', path: '/dashboard/kids', roles: ['Admin', 'Pastor', 'MinistryLeader', 'Maestro'] },
    ] },
    { name: 'Grupos', path: '/dashboard/grupos', icon: <TrendingUp size={20} />, roles: ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'] },
    { name: 'Asignados IBRP', path: '/dashboard/ibrp', icon: <img className="ibrp-menu-icon" src="/img/ibrp-logo.svg" alt="" />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'AreaLeader'] },
    { name: 'Eventos', path: '/dashboard/eventos', icon: <Calendar size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader'] },
    { name: 'Finanzas', path: 'https://iea-finanzas.vercel.app/', icon: <DollarSign size={20} />, roles: ['Admin', 'Pastor'], external: true },
    { name: 'Transmisiones', path: '/dashboard/transmisiones', icon: <Radio size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader'] },
    { name: 'Visitantes', path: '/dashboard/visitantes', icon: <UserPlus size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'] },
    { name: 'Noticias', path: '/dashboard/noticias', icon: <MessageSquare size={20} />, roles: ['Admin', 'Pastor'] },
    { name: 'Anotaciones', path: '/dashboard/notas', icon: <StickyNote size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member'] },
    { name: 'Enfoque', path: '/dashboard/enfoque', icon: <Timer size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Member'] },
    { name: 'Asistente', path: '/dashboard/asistente', icon: <Bot size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader'] },
    { name: 'Reportes', path: '/dashboard/reportes', icon: <FileText size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader'] },
    { name: 'Configuración', path: '/dashboard/configuracion', icon: <Settings size={20} />, roles: ['Admin'] },
  ].filter(item => hasRole(item.roles));
  const mobilePrimaryItems = menuItems
    .filter(item => item.path !== '/dashboard/mi-perfil')
    .slice(0, 4);

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header d-flex justify-center">
          <Logo size="medium" showText={false} />
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                {item.children ? (
                  <>
                    <button className={`nav-item nav-dropdown-trigger ${openMenu === item.name ? 'active' : ''}`} onClick={() => setOpenMenu(openMenu === item.name ? '' : item.name)}>
                      {item.icon}
                      <span>{item.name}</span>
                      <ChevronDown size={15} className={`nav-dropdown-chevron ${openMenu === item.name ? 'open' : ''}`} />
                    </button>
                    {openMenu === item.name && <div className="nav-submenu">{item.children.filter(child => !child.roles || hasRole(child.roles)).map(child => <NavLink key={child.path} to={child.path} className="nav-subitem">{child.name}</NavLink>)}</div>}
                  </>
                ) : item.external ? (
                  <a href={item.path} className="nav-item">
                    {item.icon}
                    <span>{item.name}</span>
                  </a>
                ) : (
                  <NavLink to={item.path} end={item.path === '/dashboard'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="user-info" onClick={() => navigate('/dashboard/mi-perfil')} title="Mi perfil" style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
            <div className="avatar">
              {userData?.name?.charAt(0) || currentUser?.email?.charAt(0)}
            </div>
            <div>
              <div className="user-name">{userData?.name || 'Usuario'}</div>
              <div className="badge badge-gray">{settings?.roles?.[userData?.role] || userData?.role}</div>
            </div>
          </button>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            <span>{isDarkMode ? 'Modo claro' : 'Modo oscuro'}</span>
          </button>
          <HelpButton style={{ width: '100%', justifyContent: 'flex-start', padding: '0.6rem 0.7rem', fontSize: '0.78rem' }} />
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="desktop-topbar">
          <form className="desktop-search" onSubmit={submitGlobalSearch}><Search size={15} /><input aria-label="Buscar" value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} placeholder="Buscar miembros, grupos, reuniones" /><button type="button" onClick={() => navigate('/dashboard/miembros')}><SlidersHorizontal size={13} /> Filtros</button><kbd>⌘K</kbd></form>
          <div className="desktop-account"><div className="desktop-notification-wrap"><button type="button" className="desktop-bell" aria-label="Notificaciones" onClick={() => setShowNotifications(value => !value)}><Bell size={16} /></button>{showNotifications && <div className="desktop-notification-panel"><strong>Notificaciones</strong><p>No hay notificaciones nuevas.</p></div>}</div><button type="button" className="desktop-profile-trigger" onClick={() => navigate('/dashboard/mi-perfil')}><div className="desktop-account-avatar">{userData?.name?.slice(0, 1) || 'N'}</div><div><strong>{userData?.name || 'Nicolás'}</strong><small>{settings?.roles?.[userData?.role] || 'Administrador de la cuenta'}</small></div><ChevronDown size={14} /></button></div>
        </header>
        {/* Top Header for Mobile */}
        <header className="mobile-header">
           {/* Left side: Back Button */}
           <div className="mobile-header-left">
              {location.pathname !== '/dashboard' && (
                 <button onClick={() => navigate(-1)} className="mobile-menu-btn">
                   <ArrowLeft size={24} />
                 </button>
              )}
           </div>

           {/* Center: Logo */}
           <div className="mobile-header-center">
              <Logo size="small" />
           </div>

             {/* Right side: User Profile */}
             <div className="mobile-header-right">
               <button className="mobile-theme-toggle" onClick={toggleTheme} aria-label={isDarkMode ? 'Activar modo claro' : 'Activar modo oscuro'}>
                 {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
               </button>
               <button className="mobile-user-avatar" onClick={() => navigate('/dashboard/mi-perfil')} aria-label="Ir a mi perfil">
                 {userData?.name?.charAt(0) || 'U'}
               </button>
           </div>
        </header>

        {/* Dynamic Navigation for Mobile (Bottom Bar) */}
        <nav className="bottom-nav">
           {mobilePrimaryItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              end={item.path === '/dashboard'}
              className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.name}</span>
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
        {showMobileMenu && (
          <div className="mobile-menu-overlay">
             <div className="mobile-menu-header">
                <div className="mobile-menu-user">
                   <h2>Hola, {userData?.name?.split(' ')[0]}</h2>
                   <p className="badge badge-gray">{settings?.roles?.[userData?.role] || userData?.role}</p>
                </div>
                <button onClick={handleLogout} className="btn-logout" style={{ width: 'auto', padding: '0.5rem 1rem' }}>
                   Salir
                </button>
             </div>

             <div className="mobile-menu-grid">
                 {menuItems.filter(item => item.path !== '/dashboard/mi-perfil').map((item) => (
                   item.children ? (
                     <div key={item.path} className="mobile-nav-group">
                       <div className="nav-item mobile-nav-card mobile-nav-heading">{React.cloneElement(item.icon, { size: 24 })}<span>{item.name}</span></div>
                       {item.children.filter(child => !child.roles || hasRole(child.roles)).map(child => <NavLink key={child.path} to={child.path} className="nav-item mobile-nav-card mobile-nav-subitem">{child.name}</NavLink>)}
                     </div>
                   ) : item.external ? (
                    <a key={item.path} href={item.path} className="nav-item mobile-nav-card">
                      {React.cloneElement(item.icon, { size: 24 })}
                      <span>{item.name}</span>
                    </a>
                  ) : (
                    <NavLink key={item.path} to={item.path} end={item.path === '/dashboard'} className={({ isActive }) => `nav-item mobile-nav-card ${isActive ? 'active' : ''}`}>
                      {React.cloneElement(item.icon, { size: 24 })}
                      <span>{item.name}</span>
                    </NavLink>
                  )
                ))}
             </div>
          </div>
        )}

        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
      <Onboarding />
      <FloatingAssistant />
    </div>
  );
};

export default MainLayout;
