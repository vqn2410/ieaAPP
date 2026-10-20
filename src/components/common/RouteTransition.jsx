import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './RouteTransition.css';

const COVER_MS = 600;
const TOTAL_MS = 1200;
const PREFERS_REDUCED_MOTION = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isPortalPath = (path) =>
  path.startsWith('/dashboard') ||
  path.includes('/dashboard') ||
  (!['/', '/login', '/session-expired', '/maqueta-iea', '/extensiones'].includes(path));

export default function RouteTransition({
  mode = 'navigation',
  message = 'Iniciando sesión...',
  submessage = 'PORTAL ADMINISTRATIVO',
}) {
  const { pathname } = useLocation();
  const [phase, setPhase] = useState('idle');
  const timers = useRef([]);
  const previousPath = useRef(pathname);
  const isTransitioning = useRef(false);

  // Modo 'navigation': barrido de paneles con marca al ingresar al portal desde rutas públicas
  useEffect(() => {
    if (mode === 'loading') return undefined;

    const oldPath = previousPath.current;
    previousPath.current = pathname;

    if (PREFERS_REDUCED_MOTION || pathname === '/') return undefined;

    const wasPublic = oldPath === '/' || oldPath === '/login';
    const isNowPortal = isPortalPath(pathname);

    // Solo iniciamos una nueva transición si venimos de público a portal y no estamos ya en una
    if (wasPublic && isNowPortal && !isTransitioning.current) {
      isTransitioning.current = true;
      document.body.style.overflow = 'hidden';
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase('cover');

      timers.current.push(
        setTimeout(() => {
          setPhase('reveal');
        }, COVER_MS)
      );

      timers.current.push(
        setTimeout(() => {
          setPhase('idle');
          isTransitioning.current = false;
          document.body.style.overflow = '';
        }, TOTAL_MS)
      );
    }

    return () => {
      // Intencional: no cancelamos timers aquí para permitir redirecciones intermedias
      // como /login -> /dashboard -> /:campusSlug/dashboard sin abortar la transición.
    };
  }, [pathname, mode]);

  // Limpieza al desmontar el componente raíz
  useEffect(() => {
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      document.body.style.overflow = '';
      isTransitioning.current = false;
    };
  }, []);

  // Pantalla de carga persistente cuando se usa como fallback o durante autenticación
  if (mode === 'loading') {
    return (
      <div className="rt-loading-screen" role="status" aria-live="polite">
        <div className="rt-loading-card">
          <div className="rt-logo rt-loading-logo">
            <img src="/img/icon-500x500.png" alt="IEA Logo" />
          </div>
          <div className="rt-loading-brand">
            <span className="rt-loading-title">IGLESIA EXTREMO AMOR</span>
            {submessage && <span className="rt-loading-badge">{submessage}</span>}
          </div>
          <div className="rt-loading-spinner-wrapper">
            <div className="rt-loading-bar-indeterminate">
              <span className="rt-loading-bar-fill" />
            </div>
            <p className="rt-loading-message">{message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (PREFERS_REDUCED_MOTION || phase === 'idle') return null;

  return (
    <div className={`rt-overlay rt-${phase}`} aria-hidden="true">
      <div className="rt-panel rt-p1" />
      <div className="rt-panel rt-p2" />
      <div className="rt-panel rt-p3" />
      <div className="rt-brand">
        <span className="rt-logo">
          <img src="/img/icon-500x500.png" alt="IEA Logo" />
        </span>
        <span className="rt-name">IGLESIA EXTREMO AMOR</span>
        <span className="rt-bar"><span /></span>
      </div>
    </div>
  );
}
