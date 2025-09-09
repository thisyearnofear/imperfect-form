'use client';

import React from 'react';
import Link from 'next/link';
import useDeviceDetect from '@/hooks/useDeviceDetect';
import { WalletBrowserIndicator } from '@/components/ui';

/**
 * Debug page to test mobile and wallet browser detection
 * Access via /debug-mobile
 */
export default function DebugMobilePage() {
  const { isMobile, isWalletBrowser, walletBrowserType, isClient } = useDeviceDetect();

  if (!isClient) {
    return (
      <div className="min-h-screen bg-black text-white p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-yellow-400 mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  const getDeviceInfo = () => {
    if (typeof window === 'undefined') return {};

    return {
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      screen: {
        width: window.screen?.width,
        height: window.screen?.height,
        orientation: window.screen?.orientation?.type || 'unknown',
      },
      touch: {
        ontouchstart: 'ontouchstart' in window,
        maxTouchPoints: navigator.maxTouchPoints,
      },
      ethereum: {
        hasEthereum: typeof window.ethereum !== 'undefined',
        isMetaMask: window.ethereum?.isMetaMask,
        isCoinbaseWallet: window.ethereum?.isCoinbaseWallet,
        isTrust: window.ethereum?.isTrust,
        isRainbow: window.ethereum?.isRainbow,
      },
      web3: {
        hasWeb3: typeof window.web3 !== 'undefined',
      },
    };
  };

  const deviceInfo = getDeviceInfo();

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-yellow-400 mb-6">
          Mobile & Wallet Browser Detection Debug
        </h1>

        {/* Detection Results */}
        <div className="bg-gray-900 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-green-400 mb-3">Detection Results</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Is Mobile:</span>
              <span className={isMobile ? 'text-green-400' : 'text-red-400'}>
                {isMobile ? '✅ YES' : '❌ NO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Is Wallet Browser:</span>
              <span className={isWalletBrowser ? 'text-green-400' : 'text-red-400'}>
                {isWalletBrowser ? '✅ YES' : '❌ NO'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Wallet Type:</span>
              <span className="text-blue-400">{walletBrowserType || 'None detected'}</span>
            </div>
          </div>
        </div>

        {/* Wallet Browser Indicator */}
        {isWalletBrowser && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-purple-400 mb-3">Wallet Browser Indicator</h2>
            <WalletBrowserIndicator showDetails={true} />
          </div>
        )}

        {/* Device Information */}
        <div className="bg-gray-900 p-4 rounded-lg mb-6">
          <h2 className="text-lg font-bold text-blue-400 mb-3">Device Information</h2>
          <div className="space-y-3 text-xs">
            <div>
              <strong className="text-yellow-400">User Agent:</strong>
              <div className="bg-black p-2 rounded mt-1 break-all">{deviceInfo.userAgent}</div>
            </div>

            <div>
              <strong className="text-yellow-400">Viewport:</strong>
              <div className="bg-black p-2 rounded mt-1">
                {deviceInfo.viewport?.width} × {deviceInfo.viewport?.height}
                (DPR: {deviceInfo.viewport?.devicePixelRatio})
              </div>
            </div>

            <div>
              <strong className="text-yellow-400">Screen:</strong>
              <div className="bg-black p-2 rounded mt-1">
                {deviceInfo.screen?.width} × {deviceInfo.screen?.height}
                <br />
                Orientation: {deviceInfo.screen?.orientation}
              </div>
            </div>

            <div>
              <strong className="text-yellow-400">Touch Support:</strong>
              <div className="bg-black p-2 rounded mt-1">
                Touch Events: {deviceInfo.touch?.ontouchstart ? '✅' : '❌'}
                <br />
                Max Touch Points: {deviceInfo.touch?.maxTouchPoints}
              </div>
            </div>

            <div>
              <strong className="text-yellow-400">Ethereum Object:</strong>
              <div className="bg-black p-2 rounded mt-1">
                Has Ethereum: {deviceInfo.ethereum?.hasEthereum ? '✅' : '❌'}
                <br />
                MetaMask: {deviceInfo.ethereum?.isMetaMask ? '✅' : '❌'}
                <br />
                Coinbase: {deviceInfo.ethereum?.isCoinbaseWallet ? '✅' : '❌'}
                <br />
                Trust: {deviceInfo.ethereum?.isTrust ? '✅' : '❌'}
                <br />
                Rainbow: {deviceInfo.ethereum?.isRainbow ? '✅' : '❌'}
              </div>
            </div>

            <div>
              <strong className="text-yellow-400">Web3:</strong>
              <div className="bg-black p-2 rounded mt-1">
                Has Web3: {deviceInfo.web3?.hasWeb3 ? '✅' : '❌'}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-purple-900/30 border border-purple-500 p-4 rounded-lg">
          <h2 className="text-lg font-bold text-purple-400 mb-3">Testing Instructions</h2>
          <div className="text-sm space-y-2">
            <p>
              1. <strong>Desktop Browser:</strong> Should show &quot;Is Mobile: NO&quot; and
              &quot;Is Wallet Browser: NO&quot;
            </p>
            <p>
              2. <strong>Mobile Browser:</strong> Should show &quot;Is Mobile: YES&quot;
            </p>
            <p>
              3. <strong>Wallet Browser:</strong> Should show both &quot;Is Mobile: YES&quot; and
              &quot;Is Wallet Browser: YES&quot;
            </p>
            <p>
              4. <strong>Wallet Type:</strong> Should detect specific wallet (MetaMask, Coinbase,
              etc.)
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-block bg-yellow-600 text-black px-6 py-3 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
          >
            ← Back to App
          </Link>
        </div>
      </div>
    </div>
  );
}
