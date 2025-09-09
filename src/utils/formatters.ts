// Utility functions for formatting data

/**
 * Shortens an Ethereum address for display
 */
export function shortenAddress(address: string | undefined | null): string {
  if (!address || typeof address !== 'string') {
    return 'Unknown';
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
