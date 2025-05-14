import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";
import { parseEther, toHex } from "viem";

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
  return createConfig({
    chains: [baseSepolia], // Only use Base Sepolia for development and production
    connectors: [
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
    ],
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
