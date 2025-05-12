// Cache for ENS names to avoid repeated API calls
const ensCache: Record<string, string | null> = {};

/**
 * Resolves an Ethereum address to an ENS name
 * @param address The Ethereum address to resolve
 * @returns The ENS name or null if not found
 */
export async function resolveENSName(address: string): Promise<string | null> {
  // Return from cache if available
  if (ensCache[address] !== undefined) {
    return ensCache[address];
  }

  try {
    // Attempt to resolve ENS name using the ENS Data API
    // Wrap in a timeout to prevent long-hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      const response = await fetch(`https://api.ensdata.net/${address}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.log(`ENS API response not OK: ${response.status} ${response.statusText}`);
        ensCache[address] = null;
        return null;
      }

      const data = await response.json();
      const ensName = data.ens_primary || null;

      // Cache the result
      ensCache[address] = ensName;

      return ensName;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.log(`ENS API fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
      ensCache[address] = null;
      return null;
    }
  } catch (error) {
    console.log(`Error resolving ENS name for address ${address}:`, error);
    ensCache[address] = null;
    return null;
  }
}

/**
 * Gets a display name for an address (ENS name if available, or shortened address)
 * @param address The Ethereum address
 * @returns The display name (ENS or shortened address)
 */
export async function getDisplayName(address: string): Promise<string> {
  const ensName = await resolveENSName(address);
  return ensName || shortenAddress(address);
}

/**
 * Shortens an Ethereum address for display
 * @param address The full Ethereum address
 * @returns The shortened address (e.g., 0x1234...5678)
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}
