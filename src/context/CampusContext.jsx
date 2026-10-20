import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getCampuses, getCampusSlug, matchesCampusSlug, migrateLegacyRecordsToCampus } from '../services/campusService';
import { getAssignedGroups } from '../services/assignedGroupService';
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
        ? getAssignedGroups().then(result => result.groups || []).catch(() => [])
        : Promise.resolve([]),
    ])
      .then(async ([data, assignedGroups]) => {
        if (!mounted) return;
        const central = data.find(campus => /central/i.test(campus.name || '') || campus.slug === 'sedecentral');
        if (isGlobal && central && !central.id?.includes('seed')) {
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
        const activeList = visible.filter(campus => campus.active !== false);
        setCampuses(activeList);

        setActiveCampusId(previous => {
          if (activeList.some(campus => campus.id === previous)) return previous;
          // Por defecto pastores y admin tendrán sede central
          const fallback = isGlobal && central
            ? central.id
            : (userData.defaultCampusId && activeList.some(campus => campus.id === userData.defaultCampusId)
              ? userData.defaultCampusId
              : (central?.id || activeList[0]?.id || ''));
          if (fallback) localStorage.setItem(STORAGE_KEY, fallback);
          return fallback;
        });
      })
      .catch(error => console.error('Error cargando campus:', error))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, [authLoading, currentUser?.uid, userData, isGlobal, isFacilitator]);

  const activeCampus = useMemo(
    () => campuses.find(campus => campus.id === activeCampusId) || campuses.find(c => /central/i.test(c.name || '')) || campuses[0] || null,
    [campuses, activeCampusId]
  );

  const activeCampusSlug = useMemo(
    () => (activeCampus ? getCampusSlug(activeCampus) : 'sedecentral'),
    [activeCampus]
  );

  const selectCampus = useCallback((campusId) => {
    const target = campuses.find(campus => campus.id === campusId);
    if (!target) return;
    localStorage.setItem(STORAGE_KEY, campusId);
    setActiveCampusId(campusId);
  }, [campuses]);

  const selectCampusBySlug = useCallback((slug) => {
    if (!slug || campuses.length === 0) return;
    const found = campuses.find(c => matchesCampusSlug(c, slug));
    if (found && found.id !== activeCampusId) {
      localStorage.setItem(STORAGE_KEY, found.id);
      setActiveCampusId(found.id);
    }
  }, [campuses, activeCampusId]);

  const switchCampus = useCallback((campusId, navigate, currentPathname = '') => {
    const target = campuses.find(c => c.id === campusId);
    if (!target) return;
    localStorage.setItem(STORAGE_KEY, target.id);
    setActiveCampusId(target.id);

    const newSlug = getCampusSlug(target);
    const pathname = currentPathname || (typeof window !== 'undefined' ? window.location.pathname : '');
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const parts = pathname.split('/').filter(Boolean);
    let targetPath = `/${newSlug}/dashboard${search}`;

    if (parts.length > 0) {
      const isCurrentSlug = campuses.some(c => matchesCampusSlug(c, parts[0])) || parts[0] === 'dashboard';
      if (isCurrentSlug) {
        if (parts[0] === 'dashboard') {
          parts.unshift(newSlug);
        } else {
          parts[0] = newSlug;
        }
        targetPath = '/' + parts.join('/') + search;
      }
    }

    if (typeof window !== 'undefined') {
      window.location.href = targetPath;
    } else if (typeof navigate === 'function') {
      navigate(targetPath);
    }
  }, [campuses]);

  const value = useMemo(() => ({
    campuses,
    activeCampus,
    activeCampusId,
    activeCampusSlug,
    selectCampus,
    selectCampusBySlug,
    switchCampus,
    getCampusSlug,
    matchesCampusSlug,
    isGlobal,
    isCampusAdmin,
    loading: authLoading || loading,
  }), [campuses, activeCampus, activeCampusId, activeCampusSlug, selectCampus, selectCampusBySlug, switchCampus, isGlobal, isCampusAdmin, authLoading, loading]);

  return <CampusContext.Provider value={value}>{children}</CampusContext.Provider>;
}
