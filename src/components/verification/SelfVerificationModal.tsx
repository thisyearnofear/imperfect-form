'use client';

import React, { useState, useEffect } from 'react';
import { getUniversalLink } from '@selfxyz/core';
import { SelfQRcodeWrapper, SelfAppBuilder, type SelfApp } from '@selfxyz/qrcode';
import { Dialog } from '@/components/ui';
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

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
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
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Verify as Human"
      description="Quick one-time setup with Self Protocol"
      maxWidth="400px"
    >
      <div className="space-y-4 relative">
        {/* Close button - prominent for mobile */}
        <button
          onClick={onClose}
          className="absolute top-0 right-0 text-3xl text-gray-400 hover:text-white p-2 hover:bg-gray-700/50 rounded transition-all"
          aria-label="Close verification modal"
          title="Close"
        >
          ×
        </button>

        {/* Verification Interface */}
        {isLoading ? (
          <div className="text-center py-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-transparent border-t-cyan-400 mx-auto mb-3"></div>
            <p className="text-sm text-gray-300">Generating verification...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Mobile: Show deep link button */}
            {isMobile ? (
              <div className="space-y-3">
                <button
                  onClick={openSelfApp}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-all text-sm"
                >
                  📱 Open Self App
                </button>
                <p className="text-xs text-gray-400 text-center">
                  <a
                    href="https://self.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-cyan-400"
                  >
                    Don&apos;t have it? Download Self
                  </a>
                </p>
              </div>
            ) : (
              /* Desktop: Show QR code */
              <div className="space-y-3">
                <p className="text-xs text-gray-300 text-center">Scan with Self app</p>
                {selfApp && (
                  <div className="flex justify-center p-3 bg-white rounded-lg">
                    <SelfQRcodeWrapper
                      selfApp={selfApp}
                      onSuccess={handleSuccessfulVerification}
                      onError={handleVerificationError}
                      size={200}
                      darkMode={true}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-400 text-center">
                  <a
                    href="https://self.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-cyan-400"
                  >
                    Download Self
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice - compact */}
        <div className="p-2 rounded border border-cyan-400/30 bg-cyan-900/20">
          <p className="text-xs text-gray-300">🔒 Verifies age 16+. No personal data stored.</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!isMobile && universalLink && (
            <button
              onClick={() => window.open(universalLink, '_blank')}
              className="flex-1 px-3 py-3 text-sm rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 transition-all font-medium"
            >
              Open App
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default SelfVerificationModal;
