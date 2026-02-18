'use client';

import React, { useState, useEffect } from 'react';
import {
  encodeBuilderCodeSuffix,
  getBuilderCodeCapability,
  BUILDER_CODE,
} from '@/utils/builderCodes';
import { isBuilderCodeConfigured, getAttributionStats } from '@/utils/builderCodeValidator';
import { createRemoteLogger } from '@/utils/remoteLogger';

const logger = createRemoteLogger('BuilderCodeDebug');

/**
 * Builder Code Debug Panel
 *
 * Displays current Builder Code configuration and attribution status
 * for debugging and verification purposes.
 */
export default function BuilderCodeDebug() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [dataSuffix, setDataSuffix] = useState<string>('');
  const [stats, setStats] = useState<{
    totalTransactions: number;
    attributedTransactions: number;
    lastAttributedTx?: string;
  }>({ totalTransactions: 0, attributedTransactions: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Check configuration
    const configured = isBuilderCodeConfigured();
    setIsConfigured(configured);

    // Encode suffix
    if (configured) {
      const suffix = encodeBuilderCodeSuffix(BUILDER_CODE);
      setDataSuffix(suffix);
    }

    // Get stats
    const currentStats = getAttributionStats();
    setStats(currentStats);
  }, []);

  const capability = isConfigured ? getBuilderCodeCapability() : null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2 bg-gray-900 text-yellow-400 text-xs font-mono rounded-lg border border-yellow-400 hover:bg-gray-800 transition-colors"
      >
        🏷️ Builder Code {isExpanded ? '▼' : '▲'}
      </button>

      {/* Debug panel */}
      {isExpanded && (
        <div className="mt-2 p-4 bg-gray-900 text-yellow-400 text-xs font-mono rounded-lg border border-yellow-400 shadow-xl max-w-md">
          <div className="space-y-3">
            {/* Configuration Status */}
            <div>
              <div className="font-bold text-yellow-300 mb-1">Configuration</div>
              <div className="flex items-center space-x-2">
                <span className={isConfigured ? 'text-green-400' : 'text-red-400'}>
                  {isConfigured ? '●' : '○'} Configured
                </span>
                {isConfigured && <span className="text-gray-400">| Code: {BUILDER_CODE}</span>}
              </div>
            </div>

            {/* Data Suffix */}
            {isConfigured && (
              <div>
                <div className="font-bold text-yellow-300 mb-1">ERC-8021 Data Suffix</div>
                <div className="text-gray-300 break-all bg-gray-800 p-2 rounded">{dataSuffix}</div>
                <div className="text-gray-500 mt-1">
                  Length: {dataSuffix.length} chars | Gas: ~{((dataSuffix.length - 2) / 2) * 16}
                </div>
              </div>
            )}

            {/* Capability Object */}
            {isConfigured && capability && (
              <div>
                <div className="font-bold text-yellow-300 mb-1">wallet_sendCalls Capability</div>
                <pre className="text-gray-300 bg-gray-800 p-2 rounded overflow-x-auto text-[10px]">
                  {JSON.stringify(capability, null, 2)}
                </pre>
              </div>
            )}

            {/* Attribution Stats */}
            <div>
              <div className="font-bold text-yellow-300 mb-1">Attribution Stats</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">Total Tx</div>
                  <div className="text-green-400 font-bold">{stats.totalTransactions}</div>
                </div>
                <div className="bg-gray-800 p-2 rounded">
                  <div className="text-gray-500">Attributed</div>
                  <div className="text-blue-400 font-bold">{stats.attributedTransactions}</div>
                </div>
              </div>
              {stats.lastAttributedTx && (
                <div className="text-gray-500 mt-2 truncate">
                  Last: {stats.lastAttributedTx.slice(0, 10)}...{stats.lastAttributedTx.slice(-8)}
                </div>
              )}
            </div>

            {/* Verification Links */}
            <div>
              <div className="font-bold text-yellow-300 mb-1">Verify Attribution</div>
              <div className="space-y-1 text-gray-400">
                <div>1. Check base.dev → Onchain Transactions</div>
                <div>2. View tx on Basescan → Input Data</div>
                <div>3. Verify last 16 bytes = ERC-8021 magic</div>
              </div>
            </div>

            {/* Benefits */}
            <div className="border-t border-gray-700 pt-3">
              <div className="font-bold text-yellow-300 mb-1">Benefits</div>
              <ul className="space-y-1 text-gray-400 list-disc list-inside">
                <li>Rewards attribution on base.dev</li>
                <li>Analytics tracking</li>
                <li>App discovery visibility</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
