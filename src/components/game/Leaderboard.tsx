'use client';

import React, { useState, useEffect } from 'react';
import { chainConfigs, SupportedChain } from '@/utils/chainSwitching';
import Image from 'next/image';
import '@/styles/leaderboard.css';
import { ethers } from 'ethers';
import {
  fitnessLeaderboardABI,
  monadLeaderboardABI,
  polygonLeaderboardABI,
  baseLeaderboardABI,
} from '@/constants/contracts';
import { SUPPORTED_NETWORKS } from '@/config/networks';
import {
  getNetworkStyling,
  getMedalStyle,
  getGoldenGlow,
  getHoverEffects,
} from '@/utils/leaderboardUtils';

const POLYGON_CONTRACT_ADDRESS = SUPPORTED_NETWORKS.polygon.contractAddress;
const BASE_CONTRACT_ADDRESS = SUPPORTED_NETWORKS.base.contractAddress;
const MONAD_CONTRACT_ADDRESS = SUPPORTED_NETWORKS.monad.contractAddress;
const CELO_CONTRACT_ADDRESS = SUPPORTED_NETWORKS.celo.contractAddress;
import { shortenAddress } from '@/utils/formatters';
import { getDisplayName } from '@/utils/ensResolver';
import { batchResolveFarcasterProfiles, type FarcasterProfile } from '@/utils/neynarResolver';
import {
  POLYGON_FALLBACK_RPCS,
  BASE_FALLBACK_RPCS,
  MONAD_FALLBACK_RPCS,
  CELO_FALLBACK_RPCS,
} from '@/utils/rpcUtils';
import { Spinner } from '@/components/ui';
import toast from 'react-hot-toast';
import { Score, ContractScore } from '@/types';
import {
  getCachedLeaderboardData,
  cacheLeaderboardData,
  clearLeaderboardCache,
} from '@/utils/leaderboardCache';
import { useBatchVerificationStatus } from '@/hooks/useBatchVerificationStatus';
import VerificationBadge from '@/components/verification/VerificationBadge';
import VerifiedLeaderboard from '@/components/leaderboard/VerifiedLeaderboard';
import { ProfileDisplay } from '@/components/leaderboard/ProfileDisplay';

interface LeaderboardProps {
  limit?: number;
  showNetworkSelector?: boolean;
  onViewMore?: (pushups: Score[], squats: Score[], displayNames: Record<string, string>) => void;
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
  const [pushupLeaderboard, setPushupLeaderboard] = useState<Score[]>(initialPushups || []);
  const [squatLeaderboard, setSquatLeaderboard] = useState<Score[]>(initialSquats || []);
  // Tab state is defined but currently not used for switching in the UI
  // const [activeTab] = useState<"pushups" | "squats">("pushups");
  const [displayNames, setDisplayNames] = useState<Record<string, string>>(
    initialDisplayNames || {}
  );
  const [farcasterProfiles, setFarcasterProfiles] = useState<
    Record<string, FarcasterProfile | null>
  >({});
  const [activeTab, setActiveTab] = useState<'all' | 'verified'>('all');

  // Get all unique user addresses for verification checking
  const allUserAddresses = React.useMemo(() => {
    const addresses = new Set<string>();
    [...pushupLeaderboard, ...squatLeaderboard].forEach((entry) => {
      addresses.add(entry.user);
    });
    return Array.from(addresses);
  }, [pushupLeaderboard, squatLeaderboard]);

  // Check verification status for all users
  const { verificationStatuses } = useBatchVerificationStatus(allUserAddresses);

  // We'll use ethers.js directly instead of ThirdWeb hooks
  // This avoids React hook issues when switching between wallet modes

  // Circuit breaker for failed networks
  const [networkRetryCount, setNetworkRetryCount] = useState<Record<string, number>>({});

