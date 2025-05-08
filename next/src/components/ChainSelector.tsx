"use client";

import React, { useContext, useEffect, useState } from "react";
import { ChainContext } from "@/components/Providers";
import { useNetwork as useNetworkContext } from "@/contexts/NetworkContext";
import {
  useAccount as useWagmiAccount,
  useSwitchChain as useWagmiSwitchChain,
} from "wagmi";
import { baseSepolia } from "wagmi/chains";

// Create a safe wrapper component that only renders its children when in the right network context
const SafeThirdwebWrapper = ({
  children,
  network,
}: {
  children: React.ReactNode;
  network: string | null;
}) => {
  // Only render children if we're in the polygon network
  if (network === "polygon") {
    return <>{children}</>;
  }
  return null;
};

// Import ThirdWeb hooks at the top level
import {
  useNetwork as useThirdwebNetwork,
  useSwitchChain as useThirdwebSwitchChain,
} from "@thirdweb-dev/react";

// Create a variable to store ThirdWeb hooks data
const thirdwebHooks = {
  useNetwork: useThirdwebNetwork,
  useSwitchChain: useThirdwebSwitchChain,
};

// Define the type for the chain data
interface ChainData {
  chain: { chainId?: number } | { id?: number } | null;
  switchChain: unknown;
}

// Create a component that safely uses ThirdWeb hooks
const ThirdwebChainHandler = ({
  onChainData,
}: {
  onChainData: (data: ChainData) => void;
}) => {
  // Use effect to safely try to get ThirdWeb data
  React.useEffect(() => {
    try {
      if (thirdwebHooks.useNetwork && thirdwebHooks.useSwitchChain) {
        // Get the values from the hooks
        const { chain } = thirdwebHooks.useNetwork();
        const { switchChain } = thirdwebHooks.useSwitchChain();

        // Pass the data up to the parent
        onChainData({ chain, switchChain });
      } else {
        onChainData({ chain: null, switchChain: null });
      }
    } catch (error) {
      console.error("Error using ThirdWeb hooks:", error);
      // If there's an error, pass null values
      onChainData({ chain: null, switchChain: null });
    }
  }, [onChainData]);

  return null;
};

