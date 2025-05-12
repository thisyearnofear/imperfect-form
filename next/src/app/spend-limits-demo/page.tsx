"use client";

import React, { useState } from "react";
import { SimplifiedSetupSpendLimits, ServerSideSetupSpendLimits } from "@/components/wallet";
import { Toaster } from "react-hot-toast";

export default function SpendLimitsDemo() {
  const [activeTab, setActiveTab] = useState<"client" | "server">("client");

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Toaster position="top-right" />

      <h1 className="text-3xl font-bold mb-6">Spend Limits Demo</h1>

      <p className="mb-6 text-gray-700">
        This demo shows two different approaches to setting up spend limits with
        Coinbase Wallet&apos;s smart accounts:
      </p>

      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "client"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("client")}
          >
            Client-Side Approach
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              activeTab === "server"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("server")}
          >
            Server-Side Approach
          </button>
        </div>
      </div>

      {activeTab === "client" ? (
        <div>
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Client-Side Approach</h2>
            <p className="text-gray-700">
              This approach handles everything in the browser. It&apos;s simpler
              to implement but may be less reliable for complex transactions.
            </p>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-600">
              <li>Simplified implementation</li>
              <li>No server-side code required</li>
              <li>May encounter issues with complex transactions</li>
              <li>More susceptible to API rate limits</li>
            </ul>
          </div>

          <SimplifiedSetupSpendLimits />
        </div>
      ) : (
        <div>
          <div className="mb-6 p-4 bg-blue-50 rounded-md">
            <h2 className="text-xl font-semibold mb-2">Server-Side Approach</h2>
            <p className="text-gray-700">
              This approach uses a server-side API to handle the transaction
              execution. It&apos;s more reliable for complex transactions.
            </p>
            <ul className="list-disc ml-5 mt-2 text-sm text-gray-600">
              <li>More robust implementation</li>
              <li>Better error handling</li>
              <li>Can use server-side secrets and API keys</li>
              <li>Can implement retry logic and better logging</li>
              <li>Requires server-side code and infrastructure</li>
            </ul>
          </div>

          <ServerSideSetupSpendLimits />
        </div>
      )}

      <div className="mt-8 p-4 bg-gray-50 rounded-md border border-gray-200">
        <h3 className="text-lg font-semibold mb-2">Troubleshooting Tips</h3>
        <ul className="list-disc ml-5 space-y-2 text-gray-700">
          <li>
            <strong>Insufficient Funds:</strong> Make sure your smart account
            has enough Base Sepolia testnet ETH to cover gas fees.
          </li>
          <li>
            <strong>Network Issues:</strong> Ensure you&apos;re connected to
            Base Sepolia testnet (Chain ID: 84532).
          </li>
          <li>
            <strong>Smart Account Setup:</strong> Verify that you&apos;ve
            created a smart account in Coinbase Wallet.
          </li>
          <li>
            <strong>API Errors:</strong> If you see 403 or 500 errors, it might
            be due to rate limiting or server issues at Coinbase.
          </li>
          <li>
            <strong>Console Logs:</strong> Check the browser console for
            detailed error messages.
          </li>
        </ul>
      </div>
    </div>
  );
}
