import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './components/common/Toast';
import { CampusProvider } from './context/CampusContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { Capacitor } from '@capacitor/core';

const canUseBrowserServiceWorker = 'serviceWorker' in navigator && !Capacitor.isNativePlatform();

if (canUseBrowserServiceWorker && import.meta.env.PROD) {
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
    .then(registration => registration.update())
    .catch(error => console.warn('Service worker no disponible:', error));
} else if (canUseBrowserServiceWorker) {
  // A production SW can cache Vite's HMR client and break localhost reloads.
  navigator.serviceWorker.getRegistrations()
    .then(registrations => Promise.all(registrations.map(registration => registration.unregister())))
    .catch(error => console.warn('No se pudo limpiar el service worker de desarrollo:', error));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <CampusProvider>
          <ToastProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </ToastProvider>
        </CampusProvider>
      </SettingsProvider>
    </AuthProvider>
  </React.StrictMode>,
);
