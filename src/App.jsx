import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { currentUser, loading, hasRole } = useAuth();

  if (loading) return <div className="d-flex justify-center align-center" style={{ height: '100vh' }}>Cargando...</div>;
  
  if (!currentUser) return <Navigate to="/login" />;
  
  const { userData } = useAuth();
  if (userData?.needsPasswordChange && window.location.pathname !== '/dashboard/change-password') {
    return <Navigate to="/dashboard/change-password" />;
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to="/dashboard" />; // Redirect to dashboard if no permission
  }

  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
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
    </Router>
  );
}

export default App;
