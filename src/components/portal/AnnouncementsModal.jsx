import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Megaphone, Clock } from 'lucide-react';
import './AnnouncementsModal.css';

const AUTOPLAY_MS = 6500;
const SWIPE_THRESHOLD = 48;

/**
 * Ventana emergente (bottom sheet) exclusiva para mobile que muestra los
 * anuncios de la iglesia al iniciar sesión / ingresar al dashboard.
 */
const AnnouncementsModal = ({ open, onClose, announcements = [] }) => {
  const [index, setIndex] = useState(0);
  const touchStartX = useRef(null);

  const total = announcements.length;
  const safeIndex = total > 0 ? index % total : 0;

  const go = useCallback(
    (direction) => {
      if (total === 0) return;
      setIndex((current) => (current + direction + total) % total);
    },
    [total]
  );

  const handleClose = useCallback(() => {
    setIndex(0);
    onClose?.();
  }, [onClose]);

  // Avance automático mientras está abierto
  useEffect(() => {
    if (!open || total <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % total);
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [open, total]);

  // Cierre con Escape + bloqueo del scroll del body
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, handleClose]);

  // Soporte de swipe táctil
  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null || total <= 1) return;
    const delta = event.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      go(delta < 0 ? 1 : -1);
    }
  };

  if (typeof document === 'undefined') return null;

  const current = announcements[safeIndex];

  return createPortal(
    <AnimatePresence>
      {open && (
        <Motion.div
          className="ann-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) handleClose();
          }}
        >
          <Motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Anuncios"
            className="ann-modal-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
          >
            <div className="ann-modal-handle" aria-hidden="true" />

            <div className="ann-modal-header">
              <div className="ann-modal-title">
                <Megaphone size={18} />
                <div>
                  <span>Anuncios de la Semana</span>
                  {total > 1 && (
                    <small className="ann-modal-counter">
                      {safeIndex + 1} de {total}
                    </small>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="ann-modal-close"
                onClick={handleClose}
                aria-label="Cerrar anuncios"
              >
                <X size={20} />
              </button>
            </div>

            {total > 0 && current && (
              <>
                <div
                  className="ann-modal-slider"
                  onTouchStart={handleTouchStart}
                  onTouchEnd={handleTouchEnd}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <Motion.div
                      key={current.image}
                      className="ann-modal-slide"
                      initial={{ opacity: 0, x: 40 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -40 }}
                      transition={{ duration: 0.2 }}
                    >
                      <img
                        src={current.image}
                        alt={current.title}
                        className="ann-modal-image"
                        onError={(event) => { event.currentTarget.hidden = true; }}
                      />
                      <div className="ann-modal-fallback">
                        <span>{current.title}</span>
                      </div>
                    </Motion.div>
                  </AnimatePresence>

                  {total > 1 && (
                    <>
                      <button
                        type="button"
                        className="ann-modal-nav ann-modal-prev"
                        onClick={() => go(-1)}
                        aria-label="Anuncio anterior"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        className="ann-modal-nav ann-modal-next"
                        onClick={() => go(1)}
                        aria-label="Anuncio siguiente"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>

                <div className="ann-modal-info">
                  {current.title && <p className="ann-modal-caption">{current.title}</p>}
                  {(current.category || current.schedule) && (
                    <div className="ann-modal-meta">
                      {current.category && (
                        <span className="ann-modal-badge">{current.category}</span>
                      )}
                      {current.schedule && (
                        <span className="ann-modal-schedule">
                          <Clock size={12} /> {current.schedule}
                        </span>
                      )}
                    </div>
                  )}
                  {current.detail && (
                    <p className="ann-modal-detail">{current.detail}</p>
                  )}
                </div>

                {total > 1 && (
                  <div className="ann-modal-dots">
                    {announcements.map((item, i) => (
                      <button
                        key={item.image}
                        type="button"
                        className={`ann-modal-dot ${i === safeIndex ? 'active' : ''}`}
                        onClick={() => setIndex(i)}
                        aria-label={`Ver anuncio: ${item.title}`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            <button type="button" className="ann-modal-dismiss" onClick={handleClose}>
              Entendido
            </button>
          </Motion.div>
        </Motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default AnnouncementsModal;
