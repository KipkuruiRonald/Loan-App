'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';

interface MaintenanceContextType {
  isInMaintenance: boolean;
  message: string;
  endTime: string | null;
}

const MaintenanceContext = createContext<MaintenanceContextType>({
  isInMaintenance: false,
  message: '',
  endTime: null,
});

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MaintenanceContextType>({
    isInMaintenance: false,
    message: '',
    endTime: null,
  });
  
  const isCheckingRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    let isMounted = true;
    
    const checkStatus = async () => {
      // Prevent concurrent checks
      if (isCheckingRef.current) return;
      
      isCheckingRef.current = true;
      
      try {
        const res = await fetch('http://localhost:8000/api/admin/maintenance/status');
        const data = await res.json();
        
        if (isMounted) {
          setStatus({
            isInMaintenance: data.enabled || false,
            message: data.message || '',
            endTime: data.end_time || null,
          });
          
          // Handle redirect only once when enabled
          if (data.enabled && 
              !window.location.pathname.startsWith('/admin') && 
              !window.location.pathname.includes('/maintenance')) {
            console.log('[Maintenance] Redirecting to maintenance page');
            window.location.replace('/maintenance');
          }
        }
      } catch (err) {
        console.error('[Maintenance] Failed to check status:', err);
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Initial check
    checkStatus();
    
    // Check every 30 seconds
    intervalRef.current = setInterval(checkStatus, 30000);

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return (
    <MaintenanceContext.Provider value={status}>
      {children}
    </MaintenanceContext.Provider>
  );
}

export const useMaintenance = () => useContext(MaintenanceContext);
