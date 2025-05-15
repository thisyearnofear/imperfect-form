# Imperfect Form Leaderboard Integration Guide

This document provides all the necessary configurations and settings to leverage the Imperfect Form leaderboard as a source of truth for collective fitness goal applications.

## Overview

The Imperfect Form leaderboard tracks individual push-ups and squats across multiple blockchain networks. This data can be used as a source of truth for collective goal applications, such as:

- **Bench Press Mount Olympus**: Each push-up = 1kg of force lifted (symbolically)
  - Goal: Lift the equivalent of Mount Olympus (2917m × 100kg = 291,700 push-ups)

- **Run the length of Kenya**: From Mandera (northern tip) to Lunga Lunga (southern tip)
  - Distance: Roughly 1,030 kilometers (1,030,000 meters)
  - Conversion: 1 squat = 1 meter

## Supported Networks

The leaderboard is deployed on the following networks:

| Network | Contract Address | Chain ID | Type |
|---------|-----------------|----------|------|
| Polygon Mainnet | 0xc783d6E12560dc251F5067A62426A5f3b45b6888 | 137 | Production |
| Celo Mainnet | 0xB0cbC7325EbC744CcB14211CA74C5a764928F273 | 42220 | Production |
| Monad Testnet | 0x653d41Fba630381aA44d8598a4b35Ce257924d65 | 10143 | Testnet |
| Base Sepolia | 0xFcC01405967676Be7418123c77C2acF254Dc7137 | 84532 | Testnet |

## Contract Interface

All contracts implement the same standardized interface with minor variations in the `addScore` function (payable vs. nonpayable).

### Core Functions

#### `getLeaderboard()`

Returns all entries in the leaderboard.

```solidity
function getLeaderboard() external view returns (Score[] memory);
```

Where `Score` is a struct containing:
```solidity
struct Score {
    address user;
    uint256 pushups;
    uint256 squats;
    uint256 timestamp;
}
```

#### `getUserScore(address _user)`

Returns the score for a specific user.

```solidity
function getUserScore(address _user) external view returns (Score memory);
```

## RPC Endpoints

| Network | Primary RPC URL | Fallback RPC URLs |
|---------|----------------|-------------------|
| Polygon Mainnet | https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B | https://polygon-rpc.com |
| Celo Mainnet | https://forno.celo.org | https://rpc.ankr.com/celo |
| Monad Testnet | https://testnet-rpc.monad.xyz | - |
| Base Sepolia | https://sepolia.base.org | https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B |

## Integration Code Examples

### Fetching All Leaderboard Data

Here's how to fetch leaderboard data from all networks:

```javascript
import { ethers } from "ethers";
import { 
  POLYGON_CONTRACT_ADDRESS,
  CELO_CONTRACT_ADDRESS,
  MONAD_CONTRACT_ADDRESS,
  BASE_CONTRACT_ADDRESS,
  fitnessLeaderboardABI
} from "./constants";

// RPC URLs with fallbacks
const RPC_URLS = {
  polygon: [
    "https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B",
    "https://polygon-rpc.com"
  ],
  celo: [
    "https://forno.celo.org",
    "https://rpc.ankr.com/celo"
  ],
  monad: [
    "https://testnet-rpc.monad.xyz"
  ],
  base: [
    "https://sepolia.base.org",
    "https://base-sepolia.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B"
  ]
};

// Contract addresses
const CONTRACT_ADDRESSES = {
  polygon: POLYGON_CONTRACT_ADDRESS,
  celo: CELO_CONTRACT_ADDRESS,
  monad: MONAD_CONTRACT_ADDRESS,
  base: BASE_CONTRACT_ADDRESS
};

// Function to fetch data with fallback RPCs
async function fetchWithFallbackRpcs(contractAddress, rpcUrls, networkName) {
  for (const rpcUrl of rpcUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(
        contractAddress,
        fitnessLeaderboardABI,
        provider
      );
      
      console.log(`Calling getLeaderboard() on ${networkName} contract at ${contractAddress}`);
      const data = await contract.getLeaderboard();
      console.log(`Successfully retrieved ${data.length} entries from ${networkName}`);
      
      return data;
    } catch (error) {
      console.error(`Error fetching data from ${rpcUrl} (${networkName}):`, error);
      // Continue to next RPC URL
    }
  }
  
  console.error(`All RPC URLs failed for ${networkName}`);
  return [];
}

// Fetch data from all networks
async function fetchAllNetworksData() {
  const networks = ["polygon", "celo", "monad", "base"];
  const results = {};
  
  await Promise.all(
    networks.map(async (network) => {
      const data = await fetchWithFallbackRpcs(
        CONTRACT_ADDRESSES[network],
        RPC_URLS[network],
        network
      );
      results[network] = data;
    })
  );
  
  return results;
}

// Calculate totals for collective goals
function calculateCollectiveGoals(allNetworksData) {
  let totalPushups = 0;
  let totalSquats = 0;
  
  Object.values(allNetworksData).forEach(networkData => {
    networkData.forEach(entry => {
      totalPushups += Number(entry.pushups);
      totalSquats += Number(entry.squats);
    });
  });
  
  // Calculate progress for Mount Olympus challenge
  const mountOlympusGoal = 291700; // 2917m × 100kg
  const mountOlympusProgress = (totalPushups / mountOlympusGoal) * 100;
  
  // Calculate progress for Kenya Run challenge
  const kenyaRunGoal = 1030000; // 1,030 kilometers in meters
  const kenyaRunProgress = (totalSquats / kenyaRunGoal) * 100;
  
  return {
    totalPushups,
    totalSquats,
    mountOlympus: {
      goal: mountOlympusGoal,
      current: totalPushups,
      progressPercentage: mountOlympusProgress
    },
    kenyaRun: {
      goal: kenyaRunGoal,
      current: totalSquats,
      progressPercentage: kenyaRunProgress
    }
  };
}
```

## Caching Considerations

For optimal performance, consider implementing a caching strategy:

1. Cache leaderboard data for 5-10 minutes to reduce RPC calls
2. Use a background job to refresh the cache periodically
3. Implement a manual refresh button for users who want the latest data

## Webhook Support (Future)

We plan to implement webhook notifications for new submissions. Contact us to be added to the waitlist for this feature.

## Support

For questions or support, please contact us at [support@imperfectform.xyz](mailto:support@imperfectform.xyz) or open an issue on our GitHub repository.
