"use client";

import React, { Suspense } from "react";
import { useWalletProvider } from "@/contexts/WalletProviderContext";
import WalletTypeSelector from "./WalletTypeSelector";
import dynamic from "next/dynamic";

const WalletNetworkSwitcher = dynamic(() => import("./NetworkSwitcher"), {
  ssr: false,
  loading: () => null,
});

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

  // Check URL parameter for selector request
  const [forceSelector, setForceSelector] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("showSelector") === "true") {
        console.log(
          "WalletButton: showSelector parameter found, forcing selector"
        );
        setForceSelector(true);
        // Clear the parameter from URL without refreshing
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  // If URL parameter is present or no wallet provider is selected, show the wallet type selector
  if (forceSelector || !isWalletProviderSelected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[20vh] animate-fade-in">
        <div className="mb-6 text-center">
          <h1 className="text-4xl font-bold text-yellow-400 mb-1 mt-0 title-animation animate-pulse-slow">
            IMPERFECT FORM
          </h1>
          <h2 className="text-2xl text-yellow-200 mb-2 subtitle-animation">
            ONCHAIN OLYMPICS
          </h2>
        </div>
        <div className="wallet-button-animation">
          <WalletTypeSelector />
        </div>
      </div>
    );
  }

  // Render the appropriate wallet button based on the selected wallet provider
  // Wrap in error boundaries to prevent crashes
  try {
    if (walletProvider === "smart") {
      return (
        <div className="flex flex-col items-center gap-2">
          <Suspense
            fallback={
              <button className="wallet-button smart-wallet">
                Loading wallet...
              </button>
            }
          >
            <SmartWalletButton />
          </Suspense>
        </div>
      );
    }

    // Default to Signature Wallet (previously called "Polygon Wallet")
    return (
      <div className="flex flex-col items-center gap-2">
        <Suspense
          fallback={
            <button className="wallet-button signature-wallet">
              Loading wallet...
            </button>
          }
        >
          <SignatureWalletButton />
        </Suspense>
        {/* Only show WalletNetworkSwitcher for signature wallet users and when connected */}
        {walletProvider === "signature" && (
          <Suspense fallback={null}>
            <WalletNetworkSwitcher />
          </Suspense>
        )}
      </div>
    );
  } catch (error) {
    console.error("Error rendering wallet button:", error);
    // If there's an error, show the wallet selector to give user a chance to reset
    return <WalletTypeSelector />;
  }
}
