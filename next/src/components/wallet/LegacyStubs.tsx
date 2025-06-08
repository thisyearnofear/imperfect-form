"use client";

import React from "react";
import UniversalConnectButton from "./UniversalConnectButton";

// Legacy stubs to prevent import errors from old components
// All of these redirect to the new universal system

// Import from the new unified context
import { usePlatform } from "@/contexts/PlatformContext";

export const useWalletProvider = () => {
  // Use the new context but maintain legacy interface
  const { wallet } = usePlatform();

  return {
    walletProvider:
      wallet.provider || (wallet.isConnected ? "universal" : null),
    isConnected: wallet.isConnected,
    userAddress: wallet.address,
    // Legacy methods that do nothing (for compatibility)
    setWalletProvider: () => {},
    resetAll: () => {},
    disconnect: () => {},
    setIsConnected: () => {},
    setUserAddress: () => {},
    changeWalletProvider: () => {},
    isWalletProviderSelected: wallet.isConnected,
  };
};

export const useNetwork = () => {
  const { wallet } = usePlatform();

  // Map chain IDs to network names for backward compatibility
  const getNetworkName = (id: number | null) => {
    switch (id) {
      case 84532:
        return "base";
      case 137:
        return "polygon";
      case 42220:
        return "celo";
      case 10143:
        return "monad";
      default:
        return "celo"; // Default to CELO for all contexts
    }
  };

  return {
    network: getNetworkName(wallet.chainId),
    setNetwork: () => {}, // Legacy - auto-handled now
    isNetworkSelected: true, // Always true now
  };
};

// Stub components that redirect to universal system
export const WalletButton = () => (
  <UniversalConnectButton size="md" showProfileWhenConnected={true} />
);

export const SignatureWalletButton = () => (
  <UniversalConnectButton size="md" showProfileWhenConnected={true} />
);

export const SmartWalletButton = () => (
  <UniversalConnectButton size="md" showProfileWhenConnected={true} />
);

export const WalletTypeSelector = () => (
  <UniversalConnectButton size="lg" showProfileWhenConnected={false} />
);

// Removed legacy detectors - universal system handles detection automatically
export const NetworkSelector = () => null;
export const FallbackConnectButton = () => (
  <UniversalConnectButton size="md" showProfileWhenConnected={true} />
);

export const ConnectWallet = () => (
  <UniversalConnectButton size="md" showProfileWhenConnected={true} />
);

// Legacy ThirdwebWrapper - now just passes through children
export const ThirdwebWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => <>{children}</>;

const LegacyStubs = {
  WalletButton,
  SignatureWalletButton,
  SmartWalletButton,
  WalletTypeSelector,
  NetworkSelector,
  FallbackConnectButton,
  ConnectWallet,
  ThirdwebWrapper,
  useWalletProvider,
  useNetwork,
};

export default LegacyStubs;
