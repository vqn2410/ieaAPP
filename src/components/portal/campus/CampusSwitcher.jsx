import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, ChevronDown, Check, Building2, ExternalLink } from 'lucide-react';
import { useCampus } from '../../../context/CampusContext';
import { useAuth } from '../../../context/AuthContext';
import './CampusSwitcher.css';

export default function CampusSwitcher({ compact = false }) {
  const { campuses, activeCampus, activeCampusId, switchCampus, getCampusSlug } = useCampus();
  const { hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const canSwitchCampus = hasRole(['Admin', 'Pastor']) || hasRole(['CampusAdmin']) || campuses.length > 1;

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!campuses || campuses.length === 0) return null;

  if (!canSwitchCampus) {
    return (
      <div className={`campus-indicator ${compact ? 'compact' : ''}`}>
        <MapPin size={compact ? 13 : 14} className="campus-indicator-icon" />
        <span className="campus-indicator-text">{activeCampus?.name || campuses[0]?.name || 'Sede Central'}</span>
      </div>
    );
  }

  const handleSelect = (campus) => {
    switchCampus(campus.id, navigate, location.pathname);
    setOpen(false);
  };

  const getSubtitle = (campus) => {
    if (campus.province) return campus.province;
    if (/central/i.test(campus.name || '')) return 'Sede Principal · Buenos Aires';
    if (/apostoles/i.test(campus.name || '')) return 'Misiones';
    if (/heras/i.test(campus.name || '')) return 'Santa Cruz';
    return 'Extensión IEA';
  };

  return (
    <div className={`campus-switcher-container ${compact ? 'compact' : ''}`} ref={containerRef}>
      <button
        type="button"
        className={`campus-switcher-btn ${open ? 'active' : ''} ${compact ? 'compact-btn' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Cambiar campus activo"
        title="Cambiar campus"
      >
        <div className="campus-switcher-btn-left">
          <Building2 size={compact ? 13 : 15} className="campus-icon-accent" />
          <div className="campus-btn-labels">
            {!compact && <span className="campus-btn-eyebrow">Campus</span>}
            <strong className="campus-btn-name">{activeCampus?.name || 'Sede Central'}</strong>
          </div>
        </div>
        <div className="campus-switcher-btn-right">
          {!compact && hasRole(['Admin', 'Pastor']) && (
            <span className="campus-btn-pill">Cambiar</span>
          )}
          <ChevronDown size={14} className={`campus-chevron ${open ? 'rotated' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="campus-popover" role="menu">
          <div className="campus-popover-header">
            <div>
              <span className="campus-popover-title">Campus y Extensiones IEA</span>
              <p className="campus-popover-desc">
                Seleccioná una sede para consultar sus miembros, grupos y dashboard.
              </p>
            </div>
          </div>

          <div className="campus-popover-list">
            {campuses.map((campus) => {
              const isSelected = campus.id === activeCampusId;
              const slug = getCampusSlug(campus);
              return (
                <button
                  type="button"
                  key={campus.id}
                  className={`campus-option-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelect(campus)}
                  role="menuitem"
                >
                  <div className="campus-option-info">
                    <div className="campus-option-title-row">
                      <span className="campus-option-name">{campus.name}</span>
                      {isSelected && (
                        <span className="campus-active-badge">
                          <Check size={12} strokeWidth={2.5} /> Activo
                        </span>
                      )}
                    </div>
                    <div className="campus-option-sub-row">
                      <span className="campus-option-province">{getSubtitle(campus)}</span>
                      <span className="campus-option-slug">/{slug}/dashboard</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="campus-popover-footer">
            <button
              type="button"
              className="campus-footer-action"
              onClick={() => {
                setOpen(false);
                window.location.href = `/${getCampusSlug(activeCampus)}/dashboard`;
              }}
            >
              <span>Ir al Dashboard de {activeCampus?.name || 'este campus'}</span>
              <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
