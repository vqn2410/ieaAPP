import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';

const SettingsContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  return useContext(SettingsContext);
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_PALETTE_COLORS = [
  { id: 'ember', name: 'Ember', value: '#ea6a2a', isPreset: true },
  { id: 'sage', name: 'Sage', value: '#2d6a4f', isPreset: true },
  { id: 'obsidian', name: 'Obsidian', value: '#1e293b', isPreset: true },
  { id: 'blue', name: 'Azul', value: '#2563eb', isPreset: true },
  { id: 'sky', name: 'Celeste', value: '#0ea5e9', isPreset: true },
  { id: 'emerald', name: 'Esmeralda', value: '#059669', isPreset: true },
  { id: 'amber', name: 'Ámbar', value: '#d97706', isPreset: true },
  { id: 'rose', name: 'Rosa', value: '#db2777', isPreset: true },
  { id: 'red', name: 'Rojo', value: '#dc2626', isPreset: true },
];

const hexToRgba = (hex) => {
  let h = String(hex || '').replace('#', '').trim();
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
  if (!hex) return false;
  const clean = String(hex).toLowerCase().replace('#', '').trim();
  return clean === '000000' || clean === '0b0b0b' || clean === '141414' || clean === '151515' || clean === '111827' || clean === '1c1917';
};

// eslint-disable-next-line react-refresh/only-export-components
export const applyPrimaryColor = (hex) => {
  if (hex) {
    lastPrimaryColor = hex;
    try { localStorage.setItem('portal-iea-primary-color', hex); } catch { /* ignore */ }
  }
  const activeColor = hex || lastPrimaryColor || localStorage.getItem('portal-iea-primary-color') || '#ea6a2a';
  const isDark = document.documentElement.dataset.theme === 'dark';
  const root = document.documentElement;

  const baseRgba = hexToRgba(activeColor);
  if (!baseRgba) return;
  const baseHsl = rgbaToHsl(baseRgba);

  // En modo oscuro, si el color configurado es muy oscuro/negro, ajustar luminosidad para contraste
  let targetHex = activeColor;
  if (isDark && isNearBlack(activeColor)) {
    targetHex = '#e7e5e4';
  }

  const rgba = hexToRgba(targetHex) || baseRgba;
  const { h, s, l } = rgbaToHsl(rgba);

  let effectiveL = l;
  if (isDark && !isNearBlack(activeColor) && targetHex !== '#e7e5e4') {
    effectiveL = Math.max(l, 46);
  }

  const lum = (0.299 * rgba.r + 0.587 * rgba.g + 0.114 * rgba.b) / 255;
  const onPrimary = (lum > 0.64 || effectiveL > 68) ? '#111111' : '#ffffff';

  const primaryValue = (isDark && effectiveL !== l && targetHex !== '#e7e5e4')
    ? `hsl(${h}, ${s}%, ${effectiveL}%)`
    : targetHex;

  const softColor = `hsl(${baseHsl.h}, ${Math.min(baseHsl.s + 10, 95)}%, ${Math.min(baseHsl.l + 14, 78)}%)`;
  const deepColor = `hsl(${baseHsl.h}, ${Math.min(baseHsl.s + 5, 95)}%, ${Math.max(baseHsl.l - 12, 12)}%)`;
  const midColor = `hsl(${baseHsl.h}, ${baseHsl.s}%, ${Math.max(baseHsl.l - 3, 18)}%)`;

  root.style.setProperty('--color-primary-h', h);
  root.style.setProperty('--color-primary-s', `${s}%`);
  root.style.setProperty('--color-primary-l', `${effectiveL}%`);
  root.style.setProperty('--color-primary', primaryValue);
  root.style.setProperty('--color-primary-rgb', `${rgba.r}, ${rgba.g}, ${rgba.b}`);
  root.style.setProperty(
    '--color-primary-light',
    `hsl(${h}, ${Math.min(s + 15, 95)}%, ${Math.min(effectiveL + 22, 88)}%)`
  );
  root.style.setProperty('--color-on-primary', onPrimary);

  // Sincronizar variables V15 en todo el portal y Dashboard
  root.style.setProperty('--v15-accent', primaryValue);
  root.style.setProperty('--v15-accent-soft', softColor);
  root.style.setProperty('--v15-accent-contrast', onPrimary);
  root.style.setProperty(
    '--v15-accent-surface',
    `linear-gradient(155deg, ${softColor} 0%, ${midColor} 58%, ${deepColor} 100%)`
  );
};

const applyTheme = (theme) => {
  const isDark = theme === 'dark';
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  try { localStorage.setItem('portal-iea-theme', isDark ? 'dark' : 'light'); } catch { /* ignore */ }
  applyPrimaryColor(lastPrimaryColor);
};

