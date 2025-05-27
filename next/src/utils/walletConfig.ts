import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { baseSepolia, polygon, celo } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { parseEther, toHex } from "viem";

// Define Monad Testnet chain
const monadTestnet = {
  id: 10143,
  name: 'Monad Testnet',
  network: 'monad-testnet',
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
} as const;

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

// Helper function to determine if we're in Farcaster context
function isInFarcasterContext(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for Farcaster-specific indicators
  return (
    /farcaster|warpcast/i.test(navigator.userAgent) ||
    window.location.search.includes('frame=') ||
    window.location.search.includes('farcaster') ||
    document.referrer.includes('warpcast.com') ||
    document.referrer.includes('farcaster.xyz')
  );
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
  // Determine which chains to support based on context
  const isInFarcaster = isInFarcasterContext();

  // For Farcaster context, use supported networks (Celo, Polygon, Monad Testnet)
  // For regular context, use Base Sepolia for Coinbase Smart Wallet features
  const supportedChains = isInFarcaster
    ? [celo, polygon, monadTestnet]
    : [baseSepolia, polygon, celo, monadTestnet];

  // Create connectors array
  const connectors = [
    coinbaseWallet({
      appName: "Imperfect Form App",
      appLogoUrl: "https://cdn-icons-png.flaticon.com/512/732/732669.png",
      // Configure for smart wallet (subaccounts) development only when not in Farcaster
      preference: isInFarcaster ? "eoaOnly" : {
        keysUrl: "https://keys-dev.coinbase.com/connect", // IMPORTANT: development URL for subaccounts
        options: "smartWalletOnly", // Only allow smart wallet connection
      },
      // Configure subaccounts with spend limits - this is what enables one-click transactions
      // Only for non-Farcaster contexts
      // @ts-expect-error - The TypeScript definitions may not include all subAccounts properties
      subAccounts: isInFarcaster ? undefined : {
        enableAutoSubAccounts: true, // Automatically create subaccounts
        spendLimitsEnabled: true, // Explicitly enable spend limits
        defaultSpendLimits: {
          84532: [ // Base Sepolia chain ID
            {
              token: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH
              allowance: toHex(parseEther('0.01')), // 0.01 ETH limit
              period: 86400, // 1 day in seconds
            },
          ],
        },
      },
    }),
  ];

  // Add Farcaster connector if available and in Farcaster context
  if (farcasterFrame && typeof farcasterFrame === 'function' && isInFarcaster) {
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
    chains: supportedChains as any,
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
