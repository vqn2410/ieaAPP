import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import MainLayout from './components/layout/MainLayout';
import InactivityTimer from './components/common/InactivityTimer';
import { useAuth } from './context/AuthContext';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Members = lazy(() => import('./pages/Members'));
const MemberProfile = lazy(() => import('./pages/MemberProfile'));
const Events = lazy(() => import('./pages/Events'));
const News = lazy(() => import('./pages/News'));
const Live = lazy(() => import('./pages/Live'));
const Finances = lazy(() => import('./pages/Finances'));
const Groups = lazy(() => import('./pages/Groups'));
const GroupDetails = lazy(() => import('./pages/GroupDetails'));
const GrowthGroups = lazy(() => import('./pages/GrowthGroups'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const ChangePassword = lazy(() => import('./pages/ChangePassword'));
const FollowUps = lazy(() => import('./pages/FollowUps'));

const Visitors = lazy(() => import('./pages/Visitors'));
const MemberPortal = lazy(() => import('./pages/MemberPortal'));
const SessionExpired = lazy(() => import('./pages/SessionExpired'));

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
  useEffect(() => {
    if (typeof CapacitorApp?.addListener !== 'function') return;
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });
    return () => {
      CapacitorApp.removeAllListeners();
    };
  }, []);

  return (
    <Router>
      <InactivityTimer>
        <Suspense fallback={<Loading />}>
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
            <Route path="cambio-clave" element={<ChangePassword />} />
            <Route path="seguimientos" element={<FollowUps />} />
            <Route path="visitantes" element={<Visitors />} />
            <Route path="mi-perfil" element={<MemberPortal />} />
            <Route path="reportes" element={<Reports />} />
          </Route>
        </Routes>
        </Suspense>
      </InactivityTimer>
    </Router>
  );
}

const Loading = () => <div className="d-flex justify-center align-center" style={{ height: '100vh' }}>Cargando...</div>;
export default App;