const loadStoredCustomColors = () => {
  try {
    const raw = localStorage.getItem('portal-iea-custom-palette');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const initialSettings = {
  theme: {
    primaryColor: '#ea6a2a',
    secondaryColor: '#64748b',
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
  const [userPreferences, setUserPreferences] = useState(() => ({
    customColors: loadStoredCustomColors(),
    primaryColor: localStorage.getItem('portal-iea-primary-color') || undefined,
  }));

  // Aplicar color guardado inicialmente al montar
  useEffect(() => {
    const storedColor = localStorage.getItem('portal-iea-primary-color');
    if (storedColor) {
      applyPrimaryColor(storedColor);
    }
  }, []);

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
          if (data.theme?.primaryColor && !lastPrimaryColor) {
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
        const prefs = (snap.exists() && snap.data()?.preferences) || {};
        if (!mounted) return;
        const mergedCustom = Array.isArray(prefs.customColors) && prefs.customColors.length > 0
          ? prefs.customColors
          : loadStoredCustomColors();
        try {
          localStorage.setItem('portal-iea-custom-palette', JSON.stringify(mergedCustom));
        } catch { /* ignore */ }

        setUserPreferences({ ...prefs, customColors: mergedCustom });

        if (prefs.theme) {
          applyTheme(prefs.theme);
        } else {
          applyTheme(localStorage.getItem('portal-iea-theme') === 'dark' ? 'dark' : 'light');
        }
        if (prefs.primaryColor) {
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
    if (patch.customColors !== undefined) {
      try {
        localStorage.setItem('portal-iea-custom-palette', JSON.stringify(patch.customColors));
      } catch { /* ignore */ }
    }
    if (currentUser?.uid) {
      try {
        await setDoc(doc(db, 'users', currentUser.uid), { preferences: next }, { merge: true });
      } catch (e) {
        console.error("Error saving user preferences", e);
      }
    }
  }, [userPreferences, currentUser?.uid]);

  const addCustomColor = useCallback(async (hexValue, customName = '') => {
    const normalized = String(hexValue || '').trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/i.test(normalized)) return null;

    const existingCustom = Array.isArray(userPreferences?.customColors)
      ? userPreferences.customColors
      : loadStoredCustomColors();

    const alreadyInPresets = DEFAULT_PALETTE_COLORS.some(c => c.value.toLowerCase() === normalized);
    const alreadyInCustom = existingCustom.some(c => c.value.toLowerCase() === normalized);

    let updatedCustom = existingCustom;
    if (!alreadyInPresets && !alreadyInCustom) {
      const newEntry = {
        id: `custom-${Date.now()}`,
        name: customName.trim() || `Personal ${existingCustom.length + 1}`,
        value: normalized,
        isCustom: true,
      };
      updatedCustom = [...existingCustom, newEntry];
    } else if (alreadyInCustom && customName.trim()) {
      updatedCustom = existingCustom.map(c =>
        c.value.toLowerCase() === normalized ? { ...c, name: customName.trim() } : c
      );
    }

    await updateUserPreference({
      customColors: updatedCustom,
      primaryColor: normalized,
    });
    return normalized;
  }, [userPreferences?.customColors, updateUserPreference]);

  const removeCustomColor = useCallback(async (colorIdOrValue) => {
    const existingCustom = Array.isArray(userPreferences?.customColors)
      ? userPreferences.customColors
      : loadStoredCustomColors();
    const updatedCustom = existingCustom.filter(
      c => c.id !== colorIdOrValue && c.value.toLowerCase() !== String(colorIdOrValue).toLowerCase()
    );
    const patch = { customColors: updatedCustom };
    if (
      userPreferences?.primaryColor &&
      !updatedCustom.some(c => c.value.toLowerCase() === userPreferences.primaryColor.toLowerCase()) &&
      !DEFAULT_PALETTE_COLORS.some(c => c.value.toLowerCase() === userPreferences.primaryColor.toLowerCase())
    ) {
      patch.primaryColor = settings?.theme?.primaryColor || '#ea6a2a';
    }
    await updateUserPreference(patch);
  }, [userPreferences?.customColors, userPreferences?.primaryColor, settings?.theme?.primaryColor, updateUserPreference]);

  const updateSettings = useCallback(async (newSettings) => {
    setSettings(newSettings);
    if (newSettings.theme?.primaryColor && !userPreferences?.primaryColor) {
      applyPrimaryColor(newSettings.theme.primaryColor);
    }
    try {
      await setDoc(doc(db, 'settings', 'general'), newSettings);
    } catch (e) {
      console.error("Error saving settings", e);
      throw e;
    }
  }, [userPreferences?.primaryColor]);

  const customColors = useMemo(
    () => (Array.isArray(userPreferences?.customColors) ? userPreferences.customColors : []),
    [userPreferences?.customColors]
  );

  const personalPalette = useMemo(
    () => [...DEFAULT_PALETTE_COLORS, ...customColors],
    [customColors]
  );

  const activePrimaryColor = (
    userPreferences?.primaryColor ||
    settings?.theme?.primaryColor ||
    '#ea6a2a'
  ).toLowerCase();

  const value = useMemo(() => ({
    settings,
    updateSettings,
    loading,
    userPreferences,
    updateUserPreference,
    personalPalette,
    customColors,
    activePrimaryColor,
    addCustomColor,
    removeCustomColor,
  }), [
    settings,
    updateSettings,
    loading,
    userPreferences,
    updateUserPreference,
    personalPalette,
    customColors,
    activePrimaryColor,
    addCustomColor,
    removeCustomColor,
  ]);

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
