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
 * Component that provides verification functionality after score submission on Celo
 * Shows a prompt to verify as human with Self Protocol (Celo-only feature)
 *
 * ENHANCEMENT FIRST: Only shows on Celo chain where verification bonus applies
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

  // CLEAN: Only render verification UI on Celo mainnet (chainId 42220)
  // Other chains don't support Self Protocol or verification bonuses
  const isCeloMainnet = chainId === 42220;

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

  // Don't show anything if not on Celo
  if (!isCeloMainnet) {
    return null;
  }

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

  const [showDetails, setShowDetails] = useState(false);

  return (
    <>
      {/* Ultra-compact verification prompt - default state */}
      <div className={`verification-prompt ${className}`}>
        {!showDetails ? (
          // COMPACT VIEW - Single line, easy to dismiss
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm">🏆 +10% bonus for verification</span>
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setShowDetails(true)}
                className="text-xs px-2 py-0.5 rounded text-yellow-300 hover:bg-yellow-500/20 transition-colors"
              >
                Learn more
              </button>
              <button
                onClick={onClose}
                className="text-2xl text-yellow-300 hover:text-white transition-colors p-1 hover:bg-yellow-500/20 rounded"
                aria-label="Dismiss verification prompt"
                title="Dismiss"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          // EXPANDED VIEW - Details for curious users
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 p-3 rounded-lg border border-yellow-500/30">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-yellow-200">Get Verified Human Badge</h4>
              <button
                onClick={onClose}
                className="text-2xl text-yellow-300 hover:text-white transition-colors p-1 hover:bg-yellow-500/20 rounded"
                aria-label="Dismiss verification details"
                title="Collapse"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-yellow-200/80 mb-3">
              Verify your identity with Self Protocol on Celo blockchain. One-time setup, no
              personal data stored.
            </p>

            <button
              onClick={promptForVerification}
              className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-black font-bold py-2 px-4 rounded-lg transition-all duration-200 text-sm"
            >
              {chainId && chainSupportsSelfProtocol(chainId)
                ? '🚀 Verify Now'
                : '🔄 Switch to Celo'}
            </button>

            <button
              onClick={() => setShowDetails(false)}
              className="w-full mt-2 text-xs px-2 py-1 rounded text-yellow-300 hover:bg-yellow-500/20 transition-colors"
            >
              Collapse
            </button>
          </div>
        )}
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
