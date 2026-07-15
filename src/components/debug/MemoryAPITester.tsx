/**
 * Memory API Tester Component
 *
 * Simple component to test Memory API connectivity and basic functionality.
 * Used for debugging and verifying the integration works.
 */

'use client';

import React, { useState } from 'react';
import { Spinner, Button, MemoryInput } from '@/components/ui';
import { getMemoryClient } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';
import { usePlatform } from '@/contexts/PlatformContext';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('MemoryAPITester');

interface MemoryAPITesterProps {
  className?: string;
}

export default function MemoryAPITester({ className = '' }: MemoryAPITesterProps) {
  const { wallet } = usePlatform();
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [testIdentifier, setTestIdentifier] = useState(wallet?.address || 'jessepollak'); // Default to user's wallet

  const runTest = async (testType: string) => {
    setLoading(testType);
    setResults(null);

    try {
      const client = getMemoryClient();
      let result: any;

      switch (testType) {
        case 'credits':
          result = await client.getCredits();
          break;
        case 'identity-farcaster':
          result = await client.getIdentityGraphByFarcasterUsername(testIdentifier);
          break;
        case 'identity-wallet':
          result = await client.getIdentityGraphByWallet(testIdentifier);
          break;
        case 'enhanced-profile':
          result = await client.getEnhancedUserProfile(testIdentifier, {
            walletAddress: wallet?.address || undefined,
          });
          break;
        default:
          throw new Error('Unknown test type');
      }

      setResults({ testType, success: true, data: result });
      logger.info(`Memory API test successful: ${testType}`, result);
      toast.success(`${testType} test successful!`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setResults({ testType, success: false, error: errorMessage });
      logger.error(`Memory API test failed: ${testType}`, error);
      toast.error(`${testType} test failed: ${errorMessage}`);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className={`bg-gray-900 rounded-lg p-5 border border-gray-700 ${className}`}>
      <h2 className="text-lg font-bold text-primary mb-4">Memory API Tester</h2>

      {/* Test Identifier Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Identifier (username, wallet, or FID)
        </label>
        <MemoryInput
          type="text"
          value={testIdentifier}
          onChange={(e) => setTestIdentifier(e.target.value)}
          placeholder="e.g., papa, 0x55A5..., or 5254"
          className="w-full"
        />
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <button
          onClick={() => runTest('credits')}
          disabled={!!loading}
          className="px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {loading === 'credits' ? '...' : 'Credits'}
        </button>
        <button
          onClick={() => runTest('identity-farcaster')}
          disabled={!!loading}
          className="px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {loading === 'identity-farcaster' ? '...' : 'Farcaster'}
        </button>
        <button
          onClick={() => runTest('identity-wallet')}
          disabled={!!loading}
          className="px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {loading === 'identity-wallet' ? '...' : 'Wallet'}
        </button>
        <button
          onClick={() => runTest('enhanced-profile')}
          disabled={!!loading}
          className="px-4 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
        >
          {loading === 'enhanced-profile' ? '...' : 'Profile'}
        </button>
      </div>

      {/* Results Display */}
      {results && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-primary">
              Results:{' '}
              {results.testType.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
            </h3>
            <span
              className={`text-xs px-2 py-1 rounded ${results.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}
            >
              {results.success ? 'Success' : 'Failed'}
            </span>
          </div>

          {results.success ? (
            <div className="bg-gray-800 rounded-lg p-3">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto">
                {JSON.stringify(results.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-3">
              <p className="text-red-300 text-sm">{results.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Examples */}
      <div className="p-3 bg-gray-800 rounded-lg">
        <div className="text-xs text-gray-400 space-y-1">
          <div>
            <strong>Your Wallet:</strong> {wallet?.address?.slice(0, 10)}...
            {wallet?.address?.slice(-8)}
          </div>
          <div>
            <strong>Examples:</strong> papa, jessepollak, 0x8491...bf1
          </div>
        </div>
      </div>
    </div>
  );
}
