'use client';

import React from 'react';
import { useConnect } from 'wagmi';
import { useWallet, useWalletSelector } from '@/contexts/PlatformContext';
import AccessibleDialog from '@/components/ui/AccessibleDialog';
import { Spinner } from '@/components/ui';

// A more specific type for the connectors array from useConnect
type Connector = ReturnType<typeof useConnect>['connectors'][number];

const WalletSelectorModal: React.FC = () => {
  const { connectors } = useConnect();
  const { connect, isConnecting } = useWallet();
  const { isOpen, setOpen } = useWalletSelector();

  const handleConnect = async (connector: Connector) => {
    const success = await connect(connector.id);
    if (success) {
      setOpen(false); // Close modal on successful connection
    }
    // Errors are handled and toasted within the PlatformContext
  };

  // Filter out the Farcaster connector for the general web UI
  const availableConnectors = connectors.filter(
    (c) => c.id !== 'farcasterFrame' && c.id !== 'farcaster'
  );

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={() => setOpen(false)}
      title="Sign In"
      description="Choose your preferred method to sign in and continue"
    >
      <div className="flex flex-col space-y-4">
        {/* Promote passkey onboarding with improved visibility */}
        <div className="bg-gradient-to-r from-blue-50 to-teal-50 border-2 border-blue-300 rounded-lg p-4 mb-3 shadow-lg">
          <p className="text-base text-center font-semibold" style={{ color: '#1f2937' }}>
            💡 <span style={{ color: '#2563eb' }}>Tip:</span>{' '}
            <span style={{ color: '#0f766e' }}>Coinbase Smart Wallet supports passkeys</span>{' '}
            <span style={{ color: '#16a34a' }}>(no seed phrase needed!)</span>
          </p>
        </div>
        {availableConnectors.map((connector) => (
          <button
            key={connector.id}
            onClick={() => handleConnect(connector)}
            disabled={isConnecting}
            className="flex items-center justify-center w-full px-4 py-3 text-lg font-bold text-black bg-[#fcb131] rounded-lg transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            title={
              connector.id.includes('coinbase') ? 'Supports passkeys via Smart Wallet' : undefined
            }
          >
            {isConnecting ? (
              <>
                <Spinner />
                <span className="ml-2">Connecting...</span>
              </>
            ) : (
              connector.name
            )}
          </button>
        ))}
      </div>
    </AccessibleDialog>
  );
};

export default WalletSelectorModal;