  // Helper function to verify contract addresses
  const verifyContractAddresses = () => {
    console.log('Verifying contract addresses:');
    console.log(`Polygon: ${POLYGON_CONTRACT_ADDRESS}`);
    console.log(`Base: ${BASE_CONTRACT_ADDRESS}`);
    console.log(`Monad: ${MONAD_CONTRACT_ADDRESS}`);
    console.log(`Celo: ${CELO_CONTRACT_ADDRESS}`);

    // Check for invalid addresses
    const isValidAddress = (address: string) => {
      return /^0x[a-fA-F0-9]{40}$/.test(address);
    };

    if (!isValidAddress(POLYGON_CONTRACT_ADDRESS)) {
      console.error(`Invalid Polygon contract address: ${POLYGON_CONTRACT_ADDRESS}`);
    }
    if (!isValidAddress(BASE_CONTRACT_ADDRESS)) {
      console.error(`Invalid Base contract address: ${BASE_CONTRACT_ADDRESS}`);
    }
    if (!isValidAddress(MONAD_CONTRACT_ADDRESS)) {
      console.error(`Invalid Monad contract address: ${MONAD_CONTRACT_ADDRESS}`);
    }
    if (!isValidAddress(CELO_CONTRACT_ADDRESS)) {
      console.error(`Invalid Celo contract address: ${CELO_CONTRACT_ADDRESS}`);
    }
  };

  // Define fetchLeaderboardData using useCallback to avoid dependency issues
  const fetchLeaderboardData = React.useCallback(async () => {
    // Function to fetch data using fallback RPC URLs with improved error handling
    const fetchWithFallbackRpcs = async (
      contractAddress: string,
      fallbackRpcUrls: string[],
      networkName: string
    ) => {
      // Only log in development mode - reduce spam
      const isDev = process.env.NODE_ENV === 'development';

      if (isDev && !('fetchLog' in window)) {
        console.log(`Fetching leaderboard data for all networks`);
        (window as Window & { fetchLog?: boolean }).fetchLog = true;
      }

      // Circuit breaker: if network has failed too many times, skip it
      const currentRetryCount = networkRetryCount[networkName] || 0;
      const MAX_NETWORK_FAILURES = 3;

      if (currentRetryCount >= MAX_NETWORK_FAILURES) {
        console.warn(`⚡ Circuit breaker: Skipping ${networkName} due to repeated failures`);
        return [];
      }

      // Use direct ethers.js with fallback RPC URLs
      for (const rpcUrl of fallbackRpcUrls) {
        // Add exponential backoff retry logic
        const MAX_RETRIES = 1; // Reduced from 2 to 1 to prevent spam
        for (let retry = 0; retry <= MAX_RETRIES; retry++) {
          try {
            if (retry > 0) {
              // Exponential backoff - wait longer between each retry
              await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retry)));
            }

            // Simplified network detection with caching for performance using centralized config
            const networkMap: Record<string, { name: string; chainId: number }> = {
              polygon: {
                name: 'polygon',
                chainId: chainConfigs[SupportedChain.POLYGON].id,
              },
              matic: {
                name: 'polygon',
                chainId: chainConfigs[SupportedChain.POLYGON].id,
              },
              base: {
                name: 'base',
                chainId: chainConfigs[SupportedChain.BASE].id,
              },
              sepolia: {
                name: 'base',
                chainId: chainConfigs[SupportedChain.BASE].id,
              },
              monad: {
                name: 'monad',
                chainId: chainConfigs[SupportedChain.MONAD].id,
              },
              celo: {
                name: 'celo',
                chainId: chainConfigs[SupportedChain.CELO].id,
              },
            };

            // Find the network info by looking for keywords in the URL
            const networkKey = Object.keys(networkMap).find((key) =>
              rpcUrl.toLowerCase().includes(key.toLowerCase())
            );

            const networkInfo = networkKey
              ? networkMap[networkKey]
              : { name: 'unknown', chainId: 1 };

            // Create provider with correct network info and options
            const provider = new ethers.JsonRpcProvider(rpcUrl, networkInfo, {
              staticNetwork: true,
            });

            // Set a custom timeout for the provider connection
            const TIMEOUT_MS = 15000; // 15 seconds

            try {
              // Set a timeout for getting the network
              const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`RPC timeout for ${rpcUrl}`)), TIMEOUT_MS)
              );

