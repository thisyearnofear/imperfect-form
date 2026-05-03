/**
 * Champion Traces
 *
 * Pre-baked compressed workout traces for top-tier players.
 * These are used to provide a competitive "Ghost Race" experience
 * even if the user hasn't recorded their own PB yet.
 */

export const CHAMPION_TRACES: Record<string, string> = {
  // Champion 1: 'The Pro' (Vitalik-inspired address)
  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045':
    'EBICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  // Champion 2: 'Base God'
  '0x0000000000000000000000000000000000000001':
    'EBICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

/**
 * Get a champion trace by address
 */
export const getChampionTrace = (address: string): string | null => {
  // Normalize address for lookup
  const normalizedAddress = address.toLowerCase();
  const entry = Object.entries(CHAMPION_TRACES).find(
    ([addr]) => addr.toLowerCase() === normalizedAddress
  );
  return entry ? entry[1] : null;
};

/**
 * Check if an address has a champion trace
 */
export const isChampion = (address: string): boolean => {
  const normalizedAddress = address.toLowerCase();
  return Object.keys(CHAMPION_TRACES).some((addr) => addr.toLowerCase() === normalizedAddress);
};
