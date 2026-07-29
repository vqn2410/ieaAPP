import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}

// Roles: Admin, Pastor, Líder de ministerio, Miembro, Facilitador, Co-facilitador
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  function hasRole(allowedRoles) {
    if (!userData || !userData.role) return false;
    if (Array.isArray(userData.role)) {
       return allowedRoles.some(r => userData.role.includes(r));
    }
    return allowedRoles.includes(userData.role);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Fetch custom user data from Firestore
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          } else {
            // Document doesn't exist yet, check for pre-assignment by email
            const preDocRef = doc(db, 'users', `pre-${user.email.toLowerCase()}`);
            const preDocSnap = await getDoc(preDocRef);
            
            let finalAuthData;

            if (preDocSnap.exists()) {
              const preData = preDocSnap.data();
              finalAuthData = { 
                role: preData.role || ['Member'], 
                email: user.email.toLowerCase(), 
                name: preData.name || user.displayName || 'Usuario', 
                createdAt: new Date() 
              };
              // Migrate and delete pre-assignment
              await setDoc(docRef, finalAuthData);
              // Safely delete pre-doc if needed - using setDoc instead of deleteDoc if preferred but delete is better
              await setDoc(preDocRef, { migratedTo: user.uid, migratedAt: new Date() }, { merge: true });
            } else {
              // No pre-assignment, create standard Member
              finalAuthData = { 
                role: ['Member'],
                email: user.email.toLowerCase(), 
                name: user.displayName || 'Usuario', 
                createdAt: new Date() 
              };
              await setDoc(docRef, finalAuthData);
            }
            
            setUserData(finalAuthData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({ role: ['Member'] });
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    login,
    logout,
    resetPassword,
    hasRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
