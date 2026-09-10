import React, { useEffect, useRef, useState } from 'react';
import Card from '../components/common/Card';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import './FocusTimer.css';

const PRESETS = [5, 10, 15, 25, 45, 60];

const formatTime = (totalSeconds) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const playNote = (freq, start, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    playNote(523.25, 0, 0.6);
    playNote(659.25, 0.35, 0.6);
    playNote(783.99, 0.7, 0.9);
  } catch { /* ignore */ }
};

const FocusTimer = () => {
  const [minutes, setMinutes] = useState(15);
  const [totalSeconds, setTotalSeconds] = useState(15 * 60);
  const [remaining, setRemaining] = useState(15 * 60);
  const [running, setRunning] = useState(false);
  const [sessionTitle, setSessionTitle] = useState('');
  const [finished, setFinished] = useState(false);
  const intervalRef = useRef(null);

  const startTimer = () => {
    if (remaining === 0) {
      setRemaining(totalSeconds);
    }
    setRunning(true);
    setFinished(false);
  };

  const pauseTimer = () => setRunning(false);

  const resetTimer = () => {
    setRunning(false);
    setRemaining(totalSeconds);
    setFinished(false);
  };

  const selectPreset = (mins) => {
    setRunning(false);
    setMinutes(mins);
    setTotalSeconds(mins * 60);
    setRemaining(mins * 60);
    setFinished(false);
  };

  const setCustomMinutes = (mins) => {
    const value = Math.max(1, Math.min(180, Math.round(Number(mins) || 0)));
    setMinutes(value);
    setTotalSeconds(value * 60);
    setRemaining(value * 60);
    setFinished(false);
  };

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          setFinished(true);
          playChime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const R = 120;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="focus-page">
      <div className="focus-header">
        <h1>Temporizador de enfoque</h1>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          Momentos de oración, devoción y concentración sin distracciones.
        </p>
      </div>

      <div className="focus-layout">
        <Card className="focus-main">
          <div className="focus-title-input">
            <input
              className="form-input"
              placeholder="¿Qué vas a hacer? (opcional)"
              value={sessionTitle}
              onChange={e => setSessionTitle(e.target.value)}
              maxLength={60}
            />
          </div>

          <div className="focus-ring-wrap">
            <svg className="focus-ring" viewBox="0 0 280 280">
              <circle cx="140" cy="140" r={R} fill="none" strokeWidth="14" style={{ stroke: 'var(--color-surface-hover)' }} />
              <circle
                cx="140" cy="140" r={R} fill="none"
                strokeWidth="14"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
                transform="rotate(-90 140 140)"
                style={{ transition: 'stroke-dashoffset 1s linear', stroke: 'var(--color-primary)' }}
              />
            </svg>
            <div className="focus-time-display">
              <div className="focus-time">{formatTime(remaining)}</div>
              <div className="focus-time-label">{running ? 'En curso' : finished ? '¡Tiempo completo!' : 'Preparado'}</div>
            </div>
          </div>

          {finished && sessionTitle && (
            <div className="focus-finished-msg">
              ¡Completaste tu sesión "{sessionTitle}"! Bien hecho.
            </div>
          )}

          <div className="focus-controls">
            {!running ? (
              <button className="focus-btn focus-btn-primary" onClick={startTimer}>
                <Play size={20} /> {remaining > 0 && remaining < totalSeconds ? 'Reanudar' : 'Comenzar'}
              </button>
            ) : (
              <button className="focus-btn" onClick={pauseTimer}>
                <Pause size={20} /> Pausar
              </button>
            )}
            <button className="focus-btn" onClick={resetTimer}>
              <RotateCcw size={18} /> Reiniciar
            </button>
          </div>
        </Card>

        <div className="focus-side">
          <Card>
            <div className="focus-preset-title">
              <Clock size={16} />
              <span>Duración</span>
            </div>
            <div className="focus-presets">
              {PRESETS.map(mins => (
                <button
                  key={mins}
                  className={`focus-preset ${minutes === mins && !finished ? 'active' : ''}`}
                  onClick={() => selectPreset(mins)}
                >
                  {mins} min
                </button>
              ))}
            </div>
            <div className="form-group mt-3">
              <label className="form-label">Duración personalizada</label>
              <input
                type="number"
                min="1"
                max="180"
                className="form-input"
                value={minutes}
                onChange={e => setCustomMinutes(e.target.value)}
              />
            </div>
            <p className="focus-tip">
              Consejo: comenzá con sesiones cortas de 5–10 minutos y aumentá de a poco tu constancia, como en el gimnasio.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;