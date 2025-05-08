"use client";

import React from "react";
import { useNetwork } from "@/contexts/NetworkContext";
import Dialog from "@/components/ui/Dialog";
import Image from "next/image";

interface NetworkSelectorProps {
  onClose?: () => void;
}

/**
 * NetworkSelector component that displays a dialog for selecting a network
 */
export default function NetworkSelector({ onClose }: NetworkSelectorProps) {
  const { setNetwork } = useNetwork();

  // Handle network selection
  const handleNetworkSelected = (network: "polygon" | "base") => {
    setNetwork(network);
    if (onClose) onClose();
  };

  return (
    <Dialog
      isOpen={true}
      onClose={onClose || (() => {})}
      title="Select Wallet Type"
      description="Choose which wallet type you want to use for connecting to networks"
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
          onClick={() => handleNetworkSelected("polygon")}
          className="network-option network-option-polygon w-full mb-4"
        >
          <span className="flex items-center">
            <Image
              src="/wallet-icon.svg"
              alt="Regular Wallet"
              width={24}
              height={24}
              className="mr-2"
              onError={() => {
                // Next/Image handles errors differently, we'll use a fallback prop
                return true; // This tells Next.js to use the fallback image
              }}
              // Fallback image
              unoptimized
            />
            Regular Wallet
          </span>
          <span className="text-xs bg-white text-purple-700 px-2 py-1 rounded font-bold">
            ThirdWeb
          </span>
        </button>

        <button
          onClick={() => handleNetworkSelected("base")}
          className="network-option network-option-base w-full"
        >
          <span className="flex items-center">
            <Image
              src="/smart-wallet-icon.svg"
              alt="Smart Wallet"
              width={24}
              height={24}
              className="mr-2"
              onError={() => {
                // Next/Image handles errors differently, we'll use a fallback prop
                return true; // This tells Next.js to use the fallback image
              }}
              // Fallback image
              unoptimized
            />
            Smart Wallet
          </span>
          <span className="text-xs bg-white text-blue-700 px-2 py-1 rounded font-bold">
            Coinbase
          </span>
        </button>
      </div>
    </Dialog>
  );
}
