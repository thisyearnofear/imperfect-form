/**
 * Network accent palette for atmosphere + chain themes.
 * Day-0 bay uses these as soft blooms only — full ThemeSync stays earned.
 *
 * Live theme tokens: Celo, Base, Avalanche, Monad (+ Polygon still supported).
 */
export const NETWORK_ACCENTS = {
  celo: {
    id: 'celo',
    label: 'Celo',
    hex: '#f0db18',
    soft: 'rgba(240, 219, 24, 0.14)',
  },
  base: {
    id: 'base',
    label: 'Base',
    hex: '#0052ff',
    soft: 'rgba(0, 82, 255, 0.14)',
  },
  avalanche: {
    id: 'avalanche',
    label: 'Avalanche',
    hex: '#e84142',
    soft: 'rgba(232, 65, 66, 0.14)',
  },
  monad: {
    id: 'monad',
    label: 'Monad',
    hex: '#836ef9',
    soft: 'rgba(131, 110, 249, 0.14)',
  },
} as const;

export type NetworkAccentId = keyof typeof NETWORK_ACCENTS;
