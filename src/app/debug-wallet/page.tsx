'use client';

import React from 'react';
import { WalletDiagnostics, TroubleshootingGuide } from '@/components/debug';
import { usePlatform } from '@/contexts/PlatformContext';
import MemoryAPITester from '@/components/debug/MemoryAPITester';

export default function DebugWalletPage() {
  const { platform, wallet } = usePlatform();

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">Wallet Debug Tools</h1>
          <p className="text-gray-300">
            Diagnose and fix wallet compatibility issues for score submission
          </p>
        </div>

        {/* Current Status */}
        <div className="mb-8 p-4 bg-gray-800 border border-gray-600 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-white">Current Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Platform:</span>
              <span className="ml-2 text-white font-medium">{platform}</span>
            </div>
            <div>
              <span className="text-gray-400">Wallet:</span>
              <span
                className={`ml-2 font-medium ${
                  wallet.isConnected ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {wallet.isConnected ? 'Connected' : 'Not Connected'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Network:</span>
              <span className="ml-2 text-white font-medium">
                {wallet.chainId ? `Chain ${wallet.chainId}` : 'Unknown'}
              </span>
            </div>
          </div>
          {wallet.address && (
            <div className="mt-2 text-sm">
              <span className="text-gray-400">Address:</span>
              <span className="ml-2 text-white font-mono">
                {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
              </span>
            </div>
          )}
        </div>

        {/* Troubleshooting Guide */}
        <div className="mb-8">
          <TroubleshootingGuide />
        </div>

        {/* Wallet Diagnostics */}
        <div className="mb-8">
          <WalletDiagnostics />
        </div>

        {/* Memory API Tester */}
        <div className="mb-8">
          <MemoryAPITester />
        </div>

        {/* Network Information */}
        <div className="mb-8 p-4 bg-gray-800 border border-gray-600 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-white">Supported Networks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="p-3 bg-gray-700 rounded">
                <h3 className="font-medium text-blue-400">Base</h3>
                <p className="text-gray-300">Chain ID: 8453</p>
                <p className="text-gray-300">Best for: Farcaster Mini Apps</p>
                <p className="text-gray-300">Recommended: Coinbase Wallet</p>
              </div>
              <div className="p-3 bg-gray-700 rounded">
                <h3 className="font-medium text-purple-400">Polygon</h3>
                <p className="text-gray-300">Chain ID: 137</p>
                <p className="text-gray-300">Currency: MATIC</p>
                <p className="text-gray-300">Low gas fees</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-gray-700 rounded">
                <h3 className="font-medium text-green-400">Celo</h3>
                <p className="text-gray-300">Chain ID: 42220</p>
                <p className="text-gray-300">Currency: CELO</p>
                <p className="text-gray-300">Mobile-first blockchain</p>
              </div>
              <div className="p-3 bg-gray-700 rounded">
                <h3 className="font-medium text-yellow-400">Monad Testnet</h3>
                <p className="text-gray-300">Chain ID: 10143</p>
                <p className="text-gray-300">Currency: MON (testnet)</p>
                <p className="text-gray-300">Requires 0.001 MON fee</p>
              </div>
            </div>
          </div>
        </div>

        {/* Help Links */}
        <div className="p-4 bg-gray-800 border border-gray-600 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-white">Help & Resources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-yellow-400 mb-2">Wallet Setup</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>
                  •{' '}
                  <a
                    href="https://metamask.io/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Install MetaMask
                  </a>
                </li>
                <li>
                  •{' '}
                  <a
                    href="https://www.coinbase.com/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Install Coinbase Wallet
                  </a>
                </li>
                <li>
                  •{' '}
                  <a
                    href="https://docs.base.org/using-base"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Base Network Guide
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-yellow-400 mb-2">Farcaster</h3>
              <ul className="space-y-1 text-sm text-gray-300">
                <li>
                  •{' '}
                  <a
                    href="https://warpcast.com/~/settings/wallet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Farcaster Wallet Settings
                  </a>
                </li>
                <li>
                  •{' '}
                  <a
                    href="https://docs.farcaster.xyz/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    Farcaster Documentation
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Back to App */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-block px-6 py-3 bg-yellow-600 text-black font-bold rounded-lg hover:bg-yellow-700 transition-colors"
          >
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}
