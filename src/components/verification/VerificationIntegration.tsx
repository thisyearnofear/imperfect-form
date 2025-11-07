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
  onClose?: () => void;
  className?: string;
}

/**
 * Component that provides verification functionality after score submission
 * Shows a prompt to verify as human with Self Protocol
 */
const VerificationIntegration: React.FC<VerificationIntegrationProps> = ({
  onVerificationComplete,
  onClose,
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
      {/* Streamlined Verification Prompt */}
      <div className={`verification-prompt ${className}`}>
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-3 rounded-lg border border-yellow-500/30 relative">
          {/* Much more visible dismiss button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-yellow-300 hover:text-white bg-black/30 hover:bg-black/60 rounded-full w-6 h-6 flex items-center justify-center text-lg transition-all duration-200 border border-yellow-500/50 hover:border-white/70"
            aria-label="Skip verification"
          >
            ×
          </button>

          {/* Compact, visual-first design */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-xl">🏆</span>
              <span className="text-green-400 text-sm font-bold">+10% Bonus Points</span>
            </div>

            <h4 className="font-bold text-yellow-200 text-base">Get Verified Human Badge</h4>

            <button
              onClick={promptForVerification}
              className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-2.5 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] shadow-lg text-sm mt-2"
            >
              {chainId && chainSupportsSelfProtocol(chainId)
                ? '🚀 Verify Now'
                : '🔄 Switch to Celo'}
            </button>

            {/* Ultra-compact stats */}
            <div className="text-xs text-yellow-200/80">
              {countLoading ? (
                <span className="animate-pulse">Loading...</span>
              ) : verifiedCount > 0 ? (
                <span>{verifiedCount} verified • One-time setup</span>
              ) : (
                <span>Quick one-time setup</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Network Switch Prompt */}
      <NetworkSwitchPrompt
        isOpen={showNetworkSwitch}
        onClose={() => setShowNetworkSwitch(false)}
        onNetworkSwitched={handleNetworkSwitched}
        targetChain={getSelfProtocolChain()}
        reason="Switch to Celo for verification"
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