              // Race between provider connection and timeout
              await Promise.race([provider.ready, timeoutPromise]);

              // Verify the provider is connected to the expected network
              await provider.getNetwork();
            } catch (timeoutError) {
              throw timeoutError;
            }

            // Determine which ABI to use based on the contract address and network
            let contractABI: any = fitnessLeaderboardABI;

            // Use network-specific ABIs based on contract address
            if (contractAddress === MONAD_CONTRACT_ADDRESS) {
              contractABI = monadLeaderboardABI;
            } else if (contractAddress === POLYGON_CONTRACT_ADDRESS) {
              contractABI = polygonLeaderboardABI;
            } else if (contractAddress === BASE_CONTRACT_ADDRESS) {
              contractABI = baseLeaderboardABI;
            }

            const contractInstance = new ethers.Contract(contractAddress, contractABI, provider);

            // Check if the contract exists at the address
            try {
              const code = await provider.getCode(contractAddress);
              if (code === '0x') {
                console.warn(`No contract found at ${contractAddress} on ${networkName}`);
                throw new Error(`No contract found at address`);
              }
            } catch (codeError) {
              console.error(`Error checking contract code at ${contractAddress}:`, codeError);
              throw codeError;
            }

            // Reduce logging spam - only log errors
            try {
              const data = await contractInstance.getLeaderboard();
              return data || [];
            } catch (callError) {
              console.error(`Error calling getLeaderboard on ${networkName}:`, callError);
              throw callError;
            }
          } catch (error) {
            // Provide more detailed error logging
            const err = error as {
              code?: string;
              reason?: string;
              message?: string;
              error?: { message?: string; code?: string; reason?: string };
            };

            // Extract error details, handling different error formats
            const errorCode = err.code || (err.error && err.error.code) || 'UNKNOWN';
            const errorReason = err.reason || (err.error && err.error.reason) || '';
            const errorMessage = err.message || (err.error && err.error.message) || 'Unknown error';

            if (errorCode === 'CALL_EXCEPTION') {
              console.error(
                `Contract call exception for ${rpcUrl} (${networkName}):`,
                errorReason || errorMessage || 'No reason provided'
              );
            } else if (errorCode === 'TIMEOUT') {
              console.error(`Timeout error for ${rpcUrl} (${networkName})`);
            } else if (errorCode === 'NETWORK_ERROR') {
              console.error(`Network error for ${rpcUrl} (${networkName}):`, errorMessage);
            } else {
              console.error(`Error fetching data from ${rpcUrl} (${networkName}):`, err);
            }

            // If we've reached max retries, continue to the next RPC URL
            if (retry === MAX_RETRIES) {
              console.warn(
                `Max retries reached for ${rpcUrl} (${networkName}), trying next RPC URL`
              );
              break;
            }

            // Otherwise, we'll retry this RPC URL
          }
        }
      }

      // Increment failure count for this network
      setNetworkRetryCount((prev) => ({
        ...prev,
        [networkName]: (prev[networkName] || 0) + 1,
      }));

      // Return empty array if all attempts fail
      console.warn(
        `All RPC URLs failed for ${networkName}, returning empty array. Failure count: ${
          currentRetryCount + 1
        }`
      );
      return [];
    };
    setIsLoading(true);

    // Verify contract addresses
    verifyContractAddresses();

    // Check if we have cached data
    const cachedData = getCachedLeaderboardData();
    if (cachedData) {
      setPushupLeaderboard(cachedData.pushups);
      setSquatLeaderboard(cachedData.squats);
      setDisplayNames(cachedData.displayNames);
      // Restore Farcaster profiles if available in cache
      if (cachedData.farcasterProfiles) {
        setFarcasterProfiles(cachedData.farcasterProfiles);
      }
      setIsLoading(false);

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Using cached leaderboard data');
      }

      return;
    }

    try {
      // Get all active networks from localStorage or default to base/polygon
      const activeNetworks = [];

      // Always include base and polygon as default networks
      activeNetworks.push({
        network: 'base',
        address: BASE_CONTRACT_ADDRESS,
        rpcs: BASE_FALLBACK_RPCS,
      });

      activeNetworks.push({
        network: 'polygon',
        address: POLYGON_CONTRACT_ADDRESS,
        rpcs: POLYGON_FALLBACK_RPCS,
      });

      // Always fetch data from all networks
      activeNetworks.push({
        network: 'monad',
        address: MONAD_CONTRACT_ADDRESS,
        rpcs: MONAD_FALLBACK_RPCS,
      });

      activeNetworks.push({
        network: 'celo',
        address: CELO_CONTRACT_ADDRESS,
        rpcs: CELO_FALLBACK_RPCS,
      });

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

      // Extract data from results
      let polygonData = [];
      let baseData = [];
      let monadData = [];
      let celoData = [];

      // Assign data to appropriate variables
      for (const result of networkResults) {
        if (result.network === 'polygon') polygonData = result.data;
        if (result.network === 'base') baseData = result.data;
        if (result.network === 'monad') monadData = result.data;
        if (result.network === 'celo') celoData = result.data;
      }

      // Process the data
      const pushups: Score[] = [];
      const squats: Score[] = [];

      // Helper function to process data from each network with improved error handling
      const processNetworkData = (
        data: ContractScore[],
        network: 'polygon' | 'base' | 'monad' | 'celo'
      ) => {
        if (!Array.isArray(data)) {
          console.error(`Invalid data format for ${network}`);
          return;
        }

        data.forEach((entry) => {
          try {
            // Skip null entries or zero address
            if (!entry || entry.user === '0x0000000000000000000000000000000000000000') {
              return;
            }

            // Validate entry structure
            if (!entry.user || entry.user.length !== 42 || !entry.user.startsWith('0x')) {
              return;
            }

            // All contracts now use the standardized structure: user, pushups, squats, timestamp
            let pushupScore = 0;
            let squatScore = 0;
            let timestamp = 0;

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

            // Extract timestamp - handle BigNumber format
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
                network: network,
                timestamp: timestamp > 0 ? timestamp : undefined,
              });
            }

            if (squatScore > 0) {
              squats.push({
                user: entry.user,
                score: squatScore,
                network: network,
                timestamp: timestamp > 0 ? timestamp : undefined,
              });
            }
          } catch {
            // Silent fail for entry processing errors
          }
        });
      };

      // Only log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log('Data counts:', {
          polygon: polygonData.length,
          base: baseData.length,
          monad: monadData.length,
          celo: celoData.length,
        });
      }

      // Process data from all networks with error handling
      try {
        processNetworkData(polygonData, 'polygon');
        processNetworkData(baseData, 'base');
        processNetworkData(monadData, 'monad');
        processNetworkData(celoData, 'celo');
      } catch (error) {
        console.error('Error processing network data:', error);
      }

      // Sort by score (highest first)
      const sortedPushups = pushups.sort((a, b) => b.score - a.score);
      const sortedSquats = squats.sort((a, b) => b.score - a.score);

      setPushupLeaderboard(sortedPushups);
      setSquatLeaderboard(sortedSquats);

      // Resolve Farcaster profiles and ENS names for all unique addresses
      const uniqueAddresses = Array.from(
        new Set([
          ...sortedPushups.map((entry) => entry.user),
          ...sortedSquats.map((entry) => entry.user),
        ])
      );

      // Batch resolve Farcaster profiles first (more efficient)
      const farcasterProfilesMap = await batchResolveFarcasterProfiles(uniqueAddresses);
      setFarcasterProfiles(Object.fromEntries(farcasterProfilesMap));

      // Build display names with Farcaster priority
      const names: Record<string, string> = {};

      for (const address of uniqueAddresses) {
        const farcasterProfile = farcasterProfilesMap.get(address);

        if (farcasterProfile) {
          // Use Farcaster username with @ prefix
          names[address] = `@${farcasterProfile.username}`;
        } else {
          // Fallback to ENS resolution
          try {
            const displayName = await getDisplayName(address);
            names[address] = displayName;
          } catch {
            names[address] = shortenAddress(address);
          }
        }
      }

      setDisplayNames(names);

      // Cache the leaderboard data
      const cacheData = {
        pushups: sortedPushups,
        squats: sortedSquats,
        displayNames: names,
        farcasterProfiles: Object.fromEntries(farcasterProfilesMap),
      };
      cacheLeaderboardData(cacheData);
    } catch (error) {
      console.error('Error fetching leaderboard data:', error);
      toast.error('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  }, [networkRetryCount]);

  // Fetch leaderboard data on component mount
  useEffect(() => {
    // Skip fetching if initial data is provided
    if (initialPushups && initialSquats && initialDisplayNames) {
      setIsLoading(false);
      return;
    }

    // Clear the cache to ensure we get fresh data after contract updates
    clearLeaderboardCache();

    fetchLeaderboardData();
  }, [fetchLeaderboardData, initialPushups, initialSquats, initialDisplayNames]);

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

  // Debug logging - only log significant changes
  if (process.env.NODE_ENV === 'development') {
    const currentState = `${pushupLeaderboard.length}-${squatLeaderboard.length}-${isLoading}`;
    const shouldLog =
      !('leaderboardLastLog' in window) ||
      (window as Window & { leaderboardLastLog?: string }).leaderboardLastLog !== currentState;

    if (shouldLog) {
      console.log('Leaderboard state:', {
        pushupLength: pushupLeaderboard.length,
        squatLength: squatLeaderboard.length,
        isLoading,
        pushupSample: pushupLeaderboard.slice(0, 2),
        squatSample: squatLeaderboard.slice(0, 2),
      });
      (window as Window & { leaderboardLastLog?: string }).leaderboardLastLog = currentState;
    }
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

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded font-bold transition-all duration-300 ${
            activeTab === 'all'
              ? 'bg-fcb131 text-black shadow-lg'
              : 'bg-gray-800 text-fcb131 border border-fcb131 hover:bg-fcb131 hover:text-black'
          }`}
          style={{
            backgroundColor: activeTab === 'all' ? '#fcb131' : 'rgba(17, 17, 17, 0.8)',
            color: activeTab === 'all' ? 'black' : '#fcb131',
            border: activeTab === 'all' ? '2px solid #fcb131' : '2px solid #fcb131',
            textShadow: activeTab === 'all' ? 'none' : '0 0 5px rgba(252, 177, 49, 0.5)',
            boxShadow: activeTab === 'all' ? '0 0 10px rgba(252, 177, 49, 0.5)' : 'none',
          }}
          onClick={() => setActiveTab('all')}
        >
          All Users
        </button>
        <button
          className={`px-4 py-2 rounded font-bold transition-all duration-300 ${
            activeTab === 'verified'
              ? 'bg-fcb131 text-black shadow-lg'
              : 'bg-gray-800 text-fcb131 border border-fcb131 hover:bg-fcb131 hover:text-black'
          }`}
          style={{
            backgroundColor: activeTab === 'verified' ? '#fcb131' : 'rgba(17, 17, 17, 0.8)',
            color: activeTab === 'verified' ? 'black' : '#fcb131',
            border: activeTab === 'verified' ? '2px solid #fcb131' : '2px solid #fcb131',
            textShadow: activeTab === 'verified' ? 'none' : '0 0 5px rgba(252, 177, 49, 0.5)',
            boxShadow: activeTab === 'verified' ? '0 0 10px rgba(252, 177, 49, 0.5)' : 'none',
          }}
          onClick={() => setActiveTab('verified')}
        >
          ✓ Verified Only
        </button>
      </div>

      <div className="flex gap-2 mb-2">
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
        <button
          id="clearCacheButton"
          className="load-button"
          onClick={() => {
            // Clear cache and reload
            clearLeaderboardCache();
            setIsLoading(true);
            fetchLeaderboardData();
            toast.success('Cache cleared, reloading data');
          }}
        >
          Clear Cache
        </button>
        <button
          id="forceReloadButton"
          className="load-button"
          onClick={() => {
            if (typeof window === 'undefined') return;

            // Force reload by clearing all caches
            clearLeaderboardCache();

            // Clear browser cache for this page
            if (window.caches) {
              try {
                caches.keys().then((names: readonly string[]) => {
                  names.forEach((name: string) => {
                    caches.delete(name);
                  });
                });
              } catch (e) {
                console.error('Error clearing browser caches:', e);
              }
            }

            // Force reload the page
            window.location.reload();
            toast.success('Forcing complete page reload');
          }}
        >
          Force Reload
        </button>
      </div>

      {activeTab === 'all' ? (
        <div className="overflow-x-auto">
          <table id="leaderboardTable">
            <tbody id="leaderboardBody">
              {/* Push-ups Section */}
              <tr>
                <td
                  colSpan={4}
                  style={{
                    backgroundColor: '#fcb131',
                    textAlign: 'center',
                    color: 'black',
                    fontWeight: 'bold',
                  }}
                >
                  Push-ups
                </td>
              </tr>
              {pushupLeaderboard.slice(0, limit || 2).map((entry, i) => {
                const medalStyle = getMedalStyle(i);
                const networkStyle = getNetworkStyling(entry.network);

                return (
                  <tr
                    key={`pushup-${entry.user}-${entry.network}-${i}`}
                    className={`${entry.network}-entry transition-all duration-300 ${getHoverEffects()}`}
                  >
                    <td className={`px-3 py-3 font-bold ${medalStyle.textColor}`}>
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-lg">{medalStyle.medal}</span>
                        <span>{i + 1}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        <ProfileDisplay
                          userAddress={entry.user}
                          displayName={displayNames[entry.user] || shortenAddress(entry.user)}
                          farcasterProfile={farcasterProfiles[entry.user]}
                          isVerified={verificationStatuses[entry.user] || false}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className={`px-3 py-3 font-bold text-lg ${medalStyle.textColor}`}>
                      {entry.score}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <span className={`font-bold ${networkStyle.text}`}>
                          {networkStyle.name}
                        </span>
                        <div
                          className={`w-3 h-3 rounded-full ${networkStyle.bg} border border-white/30`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* Squats Section */}
              <tr>
                <td
                  colSpan={4}
                  style={{
                    backgroundColor: '#00a651',
                    textAlign: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                  }}
                >
                  Squats
                </td>
              </tr>
              {squatLeaderboard.slice(0, limit || 2).map((entry, i) => {
                const medalStyle = getMedalStyle(i);
                const networkStyle = getNetworkStyling(entry.network);

                return (
                  <tr
                    key={`squat-${entry.user}-${entry.network}-${i}`}
                    className={`${entry.network}-entry transition-all duration-300 ${getHoverEffects()}`}
                  >
                    <td className={`px-3 py-3 font-bold ${medalStyle.textColor}`}>
                      <div className="flex items-center justify-center space-x-1">
                        <span className="text-lg">{medalStyle.medal}</span>
                        <span>{i + 1}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center">
                        <ProfileDisplay
                          userAddress={entry.user}
                          displayName={displayNames[entry.user] || shortenAddress(entry.user)}
                          farcasterProfile={farcasterProfiles[entry.user]}
                          isVerified={verificationStatuses[entry.user] || false}
                          size="sm"
                        />
                      </div>
                    </td>
                    <td className={`px-3 py-3 font-bold text-lg ${medalStyle.textColor}`}>
                      {entry.score}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <span className={`font-bold ${networkStyle.text}`}>
                          {networkStyle.name}
                        </span>
                        <div
                          className={`w-3 h-3 rounded-full ${networkStyle.bg} border border-white/30`}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <VerifiedLeaderboard className="mt-4" />
      )}

      {/* View more button - always show if we have data and onViewMore is provided */}
      {(pushupLeaderboard.length > 0 || squatLeaderboard.length > 0) && onViewMore && (
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
