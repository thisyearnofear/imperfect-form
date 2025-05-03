"use client";

import React, { useContext, useEffect } from "react";
import { ChainContext } from "@/components/Providers";
import { useNetwork, useSwitchChain } from "@thirdweb-dev/react";

const ChainSelector: React.FC = () => {
  const { chain, setChain, chainId } = useContext(ChainContext);
  const { switchChain } = useSwitchChain();
  const { chain: connectedChain } = useNetwork();

  // Attempt to switch the blockchain network when the selected chain changes
  useEffect(() => {
    // Only try to switch networks if the user is connected to a wallet
    if (!connectedChain || !switchChain) return;

    // Enable automatic network switching when the user changes the network in the dropdown
    const switchBlockchainNetwork = async () => {
      try {
        if (connectedChain?.chainId !== chainId) {
          // Only attempt to switch if we have a valid chainId
          if (chainId) {
            await switchChain(chainId);
          }
        }
      } catch (error) {
        console.error("Failed to switch network:", error);
      }
    };

    // We don't auto-switch on initial load to avoid annoying popups
    // But we do switch when the user explicitly changes the network
    const hasUserChangedNetwork =
      localStorage.getItem("userChangedNetwork") === "true";
    if (hasUserChangedNetwork) {
      switchBlockchainNetwork();
      // Reset the flag after attempting to switch
      localStorage.setItem("userChangedNetwork", "false");
    }
  }, [chain, chainId, connectedChain, switchChain]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChain = e.target.value as "amoy" | "base";
    setChain(newChain);
    localStorage.setItem("selectedChain", newChain);
    // Set flag to indicate user has explicitly changed the network
    localStorage.setItem("userChangedNetwork", "true");
  };

  return (
    <select
      id="networkSelect"
      value={chain}
      onChange={handleChange}
      className="network-select w-full bg-black text-[#fcb131] border-2 border-[#fcb131] rounded-md py-2 px-3 text-sm cursor-pointer font-bold transition-all duration-300 hover:border-[#ffd700] focus:outline-none focus:ring-2 focus:ring-[#fcb131] focus:border-transparent shadow-md"
    >
      <option value="amoy">Polygon Amoy</option>
      <option value="base">Base Sepolia</option>
    </select>
  );
};

export default ChainSelector;
