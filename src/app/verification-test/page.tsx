'use client';

import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
  verifiedFitnessLeaderboardABI,
  VERIFIED_FITNESS_CONTRACT_ADDRESS,
} from '@/constants/contracts';
import VerificationBadge from '@/components/verification/VerificationBadge';
import { CELO_FALLBACK_RPCS } from '@/utils/rpcUtils';

const VerificationTestPage: React.FC = () => {
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const checkVerificationStatus = async () => {
    if (!userAddress) {
      setError('Please enter a wallet address');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Validate address format
      if (!ethers.isAddress(userAddress)) {
        throw new Error('Invalid wallet address');
      }

      // Connect to Celo mainnet
      const provider = new ethers.JsonRpcProvider(CELO_FALLBACK_RPCS[0]);
      const contract = new ethers.Contract(
        VERIFIED_FITNESS_CONTRACT_ADDRESS,
        verifiedFitnessLeaderboardABI,
        provider
      );

      // Check verification status
      const verified = await contract.isUserVerified(userAddress);
      setIsVerified(verified);
    } catch (err) {
      console.error('Error checking verification status:', err);
      setError(err instanceof Error ? err.message : 'Failed to check verification status');
      setIsVerified(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">Self Protocol Verification Test</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Check Verification Status</h2>

          <div className="flex flex-col space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium mb-2">
                Wallet Address
              </label>
              <input
                type="text"
                id="address"
                value={userAddress}
                onChange={(e) => setUserAddress(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <button
              onClick={checkVerificationStatus}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-md hover:from-green-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'Check Verification Status'}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200">
              {error}
            </div>
          )}

          {isVerified !== null && (
            <div className="mt-6 p-4 bg-gray-700/50 rounded-md border border-gray-600">
              <div className="flex items-center space-x-3">
                <span className="font-medium">Verification Status:</span>
                <div className="flex items-center space-x-2">
                  <span className={isVerified ? 'text-green-400' : 'text-red-400'}>
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </span>
                  <VerificationBadge isVerified={isVerified} size="md" />
                </div>
              </div>

              {isVerified && (
                <div className="mt-3 text-sm text-green-300">
                  ✅ This user is a Self Protocol verified human and receives bonus points on the
                  leaderboard!
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Contract Information</h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Contract Address:</span>
              <div className="font-mono text-xs mt-1 p-2 bg-gray-700/50 rounded break-all">
                {VERIFIED_FITNESS_CONTRACT_ADDRESS}
              </div>
            </div>
            <div>
              <span className="font-medium">Network:</span> Celo
            </div>
            <div>
              <span className="font-medium">Chain ID:</span> 42220
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationTestPage;
