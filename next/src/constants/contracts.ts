// Leaderboard contract addresses for all supported networks
export const POLYGON_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_POLYGON ||
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT ||
  "0x6c5B97eC4E66FD3b507400BBA80898f13170943A"; // Polygon Amoy contract

export const BASE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_BASE ||
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT ||
  "0x45d1a7976477DC2cDD5d40e1e15f22138F20816F"; // Base Sepolia contract

// Placeholder addresses for new networks - replace with actual deployed contracts
export const MONAD_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_MONAD ||
  "0x0000000000000000000000000000000000000000"; // Monad Testnet placeholder

export const CELO_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_LEADERBOARD_CONTRACT_CELO ||
  "0x0000000000000000000000000000000000000000"; // Celo Mainnet placeholder

// Full ABI for the FitnessLeaderboard contract
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
        internalType: "struct FitnessLeaderboard.Score[]",
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
    name: "addScore", // Correct function name from the contract
    outputs: [],
    stateMutability: "nonpayable",
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
        internalType: "struct FitnessLeaderboard.Score",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
];
