"use client";

import React, { useContext, useState, useEffect } from "react";
import {
  ConnectWallet as ThirdwebConnectWallet,
  useAddress,
  useDisconnect,
  useChain,
  useSwitchChain,
  useNetworkMismatch,
} from "@thirdweb-dev/react";
import { shortenAddress } from "@/utils/formatters";
import { ChainContext } from "@/components/Providers";
import Dialog from "@/components/ui/Dialog";
import { getBestDisplayName } from "@/utils/web3bio";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  address: string;
  onDisconnect: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  address,
  onDisconnect,
}) => {
  const [identities, setIdentities] = useState<{
    ens: string | null;
    lens: string | null;
    farcaster: string | null;
  }>({ ens: null, lens: null, farcaster: null });
  const [isLoading, setIsLoading] = useState(true);

  // Fetch social identities when modal opens
  useEffect(() => {
    if (isOpen && address) {
      setIsLoading(true);
      import("@/utils/web3bio").then(({ resolveIdentity }) => {
        resolveIdentity(address)
          .then((result) => {
            setIdentities(result);
            setIsLoading(false);
          })
          .catch((error) => {
            console.error("Error resolving identities:", error);
            setIsLoading(false);
          });
      });
    }
  }, [isOpen, address]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
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

      {/* Address section */}
      <div className="wallet-details bg-gradient-to-r from-purple-600 to-blue-600 p-1 rounded-lg mb-4">
        <div className="bg-black p-3 rounded-md">
          <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 font-bold mb-2">
            Connected Address:
          </p>
          <div className="address-container bg-gradient-to-r from-purple-900/30 to-blue-900/30 p-2 rounded-md">
            <p className="address-text bg-black/50 text-white font-mono">
              {address}
            </p>
            <button
              className="copy-button bg-gradient-to-r from-purple-500 to-blue-500 text-white p-2 rounded-full hover:scale-110 transition-transform"
              onClick={() => {
                navigator.clipboard.writeText(address);
                alert("Address copied to clipboard!");
              }}
              title="Copy address"
            >
              📋
            </button>
          </div>
        </div>
      </div>

      {/* Social identities section */}
      <div className="social-identities bg-gradient-to-r from-pink-600 to-orange-600 p-1 rounded-lg mb-4">
        <div className="bg-black p-3 rounded-md">
          <h4 className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 font-bold mb-2">
            Social Identities
          </h4>
          {isLoading ? (
            <div className="flex justify-center p-4">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500"></div>
            </div>
          ) : (
            <div className="identities-list space-y-2">
              {identities.ens && (
                <div className="identity-item bg-gradient-to-r from-pink-900/30 to-orange-900/30 p-2 rounded-md">
                  <span className="identity-label text-pink-400 font-bold">
                    ENS:
                  </span>
                  <span className="identity-value bg-black/50 text-white p-1 rounded">
                    {identities.ens}
                  </span>
                </div>
              )}
              {identities.farcaster && (
                <div className="identity-item bg-gradient-to-r from-pink-900/30 to-orange-900/30 p-2 rounded-md">
                  <span className="identity-label text-pink-400 font-bold">
                    Farcaster:
                  </span>
                  <span className="identity-value bg-black/50 text-white p-1 rounded">
                    {identities.farcaster}
                  </span>
                </div>
              )}
              {identities.lens && (
                <div className="identity-item bg-gradient-to-r from-pink-900/30 to-orange-900/30 p-2 rounded-md">
                  <span className="identity-label text-pink-400 font-bold">
                    Lens:
                  </span>
                  <span className="identity-value bg-black/50 text-white p-1 rounded">
                    {identities.lens}
                  </span>
                </div>
              )}
              {!identities.ens && !identities.farcaster && !identities.lens && (
                <p className="text-orange-400 text-center p-2">
                  No social identities found for this address.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <button
        className="wallet-button bg-gradient-to-r from-red-600 to-yellow-600 hover:from-red-500 hover:to-yellow-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105"
        onClick={() => {
          onDisconnect();
          onClose();
        }}
      >
        Disconnect Wallet
      </button>
    </Dialog>
  );
};

const ConnectWalletButton: React.FC = () => {
  const address = useAddress();
  const disconnect = useDisconnect();
  const { chain } = useContext(ChainContext);
  const [showModal, setShowModal] = useState(false);
  const [displayName, setDisplayName] = useState<string>("");

  // Resolve the address to a social identity when it changes
  useEffect(() => {
    if (address) {
      // Initially show shortened address while resolving
      setDisplayName(shortenAddress(address));

      // Try to resolve to a social identity
      getBestDisplayName(address)
        .then((name) => {
          setDisplayName(name);
        })
        .catch((error) => {
          console.error("Error resolving address to social identity:", error);
          // Fallback to shortened address on error
          setDisplayName(shortenAddress(address));
        });
    }
  }, [address]);

  if (address) {
    return (
      <>
        <button
          id="connectWalletButton"
          className="wallet-button"
          onClick={() => setShowModal(true)}
          title={address}
        >
          {displayName}
        </button>
        <WalletModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          address={address}
          onDisconnect={disconnect}
        />
      </>
    );
  }

  return (
    <div id="connectWalletContainer">
      <ThirdwebConnectWallet
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
        className="wallet-button"
        style={{
          // Override any transparency in the ThirdwebConnectWallet modal
          "--tw-bg-opacity": "1 !important",
        }}
        // Explicitly set supported wallet types
        supportedWallets={[
          "metamask",
          "walletConnect",
          "coinbaseWallet",
          "injected",
        ]}
      />
    </div>
  );
};

export default ConnectWalletButton;
