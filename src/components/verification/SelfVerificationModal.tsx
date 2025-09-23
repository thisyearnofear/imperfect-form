'use client';

import React, { useState, useEffect } from 'react';
import { getUniversalLink } from '@selfxyz/core';
import { SelfQRcodeWrapper, SelfAppBuilder, type SelfApp } from '@selfxyz/qrcode';
import { Dialog } from '@/components/ui';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { SELF_PROTOCOL_CONFIG } from '@/config/self-protocol';
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
        endpoint: VERIFIED_FITNESS_CONTRACT_ADDRESS,
        logoBase64: 'https://imperfectform.fun/favicon.ico',
        userId: userAddress,
        endpointType: 'celo', // Use Celo mainnet
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
      description="Get verified to earn your human badge and join the verified leaderboard!"
      maxWidth="500px"
    >
      <div className="space-y-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent mb-2">
            🏆 Verify as Human
          </h2>
          <p className="text-cyan-300 font-medium">Get your verified badge with Self Protocol</p>
        </div>

        {/* Verification Interface */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-cyan-400 mx-auto mb-4"></div>
            <p className="text-white">Generating verification...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mobile: Show deep link button */}
            {isMobile ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-300">
                  Tap the button below to open the Self app and verify your identity:
                </p>
                <button
                  onClick={openSelfApp}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                >
                  📱 Open Self App
                </button>
                <p className="text-xs text-gray-400">
                  Don&apos;t have the Self app?{' '}
                  <a
                    href="https://self.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-cyan-400"
                  >
                    Download Self app
                  </a>
                </p>
              </div>
            ) : (
              /* Desktop: Show QR code */
              <div className="text-center space-y-4">
                <p className="text-sm text-gray-300">Scan with the Self mobile app</p>
                {selfApp && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <SelfQRcodeWrapper
                      selfApp={selfApp}
                      onSuccess={handleSuccessfulVerification}
                      onError={handleVerificationError}
                      size={250}
                      darkMode={true}
                    />
                  </div>
                )}
                <p className="text-xs text-gray-400">
                  Need the Self app?{' '}
                  <a
                    href="https://self.id"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-cyan-400"
                  >
                    Download Self app
                  </a>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="p-3 rounded-lg border border-cyan-400 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
          <p className="text-xs text-gray-300">
            🔒 <strong className="text-cyan-400">Privacy First:</strong> Self Protocol only verifies
            you're 16+ years old. No personal data stored.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-800 text-white border border-gray-600 hover:bg-gray-700 transition-colors"
          >
            Maybe Later
          </button>
          <button
            onClick={() => window.open(universalLink, '_blank')}
            className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white border border-cyan-400 hover:from-cyan-400 hover:to-blue-400 transition-all transform hover:scale-105"
          >
            📱 Open Self App
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default SelfVerificationModal;
