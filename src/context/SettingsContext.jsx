import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  return useContext(SettingsContext);
}

const hexToRgba = (hex) => {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const rgbaToHsl = ({ r, g, b }) => {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = (gn - bn) / d + (gn < bn ? 6 : 0); break;
      case gn: h = (bn - rn) / d + 2; break;
      default: h = (rn - gn) / d + 4;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

export const applyPrimaryColor = (hex) => {
  const rgba = hexToRgba(hex);
  if (!rgba) return;
  const { h, s, l } = rgbaToHsl(rgba);
  const root = document.documentElement;
  root.style.setProperty('--color-primary-h', h);
  root.style.setProperty('--color-primary-s', `${s}%`);
  root.style.setProperty('--color-primary-l', `${l}%`);
  root.style.setProperty('--color-primary', hex);
  root.style.setProperty('--color-primary-rgb', `${rgba.r}, ${rgba.g}, ${rgba.b}`);
  root.style.setProperty('--color-primary-light', `hsl(${h}, ${Math.min(s + 15, 95)}%, ${Math.min(l + 35, 90)}%)`);
};

const applyTheme = (theme) => {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  try { localStorage.setItem('portal-iea-theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
};

const initialSettings = {
  theme: {
    primaryColor: '#1e293b',  /* Slate 800 */
    secondaryColor: '#64748b', /* Slate 500 */
  },
  roles: {
    Admin: 'Administrador',
    Pastor: 'Pastor',
    MinistryLeader: 'Líder de ministerio',
    Member: 'Miembro',
    Facilitator: 'Facilitador',
    CoFacilitator: 'Co-facilitador'
  },
  modules: {
    finances: true,
    news: true,
    live: true
  },
  followUpTypes: [
    { id: 'note', label: 'Nota' },
    { id: 'contact', label: 'Contacto' },
    { id: 'visit', label: 'Visita' },
    { id: 'call', label: 'Llamada' },
    { id: 'email', label: 'Email' },
    { id: 'other', label: 'Otro' }
  ],
  absenceReasons: [
    'Salud',
    'Laboral',
    'Estudios',
    'Actividad de la Iglesia',
    'Otros'
  ],
  rolePermissions: {
    Admin: ['miembros', 'eventos', 'crecimiento', 'noticias', 'transmisiones', 'finanzas', 'grupos', 'configuracion'],
    Pastor: ['miembros', 'eventos', 'crecimiento', 'noticias', 'transmisiones', 'finanzas', 'grupos'],
    MinistryLeader: ['miembros', 'eventos', 'crecimiento', 'noticias'],
    Facilitator: ['miembros', 'eventos', 'crecimiento'],
    CoFacilitator: ['miembros', 'crecimiento'],
    Member: ['dashboard']
  }
};

export function SettingsProvider({ children }) {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setSettings(prev => ({ ...prev, ...data }));
          if (data.theme?.primaryColor) {
            applyPrimaryColor(data.theme.primaryColor);
          }
        }
      } catch (error) {
        console.error("Error loading settings", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  useEffect(() => {
    const uid = currentUser?.uid;
    if (!uid) return;
    let mounted = true;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', uid));
        const prefs = snap.exists() && snap.data()?.preferences;
        if (!mounted) return;
        setUserPreferences(prefs || {});
        if (prefs?.theme) {
          applyTheme(prefs.theme);
        } else {
          applyTheme(localStorage.getItem('portal-iea-theme') === 'dark' ? 'dark' : 'light');
        }
        if (prefs?.primaryColor) {
          applyPrimaryColor(prefs.primaryColor);
        }
      } catch (error) {
        console.error('Error loading user preferences', error);
      }
    })();

    return () => { mounted = false; };
  }, [currentUser?.uid]);

  const updateUserPreference = async (patch) => {
    const next = { ...(userPreferences || {}), ...patch };
    setUserPreferences(next);
    if (patch.theme !== undefined) applyTheme(patch.theme);
    if (patch.primaryColor !== undefined) applyPrimaryColor(patch.primaryColor);
    if (currentUser?.uid) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), { preferences: next }, { merge: true });
      } catch (e) {
        console.error("Error saving user preferences", e);
        throw e;
      }
    }
  };

  const updateSettings = async (newSettings) => {
    setSettings(newSettings);
    if (newSettings.theme?.primaryColor) {
      applyPrimaryColor(newSettings.theme.primaryColor);
    }
    try {
      await setDoc(doc(db, 'settings', 'general'), newSettings);
    } catch (e) {
      console.error("Error saving settings", e);
      throw e;
    }
  };

  const value = {
    settings,
    updateSettings,
    loading,
    userPreferences,
    updateUserPreference
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}