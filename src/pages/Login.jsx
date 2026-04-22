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
  
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSetup() {
    try {
      setLoading(true);
      setError('');
      // 1. Create Admin User
      const userCred = await createUserWithEmailAndPassword(auth, 'admin@iglesia.com', 'Cambia2410@');
      
      // 2. Set Admin Data
      await setDoc(doc(db, 'users', userCred.user.uid), {
        name: 'Administrador Principal',
        role: 'Admin',
        email: 'admin@iglesia.com',
        createdAt: new Date()
      });

      // 3. Set Global Settings config
      await setDoc(doc(db, 'settings', 'general'), {
        theme: { primaryColor: '#1e293b', secondaryColor: '#64748b' },
        roles: {
          Admin: 'Administrador', Pastor: 'Pastor', MinistryLeader: 'Líder de ministerio',
          Member: 'Miembro', Facilitator: 'Facilitador', CoFacilitator: 'Co-facilitador'
        },
        modules: { finances: true, news: true, live: true }
      });
      
      // 4. Create one dummy member in members collection
      await setDoc(doc(db, 'members', 'dummy-member'), {
        firstName: 'Juan', lastName: 'Pérez', dni: '30123456',
        phone: '+5491112345678', email: 'juan@ejemplo.com',
        growthPath: ['Bautizado', 'IETE'], group: 'Cimientos',
        createdAt: new Date()
      });

      // Navigate to dashboard automatically
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/email-already-in-use') {
        setError('El sistema ya está inicializado. Inicia sesión directamente.');
      } else {
        setError('Error al crear la BD: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <div className="login-container">
      <header className="login-header">
        <Logo size="large" variant="full" />
      </header>

      <Card className="animate-fade-in login-card">
        <h2 className="login-card-title">INICIAR SESIÓN</h2>
        
        {error && <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>{error}</div>}
        
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
          
          <div className="form-group mb-4">
            <label className="form-label login-form-label" htmlFor="password">Contraseña</label>
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
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
          </Button>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Button 
              type="button" 
              variant="outline" 
              className="login-setup-btn"
              disabled={loading}
              onClick={handleSetup}
            >
              INICIALIZAR SISTEMA (ADMIN)
            </Button>
          </div>
        </form>
      </Card>
      
      <p className="login-footer-text">
        IGLESIA EXTREMO AMOR © 2026
      </p>
    </div>
  );
};

export default Login;
