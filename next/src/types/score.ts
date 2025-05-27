// Define the network types used in the application
export type NetworkType = "polygon" | "base" | "monad" | "celo";

// Define the Score interface used throughout the application
export interface Score {
  user: string;
  score: number;
  network: NetworkType;
  displayName?: string;
}

// Define the contract data structure returned from blockchain
export interface ContractScore {
  user: string;
  pushups: number | string | {
    _isBigNumber?: boolean;
    _hex?: string;
    toString?: () => string;
    toNumber?: () => number;
  };
  squats: number | string | {
    _isBigNumber?: boolean;
    _hex?: string;
    toString?: () => string;
    toNumber?: () => number;
  };
  timestamp: number | string | {
    _isBigNumber?: boolean;
    _hex?: string;
    toString?: () => string;
    toNumber?: () => number;
  };
}