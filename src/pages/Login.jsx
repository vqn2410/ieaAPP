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
      navigate('/');
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
      navigate('/');
    } catch (err) {
      setError('Error al iniciar sesión. Revisa tus credenciales.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex align-center justify-center flex-column" style={{ minHeight: '100vh', backgroundColor: 'var(--color-primary)' }}>
      <div className="text-center mb-4 d-flex justify-center flex-column align-center" style={{ color: 'white', alignItems: 'center' }}>
        <img 
          src="https://i.postimg.cc/0jscK4Jr/LOGO_IEA_SIN_FONDO_B_W_2.png" 
          alt="Logo IEA" 
          style={{ width: '180px', marginBottom: '0.5rem' }} 
        />
        <p>Plataforma administrativa y comunitaria</p>
      </div>

      <Card className="animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 className="text-center mb-4">Iniciar Sesión</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Correo Electrónico</label>
            <input 
              className="form-input"
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@iglesia.com"
            />
          </div>
          
          <div className="form-group mb-4">
            <label className="form-label" htmlFor="password">Contraseña</label>
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
            variant="primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>

          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Button 
              type="button" 
              variant="outline" 
              style={{ width: '100%' }}
              disabled={loading}
              onClick={handleSetup}
            >
              Inicializar Base de Datos y Admin
            </Button>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>
              Haz clic aquí por única vez para crear la cuenta admin@iglesia.com (admin1234) y configurar la base de datos de manera automática.
            </p>
          </div>
        </form>
      </Card>
      
      <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '2rem', fontSize: '0.875rem' }}>
        Desarrollado para facilitar la vida en comunidad
      </p>
    </div>
  );
};

export default Login;
