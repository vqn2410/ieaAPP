import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

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

  function hasRole(allowedRoles) {
    if (!userData || !userData.role) return false;
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
            let data = docSnap.data();
            // Automatically grant Admin to this specific email
            if (user.email === 'vergaranicolas209@gmail.com' && data.role !== 'Admin') {
              data.role = 'Admin';
              await setDoc(docRef, { ...data, role: 'Admin' }, { merge: true });
            }
            setUserData(data);
          } else {
            // Document doesn't exist yet, create it and give admin if it's the target email
            const defaultRole = user.email === 'vergaranicolas209@gmail.com' ? 'Admin' : 'Miembro';
            const newData = { role: defaultRole, email: user.email, name: user.displayName || 'Usuario', createdAt: new Date() };
            await setDoc(docRef, newData);
            setUserData(newData);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData({ role: 'Miembro' });
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
    hasRole,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
