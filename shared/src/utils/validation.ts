import { z } from 'zod';

/**
 * Shared validation schemas
 */

export const ScoreSchema = z.object({
  pushups: z.number().min(0).max(10000),
  squats: z.number().min(0).max(10000)
});

export const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address');

export const ChainIdSchema = z.number().positive();

export const NetworkConfigSchema = z.object({
  chainId: ChainIdSchema,
  name: z.string().min(1),
  contractAddress: AddressSchema,
  abi: z.array(z.any()),
  rpcUrl: z.string().url().optional(),
  blockExplorer: z.string().url().optional()
});

/**
 * Validation functions
 */
export function validateScore(pushups: number, squats: number): boolean {
  try {
    ScoreSchema.parse({ pushups, squats });
    return true;
  } catch {
    return false;
  }
}

export function validateAddress(address: string): boolean {
  try {
    AddressSchema.parse(address);
    return true;
  } catch {
    return false;
  }
}

export function validateChainId(chainId: number): boolean {
  try {
    ChainIdSchema.parse(chainId);
    return true;
  } catch {
    return false;
  }
}