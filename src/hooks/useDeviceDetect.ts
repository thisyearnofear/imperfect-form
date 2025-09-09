import { useState, useEffect } from 'react';

/**
 * Enhanced device detection that properly handles wallet browser contexts
 * @returns {Object} Object with device detection information
 */
export default function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(false);
  const [isWalletBrowser, setIsWalletBrowser] = useState(false);
  const [walletBrowserType, setWalletBrowserType] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    const detectDevice = () => {
      if (typeof window === 'undefined') return;

      const userAgent = navigator.userAgent.toLowerCase();
      const width = window.innerWidth;
      const height = window.innerHeight;

      // Enhanced wallet browser detection
      const walletBrowserPatterns = {
        metamask: /metamask/i,
        coinbase: /coinbasewallet|coinbase/i,
        trust: /trust/i,
        rainbow: /rainbow/i,
        phantom: /phantom/i,
        walletconnect: /walletconnect/i,
        imtoken: /imtoken/i,
        tokenpocket: /tokenpocket/i,
        safepal: /safepal/i,
        mathwallet: /mathwallet/i,
        binance: /binancewallet/i,
        okx: /okx/i,
        bitget: /bitget/i,
        // Generic wallet browser indicators
        dapp: /dapp/i,
        web3: /web3/i,
      };

      // Check for wallet browser
      let detectedWalletType: string | null = null;
      let isInWalletBrowser = false;

      for (const [walletName, pattern] of Object.entries(walletBrowserPatterns)) {
        if (pattern.test(userAgent)) {
          detectedWalletType = walletName;
          isInWalletBrowser = true;
          break;
        }
      }

      // Additional wallet browser detection methods - but be more conservative
      if (!isInWalletBrowser) {
        // Check for injected wallet objects
        const hasEthereum = typeof window.ethereum !== 'undefined';

        // Only consider it a wallet browser if we're actually IN a mobile browser context
        // Desktop browser extensions should NOT be considered wallet browsers
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent
        );
        const isMobileViewport = width < 768;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isLikelyMobile = isMobileUA || (isMobileViewport && isTouchDevice);

        // Check for specific wallet properties ONLY on mobile-like devices
        if (hasEthereum && isLikelyMobile) {
          const ethereum = window.ethereum as typeof window.ethereum & {
            isMetaMask?: boolean;
            isCoinbaseWallet?: boolean;
            isTrust?: boolean;
            isRainbow?: boolean;
            selectedProvider?: {
              isCoinbaseWallet?: boolean;
            };
          };
          if (ethereum.isMetaMask) {
            detectedWalletType = 'metamask';
            isInWalletBrowser = true;
          } else if (ethereum.isCoinbaseWallet || ethereum.selectedProvider?.isCoinbaseWallet) {
            detectedWalletType = 'coinbase';
            isInWalletBrowser = true;
          } else if (ethereum.isTrust) {
            detectedWalletType = 'trust';
            isInWalletBrowser = true;
          } else if (ethereum.isRainbow) {
            detectedWalletType = 'rainbow';
            isInWalletBrowser = true;
          } else if (hasEthereum) {
            // Generic wallet browser detection only on mobile
            detectedWalletType = 'unknown_wallet';
            isInWalletBrowser = true;
          }
        }
      }

      // Enhanced mobile detection
      const mobileUserAgentPatterns = [
        /android/i,
        /webos/i,
        /iphone/i,
        /ipad/i,
        /ipod/i,
        /blackberry/i,
        /iemobile/i,
        /opera mini/i,
        /mobile/i,
        /tablet/i,
      ];

      const isMobileUserAgent = mobileUserAgentPatterns.some((pattern) => pattern.test(userAgent));

      // Consider mobile if:
      // 1. User agent indicates mobile
      // 2. Viewport is mobile-sized AND touch device
      // 3. In a wallet browser (wallet browsers are primarily mobile)
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileViewport = width < 768;

      const deviceIsMobile =
        isMobileUserAgent || (isMobileViewport && isTouchDevice) || isInWalletBrowser;

      // Update state
      setIsMobile(deviceIsMobile);
      setIsWalletBrowser(isInWalletBrowser);
      setWalletBrowserType(detectedWalletType);

      // Debug logging for wallet browser detection - only log significant changes
      if (process.env.NODE_ENV === 'development') {
        // Only log if there are actual changes or first detection
        const shouldLog =
          !('deviceDetectLastLog' in window) ||
          (window as Window & { deviceDetectLastLog?: string }).deviceDetectLastLog !==
            `${deviceIsMobile}-${isInWalletBrowser}-${detectedWalletType}`;

        if (shouldLog) {
          console.log('Device Detection:', {
            isMobile: deviceIsMobile,
            isWalletBrowser: isInWalletBrowser,
            walletType: detectedWalletType,
            userAgent: userAgent.substring(0, 100) + '...',
            viewport: { width, height },
            hasEthereum: typeof window.ethereum !== 'undefined',
            touchDevice: isTouchDevice,
          });
          (window as Window & { deviceDetectLastLog?: string }).deviceDetectLastLog =
            `${deviceIsMobile}-${isInWalletBrowser}-${detectedWalletType}`;
        }
      }
    };

    // Initial detection
    detectDevice();

    // Listen for resize events
    window.addEventListener('resize', detectDevice);

    // Listen for orientation changes (mobile specific)
    window.addEventListener('orientationchange', () => {
      // Small delay to ensure viewport has updated
      setTimeout(detectDevice, 100);
    });

    return () => {
      window.removeEventListener('resize', detectDevice);
      window.removeEventListener('orientationchange', detectDevice);
    };
  }, []);

  return {
    isMobile: isClient ? isMobile : false,
    isWalletBrowser: isClient ? isWalletBrowser : false,
    walletBrowserType: isClient ? walletBrowserType : null,
    isClient,
  };
}
