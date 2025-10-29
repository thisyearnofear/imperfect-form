'use client';

import React, { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui';
// Removed: useEnhancedWalletConnection - using unified PlatformContext only
import { isFarcasterMiniApp } from '@/utils/farcasterMiniApp';

interface FarcasterDiagnosticResult {
  sdkAvailable: boolean;
  walletApiAvailable: boolean;
  providerAvailable: boolean;
  accountsAvailable: boolean;
  networkAccessible: boolean;
  userContext?: any;
  supportedChains?: string[];
  capabilities?: string[];
  error?: string;
}

interface FarcasterWalletDiagnosticProps {
  onClose?: () => void;
  className?: string;
}

/**
 * Farcaster Wallet Diagnostic Component
 *
 * Provides comprehensive diagnostics for Farcaster Mini App wallet integration:
 * - SDK availability and version
 * - Wallet provider detection
 * - Account connectivity
 * - Network accessibility
 * - Supported features detection
 * - User-friendly troubleshooting guidance
 */
export default function FarcasterWalletDiagnostic({
  onClose,
  className = '',
}: FarcasterWalletDiagnosticProps) {
  // Removed: enhancedWallet - using unified PlatformContext only
  const [diagnostic, setDiagnostic] = useState<FarcasterDiagnosticResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Run comprehensive diagnostic
  const runDiagnostic = async () => {
    setIsRunning(true);
    const result: FarcasterDiagnosticResult = {
      sdkAvailable: false,
      walletApiAvailable: false,
      providerAvailable: false,
      accountsAvailable: false,
      networkAccessible: false,
    };

    try {
      // Test 1: SDK Availability
      try {
        const { sdk } = await import('@farcaster/frame-sdk');
        result.sdkAvailable = true;

        // Test 2: User Context
        try {
          const context = await sdk.context;
          if (context?.user) {
            result.userContext = {
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
            };
          }
        } catch (contextError) {
          console.warn('User context not available:', contextError);
        }

        // Test 3: Wallet API Availability
        if (sdk.wallet) {
          result.walletApiAvailable = true;

          // Test 4: Provider Detection
          let provider = null;
          if (sdk.wallet.getEthereumProvider) {
            try {
              provider = await Promise.race([
                sdk.wallet.getEthereumProvider(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Provider timeout')), 3000)
                ),
              ]);
              result.providerAvailable = true;
            } catch (providerError) {
              console.warn('getEthereumProvider failed:', providerError);
            }
          }

          // Fallback to legacy API
          if (!provider && sdk.wallet.ethProvider) {
            provider = sdk.wallet.ethProvider;
            result.providerAvailable = true;
          }

          // Test 5: Account Access
          if (provider && typeof (provider as any).request === 'function') {
            try {
              const accounts = await Promise.race([
                (provider as any).request({ method: 'eth_accounts' }),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Accounts timeout')), 2000)
                ),
              ]);
              result.accountsAvailable = Array.isArray(accounts) && accounts.length > 0;
            } catch (accountsError) {
              console.warn('Account access failed:', accountsError);
            }

            // Test 6: Network Access
            try {
              await Promise.race([
                (provider as any).request({ method: 'eth_chainId' }),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Network timeout')), 2000)
                ),
              ]);
              result.networkAccessible = true;
            } catch (networkError) {
              console.warn('Network access failed:', networkError);
            }
          }
        }

        // Test 7: Supported Chains
        try {
          if (sdk.getChains) {
            result.supportedChains = await sdk.getChains();
          }
        } catch (chainsError) {
          console.warn('Chains detection failed:', chainsError);
        }

        // Test 8: Capabilities
        try {
          if (sdk.getCapabilities) {
            result.capabilities = await sdk.getCapabilities();
          }
        } catch (capabilitiesError) {
          console.warn('Capabilities detection failed:', capabilitiesError);
        }
      } catch (sdkError) {
        result.error = `SDK not available: ${sdkError instanceof Error ? sdkError.message : String(sdkError)}`;
      }
    } catch (globalError) {
      result.error = `Diagnostic failed: ${globalError instanceof Error ? globalError.message : String(globalError)}`;
    }

    setDiagnostic(result);
    setIsRunning(false);
  };

  // Auto-run diagnostic on mount
  useEffect(() => {
    if (isFarcasterMiniApp()) {
      runDiagnostic();
    } else {
      setDiagnostic({
        sdkAvailable: false,
        walletApiAvailable: false,
        providerAvailable: false,
        accountsAvailable: false,
        networkAccessible: false,
        error: 'Not running in Farcaster Mini App context',
      });
    }
  }, []);

  // Get diagnostic status
  const getDiagnosticStatus = () => {
    if (!diagnostic) return { status: 'pending', message: 'Running diagnostic...' };

    if (diagnostic.error) {
      return { status: 'error', message: diagnostic.error };
    }

    const issues = [];
    if (!diagnostic.sdkAvailable) issues.push('SDK not available');
    if (!diagnostic.walletApiAvailable) issues.push('Wallet API not available');
    if (!diagnostic.providerAvailable) issues.push('Provider not available');
    if (!diagnostic.accountsAvailable) issues.push('No accounts connected');
    if (!diagnostic.networkAccessible) issues.push('Network not accessible');

    if (issues.length === 0) {
      return { status: 'success', message: 'All systems operational!' };
    } else if (issues.length <= 2) {
      return { status: 'warning', message: `${issues.length} issues detected` };
    } else {
      return { status: 'error', message: `${issues.length} critical issues detected` };
    }
  };

  const { status, message } = getDiagnosticStatus();

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '⏳';
    }
  };

  return (
    <div className={`bg-black border-2 border-[#fcb131] rounded-lg p-6 space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3
          className="text-lg font-bold text-[#fcb131]"
          style={{ fontFamily: "'Press Start 2P', monospace" }}
        >
          🎯 Farcaster Wallet Diagnostic
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#fcb131] hover:text-white transition-colors text-xl"
          >
            ×
          </button>
        )}
      </div>

      {/* Overall Status */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{getStatusIcon(status)}</span>
          <div>
            <p className={`font-semibold ${getStatusColor(status)}`}>{status.toUpperCase()}</p>
            <p className="text-sm text-gray-300">{message}</p>
          </div>
          {isRunning && <Spinner className="ml-auto" />}
        </div>
      </div>

      {/* Enhanced Wallet Status */}
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
        <h4 className="font-semibold text-[#fcb131] mb-2">Enhanced Wallet Status:</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Connected:</span>
            <span className={enhancedWallet.isConnected ? 'text-green-400' : 'text-red-400'}>
              {enhancedWallet.isConnected ? '✅' : '❌'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Ready:</span>
            <span className={enhancedWallet.isReady ? 'text-green-400' : 'text-red-400'}>
              {enhancedWallet.isReady ? '✅' : '❌'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Source:</span>
            <span className="text-[#fcb131]">{enhancedWallet.source || 'None'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Address:</span>
            <span className="text-gray-300 text-xs">
              {enhancedWallet.address ? `${enhancedWallet.address.slice(0, 6)}...` : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Results */}
      {diagnostic && (
        <div className="space-y-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-[#fcb131] hover:underline"
          >
            {showDetails ? '▼' : '▶'} Detailed Results
          </button>

          {showDetails && (
            <div className="space-y-3">
              {/* Core Tests */}
              <div className="grid grid-cols-1 gap-2 text-sm">
                {[
                  { key: 'sdkAvailable', label: 'Farcaster SDK Available' },
                  { key: 'walletApiAvailable', label: 'Wallet API Available' },
                  { key: 'providerAvailable', label: 'Provider Available' },
                  { key: 'accountsAvailable', label: 'Accounts Connected' },
                  { key: 'networkAccessible', label: 'Network Accessible' },
                ].map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex justify-between items-center p-2 bg-gray-800 rounded"
                  >
                    <span className="text-gray-300">{label}:</span>
                    <span
                      className={
                        diagnostic[key as keyof FarcasterDiagnosticResult]
                          ? 'text-green-400'
                          : 'text-red-400'
                      }
                    >
                      {diagnostic[key as keyof FarcasterDiagnosticResult] ? '✅ Pass' : '❌ Fail'}
                    </span>
                  </div>
                ))}
              </div>

              {/* User Context */}
              {diagnostic.userContext && (
                <div className="p-3 bg-blue-900/20 border border-blue-700 rounded">
                  <h5 className="font-semibold text-[#fcb131] mb-2">👤 User Context:</h5>
                  <div className="text-xs space-y-1">
                    <p className="text-gray-300">FID: {diagnostic.userContext.fid}</p>
                    <p className="text-gray-300">Username: @{diagnostic.userContext.username}</p>
                    <p className="text-gray-300">Display: {diagnostic.userContext.displayName}</p>
                  </div>
                </div>
              )}

              {/* Supported Chains */}
              {diagnostic.supportedChains && (
                <div className="p-3 bg-purple-900/20 border border-purple-700 rounded">
                  <h5 className="font-semibold text-[#fcb131] mb-2">⛓️ Supported Chains:</h5>
                  <div className="text-xs">
                    {diagnostic.supportedChains.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {diagnostic.supportedChains.map((chain, index) => (
                          <span key={index} className="px-2 py-1 bg-purple-800 rounded text-white">
                            {chain}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No chains detected</p>
                    )}
                  </div>
                </div>
              )}

              {/* Capabilities */}
              {diagnostic.capabilities && (
                <div className="p-3 bg-green-900/20 border border-green-700 rounded">
                  <h5 className="font-semibold text-[#fcb131] mb-2">🔧 Capabilities:</h5>
                  <div className="text-xs max-h-32 overflow-y-auto">
                    {diagnostic.capabilities.length > 0 ? (
                      <div className="space-y-1">
                        {diagnostic.capabilities.map((capability, index) => (
                          <div key={index} className="text-gray-300">
                            • {capability}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400">No capabilities detected</p>
                    )}
                  </div>
                </div>
              )}

              {/* Environment Info */}
              <div className="p-3 bg-gray-800 rounded">
                <h5 className="font-semibold text-[#fcb131] mb-2">🌐 Environment:</h5>
                <div className="text-xs space-y-1">
                  <p className="text-gray-300">
                    Farcaster Mini App: {isFarcasterMiniApp() ? 'Yes' : 'No'}
                  </p>
                  <p className="text-gray-300">User Agent: {navigator.userAgent.slice(0, 50)}...</p>
                  <p className="text-gray-300">URL: {window.location.href.slice(0, 50)}...</p>
                  <p className="text-gray-300">Referrer: {document.referrer || 'None'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Troubleshooting Tips */}
      {diagnostic && status !== 'success' && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded p-4">
          <h4 className="font-semibold text-[#fcb131] mb-2">💡 Troubleshooting Tips:</h4>
          <div className="text-sm space-y-2">
            {!diagnostic.sdkAvailable && (
              <p className="text-gray-300">
                • SDK not available - ensure you're running in a Farcaster client
              </p>
            )}
            {!diagnostic.providerAvailable && (
              <p className="text-gray-300">
                • Provider not available - check wallet connection in Farcaster app
              </p>
            )}
            {!diagnostic.accountsAvailable && (
              <p className="text-gray-300">
                • No accounts connected - connect wallet in Farcaster app first
              </p>
            )}
            {!diagnostic.networkAccessible && (
              <p className="text-gray-300">
                • Network issues - check internet connection and RPC endpoints
              </p>
            )}
            <p className="text-[#fcb131]">
              • Try using WalletConnect as an alternative connection method
            </p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex space-x-3">
        <button
          onClick={runDiagnostic}
          disabled={isRunning}
          className="px-4 py-2 bg-[#fcb131] text-black rounded font-semibold hover:bg-[#f39c12] disabled:opacity-50 transition-colors flex items-center space-x-2"
        >
          {isRunning && <Spinner className="w-4 h-4" />}
          <span>{isRunning ? 'Running...' : 'Run Again'}</span>
        </button>

        <button
          onClick={() => {
            const diagnosticData = {
              timestamp: new Date().toISOString(),
              url: window.location.href,
              userAgent: navigator.userAgent,
              diagnostic,
              enhancedWallet: {
                isConnected: enhancedWallet.isConnected,
                isReady: enhancedWallet.isReady,
                source: enhancedWallet.source,
                error: enhancedWallet.error,
              },
            };

            navigator.clipboard
              .writeText(JSON.stringify(diagnosticData, null, 2))
              .then(() => alert('Diagnostic data copied to clipboard!'))
              .catch(() => alert('Failed to copy diagnostic data'));
          }}
          className="px-4 py-2 bg-gray-700 text-white rounded font-semibold hover:bg-gray-600 transition-colors"
        >
          Copy Debug Info
        </button>
      </div>
    </div>
  );
}
