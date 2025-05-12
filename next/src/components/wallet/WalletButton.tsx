"use client";

import React, { Suspense } from "react";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import WalletTypeSelector from "./WalletTypeSelector";
import dynamic from "next/dynamic";

// Import wallet buttons dynamically to avoid ThirdWeb provider errors
// Use the new StandaloneThirdwebButton instead of SignatureWalletButton
const SignatureWalletButton = dynamic(
  () => import("./StandaloneThirdwebButton"),
  {
    ssr: false,
    loading: () => (
      <button className="wallet-button signature-wallet">
        Loading wallet...
      </button>
    ),
  }
);

const SmartWalletButton = dynamic(() => import("./SmartWalletButton"), {
  ssr: false,
  loading: () => (
    <button className="wallet-button smart-wallet">Loading wallet...</button>
  ),
});

/**
 * WalletButton component that conditionally renders the appropriate wallet button
 * based on the selected wallet provider, or shows the wallet type selector if no provider is selected
 */
export default function WalletButton() {
  const { walletProvider, isWalletProviderSelected } = useWalletProvider();

  // If no wallet provider is selected, show the wallet type selector
  if (!isWalletProviderSelected) {
    return <WalletTypeSelector />;
  }

  // Render the appropriate wallet button based on the selected wallet provider
  // Wrap in error boundaries to prevent crashes
  try {
    if (walletProvider === "smart") {
      return (
        <Suspense
          fallback={
            <button className="wallet-button smart-wallet">
              Loading wallet...
            </button>
          }
        >
          <SmartWalletButton />
        </Suspense>
      );
    }

    // Default to Signature Wallet (previously called "Polygon Wallet")
    return (
      <Suspense
        fallback={
          <button className="wallet-button signature-wallet">
            Loading wallet...
          </button>
        }
      >
        <SignatureWalletButton />
      </Suspense>
    );
  } catch (error) {
    console.error("Error rendering wallet button:", error);
    // If there's an error, show the wallet selector to give user a chance to reset
    return <WalletTypeSelector />;
  }
}
