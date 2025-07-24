/**
 * Utility functions for fetching leaderboard data
 * Extracted from Leaderboard component for reuse in user stats
 */

import { ethers } from "ethers";
import {
  fitnessLeaderboardABI,
  monadLeaderboardABI,
  polygonLeaderboardABI,
  baseLeaderboardABI,
  POLYGON_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
} from "@/constants/contracts";
import {
  POLYGON_FALLBACK_RPCS,
  BASE_FALLBACK_RPCS,
  MONAD_FALLBACK_RPCS,
  CELO_FALLBACK_RPCS,
} from "@/utils/rpcUtils";
import { Score, ContractScore, NetworkType } from "@/types";
import { getDisplayName } from "@/utils/ensResolver";
import { batchResolveFarcasterProfiles } from "@/utils/neynarResolver";
import { shortenAddress } from "@/utils/formatters";

interface LeaderboardData {
  pushups: Score[];
  squats: Score[];
  displayNames: Record<string, string>;
  farcasterProfiles?: Record<string, { username: string; displayName?: string } | null>;
}

/**
 * Fetch data from a contract with fallback RPC support
 */
async function fetchWithFallbackRpcs(
  contractAddress: string,
  rpcs: string[],
  networkName: string
): Promise<ContractScore[]> {
  let lastError: Error | null = null;

  for (const rpc of rpcs) {
    try {
      console.log(`Trying ${networkName} RPC: ${rpc}`);
      const provider = new ethers.JsonRpcProvider(rpc);

      // Select appropriate ABI based on network
      let abi;
      switch (networkName) {
        case "polygon":
          abi = polygonLeaderboardABI;
          break;
        case "base":
          abi = baseLeaderboardABI;
          break;
        case "monad":
          abi = monadLeaderboardABI;
          break;
        case "celo":
          abi = fitnessLeaderboardABI;
          break;
        default:
          abi = fitnessLeaderboardABI;
      }

      const contractInstance = new ethers.Contract(
        contractAddress,
        abi,
        provider
      );

      // Check if the contract exists at the address
      try {
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
          console.warn(
            `No contract found at ${contractAddress} on ${networkName}`
          );
          throw new Error(`No contract found at address`);
        }
      } catch (codeError) {
        console.error(
          `Error checking contract code at ${contractAddress}:`,
          codeError
        );
        throw codeError;
      }

      console.log(
        `Calling getLeaderboard() on ${networkName} contract at ${contractAddress}`
      );

      try {
        const data = await contractInstance.getLeaderboard();
        console.log(
          `Successfully retrieved ${data.length} entries from ${networkName}`
        );
        return data || [];
      } catch (callError) {
        console.error(
          `Error calling getLeaderboard on ${networkName}:`,
          callError
        );
        throw callError;
      }
    } catch (error) {
      console.error(`RPC ${rpc} failed for ${networkName}:`, error);
      lastError = error as Error;
      continue;
    }
  }

  throw lastError || new Error(`All RPCs failed for ${networkName}`);
}

/**
 * Process contract data into Score format
 */
function processContractData(
  data: ContractScore[],
  network: string,
  pushups: Score[],
  squats: Score[]
): void {
  data.forEach((entry) => {
    try {
      let pushupScore = 0;
      let squatScore = 0;

      // Extract pushup score - handle BigNumber format
      if (entry.pushups !== undefined) {
        if (typeof entry.pushups === "object" && entry.pushups !== null) {
          if (typeof entry.pushups.toString === "function") {
            pushupScore = parseInt(entry.pushups.toString());
          } else if (entry.pushups._hex) {
            pushupScore = parseInt(entry.pushups._hex, 16);
          }
        } else {
          pushupScore = Number(entry.pushups);
        }
      }

      // Extract squat score - handle BigNumber format
      if (entry.squats !== undefined) {
        if (typeof entry.squats === "object" && entry.squats !== null) {
          if (typeof entry.squats.toString === "function") {
            squatScore = parseInt(entry.squats.toString());
          } else if (entry.squats._hex) {
            squatScore = parseInt(entry.squats._hex, 16);
          }
        } else {
          squatScore = Number(entry.squats);
        }
      }

      // Only add entries with scores > 0
      if (pushupScore > 0) {
        pushups.push({
          user: entry.user,
          score: pushupScore,
          network: network as NetworkType,
        });
      }

      if (squatScore > 0) {
        squats.push({
          user: entry.user,
          score: squatScore,
          network: network as NetworkType,
        });
      }
    } catch {
      // Silent fail for entry processing errors
    }
  });
}

