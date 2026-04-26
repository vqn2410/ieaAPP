import React, { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const InactivityTimer = ({ children }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const timerRef = useRef(null);
  
  // 30 minutes in milliseconds
  const INACTIVITY_LIMIT = 30 * 60 * 1000; 

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (currentUser && !['/login', '/session-expired', '/'].includes(location.pathname)) {
      timerRef.current = setTimeout(handleInactivity, INACTIVITY_LIMIT);
    }
  };

  const handleInactivity = async () => {
    try {
      await logout();
      navigate('/session-expired');
    } catch (error) {
      console.error("Error logging out after inactivity:", error);
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const activityHandler = () => resetTimer();

    if (currentUser) {
      events.forEach(event => window.addEventListener(event, activityHandler));
      resetTimer();
    }

    return () => {
      events.forEach(event => window.removeEventListener(event, activityHandler));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentUser, location.pathname]);

  return <>{children}</>;
};

export default InactivityTimer;
