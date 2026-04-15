import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

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
      const userCred = await createUserWithEmailAndPassword(auth, 'admin@iglesia.com', 'admin1234');
      
      // 2. Set Admin Data
      await setDoc(doc(db, 'users', userCred.user.uid), {
        name: 'Administrador Principal',
        role: 'Admin',
        email: 'admin@iglesia.com',
        createdAt: new Date()
      });

      // 3. Set Global Settings config
      await setDoc(doc(db, 'settings', 'general'), {
        theme: { primaryColor: '#111111', secondaryColor: '#4b5563' },
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
    <div className="d-flex align-center justify-center flex-column" style={{ 
      minHeight: '100vh', 
      backgroundColor: '#000000', 
      fontFamily: "'Outfit', sans-serif",
      '--color-text': '#ffffff'
    }}>
      <div className="text-center mb-5 d-flex justify-center flex-column align-center" style={{ color: 'white', alignItems: 'center' }}>
        <img 
          src="https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png" 
          alt="Logo IEA" 
          style={{ width: '150px', marginBottom: '1rem', filter: 'brightness(0) invert(1)' }} 
        />
        <h1 style={{ fontWeight: 900, letterSpacing: '-1px', marginBottom: '0.5rem' }}>IEA APP</h1>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', letterSpacing: '1px' }}>PLATAORMA ADMINISTRATIVA</p>
      </div>

      <Card className="animate-fade-in" style={{ 
        width: '100%', 
        maxWidth: '400px', 
        backgroundColor: '#111111', 
        border: '1px solid rgba(255,255,255,0.1)',
        padding: '2.5rem'
      }}>
        <h2 className="text-center mb-4" style={{ color: '#ffffff' }}>INICIAR SESIÓN</h2>
        
        {error && <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email" style={{ color: '#94a3b8' }}>Correo Electrónico</label>
            <input 
              className="form-input"
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@iglesia.com"
              style={{ backgroundColor: '#000000', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }}
            />
          </div>
          
          <div className="form-group mb-4">
            <label className="form-label" htmlFor="password" style={{ color: '#94a3b8' }}>Contraseña</label>
            <input 
              className="form-input"
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ backgroundColor: '#000000', border: '1px solid rgba(255,255,255,0.2)', color: '#ffffff' }}
            />
          </div>
          
          <Button 
            type="submit" 
            style={{ width: '100%', background: '#ffffff', color: '#000000', fontWeight: 800, borderRadius: '4px' }}
            disabled={loading}
          >
            {loading ? 'INGRESANDO...' : 'INGRESAR'}
          </Button>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <Button 
              type="button" 
              variant="outline" 
              style={{ width: '100%', borderColor: 'rgba(255,255,255,0.2)', color: '#94a3b8', fontSize: '0.75rem' }}
              disabled={loading}
              onClick={handleSetup}
            >
              INICIALIZAR SISTEMA (ADMIN)
            </Button>
          </div>
        </form>
      </Card>
      
      <p style={{ color: '#475569', marginTop: '3rem', fontSize: '0.75rem', letterSpacing: '2px' }}>
        IGLESIA EXTREMO AMOR © 2026
      </p>
    </div>
  );
};

export default Login;
