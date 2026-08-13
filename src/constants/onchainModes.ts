import type { ExerciseMode } from '@/utils/biomechanics';

/**
 * Modes with on-chain leaderboard contracts. Others save locally only.
 *
 * Lives in constants/ (pure data, no React/JSX) alongside abis.ts and
 * contracts.ts, so the recap/leaderboard modules that import it keep the
 * ethers-using surface in their lazy chunks.
 */
export const ONCHAIN_MODES: readonly ExerciseMode[] = ['pushups', 'squats'] as const;

/**
 * Player level at which on-chain sync unlocks. Single source of truth for the
 * foyer status strip, the SummaryModal level gate, and the level-up toast.
 */
export const ONCHAIN_UNLOCK_LEVEL = 5;
