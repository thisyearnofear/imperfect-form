"use client";

import React from "react";
import SpendLimitsDebugAndFix from "@/components/SpendLimitsDebugAndFix";
import { Toaster } from "react-hot-toast";

export default function SpendLimitsFixPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-6">Spend Limits Troubleshooter</h1>

      <div className="mb-6 p-4 bg-blue-50 rounded-md">
        <h2 className="text-xl font-semibold mb-2">About This Tool</h2>
        <p className="text-gray-700 mb-3">
          This tool helps diagnose and fix issues with Coinbase Wallet&apos;s
          smart account spend limits. It provides multiple approaches to work
          around the &quot;Could not execute call&quot; error.
        </p>

        <h3 className="font-medium text-lg mt-4 mb-2">
          Available Fix Approaches:
        </h3>
        <ul className="list-disc ml-5 space-y-1 text-gray-700">
          <li>
            <strong>Standard:</strong> Uses the default parameters for spend
            permissions.
          </li>
          <li>
            <strong>Minimal Values:</strong> Uses minimal values for allowance,
            period, and end time.
          </li>
          <li>
            <strong>Random Salt:</strong> Uses a random salt value to avoid
            nonce issues.
          </li>
          <li>
            <strong>Direct Contract:</strong> Attempts to interact directly with
            the contract.
          </li>
        </ul>
      </div>

      <SpendLimitsDebugAndFix />

      <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Troubleshooting Tips</h3>
        <ul className="list-disc ml-5 space-y-2 text-gray-700">
          <li>
            <strong>Smart Account Creation:</strong> Make sure you&apos;ve
            created a smart account in Coinbase Wallet before trying to set up
            spend limits.
          </li>
          <li>
            <strong>Sufficient Funds:</strong> Your smart account needs ETH to
            cover gas fees. The diagnostics will show your current balance.
          </li>
          <li>
            <strong>Network Connection:</strong> Ensure you&apos;re connected to
            Base Sepolia testnet (Chain ID: 84532).
          </li>
          <li>
            <strong>Wallet Version:</strong> Make sure you&apos;re using the
            latest version of Coinbase Wallet.
          </li>
          <li>
            <strong>Try Different Approaches:</strong> If one approach
            doesn&apos;t work, try another. The &quot;Minimal Values&quot;
            approach often works when others fail.
          </li>
          <li>
            <strong>Wait and Retry:</strong> Sometimes Coinbase&apos;s services
            experience temporary issues. Wait a few minutes and try again.
          </li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
        <h3 className="text-lg font-semibold mb-2">Understanding the Error</h3>
        <p className="text-gray-700 mb-3">
          The &quot;Could not execute call&quot; error typically occurs when:
        </p>
        <ul className="list-disc ml-5 space-y-1 text-gray-700">
          <li>The smart account doesn&apos;t have enough ETH for gas</li>
          <li>There&apos;s an issue with the spend permission parameters</li>
          <li>Coinbase&apos;s services are experiencing temporary issues</li>
          <li>
            There&apos;s a nonce conflict or other blockchain-related issue
          </li>
        </ul>
        <p className="mt-3 text-gray-700">
          The diagnostic tool will help identify which of these issues might be
          affecting your setup.
        </p>
      </div>
    </div>
  );
}
