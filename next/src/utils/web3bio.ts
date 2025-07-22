// Utility for resolving wallet addresses to social identities using web3bio API
import { shortenAddress } from './formatters';

// Cache for resolved identities to avoid repeated API calls
const identityCache: Record<string, {
  ens: string | null;
  lens: string | null;
  farcaster: string | null;
}> = {};

/**
 * Resolves a wallet address to social identities using web3bio API
 * @param address The Ethereum address to resolve
 * @returns Object containing ENS, Lens, and Farcaster identities if available
 */
export async function resolveIdentity(address: string): Promise<{
  ens: string | null;
  lens: string | null;
  farcaster: string | null;
}> {
  // Return from cache if available
  if (identityCache[address]) {
    return identityCache[address];
  }

  // Default result
  const result = {
    ens: null,
    lens: null,
    farcaster: null
  };

  try {
    // Call web3bio API to get identity information
    const response = await fetch(`https://api.web3.bio/profile/${address}`);

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const data = await response.json();

    // Extract identities from response
    if (data && Array.isArray(data) && data.length > 0) {
      // Find ENS identity
      const ensIdentity = data.find(item => item.platform === 'ens');
      if (ensIdentity && ensIdentity.identity) {
        result.ens = ensIdentity.identity;
      }

      // Find Lens identity
      const lensIdentity = data.find(item => item.platform === 'lens');
      if (lensIdentity && lensIdentity.identity) {
        result.lens = lensIdentity.identity;
      }

      // Find Farcaster identity
      const farcasterIdentity = data.find(item => item.platform === 'farcaster');
      if (farcasterIdentity && farcasterIdentity.identity) {
        result.farcaster = farcasterIdentity.identity;
      }
    }

    // Cache the result
    identityCache[address] = result;

    return result;
  } catch (error) {
    console.error(`Error resolving identity for address ${address}:`, error);
    // Cache the empty result to avoid repeated failed calls
    identityCache[address] = result;
    return result;
  }
}

/**
 * Gets the best display name for an address (prioritizing social identities)
 * @param address The Ethereum address
 * @returns The best display name (Farcaster > ENS > Lens > shortened address)
 */
export async function getBestDisplayName(address: string): Promise<string> {
  const identities = await resolveIdentity(address);

  // Priority: Farcaster > ENS > Lens > shortened address
  return identities.farcaster ||
         identities.ens ||
         identities.lens ||
         shortenAddress(address);
}

