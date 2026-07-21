'use client';

import React, { useState, useEffect } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { getEthereumProvider } from '@/utils/farcasterMiniApp';
import { getNetworkByChainId } from '@/config/networks';
import { ethers } from 'ethers';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export default function WalletDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const { wallet, platform } = usePlatform();

  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // Test 1: Platform Detection
    results.push({
      test: 'Platform Detection',
      status: 'pass',
      message: `Detected platform: ${platform}`,
      details: { platform },
    });

    // Test 2: Wallet Connection State
    results.push({
      test: 'Wallet Connection',
      status: wallet.isConnected ? 'pass' : 'fail',
      message: wallet.isConnected
        ? `Connected to ${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`
        : 'Wallet not connected',
      details: {
        isConnected: wallet.isConnected,
        address: wallet.address,
        chainId: wallet.chainId,
        provider: wallet.provider,
      },
    });

    // Test 3: Ethereum Provider
    try {
      const provider = await getEthereumProvider();
      if (provider) {
        results.push({
          test: 'Ethereum Provider',
          status: 'pass',
          message: 'Ethereum provider available',
          details: {
            hasRequest: typeof (provider as any).request === 'function',
            isMetaMask: (provider as any).isMetaMask,
            isCoinbaseWallet: (provider as any).isCoinbaseWallet,
            isWalletConnect: (provider as any).isWalletConnect,
          },
        });

        // Test 4: Chain ID Detection
        try {
          const chainIdHex = await (provider as any).request({ method: 'eth_chainId' });
          const chainId = parseInt(chainIdHex, 16);
          const networkConfig = getNetworkByChainId(chainId);

          results.push({
            test: 'Chain ID Detection',
            status: networkConfig ? 'pass' : 'warning',
            message: networkConfig
              ? `Connected to ${networkConfig.name} (${chainId})`
              : `Connected to unsupported chain (${chainId})`,
            details: { chainId, networkConfig },
          });

          // Test 5: Account Access
          try {
            const accounts = await (provider as any).request({ method: 'eth_accounts' });
            results.push({
              test: 'Account Access',
              status: accounts.length > 0 ? 'pass' : 'fail',
              message:
                accounts.length > 0
                  ? `${accounts.length} account(s) available`
                  : 'No accounts available',
              details: {
                accounts: accounts.map((acc: string) => `${acc.slice(0, 6)}...${acc.slice(-4)}`),
              },
            });

            // Test 6: Balance Check (for Monad)
            if (chainId === 143 && accounts.length > 0) {
              try {
                const balance = await (provider as any).request({
                  method: 'eth_getBalance',
                  params: [accounts[0], 'latest'],
                });
                const balanceInMON = parseFloat(ethers.formatEther(balance));
                const hasEnoughMON = balanceInMON >= 0.002;

                results.push({
                  test: 'MON Balance (Monad)',
                  status: hasEnoughMON ? 'pass' : 'fail',
                  message: hasEnoughMON
                    ? `Sufficient MON balance: ${balanceInMON.toFixed(4)} MON`
                    : `Insufficient MON balance: ${balanceInMON.toFixed(4)} MON (need 0.002)`,
                  details: { balance: balanceInMON, required: 0.002 },
                });
              } catch (balanceError) {
                results.push({
                  test: 'MON Balance (Monad)',
                  status: 'fail',
                  message: 'Could not check MON balance',
                  details: { error: balanceError },
                });
              }
            }
          } catch (accountError) {
            results.push({
              test: 'Account Access',
              status: 'fail',
              message: 'Could not access accounts',
              details: { error: accountError },
            });
          }
        } catch (chainError) {
          results.push({
            test: 'Chain ID Detection',
            status: 'fail',
            message: 'Could not detect chain ID',
            details: { error: chainError },
          });
        }
      } else {
        results.push({
          test: 'Ethereum Provider',
          status: 'fail',
          message: 'No Ethereum provider found',
          details: null,
        });
      }
    } catch (providerError) {
      results.push({
        test: 'Ethereum Provider',
        status: 'fail',
        message: 'Error getting Ethereum provider',
        details: { error: providerError },
      });
    }

    // Test 7: Farcaster-specific checks
    if (platform === 'farcaster') {
      try {
        const { sdk } = await import('@farcaster/miniapp-sdk');

        results.push({
          test: 'Farcaster SDK',
          status: 'pass',
          message: 'Farcaster SDK loaded successfully',
          details: {
            hasWallet: !!sdk.wallet,
            hasActions: !!sdk.actions,
            hasContext: !!sdk.context,
          },
        });

        if (sdk.wallet) {
          // Test new API
          try {
            const farcasterProvider = await getEthereumProvider();
            results.push({
              test: 'Farcaster Provider (Consolidated)',
              status: farcasterProvider ? 'pass' : 'fail',
              message: farcasterProvider
                ? 'Provider available via consolidated detection'
                : 'Provider not available',
              details: { provider: !!farcasterProvider },
            });
          } catch (newApiError) {
            results.push({
              test: 'Farcaster Provider (Consolidated)',
              status: 'fail',
              message: 'Consolidated provider detection failed',
              details: { error: newApiError },
            });
          }

          // Test legacy API
          if (sdk.wallet.ethProvider) {
            results.push({
              test: 'Farcaster Provider (Legacy API)',
              status: 'pass',
              message: 'Legacy API provider available',
              details: { provider: !!sdk.wallet.ethProvider },
            });
          } else {
            results.push({
              test: 'Farcaster Provider (Legacy API)',
              status: 'warning',
              message: 'Legacy API provider not available',
              details: null,
            });
          }
        }
      } catch (farcasterError) {
        results.push({
          test: 'Farcaster SDK',
          status: 'fail',
          message: 'Could not load Farcaster SDK',
          details: { error: farcasterError },
        });
      }
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.isConnected, wallet.chainId]);

  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return 'text-green-400';
      case 'fail':
        return 'text-red-400';
      case 'warning':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'pass':
        return '✅';
      case 'fail':
        return '❌';
      case 'warning':
        return '⚠️';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Wallet Diagnostics</h3>
        <button
          onClick={runDiagnostics}
          disabled={isRunning}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {isRunning ? 'Running...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-3">
        {diagnostics.map((result, index) => (
          <div key={index} className="border border-gray-600 rounded p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>{getStatusIcon(result.status)}</span>
                <span className="font-medium text-white">{result.test}</span>
              </div>
              <span className={`text-sm ${getStatusColor(result.status)}`}>
                {result.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-300 text-sm mt-1">{result.message}</p>
            {result.details && (
              <details className="mt-2">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                  Show details
                </summary>
                <pre className="text-xs text-gray-400 mt-1 bg-gray-800 p-2 rounded overflow-x-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {diagnostics.length > 0 && (
        <div className="mt-4 p-3 bg-gray-800 rounded">
          <h4 className="text-sm font-medium text-white mb-2">Summary</h4>
          <div className="text-xs text-gray-300">
            <div>✅ Passed: {diagnostics.filter((d) => d.status === 'pass').length}</div>
            <div>⚠️ Warnings: {diagnostics.filter((d) => d.status === 'warning').length}</div>
            <div>❌ Failed: {diagnostics.filter((d) => d.status === 'fail').length}</div>
          </div>
        </div>
      )}
    </div>
  );
}
