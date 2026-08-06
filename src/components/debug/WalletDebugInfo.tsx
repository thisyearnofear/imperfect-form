'use client';

import { useState, useEffect } from 'react';
import { getEthereumProvider, getAvailableProviders } from '@/utils/ethereumProviderSafety';

interface DebugInfo {
  hasEthereum: boolean;
  ethereumType: string;
  availableWallets: string[];
  providers: any[];
  userAgent: string;
  isMobile: boolean;
  errors: string[];
}

/**
 * Development-only diagnostic component for wallet provider issues.
 * It is intentionally not mounted in the production application tree.
 */
export default function WalletDebugInfo() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const shouldShow = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!shouldShow) return;

    const collectDebugInfo = async () => {
      const errors: string[] = [];

      try {
        // Check ethereum provider
        const ethereum = await getEthereumProvider();
        const hasEthereum = Boolean(ethereum);

        // Identify ethereum type
        let ethereumType = 'none';
        if (ethereum) {
          if ((ethereum as any).isMetaMask) ethereumType = 'MetaMask';
          else if ((ethereum as any).isCoinbaseWallet) ethereumType = 'Coinbase Wallet';
          else if ((ethereum as any).isTrust) ethereumType = 'Trust Wallet';
          else if ((ethereum as any).isRainbow) ethereumType = 'Rainbow';
          else ethereumType = 'Unknown';
        }

        // Check available wallets using getAvailableProviders
        const availableWallets: string[] = [];
        const allProviders = getAvailableProviders();

        allProviders.forEach((provider: any) => {
          if (provider.isMetaMask) availableWallets.push('MetaMask');
          if (provider.isCoinbaseWallet) availableWallets.push('Coinbase');
          if (provider.isTrust) availableWallets.push('Trust');
          if (provider.isRainbow) availableWallets.push('Rainbow');
        });

        // Device info
        const userAgent = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent
        );

        setDebugInfo({
          hasEthereum,
          ethereumType,
          availableWallets,
          providers: allProviders.map((p: any) => ({
            isMetaMask: (p as any).isMetaMask,
            isCoinbaseWallet: (p as any).isCoinbaseWallet,
            isTrust: (p as any).isTrust,
            isRainbow: (p as any).isRainbow,
          })),
          userAgent,
          isMobile,
          errors,
        });
      } catch (error) {
        errors.push(`Failed to collect debug info: ${error}`);
        setDebugInfo({
          hasEthereum: false,
          ethereumType: 'error',
          availableWallets: [],
          providers: [],
          userAgent: navigator.userAgent || 'unknown',
          isMobile: false,
          errors,
        });
      }
    };

    collectDebugInfo();
  }, [shouldShow]);

  // Diagnostics are opt-in and development-only. Never expose a debug trigger
  // or wallet/provider inventory on a production URL, even with a query string.

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-mono hover:bg-blue-700"
      >
        🔧 Debug
      </button>

      {isVisible && debugInfo && (
        <div className="absolute bottom-12 right-0 bg-black border border-gray-600 rounded p-4 text-xs font-mono text-green-400 max-w-md max-h-96 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-yellow-400 font-bold">Wallet Debug Info</h3>
            <button onClick={() => setIsVisible(false)} className="text-red-400 hover:text-red-300">
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div>
              <span className="text-blue-400">Has Ethereum:</span>{' '}
              {debugInfo.hasEthereum ? '✅' : '❌'}
            </div>

            <div>
              <span className="text-blue-400">Ethereum Type:</span> {debugInfo.ethereumType}
            </div>

            <div>
              <span className="text-blue-400">Available Wallets:</span>
              <div className="ml-2">
                {debugInfo.availableWallets.length > 0 ? (
                  debugInfo.availableWallets.map((wallet) => <div key={wallet}>• {wallet}</div>)
                ) : (
                  <div className="text-red-400">None detected</div>
                )}
              </div>
            </div>

            <div>
              <span className="text-blue-400">Providers Count:</span> {debugInfo.providers.length}
            </div>

            <div>
              <span className="text-blue-400">Mobile:</span> {debugInfo.isMobile ? '📱' : '💻'}
            </div>

            {debugInfo.errors.length > 0 && (
              <div>
                <span className="text-red-400">Errors:</span>
                <div className="ml-2 text-red-300">
                  {debugInfo.errors.map((error, i) => (
                    <div key={i}>• {error}</div>
                  ))}
                </div>
              </div>
            )}

            <details className="mt-2">
              <summary className="text-blue-400 cursor-pointer">User Agent</summary>
              <div className="mt-1 text-gray-400 break-all">{debugInfo.userAgent}</div>
            </details>

            {debugInfo.providers.length > 0 && (
              <details className="mt-2">
                <summary className="text-blue-400 cursor-pointer">Provider Details</summary>
                <pre className="mt-1 text-gray-400 text-xs overflow-auto">
                  {JSON.stringify(debugInfo.providers, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
