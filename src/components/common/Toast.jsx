import React, { useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { ToastContext } from './toastContext';

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: { bg: '#f0fdf4', border: '#22c55e', text: '#166534' },
  error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
  info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div style={{
        position: 'fixed', top: '1rem', right: '1rem', zIndex: 99999,
        display: 'flex', flexDirection: 'column', gap: '0.5rem', maxWidth: '400px',
      }}>
        {toasts.map(toast => {
          const Icon = icons[toast.type] || icons.info;
          const color = colors[toast.type] || colors.info;
          return (
            <div key={toast.id} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: '8px',
              backgroundColor: color.bg, border: `1px solid ${color.border}`,
              color: color.text, fontSize: '0.875rem', fontWeight: 500,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              animation: 'slideInRight 0.3s ease-out',
            }}>
              <Icon size={20} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} style={{
                border: 'none', background: 'none', cursor: 'pointer', padding: '2px',
                color: color.text, opacity: 0.6,
              }}>
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
