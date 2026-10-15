import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { buildUserDataFromPreAssignment } from '../utils/authHelpers';

const AuthContext = createContext();
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

// Roles: Admin, Pastor, Líder de ministerio, Miembro, Facilitador, Co-facilitador
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback((email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(() => {
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
        // Fetch custom user data from Firestore
        try {
          const docRef = doc(db, 'users', user.uid);
          const normalizedEmail = user.email?.trim().toLowerCase();
          let memberSnap = { empty: true, docs: [] };
          try {
            if (normalizedEmail) {
              memberSnap = await getDocs(query(collection(db, 'members'), where('email', '==', normalizedEmail)));
            }
          } catch (error) {
            console.warn('No se pudo sincronizar la ficha del miembro:', error.message);
          }
          const memberRoles = Array.isArray(memberSnap.docs[0]?.data()?.role)
            ? memberSnap.docs[0].data().role
            : [memberSnap.docs[0]?.data()?.role];
          const ownMemberDoc = memberSnap.docs[0];
          if (ownMemberDoc && ownMemberDoc.data().authUid !== user.uid) {
            await updateDoc(doc(db, 'members', ownMemberDoc.id), { authUid: user.uid, updatedAt: new Date() });
          }
          const hasAssignedGroup = memberRoles.some(role => ['Facilitator', 'CoFacilitator'].includes(role));
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const storedData = docSnap.data();
            storedData.email = storedData.email || user.email?.toLowerCase() || '';
            storedData.name = storedData.name || user.displayName || user.email?.split('@')[0] || 'Usuario';
            storedData.role = storedData.role || ['Member'];
            const preDocRef = doc(db, 'users', `pre-${user.email.toLowerCase()}`);
            const preDocSnap = await getDoc(preDocRef);
            const storedRoles = Array.isArray(storedData.role) ? storedData.role : [storedData.role];
            const hasCampusAssignment = Array.isArray(storedData.campusIds) && storedData.campusIds.length > 0;

            if (hasAssignedGroup && storedRoles.includes('Member')) {
              const rolePatch = { role: ['Facilitator'] };
              await updateDoc(docRef, rolePatch);
              Object.assign(storedData, rolePatch);
            }

            // Complete pre-assignments created before the current migration flow.
            if (
              preDocSnap.exists()
              && preDocSnap.data().isPending === true
              && !storedData.preAssignmentAppliedAt
              && (!hasCampusAssignment || storedRoles.includes('Member'))
            ) {
              const assignment = buildUserDataFromPreAssignment(preDocSnap.data(), user.email, user.displayName);
              const assignmentPatch = {
                role: assignment.role,
                campusIds: assignment.campusIds,
                defaultCampusId: assignment.defaultCampusId,
                preAssignmentAppliedAt: new Date(),
              };
              await updateDoc(docRef, assignmentPatch);
              Object.assign(storedData, assignmentPatch);
            }

            // Corrige documentos antiguos que conservaron el flag activo
            // después de haber registrado una fecha de cambio.
            if (storedData.needsPasswordChange === true && storedData.lastPasswordChange) {
              await updateDoc(docRef, { needsPasswordChange: false });
              storedData.needsPasswordChange = false;
            }
            setUserData(storedData);
          } else {
            // Document doesn't exist yet, check for pre-assignment by email
            const preDocRef = doc(db, 'users', `pre-${user.email.toLowerCase()}`);
            const preDocSnap = await getDoc(preDocRef);
            
            let finalAuthData;

            if (preDocSnap.exists()) {
              const preData = preDocSnap.data();
              finalAuthData = buildUserDataFromPreAssignment(preData, user.email, user.displayName);
              finalAuthData.preAssignmentAppliedAt = new Date();
              // Create the user's own document from the read-only pre-assignment.
              await setDoc(docRef, finalAuthData);
            } else {
              // No pre-assignment, create standard Member
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
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({
            role: ['Member'],
            email: user.email?.toLowerCase() || '',
            name: user.displayName || user.email?.split('@')[0] || 'Usuario',
          });
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
