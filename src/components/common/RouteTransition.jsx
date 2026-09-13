import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import './RouteTransition.css';

const COVER_MS = 1500;
const TOTAL_MS = 3000;

// Transición de pantalla completa entre rutas, estilo "video":
// paneles escalonados barren la pantalla, muestran la marca y revelan
// la nueva vista. Respeta los colores del proyecto y reduced-motion.
export default function RouteTransition({ mode = 'navigation' }) {
  const { pathname } = useLocation();
  const [phase, setPhase] = useState('cover');
  const timers = useRef([]);
  const previousPath = useRef(pathname);
  const reduced = useRef(
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  const isHome = pathname === '/';
  const isPortalEntry = previousPath.current === '/' || previousPath.current === '/login';
  const shouldAnimate = mode === 'loading' || (mode === 'navigation' && isPortalEntry && pathname.startsWith('/dashboard'));

  useEffect(() => {
    const oldPath = previousPath.current;
    previousPath.current = pathname;
    const enteringPortal = oldPath === '/' || oldPath === '/login';
    if (reduced.current || isHome || (mode === 'navigation' && !(enteringPortal && pathname.startsWith('/dashboard')))) return undefined;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    document.body.style.overflow = 'hidden';
    setPhase('cover');
    timers.current.push(setTimeout(() => setPhase('reveal'), COVER_MS));
    timers.current.push(setTimeout(() => {
      setPhase('idle');
      document.body.style.overflow = '';
    }, TOTAL_MS));
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      document.body.style.overflow = '';
    };
  }, [pathname, mode, isHome]);

  if (reduced.current || isHome || !shouldAnimate || phase === 'idle') return null;

  return (
    <div className={`rt-overlay rt-${phase}`} aria-hidden="true">
      <div className="rt-panel rt-p1" />
      <div className="rt-panel rt-p2" />
      <div className="rt-panel rt-p3" />
      <div className="rt-brand">
        <span className="rt-logo"><img src="/img/icon-500x500.png" alt="" /></span>
        <span className="rt-name">IGLESIA EXTREMO AMOR</span>
        <span className="rt-bar"><span /></span>
      </div>
    </div>
  );
}
