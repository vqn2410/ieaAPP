import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import MainLayout from './components/portal/layout/MainLayout';
import InactivityTimer from './components/common/InactivityTimer';
import RouteTransition from './components/common/RouteTransition';
import { useAuth } from './context/AuthContext';

const Dashboard = lazy(() => import('./pages/portal/Dashboard'));
const Members = lazy(() => import('./pages/portal/Members'));
const MemberProfile = lazy(() => import('./pages/portal/MemberProfile'));
const Events = lazy(() => import('./pages/portal/Events'));
const News = lazy(() => import('./pages/landing/News'));
const Live = lazy(() => import('./pages/landing/Live'));
const GroupDetails = lazy(() => import('./pages/portal/GroupDetails'));
const GrowthGroups = lazy(() => import('./pages/portal/GrowthGroups'));
const Reports = lazy(() => import('./pages/portal/Reports'));
const Settings = lazy(() => import('./pages/portal/Settings'));
const Home = lazy(() => import('./pages/landing/Home'));
const Login = lazy(() => import('./pages/portal/Login'));
const ChangePassword = lazy(() => import('./pages/portal/ChangePassword'));

const Visitors = lazy(() => import('./pages/portal/Visitors'));
const MemberPortal = lazy(() => import('./pages/portal/MemberPortal'));
const SessionExpired = lazy(() => import('./pages/portal/SessionExpired'));
const Notes = lazy(() => import('./pages/portal/Notes'));
const FocusTimer = lazy(() => import('./pages/portal/FocusTimer'));
const Assistant = lazy(() => import('./pages/portal/Assistant'));
const Kids = lazy(() => import('./pages/portal/Kids'));
const IbrpAssigned = lazy(() => import('./pages/portal/IbrpAssigned'));
const IeaMockup = lazy(() => import('./pages/landing/IeaMockup'));
const Extensions = lazy(() => import('./pages/landing/Extensions'));

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { currentUser, userData, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) return <div className="d-flex justify-center align-center" style={{ height: '100vh' }}>Cargando...</div>;
  
  if (!currentUser) return <Navigate to="/login" />;
  
  if (userData?.needsPasswordChange === true && location.pathname !== '/dashboard/cambio-clave') {
    return <Navigate to="/dashboard/cambio-clave" replace />;
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const FinanceRedirect = () => {
  useEffect(() => {
    window.location.assign('https://iea-finanzas.vercel.app/');
  }, []);
  return <Loading />;
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
      <RouteTransition />
      <InactivityTimer>
        <Suspense fallback={<RouteTransition mode="loading" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/session-expired" element={<SessionExpired />} />
          <Route path="/maqueta-iea" element={<IeaMockup />} />
          <Route path="/extensiones" element={<Extensions />} />
          
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
            <Route path="kids" element={<ProtectedRoute requiredRoles={['Admin', 'Pastor', 'MinistryLeader', 'Maestro']}><Kids /></ProtectedRoute>} />
            <Route path="ibrp" element={<ProtectedRoute requiredRoles={['Admin', 'Pastor', 'MinistryLeader', 'AreaLeader']}><IbrpAssigned /></ProtectedRoute>} />
            <Route path="miembros/:id" element={<MemberProfile />} />
            <Route path="eventos" element={<Events />} />
            <Route path="noticias" element={<News />} />
            <Route path="transmisiones" element={<Live />} />
            <Route 
              path="finanzas" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor']}>
                  <FinanceRedirect />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="grupos" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member']}>
                  <GrowthGroups />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="grupos/:id" 
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor', 'CampusAdmin', 'Facilitator', 'CoFacilitator']}>
                  <GroupDetails />
                </ProtectedRoute>
              } 
            />
            <Route path="crecimiento" element={<Navigate to="/dashboard/grupos" replace />} />
            <Route path="configuracion" 
              element={
                <ProtectedRoute requiredRoles={['Admin']}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route path="cambio-clave" element={<ChangePassword />} />
            <Route path="seguimientos" element={<Navigate to="/dashboard/grupos?section=seguimientos" replace />} />
            <Route path="clases" element={<Navigate to="/dashboard/grupos?section=clases" replace />} />
            <Route path="visitantes" element={<Visitors />} />
            <Route path="mi-perfil" element={<MemberPortal />} />
            <Route path="reportes" element={<Reports />} />
            <Route
              path="notas"
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member']}>
                  <Notes />
                </ProtectedRoute>
              }
            />
            <Route
              path="enfoque"
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor', 'MinistryLeader', 'Member']}>
                  <FocusTimer />
                </ProtectedRoute>
              }
            />
            <Route
              path="asistente"
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor', 'MinistryLeader']}>
                  <Assistant />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
        </Suspense>
      </InactivityTimer>
    </Router>
  );
}

const Loading = () => <div className="d-flex justify-center align-center" style={{ height: '100vh' }}>Cargando...</div>;
export default App;
