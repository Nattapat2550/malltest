import { useEffect, useState } from 'react';
import api from '../services/api';

export const useServerWakeup = () => {
  const [serverReady, setServerReady] = useState(false);
  const [wakingUp, setWakingUp] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const wakeUpServers = async () => {
      try {
        await api.get('/api/homepage');
        if (isMounted) setServerReady(true);
      } catch (error: unknown) {
        if (!isMounted) return;
        setWakingUp(true);
        
        // Type-safe error checking
        const err = error as { response?: { status?: number } };
        const isRateLimited = err.response && err.response.status === 429;
        const retryDelay = isRateLimited ? 10000 : 5000;
        
        setTimeout(wakeUpServers, retryDelay);
      }
    };
    
    wakeUpServers();
    return () => { isMounted = false; };
  }, []);

  return { serverReady, wakingUp };
};