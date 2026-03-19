import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Newspaper,
  Radio,
  DollarSign,
  UsersRound,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import './MainLayout.css'; // Optional CSS mapping, I will write inline or specific classes

const MainLayout = () => {
  const { currentUser, userData, logout } = useAuth();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Miembros', path: '/miembros', icon: <Users size={20} /> },
    { name: 'Eventos', path: '/eventos', icon: <Calendar size={20} /> },
    { name: 'Grupos', path: '/grupos', icon: <UsersRound size={20} /> },
  ];

  if (settings.modules.news) {
    menuItems.push({ name: 'Noticias', path: '/noticias', icon: <Newspaper size={20} /> });
  }

  if (settings.modules.live) {
    menuItems.push({ name: 'Transmisiones', path: '/transmisiones', icon: <Radio size={20} /> });
  }

  // Finances restricted to Admin / Pastor
  if (settings.modules.finances && userData && (userData.role === 'Admin' || userData.role === 'Pastor')) {
    menuItems.push({ name: 'Finanzas', path: '/finanzas', icon: <DollarSign size={20} /> });
  }

  // Settings restricted to Admin
  if (userData && userData.role === 'Admin') {
    menuItems.push({ name: 'Configuración', path: '/configuracion', icon: <Settings size={20} /> });
  }

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header d-flex justify-center">
          <img
            src="https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png"
            alt="Logo IEA"
            style={{ maxHeight: '50px', width: 'auto' }}
          />
        </div>

        <nav className="sidebar-nav">
          <ul>
            {menuItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}
                  end={item.path === '/'}
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
        <header className="mobile-header d-flex justify-between align-center">
           <img 
             src="https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png" 
             alt="Logo IEA" 
             style={{ maxHeight: '35px' }} 
           />
           <div className="d-flex align-center gap-3">
             <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>{currentUser?.email?.charAt(0).toUpperCase()}</div>
           </div>
        </header>

        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>

      {/* App-like bottom navigation only visible on mobile (handled by CSS) */}
      <nav className="bottom-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => isActive ? 'bottom-nav-item active' : 'bottom-nav-item'}
            end={item.path === '/'}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default MainLayout;
