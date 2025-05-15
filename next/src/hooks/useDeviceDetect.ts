import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current device is mobile
 * @returns {Object} Object with isMobile boolean
 */
export default function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    if (typeof window !== 'undefined') {
      handleResize();
    }
    
    // Add listener
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return { isMobile };
}
