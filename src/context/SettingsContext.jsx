import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SettingsContext = createContext();

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState({
    theme: {
      primaryColor: '#111111',  /* Black */
      secondaryColor: '#4b5563', /* Dark Gray */
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
    }
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, this would fetch from Firestore 'settings/general'
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...docSnap.data() }));
          // Apply dynamic colors to document root if needed
          const data = docSnap.data();
          if (data.theme?.primaryColor) {
            document.documentElement.style.setProperty('--color-primary', data.theme.primaryColor);
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

  const updateSettings = async (newSettings) => {
    // Update local and remote settings
    setSettings(newSettings);
    // Apply dynamic colors to document root right away
    if (newSettings.theme?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', newSettings.theme.primaryColor);
    }
    // Write to Firestore
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
    loading
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
