'use client';

import React, { useState, useEffect } from 'react';
import { getUniversalLink } from '@selfxyz/core';
import { SelfQRcodeWrapper, SelfAppBuilder, type SelfApp } from '@selfxyz/qrcode';
import { AccessibleDialog } from '@/components/ui';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { SELF_PROTOCOL_CONFIG, getVerificationEndpoint } from '@/config/self-protocol';
import { VERIFIED_FITNESS_CONTRACT_ADDRESS } from '@/constants/contracts';

interface SelfVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: unknown) => void;
  userAddress: string;
}

const SelfVerificationModal: React.FC<SelfVerificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  userAddress,
}) => {
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  const { currentTheme } = useEnhancedChainTheme();
  const { platform } = usePlatform();

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        window.innerWidth <= 768 ||
          /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      );
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Self app configuration
  useEffect(() => {
    if (!userAddress || !isOpen) return;

    try {
      const app = new SelfAppBuilder({
        version: 2,
        appName: 'Imperfect Form',
        scope: SELF_PROTOCOL_CONFIG.scope,
        endpoint: getVerificationEndpoint(), // Backend verification endpoint URL
        logoBase64: 'https://imperfectform.fun/favicon.ico',
        userId: userAddress,
        endpointType: 'https', // Backend verification (not on-chain contract verification)
        userIdType: 'hex',
        userDefinedData: JSON.stringify({
          platform: platform,
          timestamp: Date.now(),
          action: 'fitness_verification',
        }),
        disclosures: {
          // Verification requirements (must match contract and backend)
          minimumAge: SELF_PROTOCOL_CONFIG.minimumAge,
          excludedCountries: SELF_PROTOCOL_CONFIG.verification.excludedCountries,
          ofac: SELF_PROTOCOL_CONFIG.verification.ofac,

          // Optional disclosures (what users can choose to reveal)
          nationality: false, // Don't request by default
          gender: false, // Don't request by default
        },
      }).build();

      setSelfApp(app as any);
      setUniversalLink(getUniversalLink(app as any));
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize Self app:', error);
      onError(error);
      setIsLoading(false);
    }
  }, [userAddress, isOpen, platform, onError]);

  const handleSuccessfulVerification = () => {
    console.log('✅ Self verification successful!');
    onSuccess();
  };

  const handleVerificationError = (error: unknown) => {
    console.error('❌ Self verification failed:', error);
    onError(error);
  };

  const openSelfApp = () => {
    if (universalLink) {
      window.open(universalLink, '_blank');
    }
  };

  if (!isOpen) return null;

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={onClose}
      title="Verify as Human"
      description="Quick one-time setup with Self Protocol"
      maxWidth="400px"
    >
      <div className="space-y-6 relative">
        {/* Verification Interface */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/10 border-t-cyan-400 mx-auto mb-4"></div>
            <p className="text-sm text-gray-400 font-medium">Preparing secure verification...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Mobile: Show deep link button */}
            {isMobile ? (
              <div className="space-y-4">
                <button
                  onClick={openSelfApp}
                  className="w-full relative p-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-blue-900/30 border border-blue-500/30 transition-all active:scale-[0.98] group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-lg font-bold">Open Self App</span>
                    <span className="text-2xl">📱</span>
                  </div>
                </button>

                <div className="text-center">
                  <a
                    href="https://self.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-center text-cyan-400 font-medium hover:text-cyan-300 transition-colors border-b border-transparent hover:border-cyan-400/50 pb-0.5"
                  >
                    Don&apos;t have the app? Download here
                  </a>
                </div>
              </div>
            ) : (
              /* Desktop: Show QR code */
              <div className="space-y-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <div className="flex justify-center p-3 bg-white rounded-lg shadow-inner">
                    {selfApp && (
                      <SelfQRcodeWrapper
                        selfApp={selfApp}
                        onSuccess={handleSuccessfulVerification}
                        onError={handleVerificationError}
                        size={220}
                        darkMode={true}
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 text-center mt-3 font-medium">
                    Scan with your mobile camera or Self App
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Privacy Trust Badge */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
          <span className="text-lg">🔒</span>
          <div>
            <p className="text-xs font-bold text-cyan-200">Privacy First</p>
            <p className="text-[10px] text-cyan-100/70 leading-relaxed">
              We only verify that you are a unique human over 16. No personal identity data is
              stored on our servers.
            </p>
          </div>
        </div>

        {/* Desktop Action Button (Universal Link fallback) */}
        {!isMobile && universalLink && (
          <button
            onClick={() => window.open(universalLink, '_blank')}
            className="w-full py-3 text-sm font-medium text-gray-500 hover:text-white transition-colors flex items-center justify-center gap-2 group"
          >
            <span>Problems scanning?</span>
            <span className="underline decoration-gray-700 group-hover:decoration-gray-500">
              Open in browser
            </span>
          </button>
        )}
      </div>
    </AccessibleDialog>
  );
};

export default SelfVerificationModal;
