import React, { useState } from 'react';
import { ShieldCheck, ChevronDown, ChevronUp, ExternalLink, Shield } from 'lucide-react';
import './PrivacyConsentNotice.css';

const CONSENT_STORAGE_KEY = 'iea-privacy-consent';

export default function PrivacyConsentNotice() {
  const [visible, setVisible] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_STORAGE_KEY) !== 'accepted';
    } catch {
      return true;
    }
  });
  const [expanded, setExpanded] = useState(false);

  const handleAccept = () => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    } catch { /* ignore */ }
    setVisible(false);
  };

  const handleReject = () => {
    try {
      localStorage.removeItem(CONSENT_STORAGE_KEY);
      const cookies = document.cookie ? document.cookie.split(';') : [];
      cookies.forEach(c => {
        const eqPos = c.indexOf('=');
        const name = eqPos > -1 ? c.substring(0, eqPos).trim() : c.trim();
        if (name) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
        }
      });
    } catch { /* ignore */ }
    // En caso de rechazar, recargar la página y volver a solicitar
    window.location.reload();
  };

  if (!visible) return null;

  return (
    <div
      className="privacy-notice-wrap"
      role="region"
      aria-label="Aviso de privacidad y consentimiento"
      aria-live="polite"
    >
      <div className="privacy-notice-content">
        <div className="privacy-notice-header">
          <div className="privacy-notice-title">
            <Shield className="privacy-notice-icon" size={22} />
            <span>Configuración de Privacidad y Consentimiento</span>
          </div>
          <button
            type="button"
            className="privacy-notice-expand-btn"
            onClick={() => setExpanded(prev => !prev)}
            aria-expanded={expanded}
            aria-label={expanded ? 'Ocultar detalles' : 'Ver detalles'}
          >
            <span>{expanded ? 'Ocultar detalles' : 'Ver detalles'}</span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        <p className="privacy-notice-text">
          Utilizamos almacenamiento local y datos técnicos esenciales para garantizar la seguridad, autenticación y personalización de tu experiencia. Podés aceptar su uso o rechazarlo.
        </p>

        {expanded && (
          <div className="privacy-notice-details animate-fade-in">
            <div className="privacy-notice-group">
              <div className="privacy-notice-heading">
                <ShieldCheck size={16} className="privacy-notice-check" />
                <strong>Datos Técnicos y Esenciales (Obligatorios)</strong>
              </div>
              <p>
                Permiten la autenticación segura mediante Firebase, la gestión de sesiones de usuario y la persistencia de tus preferencias visuales (modo oscuro y tema de color). Sin ellos la plataforma no puede funcionar correctamente.
              </p>
            </div>

            <div className="privacy-notice-group">
              <div className="privacy-notice-heading">
                <ExternalLink size={16} className="privacy-notice-check" />
                <strong>Servicios de Terceros y Multimedia</strong>
              </div>
              <p>
                El sitio puede integrar mapas de Google Maps y reproductores de video de YouTube para transmitir cultos y reuniones. Estos servicios de terceros pueden almacenar identificadores conforme a sus propias políticas de privacidad.
              </p>
            </div>

            <div className="privacy-notice-legal">
              <span>
                Tus datos son tratados de conformidad con la Ley N° 25.326 de Protección de Datos Personales (República Argentina).
              </span>
            </div>
          </div>
        )}

        <div className="privacy-notice-actions">
          <button
            type="button"
            className="btn-privacy-reject"
            onClick={handleReject}
          >
            Rechazar
          </button>
          <button
            type="button"
            className="btn-privacy-accept"
            onClick={handleAccept}
          >
            Aceptar todas
          </button>
        </div>
      </div>
    </div>
  );
}
