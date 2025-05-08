"use client";

import React, { useState, useEffect } from "react";
import "@/styles/leaderboard.css";
import { ethers } from "ethers";
import {
  fitnessLeaderboardABI,
  POLYGON_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
} from "@/constants/contracts";
import { shortenAddress } from "@/utils/formatters";
import { getDisplayName } from "@/utils/ensResolver";
import { POLYGON_FALLBACK_RPCS, BASE_FALLBACK_RPCS } from "@/utils/rpcUtils";
import Spinner from "@/components/Spinner";
import toast from "react-hot-toast";

interface Score {
  user: string;
  score: number;
  network: "polygon" | "base";
  displayName?: string;
}

interface LeaderboardProps {
  limit?: number;
  showNetworkSelector?: boolean;
  onViewMore?: (
    pushups: Score[],
    squats: Score[],
    displayNames: Record<string, string>
  ) => void;
  initialPushups?: Score[];
  initialSquats?: Score[];
  initialDisplayNames?: Record<string, string>;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  limit,
  // Network selector is defined but not currently used in the UI
  // showNetworkSelector = false,
  onViewMore,
  initialPushups,
  initialSquats,
  initialDisplayNames,
}) => {
  const [isLoading, setIsLoading] = useState(!initialPushups && !initialSquats);
  const [pushupLeaderboard, setPushupLeaderboard] = useState<Score[]>(
    initialPushups || []
  );
  const [squatLeaderboard, setSquatLeaderboard] = useState<Score[]>(
    initialSquats || []
  );
  // Tab state is defined but currently not used for switching in the UI
  // const [activeTab] = useState<"pushups" | "squats">("pushups");
  const [displayNames, setDisplayNames] = useState<Record<string, string>>(
    initialDisplayNames || {}
  );

  // We'll use ethers.js directly instead of ThirdWeb hooks
  // This avoids React hook issues when switching between wallet modes

  // Function to fetch data using fallback RPC URLs
  const fetchWithFallbackRpcs = async (
    contract: ethers.Contract | null,
    contractAddress: string,
    fallbackRpcUrls: string[]
  ) => {
    // Try using ThirdWeb contract first
    try {
      if (contract) {
        const data = await contract.call("getLeaderboard");
        return data || [];
      }
    } catch (error) {
      console.warn("Failed to fetch data using ThirdWeb contract:", error);
    }

    // If ThirdWeb fails, try fallback RPC URLs with ethers.js
    for (const rpcUrl of fallbackRpcUrls) {
      try {
        console.log(`Trying to fetch data from ${rpcUrl}`);
        // Use a more robust provider initialization with proper network configuration
        // Define network information based on the RPC URL
        const networkInfo =
          rpcUrl.includes("polygon") || rpcUrl.includes("matic")
            ? {
                name: "polygon-amoy",
                chainId: 80002, // Polygon Amoy chainId
              }
            : {
                name: "base-sepolia",
                chainId: 84532, // Base Sepolia chainId
              };

        // Create provider with correct network info and options
        const provider = new ethers.providers.StaticJsonRpcProvider(
          rpcUrl,
          networkInfo
        );

        // Set a custom timeout for the provider connection
        const TIMEOUT_MS = 15000; // Increase timeout to 15 seconds

        try {
          // Set a timeout for getting the network
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error(`RPC timeout for ${rpcUrl}`)),
              TIMEOUT_MS
            )
          );

          // Race between provider connection and timeout
          await Promise.race([provider.ready, timeoutPromise]);

          // Verify the provider is connected to the expected network
          const network = await provider.getNetwork();
          console.log(
            `Connected to network: ${network.name} (${network.chainId})`
          );
        } catch (timeoutError) {
          console.error(`Connection timeout for ${rpcUrl}:`, timeoutError);
          throw timeoutError;
        }

        const contractInstance = new ethers.Contract(
          contractAddress,
          fitnessLeaderboardABI,
          provider
        );

        const data = await contractInstance.getLeaderboard();
        console.log(`Successfully fetched data from ${rpcUrl}`);
        return data || [];
      } catch (error) {
        // Provide more detailed error logging
        const err = error as {
          code?: string;
          reason?: string;
          message?: string;
        };
        if (err && err.code === "CALL_EXCEPTION") {
          console.error(
            `Contract call exception for ${rpcUrl}:`,
            err.reason || "No reason provided"
          );
        } else if (err && err.code === "TIMEOUT") {
          console.error(`Timeout error for ${rpcUrl}`);
        } else if (err && err.code === "NETWORK_ERROR") {
          console.error(`Network error for ${rpcUrl}:`, err.message);
        } else {
          console.error(`Error fetching data from ${rpcUrl}:`, err);
        }

        // Continue to the next RPC URL
      }
    }

    // Return empty array if all attempts fail
    console.warn("All RPC URLs failed, returning empty array");
    return [];
  };

  // Define fetchLeaderboardData using useCallback to avoid dependency issues
  const fetchLeaderboardData = React.useCallback(async () => {
    setIsLoading(true);

    try {
      // Fetch data from both networks using fallback mechanism
      const polygonData = await fetchWithFallbackRpcs(
        null, // No ThirdWeb contract
        POLYGON_CONTRACT_ADDRESS,
        POLYGON_FALLBACK_RPCS
      );

      const baseData = await fetchWithFallbackRpcs(
        null, // No ThirdWeb contract
        BASE_CONTRACT_ADDRESS,
        BASE_FALLBACK_RPCS
      );

      // Process the data
      const pushups: Score[] = [];
      const squats: Score[] = [];

      // Helper function to process data from each network
      // Define a type for the contract data structure
      type ContractEntry = {
        user: string;
        pushups: ethers.BigNumber | number;
        squats: ethers.BigNumber | number;
      };

      const processNetworkData = (
        data: ContractEntry[],
        network: "polygon" | "base"
      ) => {
        data.forEach((entry) => {
          if (entry.user !== "0x0000000000000000000000000000000000000000") {
            // Convert BigNumber to number if needed
            const pushupScore =
              typeof entry.pushups === "object" && entry.pushups._isBigNumber
                ? parseInt(entry.pushups.toString())
                : parseInt(String(entry.pushups));

            const squatScore =
              typeof entry.squats === "object" && entry.squats._isBigNumber
                ? parseInt(entry.squats.toString())
                : parseInt(String(entry.squats));

            // Only add entries with scores > 0
            if (pushupScore > 0) {
              pushups.push({
                user: entry.user,
                score: pushupScore,
                network: network,
              });
            }

            if (squatScore > 0) {
              squats.push({
                user: entry.user,
                score: squatScore,
                network: network,
              });
            }
          }
        });
      };

      // Process data from both networks
      processNetworkData(polygonData, "polygon");
      processNetworkData(baseData, "base");

      // Sort by score (highest first)
      const sortedPushups = pushups.sort((a, b) => b.score - a.score);
      const sortedSquats = squats.sort((a, b) => b.score - a.score);

      setPushupLeaderboard(sortedPushups);
      setSquatLeaderboard(sortedSquats);

      // Resolve ENS names for all unique addresses
      const uniqueAddresses = new Set([
        ...sortedPushups.map((entry) => entry.user),
        ...sortedSquats.map((entry) => entry.user),
      ]);

      const names: Record<string, string> = {};

      for (const address of uniqueAddresses) {
        try {
          const displayName = await getDisplayName(address);
          names[address] = displayName;
        } catch {
          names[address] = shortenAddress(address);
        }
      }

      setDisplayNames(names);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      toast.error("Failed to load leaderboard data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch leaderboard data on component mount
  useEffect(() => {
    // Skip fetching if initial data is provided
    if (initialPushups && initialSquats && initialDisplayNames) {
      setIsLoading(false);
      return;
    }

    fetchLeaderboardData();
  }, [
    fetchLeaderboardData,
    initialPushups,
    initialSquats,
    initialDisplayNames,
  ]);

  // fetchWithFallbackRpcs is now defined above

  // fetchLeaderboardData is now defined above using useCallback

  // Get the active leaderboard based on the selected tab
  // This is not currently used since we display both pushups and squats
  // const activeLeaderboard =
  //   activeTab === "pushups" ? pushupLeaderboard : squatLeaderboard;

  // We don't use displayScores directly since we render pushups and squats separately
  // const displayScores =
  //   typeof limit === "number"
  //     ? activeLeaderboard.slice(0, limit)
  //     : activeLeaderboard;

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (pushupLeaderboard.length === 0 && squatLeaderboard.length === 0) {
    return (
      <div className="text-center py-4">
        <p>No leaderboard data available</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <h2>Top Performers</h2>
      <button
        id="loadLeaderboardButton"
        className="load-button"
        onClick={() => {
          setIsLoading(true);
          // Refetch data
          fetchLeaderboardData();
        }}
      >
        Load
      </button>

      <div className="overflow-x-auto">
        <table id="leaderboardTable">
          <tbody id="leaderboardBody">
            {/* Push-ups Section */}
            <tr>
              <td
                colSpan={4}
                style={{
                  backgroundColor: "#fcb131",
                  textAlign: "center",
                  color: "black",
                  fontWeight: "bold",
                }}
              >
                Push-ups
              </td>
            </tr>
            {pushupLeaderboard.slice(0, limit || 2).map((entry, i) => (
              <tr
                key={`pushup-${entry.user}-${entry.network}-${i}`}
                className={
                  entry.network === "polygon" ? "pink-entry" : "blue-entry"
                }
              >
                <td>{i + 1}</td>
                <td>
                  {displayNames[entry.user] || shortenAddress(entry.user)}
                </td>
                <td>{entry.score}</td>
                <td>
                  <span
                    className={
                      entry.network === "polygon"
                        ? "text-pink-500 font-bold"
                        : "text-blue-500 font-bold"
                    }
                  >
                    {entry.network === "polygon" ? "Polygon" : "Base"}
                  </span>
                </td>
              </tr>
            ))}

            {/* Squats Section */}
            <tr>
              <td
                colSpan={4}
                style={{
                  backgroundColor: "#00a651",
                  textAlign: "center",
                  color: "white",
                  fontWeight: "bold",
                }}
              >
                Squats
              </td>
            </tr>
            {squatLeaderboard.slice(0, limit || 2).map((entry, i) => (
              <tr
                key={`squat-${entry.user}-${entry.network}-${i}`}
                className={
                  entry.network === "polygon" ? "pink-entry" : "blue-entry"
                }
              >
                <td>{i + 1}</td>
                <td>
                  {displayNames[entry.user] || shortenAddress(entry.user)}
                </td>
                <td>{entry.score}</td>
                <td>
                  <span
                    className={
                      entry.network === "polygon"
                        ? "text-pink-500 font-bold"
                        : "text-blue-500 font-bold"
                    }
                  >
                    {entry.network === "polygon" ? "Polygon" : "Base"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* View more button - always show if we have data and onViewMore is provided */}
      {(pushupLeaderboard.length > 0 || squatLeaderboard.length > 0) &&
        onViewMore && (
          <div className="text-center mt-4">
            <button
              id="view-more-button"
              className="view-more-button"
              onClick={() => {
                onViewMore(pushupLeaderboard, squatLeaderboard, displayNames);
              }}
            >
              View Full Leaderboard
            </button>
          </div>
        )}
    </div>
  );
};

export default Leaderboard;
