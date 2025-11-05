/**
 * Memory API Tester Component
 *
 * Simple component to test Memory API connectivity and basic functionality.
 * Used for debugging and verifying the integration works.
 */

'use client';

import React, { useState } from 'react';
import { Spinner } from '@/components/ui';
import { MemoryButton, MemoryInput } from '@/components/ui/MemoryButton';
import { getMemoryClient } from '@/services/memoryApi';
import { createRemoteLogger } from '@/utils/remoteLogger';
import toast from 'react-hot-toast';

const logger = createRemoteLogger('MemoryAPITester');

interface MemoryAPITesterProps {
  className?: string;
}

export default function MemoryAPITester({ className = '' }: MemoryAPITesterProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [testIdentifier, setTestIdentifier] = useState('jessepollak'); // Default test identifier

  const runTest = async (testType: string) => {
    setLoading(testType);
    setResults(null);

    try {
      const client = getMemoryClient();

      // Check if client is available
      if (!client) {
        throw new Error('Memory API not configured. Please set NEXT_PUBLIC_MEMORY_API_KEY');
      }

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
          result = await client.getEnhancedUserProfile(testIdentifier);
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
    <div className={`bg-gray-900 rounded-lg p-6 border border-gray-700 ${className}`}>
      <h2 className="text-xl font-bold text-[#fcb131] mb-4">Memory API Tester</h2>

      {/* Test Identifier Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Test Identifier (username, wallet, or FID)
        </label>
        <MemoryInput
          type="text"
          value={testIdentifier}
          onChange={(e) => setTestIdentifier(e.target.value)}
          placeholder="e.g., jessepollak, 0x..., or FID"
        />
      </div>

      {/* Test Buttons */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <MemoryButton
          onClick={() => runTest('credits')}
          disabled={!!loading}
          variant="secondary"
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading === 'credits' ? '...' : 'Test Credits'}
        </MemoryButton>
        <MemoryButton
          onClick={() => runTest('identity-farcaster')}
          disabled={!!loading}
          variant="secondary"
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {loading === 'identity-farcaster' ? '...' : 'Farcaster Identity'}
        </MemoryButton>
        <MemoryButton
          onClick={() => runTest('identity-wallet')}
          disabled={!!loading}
          variant="secondary"
          size="sm"
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading === 'identity-wallet' ? '...' : 'Wallet Identity'}
        </MemoryButton>
        <MemoryButton
          onClick={() => runTest('enhanced-profile')}
          disabled={!!loading}
          variant="secondary"
          size="sm"
          className="bg-orange-600 hover:bg-orange-700 text-white"
        >
          {loading === 'enhanced-profile' ? '...' : 'Enhanced Profile'}
        </MemoryButton>
      </div>

      {/* Results Display */}
      {results && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-[#fcb131] mb-2">
            Test Results: {results.testType}
          </h3>

          {results.success ? (
            <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
              <p className="text-green-400 font-medium mb-2">✅ Success!</p>
              <pre className="text-xs text-gray-300 whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto">
                {JSON.stringify(results.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
              <p className="text-red-400 font-medium mb-2">❌ Failed</p>
              <p className="text-red-300 text-sm">{results.error}</p>
            </div>
          )}
        </div>
      )}

      {/* Quick Test Data */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <h4 className="font-semibold text-[#fcb131] mb-2">Quick Test Examples</h4>
        <div className="text-sm text-gray-300 space-y-1">
          <p>
            <strong>Farcaster:</strong> jessepollak, veganbeef, rish
          </p>
          <p>
            <strong>Wallet:</strong> 0x849151d7d0bf1f34b70d5cad5149d28cc2308bf1 (Jesse Pollak)
          </p>
          <p>
            <strong>FID:</strong> 99 (Jesse Pollak)
          </p>
        </div>
      </div>
    </div>
  );
}
