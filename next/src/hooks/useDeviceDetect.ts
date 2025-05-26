import { useState, useEffect } from 'react';

/**
 * Hook to detect if the current device is mobile
 * @returns {Object} Object with isMobile boolean
 */
export default function useDeviceDetect() {
  // Initialize with a more conservative approach - assume desktop first
  const [isMobile, setIsMobile] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Mark that we're on the client side
    setIsClient(true);

    const handleResize = () => {
      const width = window.innerWidth;
      const isMobileDevice = width < 768;

      // Also check user agent for mobile devices
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

      // Consider it mobile if either width is small OR it's a mobile user agent
      setIsMobile(isMobileDevice || isMobileUserAgent);
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

  return { isMobile: isClient ? isMobile : false };
}
