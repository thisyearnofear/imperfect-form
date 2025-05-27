import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { baseSepolia, polygon, celo, type Chain } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

// Define Monad Testnet chain
const monadTestnet: Chain = {
  id: 10143,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    public: { http: ['https://testnet-rpc.monad.xyz/'] },
    default: { http: ['https://testnet-rpc.monad.xyz/'] },
  },
  blockExplorers: {
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com/' },
  },
  testnet: true,
};

// Import Farcaster connector (will be available after npm install)
let farcasterFrame: unknown = null;
try {
  // Dynamic import to handle cases where the package isn't installed yet
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const farcasterConnector = require("@farcaster/frame-wagmi-connector");
  farcasterFrame = farcasterConnector.farcasterFrame;
} catch {
  console.warn("@farcaster/frame-wagmi-connector not installed. Farcaster wallet will not be available.");
}



// Create a Wagmi config with the Coinbase Wallet connector
export function getWagmiConfig() {
  // Skip blockchain initialization if disabled in environment
  const isBlockchainDisabled = typeof window !== 'undefined' &&
    window.process?.env?.NEXT_PUBLIC_DISABLE_BLOCKCHAIN === 'true';

  if (isBlockchainDisabled) {
    // Return minimal config when blockchain is disabled
    return createConfig({
      chains: [baseSepolia],
      connectors: [],
      storage: createStorage({
        storage: cookieStorage,
      }),
      ssr: true,
      transports: {
        [baseSepolia.id]: http(),
      },
    });
  }
  // Always include all chains for maximum compatibility
  const supportedChains: readonly [Chain, ...Chain[]] = [baseSepolia, polygon, celo, monadTestnet];

  // Create connectors array - provide both EOA and Smart Wallet options
  const connectors = [
    // Standard EOA connector (works with all wallets including Farcaster)
    coinbaseWallet({
      appName: "Imperfect Form App",
      appLogoUrl: "https://cdn-icons-png.flaticon.com/512/732/732669.png",
      preference: "eoaOnly",
    }),
  ];

  // Add Farcaster connector if available
  if (farcasterFrame && typeof farcasterFrame === 'function') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const connector = (farcasterFrame as () => any)();
      connectors.push(connector);
    } catch (err) {
      console.warn('Failed to initialize Farcaster connector:', err);
    }
  }

  // Create transport configuration for all supported chains
  const transports: Record<number, ReturnType<typeof http>> = {};

  if (supportedChains.includes(baseSepolia)) {
    transports[baseSepolia.id] = http();
  }
  if (supportedChains.includes(polygon)) {
    transports[polygon.id] = http("https://polygon-mainnet.g.alchemy.com/v2/Tx9luktS3qyIwEKVtjnQrpq8t3MNEV-B");
  }
  if (supportedChains.includes(celo)) {
    transports[celo.id] = http();
  }
  if (supportedChains.includes(monadTestnet)) {
    transports[monadTestnet.id] = http();
  }

  return createConfig({
    chains: supportedChains,
    connectors,
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports,
  });
}

// Type declaration for Wagmi
declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>;
  }
}
