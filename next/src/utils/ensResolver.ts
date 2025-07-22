// Cache for ENS names to avoid repeated API calls
import { shortenAddress } from './formatters';
const ensCache: Record<string, string | null> = {};

// Cache of pending promises to prevent duplicate API calls for the same address
const pendingFetches: Record<string, Promise<string | null>> = {};

// List of addresses we've recently tried and failed to resolve to avoid hammering the API
const recentFailures: Set<string> = new Set();

// Cooldown time (5 minutes) for failed lookups
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

/**
 * Resolves an Ethereum address to an ENS name
 * @param address The Ethereum address to resolve
 * @returns The ENS name or null if not found
 */
export async function resolveENSName(address: string): Promise<string | null> {
  // Normalize address to lowercase for consistent caching
  const normalizedAddress = address.toLowerCase();
  
  // Return from cache if available
  if (ensCache[normalizedAddress] !== undefined) {
    return ensCache[normalizedAddress];
  }
  
  // Skip if this address recently failed resolution
  if (recentFailures.has(normalizedAddress)) {
    return null;
  }
  
  // If there's already a pending fetch for this address, return that promise
  if (normalizedAddress in pendingFetches) {
    return pendingFetches[normalizedAddress];
  }
  
  // Create a new promise for this fetch and store it
  const fetchPromise = (async () => {
    try {
      // Attempt to resolve ENS name using the ENS Data API
      // Wrap in a timeout to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
  
      try {
        const response = await fetch(`https://api.ensdata.net/${normalizedAddress}`, {
          signal: controller.signal,
        });
  
        clearTimeout(timeoutId);
  
        if (!response.ok) {
          // Add to recent failures with a cleanup timeout
          recentFailures.add(normalizedAddress);
          setTimeout(() => recentFailures.delete(normalizedAddress), FAILURE_COOLDOWN_MS);
          
          // Only log in development to reduce noise
          if (process.env.NODE_ENV === 'development') {
            console.log(`ENS API response not OK: ${response.status}`);
          }
          
          ensCache[normalizedAddress] = null;
          return null;
        }
  
        const data = await response.json();
        const ensName = data.ens_primary || null;
  
        // Cache the result
        ensCache[normalizedAddress] = ensName;
  
        return ensName;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        // Add to recent failures with a cleanup timeout
        recentFailures.add(normalizedAddress);
        setTimeout(() => recentFailures.delete(normalizedAddress), FAILURE_COOLDOWN_MS);
        
        // Only log in development to reduce noise
        if (process.env.NODE_ENV === 'development') {
          console.log(`ENS API fetch error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
        
        ensCache[normalizedAddress] = null;
        return null;
      }
    } catch (error) {
      // Only log in development to reduce noise
      if (process.env.NODE_ENV === 'development') {
        console.log(`Error resolving ENS name for address ${normalizedAddress}:`, error);
      }
      
      ensCache[normalizedAddress] = null;
      return null;
    } finally {
      // Clean up the pending promise when done
      delete pendingFetches[normalizedAddress];
    }
  })();
  
  // Store the promise so parallel requests for the same address reuse it
  pendingFetches[normalizedAddress] = fetchPromise;
  
  return fetchPromise;
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

