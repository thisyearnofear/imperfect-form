'use client';

import React, { useState } from 'react';
import { SelfVerificationModal } from '@/components/verification';
import NetworkSwitchPrompt from './NetworkSwitchPrompt';
import { usePlatform } from '@/contexts/PlatformContext';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { chainSupportsSelfProtocol, getSelfProtocolChain } from '@/utils/chainSwitching';
import { useVerifiedCount } from '@/hooks/useVerifiedCount';
import toast from 'react-hot-toast';

interface VerificationIntegrationProps {
  onVerificationComplete?: () => void;
  className?: string;
}

/**
 * Component that provides verification functionality after score submission
 * Shows a prompt to verify as human with Self Protocol
 */
const VerificationIntegration: React.FC<VerificationIntegrationProps> = ({
  onVerificationComplete,
  className = '',
}) => {
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showNetworkSwitch, setShowNetworkSwitch] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const { wallet } = usePlatform();
  const { currentTheme } = useEnhancedChainTheme();
  const { count: verifiedCount, isLoading: countLoading } = useVerifiedCount();
  const { address, chainId } = wallet;

  const handleVerificationSuccess = () => {
    setIsVerified(true);
    setShowVerificationModal(false);

    toast.success('🎉 Verified as human! You now have a verified badge.', {
      duration: 5000,
      style: {
        background: currentTheme.palette.surface,
        color: currentTheme.palette.text,
        border: `2px solid ${currentTheme.palette.accent}`,
      },
    });

    onVerificationComplete?.();
  };

  const handleVerificationError = (error: unknown) => {
    console.error('Verification failed:', error);
    setShowVerificationModal(false);

    toast.error('Verification failed. Please try again.', {
      style: {
        background: currentTheme.palette.surface,
        color: currentTheme.palette.text,
        border: `2px solid ${currentTheme.palette.error}`,
      },
    });
  };

  const promptForVerification = () => {
    // Check if current network supports Self Protocol
    if (!chainId || !chainSupportsSelfProtocol(chainId)) {
      // Show network switch prompt first
      setShowNetworkSwitch(true);
    } else {
      // Network is correct, show verification modal
      setShowVerificationModal(true);
    }
  };

  const handleNetworkSwitched = () => {
    // After successful network switch, show verification modal
    setShowVerificationModal(true);
  };

  if (isVerified) {
    return (
      <div className={`verification-success ${className}`}>
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 rounded-lg border border-green-500/30">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">✅</div>
            <div>
              <h4 className="font-bold text-green-400">Verified Human</h4>
              <p className="text-sm text-green-300">
                You&apos;re verified! Your scores now show with a verified badge.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Verification Prompt */}
      <div className={`verification-prompt ${className}`}>
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-4 rounded-lg border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">🏆</div>
              <div>
                <h4 className="font-bold text-yellow-200">Get Verified!</h4>
                <p className="text-sm text-yellow-100">
                  {countLoading ? (
                    <span className="flex items-center">
                      <span className="animate-pulse">Loading...</span>
                    </span>
                  ) : verifiedCount > 0 ? (
                    <span className="animate-fade-in">
                      Join <span className="font-semibold text-yellow-200">{verifiedCount}</span>{' '}
                      verified athletes and earn your badge
                    </span>
                  ) : (
                    <span className="animate-fade-in">Be among the first verified athletes!</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={promptForVerification}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 text-sm"
            >
              Verify Now
            </button>
          </div>

          <div className="mt-3 text-xs text-yellow-100">
            {countLoading ? (
              <span className="animate-pulse">✨ Loading verification stats...</span>
            ) : verifiedCount > 0 ? (
              <span className="animate-fade-in">
                ✨ One-time setup • 🏆{' '}
                <span className="font-medium text-yellow-50">{verifiedCount}</span> humans verified
                • ⚡ Instant badge
              </span>
            ) : (
              <span className="animate-fade-in">
                ✨ One-time setup • 🔒 Privacy-first • ⚡ Instant badge
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Network Switch Prompt */}
      <NetworkSwitchPrompt
        isOpen={showNetworkSwitch}
        onClose={() => setShowNetworkSwitch(false)}
        onNetworkSwitched={handleNetworkSwitched}
        targetChain={getSelfProtocolChain()}
        reason="Switch to Celo mainnet for verification"
      />

      {/* Verification Modal */}
      <SelfVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        onSuccess={handleVerificationSuccess}
        onError={handleVerificationError}
        userAddress={address || ''}
      />
    </>
  );
};

export default VerificationIntegration;
