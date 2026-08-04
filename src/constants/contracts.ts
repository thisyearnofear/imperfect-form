// Event topic for ScoreSubmitted(address,uint256,uint256,string,bool,uint256)
// Computed once via ethers.keccak256(ethers.toUtf8Bytes(...)) and hardcoded so
// this file stays pure data. Importing ethers here pulled the entire library
// into the / first load via chainSwitching → config/networks (PERFORMANT).
export const SCORE_SUBMITTED_TOPIC =
  '0xd9b57a903d28eefa928c7ad618f7211b33e87f11b1b238b8fecc8e0814f18487';

// =============================================================================
// SELF PROTOCOL INTEGRATION - CELO MAINNET
// =============================================================================

// Self Protocol V2 Hub Address (Celo Mainnet) - DO NOT CHANGE
export const SELF_PROTOCOL_HUB_ADDRESS = '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF';

// Our deployed VerifiedFitnessContract address (Celo Mainnet)
// This is the contract users interact with for verification
export const VERIFIED_FITNESS_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_VERIFIED_FITNESS_CONTRACT || '0x41f2fA6E60A34c26BD2C467d21EcB0a2f9087B03'; // DEPLOYED ON CELO MAINNET

// ABIs are pure data and live in abis.ts (no eager importers), so the
// ethers-using recap/leaderboard modules that import them through this
// re-export keep ethers in their lazy chunks — never the / first load.
export {
  verifiedFitnessContractABI,
  fitnessLeaderboardABI,
  verifiedFitnessLeaderboardABI,
  standardFitnessLeaderboardABI,
  monadLeaderboardABI,
  polygonLeaderboardABI,
  baseLeaderboardABI,
} from './abis';
