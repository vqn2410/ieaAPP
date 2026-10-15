import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Instagram, Facebook, Youtube, Twitter } from 'lucide-react';
import Logo from '../../components/common/Logo';
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
      const messages = {
        'auth/user-not-found': 'No existe una cuenta con ese email.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-credential': 'Email o contraseña incorrectos.',
        'auth/invalid-email': 'El formato del email no es válido.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
      };
      setError(messages[err.code] || 'Error al iniciar sesión. Revisa tus credenciales.');
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
      const messages = {
        'auth/user-not-found': 'No existe una cuenta con ese email.',
        'auth/invalid-email': 'El formato del email no es válido.',
      };
      setError(messages[err.code] || 'Error al enviar el correo. Verifica que el email sea correcto.');
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
              <h2>¡Hola de nuevo!</h2>
              <p>Bienvenido a Portal IEA</p>
            </div>
          )}

          {error && (
            <div className="alert alert-danger mb-4 login-alert" role="alert" aria-live="assertive">
              {error}
            </div>
          )}

          {showReset ? (
            <div className="animate-fade-in">
              <div className="login-greeting">
                <h2>Recuperar Clave</h2>
                <button
                  type="button"
                  className="login-back-link"
                  onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}
                >
                  Volver al inicio de sesión
                </button>
              </div>

              <form onSubmit={handleResetSubmit}>
                {resetSent ? (
                  <div className="alert alert-success login-alert" role="status" aria-live="polite">
                    ¡Correo enviado! Revisa tu bandeja de entrada para continuar.
                  </div>
                ) : (
                  <>
                    <div className="login-field">
                      <label htmlFor="reset-email">Correo Electrónico</label>
                      <div className="login-input-wrapper">
                        <input
                          className="login-input"
                          type="email"
                          id="reset-email"
                          autoComplete="email"
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
                    autoComplete="email"
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
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="input-icon-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
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
          <a href="https://instagram.com/iea_escalada" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Instagram"><Instagram size={20} /></a>
          <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="Facebook"><Facebook size={20} /></a>
          <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="X (Twitter)"><Twitter size={20} /></a>
          <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="social-icon" aria-label="YouTube"><Youtube size={20} /></a>
        </div>

        <div className="login-footer">
          <p className="login-copy">PORTAL IEA © 2026</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
