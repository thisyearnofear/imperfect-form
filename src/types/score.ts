// Define the network types used in the application
export type NetworkType = 'polygon' | 'base' | 'monad' | 'celo' | 'avalanche';

// Define the Score interface used throughout the application
export interface Score {
  user: string;
  score: number;
  network: NetworkType;
  displayName?: string;
  timestamp?: number; // Optional timestamp for streak calculations
}

// Define the standardized contract data structure returned from blockchain
export interface ContractScore {
  user: string;
  pushups:
    | number
    | string
    | {
        _isBigNumber?: boolean;
        _hex?: string;
        toString?: () => string;
        toNumber?: () => number;
      };
  squats:
    | number
    | string
    | {
        _isBigNumber?: boolean;
        _hex?: string;
        toString?: () => string;
        toNumber?: () => number;
      };
  timestamp:
    | number
    | string
    | {
        _isBigNumber?: boolean;
        _hex?: string;
        toString?: () => string;
        toNumber?: () => number;
      };
}
