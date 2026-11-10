import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { buildUserDataFromPreAssignment } from '../utils/authHelpers';

const AuthContext = createContext();
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const USER_CACHE_PREFIX = 'portal-iea-user-cache:';

const readCachedUserData = (uid) => {
  if (!uid || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${USER_CACHE_PREFIX}${uid}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const writeCachedUserData = (uid, data) => {
  if (!uid || !data || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(`${USER_CACHE_PREFIX}${uid}`, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors
  }
};

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

// Roles: Admin, Pastor, Líder de ministerio, Miembro, Facilitador, Co-facilitador
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem('portal-iea-login-announcements-pending', '1');
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('portal-iea-announcements-dismissed:')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch {
        // Ignore storage errors
      }
    }
    return credential;
  }, []);

  const logout = useCallback(() => {
    if (typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.removeItem('portal-iea-login-announcements-pending');
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith('portal-iea-announcements-dismissed:')) {
            sessionStorage.removeItem(key);
          }
        });
      } catch {
        // Ignore storage errors
      }
    }
    return signOut(auth);
  }, []);

  const resetPassword = useCallback((email) => {
    return sendPasswordResetEmail(auth, email);
  }, []);

  const hasRole = useCallback((allowedRoles) => {
    if (!userData || !userData.role) return false;
    if (Array.isArray(userData.role)) {
       return allowedRoles.some(r => userData.role.includes(r));
    }
    return allowedRoles.includes(userData.role);
  }, [userData]);

  useEffect(() => {
    const storedVersion = localStorage.getItem('app-version');
    const versionChanged = storedVersion && storedVersion !== APP_VERSION;

    if (versionChanged) {
      // Fuerza un nuevo inicio de sesión después de una actualización.
      sessionStorage.clear();
      signOut(auth).catch(error => console.error('Error cerrando sesión por actualización:', error));
    }
    localStorage.setItem('app-version', APP_VERSION);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Hidratar inmediatamente desde caché local para no bloquear la pantalla inicial
        const cachedProfile = readCachedUserData(user.uid);
        if (cachedProfile) {
          setUserData(cachedProfile);
          setLoading(false);
        }

        // Fetch custom user data from Firestore in parallel
        try {
          const docRef = doc(db, 'users', user.uid);
          const normalizedEmail = user.email?.trim().toLowerCase();

          const [docSnap, memberSnap] = await Promise.all([
            getDoc(docRef),
            normalizedEmail
              ? getDocs(query(collection(db, 'members'), where('email', '==', normalizedEmail))).catch((error) => {
                  console.warn('No se pudo sincronizar la ficha del miembro:', error.message);
                  return { empty: true, docs: [] };
                })
              : Promise.resolve({ empty: true, docs: [] }),
          ]);

          const memberRoles = Array.isArray(memberSnap.docs[0]?.data()?.role)
            ? memberSnap.docs[0].data().role
            : [memberSnap.docs[0]?.data()?.role];
          const ownMemberDoc = memberSnap.docs[0];
          if (ownMemberDoc && ownMemberDoc.data().authUid !== user.uid) {
            void updateDoc(doc(db, 'members', ownMemberDoc.id), { authUid: user.uid, updatedAt: new Date() }).catch((error) => {
              console.warn('No se pudo vincular la ficha con el UID:', error.message);
            });
          }
          const hasAssignedGroup = memberRoles.some(role => ['Facilitator', 'CoFacilitator'].includes(role));
          
          if (docSnap.exists()) {
            const storedData = docSnap.data();
            storedData.email = storedData.email || user.email?.toLowerCase() || '';
            storedData.name = storedData.name || user.displayName || user.email?.split('@')[0] || 'Usuario';
            storedData.role = storedData.role || ['Member'];

            const storedRoles = Array.isArray(storedData.role) ? storedData.role : [storedData.role];
            const hasCampusAssignment = Array.isArray(storedData.campusIds) && storedData.campusIds.length > 0;

            if (hasAssignedGroup && storedRoles.includes('Member')) {
              const rolePatch = { role: ['Facilitator'] };
              void updateDoc(docRef, rolePatch).catch(() => {});
              Object.assign(storedData, rolePatch);
            }

            // Solo consultar pre-asignación si el usuario aún no fue migrado
            if (!storedData.preAssignmentAppliedAt && (!hasCampusAssignment || storedRoles.includes('Member'))) {
              const preDocRef = doc(db, 'users', `pre-${user.email.toLowerCase()}`);
              let preData = null;
              try {
                const preDocSnap = await getDoc(preDocRef);
                if (preDocSnap.exists()) preData = preDocSnap.data();
              } catch (error) {
                console.warn('No se pudo consultar la pre-asignación:', error.message);
              }

              if (preData?.isPending === true) {
                const assignment = buildUserDataFromPreAssignment(preData, user.email, user.displayName);
                const assignmentPatch = {
                  role: assignment.role,
                  campusIds: assignment.campusIds,
                  defaultCampusId: assignment.defaultCampusId,
                  preAssignmentAppliedAt: new Date(),
                };
                void updateDoc(docRef, assignmentPatch).catch(() => {});
                Object.assign(storedData, assignmentPatch);
              }
            }

            // Corrige documentos antiguos que conservaron el flag activo
            // después de haber registrado una fecha de cambio.
            if (storedData.needsPasswordChange === true && storedData.lastPasswordChange) {
              void updateDoc(docRef, { needsPasswordChange: false }).catch(() => {});
              storedData.needsPasswordChange = false;
            }
            setUserData(storedData);
            writeCachedUserData(user.uid, storedData);
          } else {
            // Document doesn't exist yet, check for pre-assignment by email
            const preDocRef = doc(db, 'users', `pre-${user.email.toLowerCase()}`);
            const preDocSnap = await getDoc(preDocRef);
            
            let finalAuthData;

            if (preDocSnap.exists()) {
              const preData = preDocSnap.data();
              finalAuthData = buildUserDataFromPreAssignment(preData, user.email, user.displayName);
              finalAuthData.preAssignmentAppliedAt = new Date();
              await setDoc(docRef, finalAuthData);
            } else {
              finalAuthData = { 
                role: hasAssignedGroup ? ['Facilitator'] : ['Member'],
                email: user.email.toLowerCase(), 
                name: user.displayName || 'Usuario', 
                needsPasswordChange: true,
                createdAt: new Date() 
              };
              await setDoc(docRef, finalAuthData);
            }
            
            setUserData(finalAuthData);
            writeCachedUserData(user.uid, finalAuthData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          if (!cachedProfile) {
            setUserData({
              role: ['Member'],
              email: user.email?.toLowerCase() || '',
              name: user.displayName || user.email?.split('@')[0] || 'Usuario',
            });
          }
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = useMemo(() => ({
    currentUser,
    userData,
    login,
    logout,
    resetPassword,
    hasRole,
    loading
  }), [currentUser, userData, login, logout, resetPassword, hasRole, loading]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
