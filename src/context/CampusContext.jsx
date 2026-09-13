import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCampuses, migrateLegacyRecordsToCampus } from '../services/campusService';
import { useAuth } from './AuthContext';

const CampusContext = createContext(null);
const STORAGE_KEY = 'portal-iea-active-campus';

export const useCampus = () => useContext(CampusContext);

export function CampusProvider({ children }) {
  const { userData, loading: authLoading, hasRole } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const [activeCampusId, setActiveCampusId] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [loading, setLoading] = useState(true);

  const isGlobal = hasRole(['Admin', 'Pastor']);
  const isCampusAdmin = hasRole(['CampusAdmin']);

  useEffect(() => {
    if (authLoading || !userData) return undefined;
    let mounted = true;
    setLoading(true);
    getCampuses()
      .then(async data => {
        if (!mounted) return;
        const central = data.find(campus => /central/i.test(campus.name || ''));
        if (isGlobal && central) {
          // La base histórica no tenía campusId: pertenece a Sede Central.
          // Se completa una sola vez; luego el servicio no encuentra legacy pendientes.
          await migrateLegacyRecordsToCampus(central.id).catch(error => console.error('Error migrando Sede Central:', error));
        }
        const allowedIds = Array.isArray(userData.campusIds) ? userData.campusIds : [];
        const visible = isGlobal ? data : data.filter(campus => allowedIds.includes(campus.id));
        setCampuses(visible.filter(campus => campus.active !== false));
        setActiveCampusId(previous => {
          if (visible.some(campus => campus.id === previous && campus.active !== false)) return previous;
          const fallback = userData.defaultCampusId && visible.some(campus => campus.id === userData.defaultCampusId)
            ? userData.defaultCampusId
            : visible[0]?.id || '';
          if (fallback) localStorage.setItem(STORAGE_KEY, fallback);
          return fallback;
        });
      })
      .catch(error => console.error('Error cargando campus:', error))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [authLoading, userData, isGlobal]);

  const activeCampus = useMemo(
    () => campuses.find(campus => campus.id === activeCampusId) || null,
    [campuses, activeCampusId]
  );

  const selectCampus = (campusId) => {
    if (!campuses.some(campus => campus.id === campusId)) return;
    localStorage.setItem(STORAGE_KEY, campusId);
    setActiveCampusId(campusId);
  };

  const value = {
    campuses,
    activeCampus,
    activeCampusId,
    selectCampus,
    isGlobal,
    isCampusAdmin,
    loading: authLoading || loading,
  };

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}
