import { ethers } from 'ethers';

// Event topic for ScoreSubmitted(address,uint256,uint256,string,bool,uint256)
export const SCORE_SUBMITTED_TOPIC = ethers.keccak256(
  ethers.toUtf8Bytes('ScoreSubmitted(address,uint256,uint256,string,bool,uint256)')
);

// =============================================================================
// SELF PROTOCOL INTEGRATION - CELO MAINNET
// =============================================================================

// Self Protocol V2 Hub Address (Celo Mainnet) - DO NOT CHANGE
export const SELF_PROTOCOL_HUB_ADDRESS = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';

// Our deployed VerifiedFitnessContract address (Celo Mainnet)
// This is the contract users interact with for verification
export const VERIFIED_FITNESS_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT || '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03'; // DEPLOYED ON CELO MAINNET

// =============================================================================
// VERIFIED FITNESS CONTRACT ABI - SELF PROTOCOL INTEGRATION
// =============================================================================

export const verifiedFitnessContractABI = [
  // Core verification functions
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isVerifiedHuman',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getVerificationTimestamp',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVerificationStats',
    outputs: [
      { internalType: 'uint256', name: 'totalUsers', type: 'uint256' },
      { internalType: 'address', name: 'lastUser', type: 'address' },
      { internalType: 'uint256', name: 'lastTimestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Configuration functions
  {
    inputs: [],
    name: 'MINIMUM_AGE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SCOPE_NAME',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'VERIFICATION_CONFIG_ID',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { indexed: false, internalType: 'bytes32', name: 'userIdentifier', type: 'bytes32' },
      { indexed: false, internalType: 'string', name: 'platform', type: 'string' },
    ],
    name: 'UserVerified',
    type: 'event',
  },
];

// Full ABI for the standardized FitnessLeaderboard contracts
// This is the base ABI that works for most networks
export const fitnessLeaderboardABI = [
  {
    inputs: [],
    name: 'getLeaderboard',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct Score[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'pushups', type: 'uint256' },
      { internalType: 'uint256', name: 'squats', type: 'uint256' },
    ],
    name: 'addScore',
    outputs: [],
    stateMutability: 'nonpayable', // Changed to nonpayable for Celo standardized contract
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_SCORE_PER_SUBMISSION',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SUBMISSION_COOLDOWN',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getTimeUntilNextSubmission',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserScore',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct Score',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: '_user', type: 'address' }],
    name: 'getUserScoreSafe',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct Score',
        name: '',
        type: 'tuple',
      },
      { internalType: 'bool', name: '', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'offset', type: 'uint256' },
      { internalType: 'uint256', name: 'limit', type: 'uint256' },
    ],
    name: 'getLeaderboardPaginated',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct Score[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getCurrentChainId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isCeloMainnet',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDeployedChainId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];

// Verified Fitness Contract ABI (Self Protocol Integration)
export const verifiedFitnessLeaderboardABI = [
  {
    inputs: [],
    name: 'getLeaderboard',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'user', type: 'address' },
          { internalType: 'uint256', name: 'pushups', type: 'uint256' },
          { internalType: 'uint256', name: 'squats', type: 'uint256' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
        ],
        internalType: 'struct VerifiedFitnessLeaderboard.Score[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'baseScore', type: 'uint256' },
      { internalType: 'string', name: 'exerciseType', type: 'string' },
    ],
    name: 'submitScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserStats',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'totalSubmissions', type: 'uint256' },
          { internalType: 'uint256', name: 'bestPushups', type: 'uint256' },
          { internalType: 'uint256', name: 'bestSquats', type: 'uint256' },
          { internalType: 'bool', name: 'isVerified', type: 'bool' },
          { internalType: 'uint256', name: 'verifiedAt', type: 'uint256' },
          { internalType: 'uint256', name: 'totalBonusEarned', type: 'uint256' },
        ],
        internalType: 'struct VerifiedFitnessLeaderboard.UserStats',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'isUserVerified',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getTotalUsers',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'verificationBonusPercentage',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SUBMISSION_COOLDOWN',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MAX_SCORE_PER_SUBMISSION',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'MINIMUM_AGE',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'SCOPE_NAME',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserVerificationTimestamp',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getVerificationStats',
    outputs: [
      { internalType: 'uint256', name: 'totalVerifiedUsers', type: 'uint256' },
      { internalType: 'address', name: 'lastVerifiedUser', type: 'address' },
      { internalType: 'uint256', name: 'lastVerificationTimestamp', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newVerificationContract', type: 'address' }],
    name: 'setVerificationContract',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'newBonusPercentage', type: 'uint256' }],
    name: 'setVerificationBonus',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'newOwner', type: 'address' }],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'baseScore', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'finalScore', type: 'uint256' },
      { indexed: false, internalType: 'string', name: 'exerciseType', type: 'string' },
      { indexed: false, internalType: 'bool', name: 'isVerified', type: 'bool' },
      { indexed: false, internalType: 'uint256', name: 'bonusEarned', type: 'uint256' },
    ],
    name: 'ScoreSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'oldContract', type: 'address' },
      { indexed: true, internalType: 'address', name: 'newContract', type: 'address' },
      { indexed: false, internalType: 'address', name: 'updatedBy', type: 'address' },
    ],
    name: 'VerificationContractUpdated',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: false, internalType: 'uint256', name: 'oldBonus', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'newBonus', type: 'uint256' },
      { indexed: false, internalType: 'address', name: 'updatedBy', type: 'address' },
    ],
    name: 'VerificationBonusUpdated',
    type: 'event',
  },
];

// Monad-specific ABI with payable addScore function
export const monadLeaderboardABI = [
  ...fitnessLeaderboardABI.filter((item) => item.name !== 'addScore'),
  {
    inputs: [
      { internalType: 'uint256', name: 'pushups', type: 'uint256' },
      { internalType: 'uint256', name: 'squats', type: 'uint256' },
    ],
    name: 'addScore',
    outputs: [],
    stateMutability: 'payable', // Payable for Monad contract
    type: 'function',
  },
];

// Polygon-specific ABI with nonpayable addScore function
export const polygonLeaderboardABI = [
  ...fitnessLeaderboardABI.filter((item) => item.name !== 'addScore'),
  {
    inputs: [
      { internalType: 'uint256', name: 'pushups', type: 'uint256' },
      { internalType: 'uint256', name: 'squats', type: 'uint256' },
    ],
    name: 'addScore',
    outputs: [],
    stateMutability: 'nonpayable', // Nonpayable for Polygon contract
    type: 'function',
  },
];

// Base Mainnet ABI - based on proven Celo template (no ReentrancyGuard)
export const baseLeaderboardABI = [
  // Use the same proven ABI as Celo for maximum reliability
  ...fitnessLeaderboardABI.filter((item) => item.name !== 'addScore'),
  {
    inputs: [
      { internalType: 'uint256', name: 'pushups', type: 'uint256' },
      { internalType: 'uint256', name: 'squats', type: 'uint256' },
    ],
    name: 'addScore',
    outputs: [],
    stateMutability: 'nonpayable', // Simple nonpayable like Celo
    type: 'function',
  },
  // Add Base-specific functions
  {
    inputs: [],
    name: 'isBaseMainnet',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getDeployedChainId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
];