/**
 * Main function to fetch leaderboard data from all networks
 */
export async function getLeaderboard(): Promise<LeaderboardData | null> {
  try {
    console.log("🔄 Fetching leaderboard data from all networks...");

    // Check cache first
    if (typeof window !== "undefined") {
      const cachedData = localStorage.getItem("leaderboardCache");
      const cacheTimestamp = localStorage.getItem("leaderboardCacheTimestamp");
      
      if (cachedData && cacheTimestamp) {
        const cacheAge = Date.now() - parseInt(cacheTimestamp);
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        
        if (cacheAge < CACHE_DURATION) {
          try {
            const parsedData = JSON.parse(cachedData);
            console.log("📦 Using cached leaderboard data");
            return parsedData;
          } catch (error) {
            console.error("Error parsing cached leaderboard data:", error);
          }
        }
      }
    }

    // Define active networks
    const activeNetworks = [
      {
        network: "polygon",
        address: POLYGON_CONTRACT_ADDRESS,
        rpcs: POLYGON_FALLBACK_RPCS,
      },
      {
        network: "base",
        address: BASE_CONTRACT_ADDRESS,
        rpcs: BASE_FALLBACK_RPCS,
      },
      {
        network: "monad",
        address: MONAD_CONTRACT_ADDRESS,
        rpcs: MONAD_FALLBACK_RPCS,
      },
      {
        network: "celo",
        address: CELO_CONTRACT_ADDRESS,
        rpcs: CELO_FALLBACK_RPCS,
      },
    ];

    // Fetch data from active networks in parallel
    const networkResults = await Promise.all(
      activeNetworks.map(({ network, address, rpcs }) =>
        fetchWithFallbackRpcs(address, rpcs, network)
          .then((data) => ({ network, data }))
          .catch((error) => {
            console.error(`Failed to fetch data for ${network}:`, error);
            return { network, data: [] };
          })
      )
    );

    // Process all network data
    const pushups: Score[] = [];
    const squats: Score[] = [];

    networkResults.forEach(({ network, data }) => {
      processContractData(data, network, pushups, squats);
    });

    // Sort by score (highest first)
    const sortedPushups = pushups.sort((a, b) => b.score - a.score);
    const sortedSquats = squats.sort((a, b) => b.score - a.score);

    // Resolve display names
    const uniqueAddresses = Array.from(
      new Set([
        ...sortedPushups.map((entry) => entry.user),
        ...sortedSquats.map((entry) => entry.user),
      ])
    );

    // Batch resolve Farcaster profiles first
    const farcasterProfilesMap = await batchResolveFarcasterProfiles(
      uniqueAddresses
    );

    // Build display names with Farcaster priority
    const names: Record<string, string> = {};

    for (const address of uniqueAddresses) {
      const farcasterProfile = farcasterProfilesMap.get(address);

      if (farcasterProfile) {
        names[address] = `@${farcasterProfile.username}`;
      } else {
        try {
          const displayName = await getDisplayName(address);
          names[address] = displayName;
        } catch {
          names[address] = shortenAddress(address);
        }
      }
    }

    const result: LeaderboardData = {
      pushups: sortedPushups,
      squats: sortedSquats,
      displayNames: names,
      farcasterProfiles: Object.fromEntries(farcasterProfilesMap),
    };

    // Cache the result
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("leaderboardCache", JSON.stringify(result));
        localStorage.setItem("leaderboardCacheTimestamp", Date.now().toString());
        console.log("💾 Cached leaderboard data");
      } catch (cacheError) {
        console.error("Error caching leaderboard data:", cacheError);
      }
    }

    console.log("✅ Successfully fetched leaderboard data");
    return result;

  } catch (error) {
    console.error("❌ Error fetching leaderboard data:", error);
    return null;
  }
}
