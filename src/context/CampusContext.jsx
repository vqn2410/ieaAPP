import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getCampuses, migrateLegacyRecordsToCampus } from '../services/campusService';
import { getGroupsByFacilitatorUid } from '../services/groupService';
import { useAuth } from './AuthContext';

const CampusContext = createContext(null);
const STORAGE_KEY = 'portal-iea-active-campus';

// eslint-disable-next-line react-refresh/only-export-components
export const useCampus = () => useContext(CampusContext);

export function CampusProvider({ children }) {
  const { currentUser, userData, loading: authLoading, hasRole } = useAuth();
  const [campuses, setCampuses] = useState([]);
  const [activeCampusId, setActiveCampusId] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [loading, setLoading] = useState(true);

  const isGlobal = hasRole(['Admin', 'Pastor']);
  const isCampusAdmin = hasRole(['CampusAdmin']);
  const isFacilitator = hasRole(['Facilitator', 'CoFacilitator']);

  useEffect(() => {
    if (authLoading || !userData) return undefined;
    let mounted = true;
    // Sincronización deliberada con la carga asíncrona de campus.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      getCampuses(),
      isFacilitator && currentUser?.uid
        ? getGroupsByFacilitatorUid(currentUser.uid).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(async ([data, assignedGroups]) => {
        if (!mounted) return;
        const central = data.find(campus => /central/i.test(campus.name || ''));
        if (isGlobal && central) {
          // La base histórica no tenía campusId: pertenece a Sede Central.
          // Se completa una sola vez; luego el servicio no encuentra legacy pendientes.
          await migrateLegacyRecordsToCampus(central.id).catch(error => console.error('Error migrando Sede Central:', error));
        }
        const assignedCampusIds = assignedGroups.map(group => group.campusId).filter(Boolean);
        const allowedIds = [...new Set([
          ...(Array.isArray(userData.campusIds) ? userData.campusIds : []),
          ...assignedCampusIds,
        ])];
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
  }, [authLoading, currentUser?.uid, userData, isGlobal, isFacilitator]);

  const activeCampus = useMemo(
    () => campuses.find(campus => campus.id === activeCampusId) || null,
    [campuses, activeCampusId]
  );

  const selectCampus = useCallback((campusId) => {
    if (!campuses.some(campus => campus.id === campusId)) return;
    localStorage.setItem(STORAGE_KEY, campusId);
    setActiveCampusId(campusId);
  }, [campuses]);

  const value = useMemo(() => ({
    campuses,
    activeCampus,
    activeCampusId,
    selectCampus,
    isGlobal,
    isCampusAdmin,
    loading: authLoading || loading,
  }), [campuses, activeCampus, activeCampusId, selectCampus, isGlobal, isCampusAdmin, authLoading, loading]);

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}
