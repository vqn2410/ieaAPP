import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Card from '../common/Card';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Newspaper,
  Radio,
  DollarSign,
  UsersRound,
  Settings,
  LogOut,
  ArrowLeft,
  Heart,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './MainLayout.css';

const MainLayout = () => {
  const { currentUser, userData, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const canAccess = (area) => {
    if (!userData || !userData.role) return false;
    const perms = settings.rolePermissions || {};
    const userRoles = Array.isArray(userData.role) ? userData.role : [userData.role];
    
    // Admin always has access to everything for safety, or we can strictly follow perms
    if (userRoles.includes('Admin')) return true;

    return userRoles.some(role => perms[role]?.includes(area));
  };

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, id: 'dashboard' },
  ];

  if (canAccess('miembros')) menuItems.push({ name: 'Miembros', path: '/dashboard/miembros', icon: <Users size={20} />, id: 'miembros' });
  if (canAccess('eventos')) menuItems.push({ name: 'Eventos', path: '/dashboard/eventos', icon: <Calendar size={20} />, id: 'eventos' });
  if (canAccess('crecimiento')) menuItems.push({ name: 'Grupos de Amistad', path: '/dashboard/crecimiento', icon: <Heart size={20} />, id: 'crecimiento' });

  if (settings.modules.news && canAccess('noticias')) {
    menuItems.push({ name: 'Noticias', path: '/dashboard/noticias', icon: <Newspaper size={20} />, id: 'noticias' });
  }

  if (settings.modules.live && canAccess('transmisiones')) {
    menuItems.push({ name: 'Transmisiones', path: '/dashboard/transmisiones', icon: <Radio size={20} />, id: 'transmisiones' });
  }

  // Group Management restricted by perms
  if (canAccess('grupos')) {
    menuItems.push({ name: 'Gestor Grupos', path: '/dashboard/grupos', icon: <UsersRound size={20} />, id: 'grupos' });
  }

  // Finances restricted by perms
  if (settings.modules.finances && canAccess('finanzas')) {
    menuItems.push({ name: 'Finanzas', path: 'https://iea-finanzas.vercel.app/', external: true, icon: <DollarSign size={20} />, id: 'finanzas' });
  }

  // Settings restricted by perms
  if (canAccess('configuracion')) {
    menuItems.push({ name: 'Configuración', path: '/dashboard/configuracion', icon: <Settings size={20} />, id: 'configuracion' });
  }

  // Bottom Nav items based on permissions
  const bottomNavItems = menuItems.filter(item => 
    ['dashboard', 'miembros', 'eventos', 'crecimiento'].includes(item.id)
  ).slice(0, 4);

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header d-flex justify-center">
          <img
            src="https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png"
            alt="Logo IEA"
            style={{ maxHeight: '50px', width: 'auto', filter: 'brightness(0) invert(1)' }}
          />
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                {item.external ? (
                  <a href={item.path} target="_blank" rel="noopener noreferrer" className="nav-item">
                    {item.icon}
                    <span>{item.name}</span>
                  </a>
                ) : (
                  <NavLink
                    to={item.path}
                    className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                    end={item.path === '/dashboard'}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="avatar">{currentUser?.email?.charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{userData?.name || 'Usuario'}</span>
              <span className="user-role badge badge-gray">{userData?.role || 'Miembro'}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Salir</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="mobile-header" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '60px', padding: '0 1rem' }}>
           {/* Left side: Back Button */}
           <div style={{ flex: '1', display: 'flex', alignItems: 'center' }}>
             {location.pathname !== '/dashboard' && (
                <button 
                  onClick={() => navigate(-1)} 
                  style={{ background: 'transparent', border: 'none', padding: '0.5rem', cursor: 'pointer', color: 'var(--color-primary)' }}
                >
                  <ArrowLeft size={24} />
                </button>
             )}
           </div>

           {/* Center: Logo (Centered absolutely) */}
           <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center' }}>
              <img 
                src="https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png" 
                alt="Logo IEA" 
                style={{ maxHeight: '32px', width: 'auto', filter: 'brightness(0) invert(1)' }} 
              />
           </div>

           {/* Right side: User Profile */}
           <div style={{ flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
             <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{currentUser?.email?.charAt(0).toUpperCase()}</div>
           </div>
        </header>

        <div className="content-wrapper">
          {location.pathname !== '/dashboard' && (
            <div className="d-none lg-d-block mb-4 desktop-back-btn">
               <button 
                 onClick={() => navigate(-1)} 
                 className="btn btn-outline"
                 style={{ display: 'inline-flex', padding: '0.5rem 1rem' }}
               >
                 <ArrowLeft size={16} style={{ marginRight: '0.5rem' }} /> Volver atrás
               </button>
            </div>
          )}
          <Outlet />
        </div>
      </main>

      {/* Full-screen Mobile Menu Overlay */}
      {showMobileMenu && (
        <div className="mobile-menu-overlay animate-fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--color-surface)',
          zIndex: 100,
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div className="d-flex justify-between align-center mb-5">
            <h2 style={{ margin: 0 }}>Menú Principal</h2>
            <button 
              onClick={() => setShowMobileMenu(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--color-primary)' }}
            >
              <X size={32} />
            </button>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
              {menuItems.map((item) => (
                <div key={item.path} onClick={() => { if(!item.external) setShowMobileMenu(false); }}>
                  {item.external ? (
                    <a href={item.path} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                      <Card style={{ textAlign: 'center', padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ color: 'var(--color-primary)' }}>{item.icon}</div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                      </Card>
                    </a>
                  ) : (
                    <NavLink to={item.path} style={{ textDecoration: 'none' }}>
                      <Card style={{ textAlign: 'center', padding: '1.5rem', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ color: 'var(--color-primary)' }}>{item.icon}</div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</span>
                      </Card>
                    </NavLink>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="sidebar-footer" style={{ border: 'none', marginTop: '2rem' }}>
            <div className="user-info">
              <div className="avatar">{currentUser?.email?.charAt(0).toUpperCase()}</div>
              <div className="user-details">
                <span className="user-name">{userData?.name || 'Usuario'}</span>
                <span className="user-role badge badge-gray">{userData?.role || 'Miembro'}</span>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* App-like bottom navigation with 5 buttons */}
      <nav className="bottom-nav">
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}
            end={item.path === '/dashboard'}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
        <button 
          className="bottom-nav-item" 
          onClick={() => setShowMobileMenu(true)} 
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Menu size={20} />
          <span>Más</span>
        </button>
      </nav>
    </div>
  );
};

export default MainLayout;
