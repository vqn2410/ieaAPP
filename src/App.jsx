import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { App as CapacitorApp } from '@capacitor/app';
import MainLayout from './components/portal/layout/MainLayout';
import InactivityTimer from './components/common/InactivityTimer';
import RouteTransition from './components/common/RouteTransition';
import { useAuth } from './context/AuthContext';
import { useCampus } from './context/CampusContext';

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
const Finances = lazy(() => import('./pages/portal/Finances'));
const Home = lazy(() => import('./pages/landing/Home'));
const Login = lazy(() => import('./pages/portal/Login'));
const ChangePassword = lazy(() => import('./pages/portal/ChangePassword'));

const Visitors = lazy(() => import('./pages/portal/Visitors'));
const MemberPortal = lazy(() => import('./pages/portal/MemberPortal'));
const SessionExpired = lazy(() => import('./pages/portal/SessionExpired'));
const Notes = lazy(() => import('./pages/portal/Notes'));
const AuditLogs = lazy(() => import('./pages/portal/AuditLogs'));
const FocusTimer = lazy(() => import('./pages/portal/FocusTimer'));
const Kids = lazy(() => import('./pages/portal/Kids'));
const IbrpAssigned = lazy(() => import('./pages/portal/IbrpAssigned'));
const IeaMockup = lazy(() => import('./pages/landing/IeaMockup'));
const Extensions = lazy(() => import('./pages/landing/Extensions'));

const ProtectedRoute = ({ children, requiredRoles }) => {
  const { currentUser, userData, loading, hasRole } = useAuth();
  const { activeCampusSlug } = useCampus();
  const location = useLocation();

  if (loading) return <RouteTransition mode="loading" message="Iniciando sesión..." />;
  
  if (!currentUser) return <Navigate to="/login" />;
  
  const campusPrefix = `/${activeCampusSlug || 'sedecentral'}`;

  if (userData?.needsPasswordChange === true && !location.pathname.endsWith('/cambio-clave')) {
    return <Navigate to={`${campusPrefix}/cambio-clave`} replace />;
  }

  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to={`${campusPrefix}/dashboard`} />;
  }

  return children;
};

const CampusRouteWrapper = ({ children }) => {
  const { campusSlug } = useParams();
  const { selectCampusBySlug, loading } = useCampus();

  useEffect(() => {
    if (!loading && campusSlug) {
      selectCampusBySlug(campusSlug);
    }
  }, [campusSlug, loading, selectCampusBySlug]);

  return children;
};

const CampusRedirect = ({ to }) => {
  const { campusSlug } = useParams();
  return <Navigate to={`/${campusSlug || 'sedecentral'}/${to}`} replace />;
};

const NestedDashboardRedirect = () => {
  const { campusSlug, section } = useParams();
  const location = useLocation();
  return <Navigate to={`/${campusSlug || 'sedecentral'}/${section}${location.search || ''}`} replace />;
};

const LegacyDashboardRedirect = () => {
  const { activeCampusSlug } = useCampus();
  const location = useLocation();
  const targetSlug = activeCampusSlug || 'sedecentral';
  const remainder = location.pathname.replace(/^\/dashboard\/?/, '');
  const search = location.search || '';
  if (!remainder) {
    return <Navigate to={`/${targetSlug}/dashboard${search}`} replace />;
  }
  return <Navigate to={`/${targetSlug}/${remainder}${search}`} replace />;
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
          {/* Rutas públicas y landing */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/session-expired" element={<SessionExpired />} />
          <Route path="/maqueta-iea" element={<IeaMockup />} />
          <Route path="/extensiones" element={<Extensions />} />
          
          {/* Redirecciones de rutas legacy /dashboard hacia el campus activo */}
          <Route path="/dashboard" element={<LegacyDashboardRedirect />} />
          <Route path="/dashboard/*" element={<LegacyDashboardRedirect />} />

          {/* Rutas principales organizadas por campus: /sedecentral/dashboard, /apostoles/dashboard, etc. */}
          <Route 
            path="/:campusSlug" 
            element={
              <ProtectedRoute>
                <CampusRouteWrapper>
                  <MainLayout />
                </CampusRouteWrapper>
              </ProtectedRoute>
            }
          >
            <Route index element={<CampusRedirect to="dashboard" />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="dashboard/:section" element={<NestedDashboardRedirect />} />
            <Route path="miembros" element={<Members />} />
            <Route path="kids" element={<ProtectedRoute requiredRoles={['Admin', 'Pastor', 'MinistryLeader', 'Maestro']}><Kids /></ProtectedRoute>} />
            <Route path="ibrp" element={<ProtectedRoute requiredRoles={['Admin', 'Pastor', 'MinistryLeader', 'AreaLeader']}><IbrpAssigned /></ProtectedRoute>} />
            <Route path="miembros/:id" element={<MemberProfile />} />
            <Route path="eventos" element={<Events />} />
            <Route path="noticias" element={<News />} />
            <Route path="transmisiones" element={<Live />} />
            <Route path="finanzas" element={<ProtectedRoute requiredRoles={['Admin', 'Pastor']}><Finances /></ProtectedRoute>} />
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
            <Route path="crecimiento" element={<CampusRedirect to="grupos" />} />
            <Route path="configuracion" 
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route path="auditoria" element={<ProtectedRoute requiredRoles={['Admin', 'Pastor']}><AuditLogs /></ProtectedRoute>} />
            <Route path="cambio-clave" element={<ChangePassword />} />
            <Route path="seguimientos" element={<CampusRedirect to="grupos?section=seguimientos" />} />
            <Route path="clases" element={<CampusRedirect to="grupos?section=clases" />} />
            <Route path="visitantes" element={<Visitors />} />
            <Route path="mi-perfil" element={<MemberPortal />} />
            <Route path="reportes" element={<Reports />} />
            <Route
              path="notas"
              element={
                <ProtectedRoute requiredRoles={['Admin', 'Pastor', 'CampusAdmin', 'MinistryLeader', 'Facilitator', 'CoFacilitator', 'Member']}>
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
          </Route>
        </Routes>
        </Suspense>
      </InactivityTimer>
    </Router>
  );
}

export default App;