const ChainSelector: React.FC = () => {
  const { chain, setChain, chainId } = useContext(ChainContext);
  const { network } = useNetworkContext();

  // State to store ThirdWeb data
  const [thirdwebData, setThirdwebData] = useState<{
    chain: unknown;
    switchChain: unknown;
  }>({
    chain: null,
    switchChain: null,
  });

  // Use Wagmi hooks for Base network
  const { switchChainAsync: wagmiSwitchChain } = useWagmiSwitchChain();
  const { chain: wagmiChain } = useWagmiAccount();

  // Log Wagmi chain information for debugging
  useEffect(() => {
    if (network === "base") {
      console.log("Wagmi chain info:", wagmiChain);
      console.log("Wagmi switchChain available:", !!wagmiSwitchChain);
    }
  }, [network, wagmiChain, wagmiSwitchChain]);

  // Store the switchChain function based on the network
  // We'll use a more generic type and handle the different parameter formats in the usage
  const switchChain =
    network === "polygon" ? thirdwebData.switchChain : wagmiSwitchChain;

  // Add proper type handling for connectedChain
  const connectedChain: { chainId?: number; id?: number } | null =
    network === "polygon"
      ? (thirdwebData.chain as { chainId?: number }) || null
      : (wagmiChain as { id?: number }) || null;

  // Log the current chain and network for debugging
  useEffect(() => {
    console.log("Current network:", network);
    console.log("Connected chain:", connectedChain);
    console.log("Chain ID from context:", chainId);
    console.log("Switch chain function available:", !!switchChain);
  }, [network, connectedChain, chainId, switchChain]);

  // We'll render the ThirdwebChainHandler in the return statement

  // Use the imported baseSepolia chain ID directly
  const baseSepoliaChainId = baseSepolia.id;

  // Log the Base Sepolia chain ID for debugging
  useEffect(() => {
    console.log("Using Base Sepolia chain ID:", baseSepoliaChainId);
  }, [baseSepoliaChainId]);

  // Attempt to switch the blockchain network when the selected chain changes
  useEffect(() => {
    // Only try to switch networks if the user is connected to a wallet
    if (!connectedChain || !switchChain) return;

    // Enable automatic network switching when the user changes the network in the dropdown
    const switchBlockchainNetwork = async () => {
      try {
        // For ThirdWeb (Polygon)
        if (network === "polygon") {
          if (connectedChain?.chainId !== chainId) {
            // Only attempt to switch if we have a valid chainId
            if (chainId && switchChain) {
              console.log(`Switching to Polygon Amoy chainId: ${chainId}`);
              // For ThirdWeb, we call switchChain with the chainId directly
              if (typeof switchChain === "function") {
                await (switchChain as (chainId: number) => Promise<void>)(
                  chainId
                );
              }
            }
          }
        }
        // For Wagmi (Base)
        else if (network === "base") {
          // For Base, we need to check if the connected chain ID matches the expected chain ID
          const currentChainId = connectedChain?.id;
          const targetChainId = baseSepoliaChainId || chainId;

          console.log(
            `Current chain ID: ${currentChainId}, Target chain ID: ${targetChainId}`
          );

          if (currentChainId !== targetChainId) {
            // Only attempt to switch if we have a valid chainId and switchChain function
            if (targetChainId && switchChain) {
              try {
                console.log(
                  `Attempting to switch to Base Sepolia chainId: ${targetChainId}`
                );

                // Use the correct parameter format for Wagmi switchChain
                if (typeof switchChain === "function") {
                  // For Wagmi, we call switchChain with an object containing chainId
                  await (
                    switchChain as (params: {
                      chainId: number;
                    }) => Promise<void>
                  )({
                    chainId: targetChainId,
                  });
                  console.log("Chain switch successful");
                }
              } catch (error) {
                console.error("Error switching chain:", error);
                throw error; // Re-throw to be caught by the outer try/catch
              }
            }
          } else {
            console.log("Already on the correct chain, no need to switch");
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
  }, [
    chain,
    chainId,
    connectedChain,
    switchChain,
    network,
    baseSepoliaChainId,
  ]);

  // Get the setNetwork function from the NetworkContext
  const { setNetwork } = useNetworkContext();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newChain = e.target.value as "amoy" | "base";

    // Update ChainContext
    setChain(newChain);
    localStorage.setItem("selectedChain", newChain);

    // Also update NetworkContext to keep them in sync
    // Map chain to network: "amoy" -> "polygon", "base" -> "base"
    const newNetwork = newChain === "amoy" ? "polygon" : "base";
    if (network !== newNetwork) {
      // Only update if different to avoid unnecessary re-renders
      setNetwork(newNetwork);
      console.log(`Updated network context to: ${newNetwork}`);
    }

    // Set flag to indicate user has explicitly changed the network
    localStorage.setItem("userChangedNetwork", "true");
  };

  // Sync chain with network when component mounts or network changes
  useEffect(() => {
    // Map network to chain: "polygon" -> "amoy", "base" -> "base"
    const expectedChain = network === "polygon" ? "amoy" : "base";
    if (chain !== expectedChain) {
      // Update chain to match network
      setChain(expectedChain);
      // Also update localStorage to keep everything in sync
      localStorage.setItem("selectedChain", expectedChain);
      console.log(
        `Synced chain (${chain}) with network (${network}) -> new chain: ${expectedChain}`
      );
    }

    // Force the correct chain ID in the context when using Base network
    if (network === "base" && baseSepoliaChainId) {
      // This ensures we're always using the correct Base Sepolia chain ID
      // even if there's a mismatch in the context
      localStorage.setItem("forceChainId", baseSepoliaChainId.toString());
    }
  }, [network, chain, setChain, baseSepoliaChainId]);

  return (
    <>
      {/* Render the ThirdwebChainHandler only when in polygon network */}
      {network === "polygon" && (
        <SafeThirdwebWrapper network={network}>
          <ThirdwebChainHandler onChainData={setThirdwebData} />
        </SafeThirdwebWrapper>
      )}

      <div className="network-info mb-2">
        <span className="text-xs text-gray-400">Current Network: </span>
        <span
          className="text-xs font-bold"
          style={{
            color: network === "base" ? "#0052FF" : "#8247E5",
          }}
        >
          {network === "polygon" ? "Polygon Amoy" : "Base Sepolia"}
        </span>
      </div>

      <select
        id="networkSelect"
        value={chain}
        onChange={handleChange}
        className="network-select w-full bg-black text-[#fcb131] border-2 border-[#fcb131] rounded-md py-2 px-3 text-sm cursor-pointer font-bold transition-all duration-300 hover:border-[#ffd700] focus:outline-none focus:ring-2 focus:ring-[#fcb131] focus:border-transparent shadow-md"
      >
        <option value="base">Base Sepolia</option>
        <option value="amoy">Polygon Amoy</option>
      </select>
    </>
  );
};

export default ChainSelector;
