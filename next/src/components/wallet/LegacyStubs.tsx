"use client";

import React from "react";
import UniversalConnectButton from "./UniversalConnectButton";

// Legacy stubs to prevent import errors from old components
// All of these redirect to the new universal system

// Import from the new unified context
import { useWalletProvider as useNewWalletProvider } from "@/components/providers";

export const useWalletProvider = () => {
  // Use the new context but maintain legacy interface
  return useNewWalletProvider();
};

export const useNetwork = () => ({
  network: "base",
  setNetwork: () => {},
  isNetworkSelected: true,
});

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
