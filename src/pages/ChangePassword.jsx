import React, { useState } from 'react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { useAuth } from '../context/AuthContext';
import { updatePassword } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck, AlertCircle } from 'lucide-react';

const ChangePassword = () => {
  const { currentUser, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.');
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden.');

    setLoading(true);
    setError('');
    try {
      // 1. Update Password in Firebase Auth
      await updatePassword(currentUser, newPassword);
      
      // 2. Update flag in Firestore
      await updateDoc(doc(db, 'users', currentUser.uid), {
        needsPasswordChange: false
      });

      alert('¡Contraseña actualizada con éxito!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Por seguridad, debes cerrar sesión e ingresar nuevamente para cambiar tu clave.');
      } else {
        setError('Error al actualizar: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-center align-center" style={{ minHeight: '70vh' }}>
      <Card title={
          <div className="d-flex align-center gap-2">
            <Lock size={20} color="var(--color-primary)" /> ACTUALIZAR CONTRASEÑA
          </div>
      } style={{ maxWidth: '400px', width: '100%' }}>
        <div className="alert alert-warning mb-4" style={{ fontSize: '0.85rem', background: '#fffbeb', border: '1px solid #fde68a', padding: '1rem', borderRadius: '8px' }}>
            <div className="d-flex gap-2">
                <ShieldCheck size={18} color="#b45309" />
                <span>Por seguridad, es obligatorio cambiar tu clave inicial antes de continuar.</span>
            </div>
        </div>

        {error && (
            <div className="alert alert-danger mb-4" style={{ fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {error}
            </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nueva Contraseña</label>
            <input 
              className="form-input" 
              type="password" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Confirmar Contraseña</label>
            <input 
              className="form-input" 
              type="password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite la contraseña"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'ACTUALIZANDO...' : 'GUARDAR Y CONTINUAR'}
          </Button>
          
          <button 
            type="button" 
            onClick={() => logout()} 
            style={{ width: '100%', marginTop: '1rem', background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            Cerrar sesión
          </button>
        </form>
      </Card>
    </div>
  );
};

export default ChangePassword;
