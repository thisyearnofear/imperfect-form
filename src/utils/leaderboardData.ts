/**
 * Utility functions for fetching leaderboard data
 * Extracted from Leaderboard component for reuse in user stats
 */

import { ethers } from 'ethers';
import { SUPPORTED_NETWORKS } from '@/config/networks';

const { polygon, base, monad, celo } = SUPPORTED_NETWORKS;

const _POLYGON_CONTRACT_ADDRESS = polygon.contractAddress;
const _BASE_CONTRACT_ADDRESS = base.contractAddress;
const _MONAD_CONTRACT_ADDRESS = monad.contractAddress;
const _CELO_CONTRACT_ADDRESS = celo.contractAddress;
const _VERIFIED_FITNESS_CONTRACT_ADDRESS = SUPPORTED_NETWORKS.celoVerified.contractAddress;

import { Score, ContractScore, NetworkType } from '@/types';
import { getDisplayName } from '@/utils/ensResolver';
import { batchResolveFarcasterProfiles, FarcasterProfile } from '@/utils/neynarResolver';
import { shortenAddress } from '@/utils/formatters';
import { cacheLeaderboardData, clearLeaderboardCache } from './leaderboardCache';

interface LeaderboardData {
  pushups: Score[];
  squats: Score[];
  displayNames: Record<string, string>;
  farcasterProfiles?: Record<string, FarcasterProfile | null>;
}

/**
 * Fetch data from a contract with fallback RPC support
 */
async function fetchWithFallbackRpcs(
  contractAddress: string,
  networkName: string
): Promise<ContractScore[]> {
  const network = SUPPORTED_NETWORKS[networkName];
  if (!network || !network.rpcUrls || network.rpcUrls.length === 0) {
    throw new Error(`Unsupported or misconfigured network: ${networkName}`);
  }

  let lastError: Error | null = null;

  for (const rpc of network.rpcUrls) {
    try {
      console.log(`Trying ${networkName} RPC: ${rpc}`);
      const provider = new ethers.JsonRpcProvider(rpc);
      const contractInstance = new ethers.Contract(contractAddress, network.abi, provider);

      // Check if the contract exists at the address
      const code = await provider.getCode(contractAddress);
      if (code === '0x') {
        throw new Error(`No contract found at address`);
      }

      console.log(`Calling getLeaderboard() on ${networkName} contract at ${contractAddress}`);
      const data = await contractInstance.getLeaderboard();
      console.log(`Successfully retrieved ${data.length} entries from ${networkName}`);

      // Log sample entry to debug timestamp data
      if (data.length > 0) {
        console.log(`📊 Sample entry from ${networkName}:`, {
          user: data[0].user,
          pushups: data[0].pushups?.toString(),
          squats: data[0].squats?.toString(),
          timestamp: data[0].timestamp?.toString(),
          hasTimestamp: !!data[0].timestamp,
        });
      }

      return data || [];
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
  data.forEach((entry, index) => {
    console.log(`🔍 Processing entry ${index} from ${network}:`, {
      user: entry.user,
      pushups: entry.pushups,
      squats: entry.squats,
      timestamp: entry.timestamp,
      allKeys: Object.keys(entry),
    });

    try {
      let pushupScore = 0;
      let squatScore = 0;

      // Extract pushup score - handle BigNumber format
      if (entry.pushups !== undefined) {
        if (typeof entry.pushups === 'object' && entry.pushups !== null) {
          if (typeof entry.pushups.toString === 'function') {
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
        if (typeof entry.squats === 'object' && entry.squats !== null) {
          if (typeof entry.squats.toString === 'function') {
            squatScore = parseInt(entry.squats.toString());
          } else if (entry.squats._hex) {
            squatScore = parseInt(entry.squats._hex, 16);
          }
        } else {
          squatScore = Number(entry.squats);
        }
      }

      // Extract timestamp - this is critical for streak calculations
      let timestamp: number | undefined;
      if (entry.timestamp !== undefined) {
        if (typeof entry.timestamp === 'object' && entry.timestamp !== null) {
          if (typeof entry.timestamp.toString === 'function') {
            timestamp = parseInt(entry.timestamp.toString());
          } else if (entry.timestamp._hex) {
            timestamp = parseInt(entry.timestamp._hex, 16);
          }
        } else {
          timestamp = Number(entry.timestamp);
        }
      }

      // Only add entries with scores > 0
      if (pushupScore > 0) {
        pushups.push({
          user: entry.user,
          score: pushupScore,
          network: network as NetworkType,
          timestamp: timestamp, // ✅ FIX: Include timestamp for streak calculations
        });
      }

      if (squatScore > 0) {
        squats.push({
          user: entry.user,
          score: squatScore,
          network: network as NetworkType,
          timestamp: timestamp, // ✅ FIX: Include timestamp for streak calculations
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
    console.log('🔄 Fetching leaderboard data from all networks...');

    // FORCE COMPLETE CACHE CLEAR - timestamps issue
    console.log('🚨 FORCING COMPLETE CACHE CLEAR FOR TIMESTAMP FIX');
    clearLeaderboardCache();

    // Also clear any other caches that might interfere
    if (typeof window !== 'undefined') {
      localStorage.removeItem('leaderboardCache');
      localStorage.removeItem('leaderboardCacheTimestamp');
      localStorage.removeItem('leaderboard_data');
      localStorage.removeItem('leaderboard_timestamp');
      console.log('🧹 Cleared all possible cache keys');
    }

    // Clear cache to force fresh data with timestamp fixes
    console.log('🧹 Clearing cache to test timestamp extraction fix');
    clearLeaderboardCache(); // Force clear the cache

    console.log('📋 Available networks for main leaderboard:');
    Object.entries(SUPPORTED_NETWORKS)
      .filter(([networkName]) => networkName !== 'celoVerified')
      .forEach(([networkName, config]) => {
        console.log(`  - ${networkName}: ${config.contractAddress}`);
      });

    // Fetch data from all supported networks in parallel
    // EXCLUDE celoVerified from main leaderboard (has separate VerifiedLeaderboard component)
    const networkResults = await Promise.all(
      Object.entries(SUPPORTED_NETWORKS)
        .filter(([networkName]) => networkName !== 'celoVerified') // Keep verified separate
        .map(([networkName, networkConfig]) =>
          fetchWithFallbackRpcs(networkConfig.contractAddress, networkName)
            .then((data) => ({ network: networkName, data }))
            .catch((error) => {
              console.error(`Failed to fetch data for ${networkName}:`, error);
              return { network: networkName, data: [] };
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
    const farcasterProfilesMap = await batchResolveFarcasterProfiles(uniqueAddresses);

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
    cacheLeaderboardData(result);

    console.log('✅ Successfully fetched leaderboard data');
    return result;
  } catch (error) {
    console.error('❌ Error fetching leaderboard data:', error);
    return null;
  }
}
