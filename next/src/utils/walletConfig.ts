import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { parseEther, toHex } from "viem";

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
  // Create connectors array
  const connectors = [
    coinbaseWallet({
      appName: "Imperfect Form App",
      appLogoUrl: "https://cdn-icons-png.flaticon.com/512/732/732669.png",
      // Configure for smart wallet (subaccounts) development
      preference: {
        keysUrl: "https://keys-dev.coinbase.com/connect", // IMPORTANT: development URL for subaccounts
        options: "smartWalletOnly", // Only allow smart wallet connection
      },
      // Configure subaccounts with spend limits - this is what enables one-click transactions
      // @ts-expect-error - The TypeScript definitions may not include all subAccounts properties
      subAccounts: {
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

  return createConfig({
    chains: [baseSepolia], // Only use Base Sepolia for development and production
    connectors,
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http(),
    },
  });
}

// Type declaration for Wagmi
declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>;
  }
}
