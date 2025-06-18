// Leaderboard contract addresses for all supported networks
export const POLYGON_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_POLYGON ||
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT ||
  "0xc783d6E12560dc251F5067A62426A5f3b45b6888"; // Polygon Mainnet contract (standardized)

export const BASE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_BASE ||
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT ||
  "0x60228F4f4F1A71e9b43ebA8C5A7ecaA7e4d4950B"; // Base Mainnet contract (based on proven Celo template)

// Standardized contract addresses for all networks
export const MONAD_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_MONAD ||
  "0x653d41Fba630381aA44d8598a4b35Ce257924d65"; // Monad Testnet contract (standardized)

export const CELO_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_CELO ||
  "0xB0cbC7325EbC744CcB14211CA74C5a764928F273"; // Celo Mainnet contract (standardized)

// Full ABI for the standardized FitnessLeaderboard contracts
// This is the base ABI that works for most networks
export const fitnessLeaderboardABI = [
  {
    inputs: [],
    name: "getLeaderboard",
    outputs: [
      {
        components: [
          { internalType: "address", name: "user", type: "address" },
          { internalType: "uint256", name: "pushups", type: "uint256" },
          { internalType: "uint256", name: "squats", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        internalType: "struct Score[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "pushups", type: "uint256" },
      { internalType: "uint256", name: "squats", type: "uint256" }
    ],
    name: "addScore",
    outputs: [],
    stateMutability: "nonpayable", // Changed to nonpayable for Celo standardized contract
    type: "function"
  },
  {
    inputs: [],
    name: "MAX_SCORE_PER_SUBMISSION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "SUBMISSION_COOLDOWN",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getTimeUntilNextSubmission",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserScore",
    outputs: [
      {
        components: [
          { internalType: "address", name: "user", type: "address" },
          { internalType: "uint256", name: "pushups", type: "uint256" },
          { internalType: "uint256", name: "squats", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        internalType: "struct Score",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "_user", type: "address" }],
    name: "getUserScoreSafe",
    outputs: [
      {
        components: [
          { internalType: "address", name: "user", type: "address" },
          { internalType: "uint256", name: "pushups", type: "uint256" },
          { internalType: "uint256", name: "squats", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        internalType: "struct Score",
        name: "",
        type: "tuple"
      },
      { internalType: "bool", name: "", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "offset", type: "uint256" },
      { internalType: "uint256", name: "limit", type: "uint256" }
    ],
    name: "getLeaderboardPaginated",
    outputs: [
      {
        components: [
          { internalType: "address", name: "user", type: "address" },
          { internalType: "uint256", name: "pushups", type: "uint256" },
          { internalType: "uint256", name: "squats", type: "uint256" },
          { internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        internalType: "struct Score[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getCurrentChainId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "isCeloMainnet",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getDeployedChainId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];

// Monad-specific ABI with payable addScore function
export const monadLeaderboardABI = [
  ...fitnessLeaderboardABI.filter(item => item.name !== "addScore"),
  {
    inputs: [
      { internalType: "uint256", name: "pushups", type: "uint256" },
      { internalType: "uint256", name: "squats", type: "uint256" }
    ],
    name: "addScore",
    outputs: [],
    stateMutability: "payable", // Payable for Monad contract
    type: "function"
  }
];

// Polygon-specific ABI with nonpayable addScore function
export const polygonLeaderboardABI = [
  ...fitnessLeaderboardABI.filter(item => item.name !== "addScore"),
  {
    inputs: [
      { internalType: "uint256", name: "pushups", type: "uint256" },
      { internalType: "uint256", name: "squats", type: "uint256" }
    ],
    name: "addScore",
    outputs: [],
    stateMutability: "nonpayable", // Nonpayable for Polygon contract
    type: "function"
  }
];

// Base Mainnet ABI - based on proven Celo template (no ReentrancyGuard)
export const baseLeaderboardABI = [
  // Use the same proven ABI as Celo for maximum reliability
  ...fitnessLeaderboardABI.filter(item => item.name !== "addScore"),
  {
    inputs: [
      { internalType: "uint256", name: "pushups", type: "uint256" },
      { internalType: "uint256", name: "squats", type: "uint256" }
    ],
    name: "addScore",
    outputs: [],
    stateMutability: "nonpayable", // Simple nonpayable like Celo
    type: "function"
  },
  // Add Base-specific functions
  {
    inputs: [],
    name: "isBaseMainnet",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "pure",
    type: "function"
  },
  {
    inputs: [],
    name: "getDeployedChainId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  }
];
