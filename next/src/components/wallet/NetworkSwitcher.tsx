"use client";

import React, { useState, lazy, Suspense } from "react";
import { useNetwork } from "@/contexts/NetworkContext";

// Lazy load the NetworkSelector component
const NetworkSelector = lazy(() => import("./NetworkSelector"));

/**
 * NetworkSwitcher component that displays a button to switch between networks
 * when using ThirdWeb/signature wallet
 */
export default function NetworkSwitcher() {
  const { network } = useNetwork();
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);

  // Simple network info lookup to improve performance
  const getNetworkInfo = () => {
    if (!network) {
      return {
        name: "Unknown Network",
        className: "bg-gray-700 hover:bg-gray-600",
      };
    }

    const networkMap = {
      polygon: {
        name: "Polygon Mainnet",
        className: "bg-purple-800 hover:bg-purple-700",
      },
      monad: {
        name: "Monad Testnet",
        className: "bg-yellow-700 hover:bg-yellow-600",
      },
      celo: {
        name: "Celo Mainnet",
        className: "bg-green-700 hover:bg-green-600",
      },
      base: {
        name: "Base Sepolia",
        className: "bg-blue-700 hover:bg-blue-600",
      },
    };

    return (
      networkMap[network] || {
        name: "Unknown Network",
        className: "bg-gray-700 hover:bg-gray-600",
      }
    );
  };

  const networkInfo = getNetworkInfo();

  return (
    <>
      <button
        onClick={() => setShowNetworkSelector(true)}
        className={`px-2 py-0.5 text-xs rounded-full text-white font-medium border border-white/20 ${networkInfo.className} flex items-center space-x-1`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-green-400 mr-1"></span>
        <span>{networkInfo.name}</span>
      </button>

      {showNetworkSelector && (
        <Suspense fallback={null}>
          <NetworkSelector
            isOpen={showNetworkSelector}
            onClose={() => setShowNetworkSelector(false)}
          />
        </Suspense>
      )}
    </>
  );
}
