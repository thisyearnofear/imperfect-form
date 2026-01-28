'use client';

import React, { useState } from 'react';
import { usePlatform } from '@/contexts/PlatformContext';

interface TroubleshootingStep {
  title: string;
  description: string;
  action?: string;
  isCompleted?: boolean;
}

export default function TroubleshootingGuide() {
  const { platform, wallet } = usePlatform();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const getStepsForPlatform = (): TroubleshootingStep[] => {
    if (platform === 'farcaster') {
      return [
        {
          title: 'Check Farcaster Wallet Connection',
          description: 'Ensure your wallet is connected in the Farcaster app',
          action: 'Open Farcaster settings and connect your wallet',
          isCompleted: wallet.isConnected,
        },
        {
          title: 'Verify Network',
          description: "Make sure you're on the correct network (Base for Farcaster)",
          action: 'Switch to Base (Chain ID: 8453)',
          isCompleted: wallet.chainId === 8453,
        },
        {
          title: 'Refresh Mini App',
          description: 'Sometimes the wallet provider needs to be reinitialized',
          action: 'Pull down to refresh the Farcaster mini app',
        },
        {
          title: 'Use Coinbase Wallet',
          description: 'For best Base network experience',
          action: 'Connect Coinbase Wallet in Farcaster if available',
        },
      ];
    } else if (wallet.chainId === 143) {
      return [
        {
          title: 'Add Monad Network',
          description: 'Monad testnet might not be in your wallet',
          action: 'Add Monad testnet with RPC: https://testnet-rpc.monad.xyz',
        },
        {
          title: 'Get Testnet MON',
          description: 'You need at least 0.002 MON for submission fee and gas',
          action: 'Visit Monad faucet to get testnet MON',
        },
        {
          title: 'Check Balance',
          description: 'Ensure sufficient MON balance',
          action: 'Verify you have at least 0.002 MON in your wallet',
        },
        {
          title: 'Connect Wallet',
          description: 'Make sure your wallet is properly connected',
          action: 'Disconnect and reconnect your wallet',
          isCompleted: wallet.isConnected,
        },
      ];
    } else {
      return [
        {
          title: 'Connect Wallet',
          description: 'Connect your Web3 wallet to continue',
          action: 'Click the connect wallet button',
          isCompleted: wallet.isConnected,
        },
        {
          title: 'Switch Network',
          description: "Make sure you're on a supported network",
          action: 'Switch to Base, Polygon, Celo, or Monad',
        },
        {
          title: 'Check Balance',
          description: 'Ensure you have enough tokens for gas fees',
          action: 'Add funds to your wallet if needed',
        },
        {
          title: 'Refresh Page',
          description: 'Sometimes a refresh helps with connection issues',
          action: 'Refresh the browser page',
        },
      ];
    }
  };

  const commonIssues = [
    {
      title: 'Transaction Rejected',
      description: 'User rejected the transaction in wallet',
      solutions: [
        'Confirm the transaction in your wallet popup',
        'Check if you have sufficient balance for gas fees',
        'Try reducing gas price if wallet allows',
      ],
    },
    {
      title: 'Insufficient Funds',
      description: 'Not enough tokens for transaction fees',
      solutions: [
        'Add more tokens to your wallet',
        'For Monad: Get testnet MON from faucet',
        'For Base: Ensure you have ETH for gas',
        'For Polygon: Ensure you have MATIC for gas',
      ],
    },
    {
      title: 'Network Error',
      description: 'Wrong network or RPC issues',
      solutions: [
        'Switch to the correct network',
        'Check your internet connection',
        'Try a different RPC endpoint',
        'Refresh the page and try again',
      ],
    },
    {
      title: 'Provider Not Available',
      description: 'Wallet provider not detected',
      solutions: [
        'Install a Web3 wallet (MetaMask, Coinbase Wallet)',
        'Enable the wallet extension',
        'Refresh the page after installing wallet',
        'For Farcaster: Connect wallet in the Farcaster app',
      ],
    },
  ];

  const steps = getStepsForPlatform();

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 max-w-2xl mx-auto">
      <h3 className="text-lg font-bold text-white mb-4">Troubleshooting Guide</h3>

      {/* Platform-specific steps */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-yellow-400 mb-3">
          Steps for{' '}
          {platform === 'farcaster'
            ? 'Farcaster Mini App'
            : wallet.chainId === 143
              ? 'Monad Network'
              : 'General Setup'}
        </h4>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-800 rounded">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step.isCompleted ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                }`}
              >
                {step.isCompleted ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-white">{step.title}</h5>
                <p className="text-sm text-gray-300 mt-1">{step.description}</p>
                {step.action && (
                  <p className="text-xs text-blue-400 mt-1 italic">→ {step.action}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Common Issues */}
      <div>
        <h4 className="text-md font-semibold text-yellow-400 mb-3">Common Issues</h4>
        <div className="space-y-2">
          {commonIssues.map((issue, index) => (
            <div key={index} className="border border-gray-600 rounded">
              <button
                onClick={() => toggleSection(`issue-${index}`)}
                className="w-full text-left p-3 hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-white">{issue.title}</h5>
                  <span className="text-gray-400">
                    {expandedSection === `issue-${index}` ? '−' : '+'}
                  </span>
                </div>
                <p className="text-sm text-gray-300 mt-1">{issue.description}</p>
              </button>

              {expandedSection === `issue-${index}` && (
                <div className="px-3 pb-3">
                  <div className="bg-gray-800 rounded p-3">
                    <h6 className="text-sm font-medium text-green-400 mb-2">Solutions:</h6>
                    <ul className="space-y-1">
                      {issue.solutions.map((solution, sIndex) => (
                        <li key={sIndex} className="text-sm text-gray-300 flex items-start">
                          <span className="text-green-400 mr-2">•</span>
                          {solution}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 p-3 bg-blue-900/30 border border-blue-700 rounded">
        <h4 className="text-sm font-medium text-blue-400 mb-2">Quick Actions</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
          {!wallet.isConnected && (
            <button
              onClick={() => {
                // This would trigger the wallet connection
                const connectBtn = document.querySelector(
                  '[data-testid="connect-wallet"]'
                ) as HTMLButtonElement;
                connectBtn?.click();
              }}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
            >
              Connect Wallet
            </button>
          )}
          {platform === 'farcaster' && (
            <a
              href="https://warpcast.com/~/settings/wallet"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
            >
              Farcaster Wallet Settings
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
