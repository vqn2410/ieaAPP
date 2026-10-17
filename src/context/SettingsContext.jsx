import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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

let lastPrimaryColor = null;

const isNearBlack = (hex) => {
  if (!hex) return true;
  const clean = String(hex).toLowerCase().replace('#', '').trim();
  return clean === '000000' || clean === '0b0b0b' || clean === '141414' || clean === '151515' || clean === '111827';
};

// eslint-disable-next-line react-refresh/only-export-components
export const applyPrimaryColor = (hex) => {
  if (hex) lastPrimaryColor = hex;
  const activeColor = hex || lastPrimaryColor;
  const isDark = document.documentElement.dataset.theme === 'dark';
  const root = document.documentElement;

  if (!activeColor) {
    if (isDark) {
      root.style.removeProperty('--color-primary');
      root.style.removeProperty('--color-primary-rgb');
      root.style.removeProperty('--color-primary-light');
      root.style.removeProperty('--color-primary-h');
      root.style.removeProperty('--color-primary-s');
      root.style.removeProperty('--color-primary-l');
      root.style.removeProperty('--color-on-primary');
    }
    return;
  }

  // En modo oscuro, si el color configurado es el negro por defecto, invertir a blanco
  let targetHex = activeColor;
  if (isDark && isNearBlack(activeColor)) {
    targetHex = '#ffffff';
  }

  const rgba = hexToRgba(targetHex);
  if (!rgba) return;

  const { h, s, l } = rgbaToHsl(rgba);

  // En modo oscuro, asegurar que la luminosidad permita contraste contra fondos oscuros
  let effectiveL = l;
  if (isDark && !isNearBlack(activeColor) && targetHex !== '#ffffff') {
    // Si es un color muy oscuro (como Slate #1e293b), elevar l para visibilidad
    effectiveL = Math.max(l, 40);
  }

  const lum = (0.299 * rgba.r + 0.587 * rgba.g + 0.114 * rgba.b) / 255;
  const onPrimary = (lum > 0.62 || effectiveL > 65) ? '#000000' : '#ffffff';

  root.style.setProperty('--color-primary-h', h);
  root.style.setProperty('--color-primary-s', `${s}%`);
  root.style.setProperty('--color-primary-l', `${effectiveL}%`);

  const primaryValue = (isDark && effectiveL !== l && targetHex !== '#ffffff')
    ? `hsl(${h}, ${s}%, ${effectiveL}%)`
    : targetHex;

  root.style.setProperty('--color-primary', primaryValue);
  root.style.setProperty('--color-primary-rgb', `${rgba.r}, ${rgba.g}, ${rgba.b}`);
  root.style.setProperty(
    '--color-primary-light',
    `hsl(${h}, ${Math.min(s + 15, 95)}%, ${Math.min(effectiveL + 25, 90)}%)`
  );
  root.style.setProperty('--color-on-primary', onPrimary);
};

const applyTheme = (theme) => {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  try { localStorage.setItem('portal-iea-theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  applyPrimaryColor(lastPrimaryColor);
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
    AreaLeader: 'Encargado de área',
    Member: 'Miembro',
    Facilitator: 'Facilitador',
    CoFacilitator: 'Co-facilitador',
    CampusAdmin: 'Encargado de campus',
    Maestro: 'Maestro'
  },
  modules: {
    finances: true,
    news: true,
    live: true
  },
  serviceAreas: ['IEA Fem', 'IEA Alfa', 'IEA Kids', 'IEA Worships', 'Mantenimiento', 'Cafetería', 'Consolidación', 'Multimedia', 'Creativa'],
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
    Admin: ['miembros', 'eventos', 'crecimiento', 'kids', 'ibrp', 'noticias', 'transmisiones', 'finanzas', 'grupos', 'configuracion'],
    Pastor: ['miembros', 'eventos', 'crecimiento', 'kids', 'ibrp', 'noticias', 'transmisiones', 'finanzas', 'grupos', 'configuracion'],
    MinistryLeader: ['miembros', 'eventos', 'crecimiento', 'kids', 'ibrp', 'noticias', 'configuracion'],
    Facilitator: ['miembros', 'eventos', 'crecimiento', 'configuracion'],
    CoFacilitator: ['miembros', 'crecimiento', 'configuracion'],
    CampusAdmin: ['miembros', 'grupos', 'crecimiento', 'visitantes', 'notas', 'configuracion'],
    AreaLeader: ['ibrp', 'configuracion'],
    Maestro: ['kids', 'configuracion'],
    Member: ['dashboard', 'configuracion']
  }
};

export function SettingsProvider({ children }) {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState(initialSettings);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return undefined;
    }

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
  }, [currentUser]);

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

  const updateUserPreference = useCallback(async (patch) => {
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
  }, [userPreferences, currentUser?.uid]);

  const updateSettings = useCallback(async (newSettings) => {
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
  }, []);

  const value = useMemo(() => ({
    settings,
    updateSettings,
    loading,
    userPreferences,
    updateUserPreference
  }), [settings, updateSettings, loading, userPreferences, updateUserPreference]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
