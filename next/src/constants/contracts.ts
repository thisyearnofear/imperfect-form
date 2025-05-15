// Leaderboard contract addresses for all supported networks
export const POLYGON_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_POLYGON ||
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT ||
  "0xc783d6E12560dc251F5067A62426A5f3b45b6888"; // Polygon Mainnet contract (standardized)

export const BASE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_BASE ||
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT ||
  "0xFcC01405967676Be7418123c77C2acF254Dc7137"; // Base Sepolia contract (standardized)

// Standardized contract addresses for all networks
export const MONAD_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_MONAD ||
  "0x653d41Fba630381aA44d8598a4b35Ce257924d65"; // Monad Testnet contract (standardized)

export const CELO_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_CELO ||
  "0x74Bafd1bDB5d087a2dE2941a50C27D93406A75af"; // Celo Mainnet contract (standardized with charity fee)

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

// Base-specific ABI with nonpayable addScore function
export const baseLeaderboardABI = [
  ...fitnessLeaderboardABI.filter(item => item.name !== "addScore"),
  {
    inputs: [
      { internalType: "uint256", name: "pushups", type: "uint256" },
      { internalType: "uint256", name: "squats", type: "uint256" }
    ],
    name: "addScore",
    outputs: [],
    stateMutability: "nonpayable", // Nonpayable for Base contract
    type: "function"
  }
];
