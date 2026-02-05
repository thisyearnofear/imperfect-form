'use client';

import React from 'react';
import { useConnect } from 'wagmi';
import { useWallet, useWalletSelector } from '@/contexts/PlatformContext';
import AccessibleDialog from '@/components/ui/AccessibleDialog';
import { Spinner } from '@/components/ui';
import { useFadeTransition } from '@/hooks';

// A more specific type for the connectors array from useConnect
type Connector = ReturnType<typeof useConnect>['connectors'][number];

const WalletSelectorModal: React.FC = () => {
  const { connectors } = useConnect();
  const { connect, isConnecting } = useWallet();
  const { isOpen, setOpen } = useWalletSelector();
  const { isVisible, className: transitionClass } = useFadeTransition(isOpen, 300);

  const handleConnect = async (connector: Connector) => {
    const success = await connect(connector.id);
    if (success) {
      setOpen(false); // Close modal on successful connection
    }
    // Errors are handled and toasted within the PlatformContext
  };

  // Filter out the Farcaster connectors for the general web UI
  const availableConnectors = connectors.filter(
    (c) => c.id !== 'farcasterFrame' && c.id !== 'farcaster' && c.id !== 'farcasterMiniApp'
  );

  if (!isVisible) return null;

  return (
    <AccessibleDialog
      isOpen={isOpen}
      onClose={() => setOpen(false)}
      title="Sign In"
      description="Choose your preferred method to sign in and continue"
      variant="wallet"
    >
      <div className={`flex flex-col space-y-3 ${transitionClass}`}>
        {/* Promote passkey onboarding with improved visibility */}
        <div className="bg-gradient-to-r from-blue-500/10 to-teal-500/10 border border-blue-500/20 rounded-xl p-4 mb-2">
          <p className="text-sm text-center font-medium text-gray-300">
            <span className="mr-2">💡</span>
            <span className="text-blue-400 font-bold">Smart Wallet</span> supports passkeys{' '}
            <span className="text-teal-400 font-bold">(no seed needed!)</span>
          </p>
        </div>

        <div className="space-y-3">
          {availableConnectors.map((connector) => (
            <button
              key={connector.id}
              onClick={() => handleConnect(connector)}
              disabled={isConnecting}
              className="group relative w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 active:bg-black/40 transition-all duration-200 flex items-center justify-between overflow-hidden"
              title={
                connector.id.includes('coinbase') ? 'Supports passkeys via Smart Wallet' : undefined
              }
            >
              <div className="flex items-center gap-3 relative z-10">
                {/* Visual indicator for provider */}
                <div
                  className={`w-2 h-2 rounded-full ${
                    connector.id.includes('coinbase')
                      ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                      : connector.id.includes('injected')
                        ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                        : 'bg-gray-500'
                  }`}
                />
                <span className="text-base font-bold text-gray-200 group-hover:text-white transition-colors">
                  {connector.name}
                </span>

                {connector.id.includes('coinbase') && (
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold border border-blue-500/30">
                    RECOMMENDED
                  </span>
                )}
              </div>

              <div className="relative z-10">
                {isConnecting ? (
                  <div className="flex items-center gap-2">
                    <Spinner size="sm" />
                  </div>
                ) : (
                  <span className="text-gray-500 group-hover:text-gray-300 transition-colors text-xl">
                    →
                  </span>
                )}
              </div>

              {/* Subtle gradient hover effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
            </button>
          ))}
        </div>
      </div>
    </AccessibleDialog>
  );
};

export default WalletSelectorModal;
