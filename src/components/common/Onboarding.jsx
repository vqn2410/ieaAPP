import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, LayoutDashboard, Users, MessageSquare, Sparkles, Clock, HelpCircle } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import './Onboarding.css';

const steps = [
  {
    icon: LayoutDashboard,
    title: '¡Bienvenido al Portal IEA!',
    description: 'Tu espacio para gestionar la vida de la congregación: miembros, grupos, eventos, asistencia y mucho más, en un solo lugar.',
  },
  {
    icon: Users,
    title: 'Miembros y Grupos',
    description: 'Administrá las fichas de cada miembro, asignalos a grupos de amistad y seguí su camino de crecimiento con un par de clics.',
  },
  {
    icon: MessageSquare,
    title: 'Herramientas de liderazgo',
    description: 'Tomá asistencia con rachas y estadísticas, registrá seguimientos, anotaciones por categorías y evaluá la salud de tus grupos con la Rueda de Vida.',
  },
  {
    icon: Sparkles,
    title: 'Enfoque y asistencia inteligente',
    description: 'Usá el temporizador de oración para tus momentos de devoción, personalizá los colores de tu app y consultá al Asistente IA cuando lo necesites.',
  },
];

const Onboarding = ({ open: controlledOpen, onClose }) => {
  const { userPreferences, updateUserPreference } = useSettings();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  const isManual = controlledOpen !== undefined;

  useEffect(() => {
    if (isManual) {
      setVisible(controlledOpen);
      setStep(0);
      return;
    }
    if (userPreferences === null) return;
    if (!userPreferences.onboardingDone && !visible) {
      setVisible(true);
      setStep(0);
    }
  }, [userPreferences, isManual, controlledOpen, visible]);

  const finish = async () => {
    setVisible(false);
    if (!isManual) {
      try { await updateUserPreference({ onboardingDone: true }); } catch { /* ignore */ }
    }
    onClose?.();
  };

  if (!visible) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Guía de bienvenida">
      <div className="onboarding-card">
        <div className="onboarding-icon-wrap">
          <Icon size={34} strokeWidth={1.5} />
        </div>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-desc">{current.description}</p>

        <div className="onboarding-dots">
          {steps.map((_, i) => (
            <span key={i} className={`onboarding-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>

        <p className="onboarding-counter">{step + 1} / {steps.length}</p>

        <div className="onboarding-actions">
          <button className="btn btn-outline" onClick={finish}>
            {isManual ? 'Cerrar' : 'Omitir'}
          </button>
          {step < steps.length - 1 ? (
            <button className="btn btn-primary" onClick={() => setStep(s => s + 1)}>
              Siguiente
            </button>
          ) : (
            <button className="btn btn-primary" onClick={finish} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              <Check size={16} /> ¡Empezar!
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export const HelpButton = ({ style }) => {
  const { updateUserPreference } = useSettings();
  return (
    <button
      className="btn btn-outline btn-sm"
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', ...style }}
      onClick={() => updateUserPreference({ onboardingDone: false })}
      title="Ver guía de bienvenida"
    >
      <HelpCircle size={15} />
      Ayuda
    </button>
  );
};

export default Onboarding;