'use client';

import React from 'react';
import { WalletDiagnostics, TroubleshootingGuide } from '@/components/debug';
import { usePlatform } from '@/contexts/PlatformContext';
import MemoryAPITester from '@/components/debug/MemoryAPITester';

export default function DebugWalletPage() {
  const { platform, wallet } = usePlatform();

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#fcb131] mb-1">Debug Center</h1>
          <p className="text-gray-400 text-sm">Wallet & API Diagnostics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Status & Memory API */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Status */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h2 className="text-lg font-semibold text-[#fcb131] mb-3">Quick Status</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Platform</div>
                  <div className="font-medium text-white">{platform}</div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Wallet</div>
                  <div
                    className={`font-medium ${wallet.isConnected ? 'text-green-400' : 'text-red-400'}`}
                  >
                    {wallet.isConnected ? 'Connected' : 'Disconnected'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Network</div>
                  <div className="font-medium text-white">
                    {wallet.chainId ? `Chain ${wallet.chainId}` : 'Unknown'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-gray-400 text-xs">Credits</div>
                  <div className="font-medium text-blue-400">95</div>
                </div>
              </div>
              {wallet.address && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <div className="text-xs text-gray-400">Address</div>
                  <div className="font-mono text-white text-sm">
                    {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
                  </div>
                </div>
              )}
            </div>

            {/* Memory API Tester - Prominent */}
            <MemoryAPITester />
          </div>

          {/* Right Column - Diagnostics & Help */}
          <div className="space-y-6">
            {/* Wallet Diagnostics */}
            <WalletDiagnostics />

            {/* Quick Troubleshooting */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold text-[#fcb131] mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm rounded transition-colors">
                  Refresh Page
                </button>
                <button className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors">
                  Wallet Diagnostics
                </button>
              </div>
            </div>

            {/* Network Info - Compact */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold text-[#fcb131] mb-3">Networks</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-blue-400">Base</span>
                  <span className="text-gray-400">8453</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-400">Polygon</span>
                  <span className="text-gray-400">137</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-400">Celo</span>
                  <span className="text-gray-400">42220</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-yellow-400">Monad</span>
                  <span className="text-gray-400">143</span>
                </div>
              </div>
            </div>

            {/* Help Links - Compact */}
            <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
              <h3 className="font-semibold text-[#fcb131] mb-3">Help</h3>
              <div className="space-y-1 text-xs">
                <a href="https://metamask.io/" className="block text-blue-400 hover:underline">
                  MetaMask Setup
                </a>
                <a href="https://docs.base.org/" className="block text-blue-400 hover:underline">
                  Base Network
                </a>
                <a href="https://memoryproto.co" className="block text-blue-400 hover:underline">
                  Memory Protocol
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Back to App - Compact */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="inline-block px-4 py-2 bg-[#fcb131] text-black font-semibold rounded-lg hover:bg-yellow-500 transition-colors text-sm"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}
