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

// Self Protocol Verified Fitness Contract (Celo Alfajores)
export const VERIFIED_FITNESS_CONTRACT_ADDRESS = "0x18082d110113B40A24A41dF10b4b249Ee461D3eb";
export const SELF_PROTOCOL_CONTRACT_ADDRESS = "0xc51065eCBe91E7DbA69934F37130DCA29E516189";

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

// Verified Fitness Contract ABI (Self Protocol Integration)
export const verifiedFitnessLeaderboardABI = [
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
        internalType: "struct VerifiedFitnessLeaderboard.Score[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "baseScore", type: "uint256" },
      { internalType: "string", name: "exerciseType", type: "string" }
    ],
    name: "submitScore",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "getUserStats",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "totalSubmissions", type: "uint256" },
          { internalType: "uint256", name: "bestPushups", type: "uint256" },
          { internalType: "uint256", name: "bestSquats", type: "uint256" },
          { internalType: "bool", name: "isVerified", type: "bool" },
          { internalType: "uint256", name: "verifiedAt", type: "uint256" },
          { internalType: "uint256", name: "totalBonusEarned", type: "uint256" }
        ],
        internalType: "struct VerifiedFitnessLeaderboard.UserStats",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "user", type: "address" }],
    name: "isUserVerified",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getTotalUsers",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "verificationBonusPercentage",
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
    inputs: [],
    name: "MAX_SCORE_PER_SUBMISSION",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "MINIMUM_AGE",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "SCOPE_NAME",
    outputs: [{ internalType: "string", name: "", type: "string" }],
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
