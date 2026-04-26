import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import MemberProfile from './pages/MemberProfile';
import Events from './pages/Events';
import News from './pages/News';
import Live from './pages/Live';
import Finances from './pages/Finances';
import Groups from './pages/Groups';
import GroupDetails from './pages/GroupDetails';
import GrowthGroups from './pages/GrowthGroups';
import Settings from './pages/Settings';
import Home from './pages/Home';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import SessionExpired from './pages/SessionExpired';
import InactivityTimer from './components/common/InactivityTimer';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { currentUser, loading, userData, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <div className="d-flex justify-center align-center" style={{ height: '100vh' }}>Cargando...</div>;
  
  if (!currentUser) return <Navigate to="/login" />;
  
  console.log('ProtectedRoute Check:', { 
    path: location.pathname, 
    needsChange: userData?.needsPasswordChange 
  });

  // Redirection for password change removed as requested

  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <InactivityTimer>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/session-expired" element={<SessionExpired />} />
          
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="miembros" element={<Members />} />
            <Route path="miembros/:id" element={<MemberProfile />} />
            <Route path="eventos" element={<Events />} />
            <Route path="noticias" element={<News />} />
            <Route path="transmisiones" element={<Live />} />
            <Route 
              path="finanzas" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor']}>
                  <Finances />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="grupos" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor']}>
                  <Groups />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="grupos/:id" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor']}>
                  <GroupDetails />
                </ProtectedRoute>
              } 
            />
            <Route path="crecimiento" element={<GrowthGroups />} />
            <Route path="configuracion" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route path="change-password" element={<ChangePassword />} />
          </Route>
        </Routes>
      </InactivityTimer>
    </Router>
  );
}

export default App;

