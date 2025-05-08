"use client";

import React, { useState, useEffect, useContext } from "react";
import ConnectWalletButton from "@/components/ConnectWallet";
import SubmitScore from "@/components/SubmitScore";
import ChainSelector from "@/components/ChainSelector";
import Medal from "@/components/Medal";
import Dialog from "@/components/ui/Dialog";
import { getBestDisplayName } from "@/utils/web3bio";
import { useNetwork } from "@/contexts/NetworkContext";
import { ChainContext } from "@/components/Providers";
import SetupSpendLimits from "@/components/SetupSpendLimits";

// Initialize window properties if they don't exist
if (typeof window !== "undefined") {
  if (window.transactionHash === undefined) {
    window.transactionHash = "";
  }
  if (window.selectedNetworkName === undefined) {
    window.selectedNetworkName = "";
  }
}

export interface SummaryModalProps {
  open: boolean;
  onClose: () => void;
  repCount: number;
  timeLeft: number;
  mode?: "pushups" | "squats";
  address?: string; // Optional wallet address
}

const SummaryModal: React.FC<SummaryModalProps> = ({
  open,
  onClose,
  repCount,
  timeLeft,
  mode = "pushups",
  address,
}) => {
  const [medalClass, setMedalClass] = useState("");
  const [performance, setPerformance] = useState("");
  const [displayName, setDisplayName] = useState<string>("");

  // Get network and chain information
  const { network } = useNetwork();
  const { chain } = useContext(ChainContext);

  // Update the window.selectedNetworkName when network or chain changes, or when modal opens
  useEffect(() => {
    if (open) {
      const newNetworkName =
        network === "polygon" ? "Polygon Amoy" : "Base Sepolia";

      // Update window object for compatibility with existing code
      if (typeof window !== "undefined") {
        window.selectedNetworkName = newNetworkName;
      }

      console.log(
        `SummaryModal: Updated network name to ${newNetworkName} (network: ${network}, chain: ${chain})`
      );
    }
  }, [network, chain, open]);

  useEffect(() => {
    // Determine medal based on rep count and exercise type
    if (mode === "pushups") {
      if (repCount >= 30) setMedalClass("gold");
      else if (repCount >= 20) setMedalClass("silver");
      else if (repCount >= 10) setMedalClass("bronze");
      else setMedalClass("");
    } else {
      // squats have different thresholds
      if (repCount >= 40) setMedalClass("gold");
      else if (repCount >= 25) setMedalClass("silver");
      else if (repCount >= 15) setMedalClass("bronze");
      else setMedalClass("");
    }

    // Set performance text
    if (medalClass === "gold") {
      setPerformance("Outstanding performance! You've earned a gold medal!");
    } else if (medalClass === "silver") {
      setPerformance("Great job! You've earned a silver medal!");
    } else if (medalClass === "bronze") {
      setPerformance("Good effort! You've earned a bronze medal!");
    } else {
      setPerformance("Keep practicing to earn a medal next time!");
    }
  }, [repCount, mode, medalClass]);

  // Resolve wallet address to social identity when address changes
  useEffect(() => {
    if (address) {
      // Initially show shortened address
      setDisplayName(`${address.slice(0, 6)}...${address.slice(-4)}`);

      // Try to resolve to a social identity
      getBestDisplayName(address)
        .then((name) => {
          setDisplayName(name);
        })
        .catch((error) => {
          console.error("Error resolving address to social identity:", error);
        });
    } else {
      setDisplayName("");
    }
  }, [address]);

  if (!open) return null;

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      title="Summary"
      description={`You completed ${repCount} ${mode} in ${
        120 - timeLeft
      } seconds! ${performance}`}
    >
      <div className="olympic-rings" aria-label="Olympic Rings">
        <div className="ring blue" />
        <div className="ring yellow" />
        <div className="ring black" />
        <div className="ring green" />
        <div className="ring red" />
      </div>

      {/* Medal component */}
      <Medal repCount={repCount} exerciseType={mode} />

      <div className="share-button">
        <button
          className="farcaster-button"
          disabled={!window.transactionHash}
          onClick={() => {
            const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
            const url = `https://imperfect-form.vercel.app?ref=farcaster`;
            window.open(
              `https://warpcast.com/~/compose?text=${encodeURIComponent(
                text + " " + url
              )}`,
              "_blank"
            );
          }}
        >
          Farcaster
        </button>
        <button
          className="twitter-button"
          disabled={!window.transactionHash}
          onClick={() => {
            const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
            const url = `https://imperfect-form.vercel.app?ref=twitter`;
            const hashtags = ["OnchainOlympics", "FitnessOnchain"];
            window.open(
              `https://twitter.com/intent/tweet?text=${encodeURIComponent(
                text
              )}&url=${encodeURIComponent(url)}&hashtags=${hashtags.join(",")}`,
              "_blank"
            );
          }}
        >
          Twitter
        </button>
        <button
          className="lens-button"
          disabled={!window.transactionHash}
          onClick={() => {
            const text = `I just completed ${repCount} ${mode} in the Onchain Olympics! 💪`;
            const url = `https://imperfect-form.vercel.app?ref=lens`;
            window.open(
              `https://hey.xyz/?text=${encodeURIComponent(text + " " + url)}`,
              "_blank"
            );
          }}
        >
          Lens
        </button>
      </div>

      <div className="blockchain-submission mt-6 p-4 border-2 border-[#fcb131] rounded-md">
        <p className="text-[#fcb131] text-sm font-bold mb-3">
          Submit score, unlock socials
        </p>
        <div className="flex flex-col gap-3">
          {!address ? (
            <>
              <p className="text-yellow-500 text-sm">
                Connect your wallet to submit your score
              </p>
              <ConnectWalletButton />
            </>
          ) : (
            <>
              <p className="text-green-500 text-sm">
                Wallet connected: {displayName}
              </p>
              <ChainSelector />
              {network === "base" && <SetupSpendLimits />}
              <SubmitScore score={repCount} exerciseType={mode} />
            </>
          )}
        </div>
      </div>
    </Dialog>
  );
};

export default SummaryModal;
