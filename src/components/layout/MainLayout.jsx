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
  TrendingUp,
  MessageSquare,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './MainLayout.css';

const MainLayout = () => {
  const { currentUser, userData, logout, hasRole } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out', error);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member'] },
    { name: 'Miembros', path: '/dashboard/miembros', icon: <Users size={20} />, roles: ['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator'] },
    { name: 'Grupos', path: '/dashboard/grupos', icon: <TrendingUp size={20} />, roles: ['Admin', 'Pastor', 'Facilitator', 'CoFacilitator'] },
    { name: 'Eventos', path: '/dashboard/eventos', icon: <Calendar size={20} />, roles: ['Admin', 'Pastor'] },
    { name: 'Noticias', path: '/dashboard/noticias', icon: <MessageSquare size={20} />, roles: ['Admin', 'Pastor'] },
    { name: 'Configuración', path: '/dashboard/configuracion', icon: <Settings size={20} />, roles: ['Admin', 'Pastor'] },
  ].filter(item => hasRole(item.roles));

  const getCurrentPageTitle = () => {
    const item = menuItems.find(item => item.path === location.pathname);
    return item ? item.name : 'IEA Portal';
  };

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
                <NavLink 
                  to={item.path} 
                  end={item.path === '/dashboard'}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">
              {userData?.name?.charAt(0) || currentUser?.email?.charAt(0)}
            </div>
            <div>
              <div className="user-name">{userData?.name || 'Usuario'}</div>
              <div className="badge badge-gray">{settings?.roles?.[userData?.role] || userData?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-logout">
            <LogOut size={18} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
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
              <button className="mobile-user-avatar" onClick={() => setShowMobileMenu(!showMobileMenu)}>
                {userData?.name?.charAt(0) || 'U'}
              </button>
           </div>
        </header>

        {/* Dynamic Navigation for Mobile (Bottom Bar) */}
        <nav className="bottom-nav">
          {menuItems.slice(0, 4).map((item) => (
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
               {menuItems.map((item) => (
                 <NavLink 
                   key={item.path} 
                   to={item.path} 
                   end={item.path === '/dashboard'}
                   className={({ isActive }) => `nav-item mobile-nav-card ${isActive ? 'active' : ''}`}
                 >
                   {React.cloneElement(item.icon, { size: 24 })}
                   <span>{item.name}</span>
                 </NavLink>
               ))}
             </div>
          </div>
        )}

        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
