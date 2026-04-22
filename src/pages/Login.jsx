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
    <div className="login-container">
      <header className="login-header">
        <Logo size="large" variant="full" />
      </header>

      <Card className="animate-fade-in login-card">
        <h2 className="login-card-title">INICIAR SESIÓN</h2>
        
        {error && <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>{error}</div>}
        
        {showReset ? (
          <form onSubmit={handleResetSubmit}>
             <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
                Ingresa tu correo electrónico y te enviaremos un link para restablecer tu contraseña.
             </p>
             {resetSent ? (
               <div className="alert alert-success">
                  ¡Correo enviado! Revisa tu bandeja de entrada y sigue el enlace.
               </div>
             ) : (
               <>
                 <div className="form-group mb-4">
                    <label className="form-label login-form-label">Correo Electrónico</label>
                    <input 
                      className="form-input"
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      required
                    />
                 </div>
                 <Button type="submit" className="login-submit-btn" disabled={loading}>
                    {loading ? 'ENVIANDO...' : 'ENVIAR LINK DE RECUPERACIÓN'}
                 </Button>
               </>
             )}
             <button 
               type="button" 
               className="btn-text" 
               style={{ width: '100%', marginTop: '1.5rem', color: 'var(--color-primary)' }}
               onClick={() => { setShowReset(false); setResetSent(false); setError(''); }}
             >
                Volver al Inicio de Sesión
             </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label login-form-label" htmlFor="email">Correo Electrónico</label>
              <input 
                className="form-input"
                type="email" 
                id="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@iglesia.com"
              />
            </div>
            
            <div className="form-group">
              <div className="d-flex justify-between align-center">
                <label className="form-label login-form-label" htmlFor="password">Contraseña</label>
              </div>
              <input 
                className="form-input"
                type="password" 
                id="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            
            <Button 
              type="submit" 
              className="login-submit-btn mb-2"
              disabled={loading}
              style={{ marginTop: '1.5rem' }}
            >
              {loading ? 'INGRESANDO...' : 'INGRESAR'}
            </Button>

            <div style={{ marginTop: '2rem', textAlign: 'center', borderTop: '1px solid var(--color-border)', paddingTop: '1.5rem' }}>
               <button 
                 type="button" 
                 className="btn-text"
                 style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.9rem' }}
                 onClick={() => setShowReset(true)}
               >
                 ¿Problemas para ingresar? Restablecer contraseña
               </button>
            </div>
          </form>
        )}
      </Card>
      
      <p className="login-footer-text">
        IGLESIA EXTREMO AMOR © 2026
      </p>
    </div>
  );
};

export default Login;
