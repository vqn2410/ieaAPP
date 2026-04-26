import React from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from '../components/common/Logo';
import './Login.css'; // Reuse login styles for consistency

const SessionExpired = () => {
  const navigate = useNavigate();

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <div className="info-card animate-slide-up">
            <div className="info-card-text">
              <h4>Seguridad del Portal</h4>
              <p>Por tu seguridad, cerramos las sesiones inactivas para proteger tu información y la de la congregación.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container text-center animate-fade-in">
          <div className="login-logo-wrapper">
            <Logo size="large" variant="full" showText={false} />
          </div>

          <div className="login-greeting">
            <h2 style={{ fontSize: '2rem', color: 'var(--color-primary)' }}>Sesión Finalizada</h2>
            <p>Tu sesión ha expirado por inactividad.</p>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button 
              className="login-btn-primary" 
              onClick={() => navigate('/login')}
              style={{ padding: '1.25rem 2rem' }}
            >
              VOLVER AL INICIO
            </button>
          </div>
        </div>

        <div className="login-footer">
          <p className="login-copy">IEA PORTAL © 2026</p>
        </div>
      </div>
    </div>
  );
};

export default SessionExpired;
