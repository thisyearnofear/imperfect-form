"use client";

import React, { useState, useEffect } from "react";
import { ConnectWallet } from "@thirdweb-dev/react";
import { useAddress, useDisconnect } from "@thirdweb-dev/react";
import { shortenAddress } from "@/utils/formatters";
import { getBestDisplayName } from "@/utils/web3bio";
import Dialog from "@/components/ui/Dialog";

/**
 * PolygonWalletButton component for connecting to Polygon network using ThirdWeb
 */
export default function PolygonWalletButton() {
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // ThirdWeb hooks
  const address = useAddress();
  const disconnect = useDisconnect();

  // Update display name when address changes
  useEffect(() => {
    if (address) {
      const updateDisplayName = async () => {
        try {
          const name = await getBestDisplayName(address);
          setDisplayName(name || shortenAddress(address));
        } catch (error) {
          console.error("Error fetching display name:", error);
          setDisplayName(shortenAddress(address));
        }
      };

      updateDisplayName();
    } else {
      setDisplayName("");
    }
  }, [address]);

  // Copy address to clipboard
  const copyToClipboard = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Wallet details modal
  const WalletModal = () => (
    <Dialog
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      title="Wallet Details"
      description="Your wallet information and social identities"
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

      <div className="flex flex-col items-center space-y-4 p-4">
        <div className="text-center">
          <h3 className="text-lg font-bold">{displayName}</h3>
          <div className="flex items-center justify-center mt-1">
            <code className="bg-gray-800 px-2 py-1 rounded text-sm">
              {shortenAddress(address || "")}
            </code>
            <button
              onClick={copyToClipboard}
              className="ml-2 text-blue-400 hover:text-blue-300"
              aria-label="Copy address to clipboard"
            >
              {copied ? "✓" : "📋"}
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-purple-400 mb-2">
          Connected with Regular Wallet (Polygon Amoy)
        </div>

        <button
          onClick={() => {
            disconnect();
            setShowModal(false);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Disconnect Wallet
        </button>
      </div>
    </Dialog>
  );

  // If connected, show the wallet button with address
  if (address) {
    return (
      <>
        <button
          id="connectWalletButton"
          className="wallet-button polygon-wallet"
          onClick={() => setShowModal(true)}
          title={address}
        >
          {displayName || shortenAddress(address)}
        </button>
        <WalletModal />
      </>
    );
  }

  // If not connected, show the ThirdWeb connect button
  return (
    <ConnectWallet
      theme="dark"
      modalSize="compact"
      welcomeScreen={{
        title: "Onchain Olympics",
        subtitle: "Connect to submit your score",
        img: {
          src: "/favicon.ico",
          width: 150,
          height: 150,
        },
      }}
      modalTitleIconUrl="/favicon.ico"
      detailsBtn={() => <></>}
      btnTitle="Connect Wallet"
      className="wallet-button polygon-wallet"
      id="thirdwebConnectButton"
      style={{
        "--tw-bg-opacity": "1 !important",
      }}
      supportedWallets={[
        "metamask",
        "walletConnect",
        "coinbaseWallet",
        "injected",
      ]}
    />
  );
}
