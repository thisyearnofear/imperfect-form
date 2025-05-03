// Utility functions for formatting data

/**
 * Shortens an Ethereum address for display
 */
export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
