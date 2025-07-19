"use client";

import React, { useState } from "react";
import { useSwitchChain } from "wagmi";
import { polygon, base, celo } from "wagmi/chains";
import { Dialog } from "@/components/ui";
import Image from "next/image";
import {
  POLYGON_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
} from "@/constants/contracts";

// Custom Monad Testnet chain object
const monad = {
  id: 10143,
  name: "Monad Testnet",
  network: "monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } },
} as const;

interface ChainSelectorProps {
  onClose?: () => void;
}

/**
 * ChainSelector component that displays a dialog for selecting a blockchain network
 * This is different from WalletTypeSelector which chooses the wallet connection type
 */
export default function ChainSelector({ onClose }: ChainSelectorProps) {
  const { switchChain } = useSwitchChain();
  const [isLoading, setIsLoading] = useState(false);

  // Handle chain selection
  const handleChainSelected = async (
    selectedNetwork: "polygon" | "base" | "monad" | "celo"
  ) => {
    setIsLoading(true);

    try {
      // Update local storage (client-side only)
      if (typeof window !== "undefined") {
        localStorage.setItem("selectedNetwork", selectedNetwork);
        localStorage.setItem(
          "selectedChain",
          selectedNetwork === "polygon"
            ? "amoy"
            : selectedNetwork === "base"
            ? "base"
            : selectedNetwork === "monad"
            ? "monad"
            : "celo"
        );
      }

      // Switch chain using Wagmi or custom object
      let targetChain: typeof polygon | typeof base | typeof celo | typeof monad;
      if (selectedNetwork === "polygon") targetChain = polygon;
      else if (selectedNetwork === "base") targetChain = base;
      else if (selectedNetwork === "celo") targetChain = celo;
      else if (selectedNetwork === "monad") targetChain = monad;

      if (switchChain && targetChain) {
        switchChain({ chainId: targetChain.id });
      }

      // Close dialog
      if (onClose) onClose();
    } catch (error) {
      console.error("Error selecting chain:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose || (() => {})}
      title="Select Blockchain"
      description="Choose which blockchain network to use"
      maxWidth="450px"
    >
      <div
        className="olympic-rings mb-4 justify-center"
        aria-label="Olympic Rings"
      >
        <div className="ring blue" />
        <div className="ring black" />
        <div className="ring red" />
        <div className="ring yellow" />
        <div className="ring green" />
      </div>

      <div className="network-selection-dialog p-4">
        <button
          onClick={() => handleChainSelected("polygon")}
          className="network-option network-option-polygon w-full mb-4"
          disabled={isLoading}
        >
          <span className="flex items-center gap-2 truncate">
            <Image
              src="/polygon-logo.svg"
              alt="Polygon Network"
              width={24}
              height={24}
              className="mr-2"
              onError={() => true}
              unoptimized
            />
            Polygon Mainnet
          </span>
          <span className="text-xs bg-white text-purple-700 px-2 py-1 rounded font-bold">
            Mainnet
          </span>
        </button>

        <button
          onClick={() => handleChainSelected("base")}
          className="network-option network-option-base w-full mb-4"
          disabled={isLoading}
        >
          <span className="flex items-center gap-2 truncate">
            <Image
              src="/base-logo.svg"
              alt="Base Network"
              width={24}
              height={24}
              className="mr-2"
              onError={() => true}
              unoptimized
            />
            Base Mainnet
          </span>
          <span className="text-xs bg-white text-blue-700 px-2 py-1 rounded font-bold">
            Mainnet
          </span>
        </button>

        <button
          onClick={() => handleChainSelected("monad")}
          className="network-option network-option-monad w-full mb-4"
          disabled={isLoading}
        >
          <span className="flex items-center gap-2 truncate">
            <Image
              src="/monad-logo.svg"
              alt="Monad Network"
              width={24}
              height={24}
              className="mr-2"
              onError={e => ((e.target as HTMLImageElement).style.display = "none")}
              unoptimized
            />
            Monad Testnet
          </span>
          <span className="text-xs bg-white text-gray-800 px-2 py-1 rounded font-bold">
            Testnet
          </span>
        </button>

        <button
          onClick={() => handleChainSelected("celo")}
          className="network-option network-option-celo w-full"
          disabled={isLoading}
        >
          <span className="flex items-center gap-2 truncate">
            <Image
              src="/celo-logo.svg"
              alt="Celo Network"
              width={24}
              height={24}
              className="mr-2"
              onError={e => ((e.target as HTMLImageElement).style.display = "none")}
              unoptimized
            />
            Celo Mainnet
          </span>
          <span className="text-xs bg-white text-emerald-700 px-2 py-1 rounded font-bold">
            Mainnet
          </span>
        </button>

        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>Contract Addresses:</p>
          <p>
            Polygon Mainnet: {POLYGON_CONTRACT_ADDRESS.slice(0, 6)}...
            {POLYGON_CONTRACT_ADDRESS.slice(-4)}
          </p>
          <p>
            Base Mainnet: {BASE_CONTRACT_ADDRESS.slice(0, 6)}...
            {BASE_CONTRACT_ADDRESS.slice(-4)}
          </p>
        </div>
      </div>
    </Dialog>
  );
}
