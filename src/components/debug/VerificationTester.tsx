'use client';

import React, { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import {
  VERIFIED_FITNESS_CONTRACT_ADDRESS,
  verifiedFitnessContractABI,
} from '@/constants/contracts';
import { ethers } from 'ethers';
import { Spinner } from '@/components/ui';

export const VerificationTester: React.FC = () => {
  const { wallet } = usePlatform();
  const { currentTheme } = useEnhancedChainTheme();

  const [isCheckLoading, setIsCheckLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    verified: boolean;
    timestamp?: number;
    error?: string;
  } | null>(null);

  const checkStatus = async () => {
    if (!wallet.address) return;

    setIsCheckLoading(true);
    setCheckResult(null);

    try {
      // Connect specifically to Celo endpoint
      const provider = new ethers.JsonRpcProvider('https://forno.celo.org');
      const contract = new ethers.Contract(
        VERIFIED_FITNESS_CONTRACT_ADDRESS,
        verifiedFitnessContractABI,
        provider
      );

      // 1. Check direct verification status
      const isVerified = await contract.isVerifiedHuman(wallet.address);

      // 2. Get verification timestamp if possible
      let timestamp = 0;
      try {
        timestamp = await contract.getVerificationTimestamp(wallet.address);
      } catch (e) {
        console.warn('Could not fetch timestamp', e);
      }

      setCheckResult({
        verified: isVerified,
        timestamp: Number(timestamp),
      });
    } catch (err: any) {
      console.error('Check failed:', err);
      setCheckResult({
        verified: false,
        error: err.message || 'Failed to check status',
      });
    } finally {
      setIsCheckLoading(false);
    }
  };

  if (!wallet.address) {
    return (
      <div className="p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg text-yellow-200">
        Please connect wallet to test verification
      </div>
    );
  }

  return (
    <div
      className="space-y-4 p-4 rounded-lg border bg-black/40"
      style={{ borderColor: currentTheme.palette.accent }}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg" style={{ color: currentTheme.palette.primary }}>
          🕵️ Verification Debugger
        </h3>
        <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400">Celo Mainnet</span>
      </div>

      <div className="space-y-2 text-sm text-gray-400">
        <p>
          Target Contract:{' '}
          <span className="font-mono text-gray-300">
            {VERIFIED_FITNESS_CONTRACT_ADDRESS.substring(0, 10)}...
          </span>
        </p>
        <p>
          Your Address:{' '}
          <span className="font-mono text-gray-300">{wallet.address.substring(0, 10)}...</span>
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={checkStatus}
          disabled={isCheckLoading}
          className="px-4 py-2 rounded font-bold transition-all disabled:opacity-50 flex items-center gap-2"
          style={{
            backgroundColor: currentTheme.palette.primary,
            color: currentTheme.palette.background,
          }}
        >
          {isCheckLoading && <Spinner />}
          {isCheckLoading ? 'Checking...' : 'Check Status'}
        </button>
      </div>

      {checkResult && (
        <div
          className={`mt-4 p-3 rounded border ${
            checkResult.error
              ? 'bg-red-900/20 border-red-500/50'
              : checkResult.verified
                ? 'bg-green-900/20 border-green-500/50'
                : 'bg-yellow-900/20 border-yellow-500/50'
          }`}
        >
          {checkResult.error ? (
            <div className="text-red-300">❌ Error: {checkResult.error}</div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">{checkResult.verified ? '✅' : '⚠️'}</span>
                <span
                  className={`font-bold ${checkResult.verified ? 'text-green-400' : 'text-yellow-400'}`}
                >
                  {checkResult.verified ? 'Verified Human' : 'Not Verified'}
                </span>
              </div>

              {checkResult.verified && checkResult.timestamp && checkResult.timestamp > 0 && (
                <div className="text-xs text-gray-400">
                  Verified since: {new Date(checkResult.timestamp * 1000).toLocaleString()}
                </div>
              )}

              {!checkResult.verified && (
                <div className="text-xs text-yellow-200">
                  This address has not completed Self Protocol verification on the contract.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default VerificationTester;
