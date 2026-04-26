import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import Logo from '../components/common/Logo';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      return setError('Completa todos los campos');
    }

    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSubmit(e) {
    e.preventDefault();
    if (!email) return setError('Ingresa tu correo');
    try {
      setLoading(true);
      setError('');
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError('Error al enviar el correo. Verifica que el email sea correcto.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-left-content">
          <div className="info-card animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="info-card-text">
              <h4>Bienvenido a tu Portal</h4>
              <p>Accede a toda la información y herramientas que necesitas en un solo lugar.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="login-logo-wrapper">
            <Logo size="large" variant="full" showText={false} />
          </div>

          {!showReset && (
            <div className="login-greeting animate-fade-in">
              <h2>¡Hola de nuevo! 👋</h2>
              <p>Bienvenido al Portal IEA</p>
            </div>
          )}

          {error && <div className="alert alert-danger mb-4" style={{ borderRadius: '12px' }}>{error}</div>}

          {showReset ? (
            <div className="animate-fade-in">
              <div className="login-greeting">
                <h2>Recuperar Clave</h2>
                <p onClick={() => { setShowReset(false); setResetSent(false); setError(''); }} style={{ cursor: 'pointer', color: 'var(--color-primary)' }}>
                  Volver al inicio de sesión
                </p>
              </div>

              <form onSubmit={handleResetSubmit}>
                {resetSent ? (
                  <div className="alert alert-success" style={{ borderRadius: '12px' }}>
                    ¡Correo enviado! Revisa tu bandeja de entrada para continuar.
                  </div>
                ) : (
                  <>
                    <div className="login-field">
                      <label>Correo Electrónico</label>
                      <div className="login-input-wrapper">
                        <input 
                          className="login-input"
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="tu@email.com"
                          required
                        />
                      </div>
                    </div>
                    <button type="submit" className="login-btn-primary" disabled={loading}>
                      {loading ? 'ENVIANDO...' : 'ENVIAR INSTRUCCIONES'}
                    </button>
                  </>
                )}
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="animate-fade-in">
              <div className="login-field">
                <label htmlFor="email">Usuario o Email</label>
                <div className="login-input-wrapper">
                  <input 
                    className="login-input"
                    type="email" 
                    id="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@iglesia.com"
                    required
                  />
                </div>
              </div>
              
              <div className="login-field">
                <label htmlFor="password">Contraseña</label>
                <div className="login-input-wrapper">
                  <input 
                    className="login-input"
                    type={showPassword ? "text" : "password"} 
                    id="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button 
                    type="button" 
                    className="input-icon-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                className="login-btn-primary"
                disabled={loading}
              >
                {loading ? 'INGRESANDO...' : 'INGRESAR'}
              </button>

              <button 
                type="button" 
                className="login-recover-link"
                onClick={() => setShowReset(true)}
              >
                ¿Olvidaste tu usuario o clave?
              </button>
            </form>
          )}
        </div>

        <div className="social-links">
          <a href="#" className="social-icon"><i className="ri-instagram-line"></i></a>
          <a href="#" className="social-icon"><i className="ri-facebook-box-line"></i></a>
          <a href="#" className="social-icon"><i className="ri-twitter-x-line"></i></a>
        </div>

        <div className="login-footer">
          <p className="login-copy">IEA PORTAL © 2026</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
