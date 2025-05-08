import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

// Type for Ethereum provider
type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
  removeListener: (
    event: string,
    callback: (...args: unknown[]) => void
  ) => void;
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isCoinbaseBrowser?: boolean;
  version?: string;
  providers?: ProviderWithCoinbase[];
  _coinbaseWalletExtension?: unknown;
  getSubAccounts?: () => Promise<unknown>;
  _subAccounts?: unknown;
  smartAccount?: unknown;
  smartWallet?: unknown;
};

// Type for provider in multi-provider setup
type ProviderWithCoinbase = {
  isCoinbaseWallet?: boolean;
  isMetaMask?: boolean;
  isCoinbaseBrowser?: boolean;
  version?: string;
};

// Create a Coinbase Wallet connector with smart account support
export const coinbaseWalletConnector = coinbaseWallet({
  appName: "Imperfect Form",
  headlessMode: false,
  version: "4",
  appLogoUrl: null,
  preference: {
    keysUrl: "https://keys.coinbase.com/connect",
    options: "smartWalletOnly", // Force smart wallet mode
  },
});

// Create a Wagmi config with the Coinbase Wallet connector
export function getWagmiConfig() {
  return createConfig({
    chains: [baseSepolia],
    connectors: [coinbaseWalletConnector],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [baseSepolia.id]: http(
        process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_URL ||
          "https://base-sepolia.g.alchemy.com/v2/demo"
      ),
    },
    syncConnectedChain: true, // Sync connected chain with wallet
    multiInjectedProviderDiscovery: true, // Enable discovery of multiple injected providers
  });
}

// Helper function to check if the wallet is Coinbase Wallet
export function isCoinbaseWallet(): boolean {
  try {
    // Use type assertion for the provider
    const provider = window.ethereum as unknown as EthereumProvider;
    if (!provider) return false;

    // Log provider details for debugging
    console.log("Provider details:", {
      exists: !!provider,
      isCoinbaseWallet: provider?.isCoinbaseWallet,
      isMetaMask: provider?.isMetaMask,
      isCoinbaseBrowser: provider?.isCoinbaseBrowser,
      version: provider?.version,
      // Check for other properties that might indicate Coinbase Wallet
      hasCoinbaseProperties: !!(
        provider?.isCoinbaseWallet ||
        provider?.isCoinbaseBrowser ||
        provider?._coinbaseWalletExtension ||
        provider?.providers?.some(
          (p: ProviderWithCoinbase) => p.isCoinbaseWallet
        )
      ),
    });

    // Check if it's directly identified as Coinbase Wallet
    if (provider.isCoinbaseWallet) {
      return true;
    }

    // Check if it's Coinbase Browser
    if (provider.isCoinbaseBrowser) {
      return true;
    }

    // Check if it's a multi-provider setup (like with MetaMask also installed)
    if (provider.providers && Array.isArray(provider.providers)) {
      return provider.providers.some(
        (p: ProviderWithCoinbase) => p.isCoinbaseWallet
      );
    }

    return false;
  } catch (error) {
    console.error("Error in isCoinbaseWallet:", error);
    return false;
  }
}

// Helper function to check if smart accounts are enabled
export function isSmartAccountEnabled(): boolean {
  try {
    // Use type assertion for the provider
    const provider = window.ethereum as unknown as EthereumProvider;
    if (!provider) {
      console.log("No provider found");
      return false;
    }

    // Get the actual Coinbase provider if we're in a multi-provider setup
    const coinbaseProvider =
      provider.providers?.find(
        (p: ProviderWithCoinbase) => p.isCoinbaseWallet
      ) || provider;

    // Use type assertion to access properties that might not be in the type definition
    const extendedProvider = coinbaseProvider as unknown as {
      getSubAccounts?: () => Promise<unknown>;
      _subAccounts?: unknown;
      smartAccount?: unknown;
      smartWallet?: unknown;
      isCoinbaseWallet?: boolean;
    };

    // Log provider capabilities for debugging
    console.log("Provider capabilities:", {
      hasGetSubAccounts: typeof extendedProvider.getSubAccounts === "function",
      hasSubAccountsProperty:
        typeof extendedProvider._subAccounts !== "undefined",
      hasSmartAccountProperty:
        typeof extendedProvider.smartAccount !== "undefined",
      hasSmartWalletProperty:
        typeof extendedProvider.smartWallet !== "undefined",
    });

    // Check for various indicators of smart account support
    return !!(
      extendedProvider.isCoinbaseWallet &&
      (typeof extendedProvider.getSubAccounts === "function" ||
        typeof extendedProvider._subAccounts !== "undefined" ||
        typeof extendedProvider.smartAccount !== "undefined" ||
        typeof extendedProvider.smartWallet !== "undefined")
    );
  } catch (error) {
    console.error("Error in isSmartAccountEnabled:", error);
    return false;
  }
}

// Helper function to get the Coinbase Wallet version
export function getCoinbaseWalletVersion(): string | null {
  try {
    // Use type assertion for the provider
    const provider = window.ethereum as unknown as EthereumProvider;
    if (!provider) {
      return null;
    }

    // Get the actual Coinbase provider if we're in a multi-provider setup
    const coinbaseProvider =
      provider.providers?.find(
        (p: ProviderWithCoinbase) => p.isCoinbaseWallet
      ) || provider;

    if (
      coinbaseProvider &&
      coinbaseProvider.isCoinbaseWallet &&
      coinbaseProvider.version
    ) {
      return coinbaseProvider.version;
    }

    return null;
  } catch (error) {
    console.error("Error in getCoinbaseWalletVersion:", error);
    return null;
  }
}

// Helper function to check if the wallet version supports smart accounts
export function supportsSmartAccounts(): boolean {
  try {
    const version = getCoinbaseWalletVersion();

    if (!version) {
      console.log("Could not determine Coinbase Wallet version");
      return false;
    }

    console.log("Detected Coinbase Wallet version:", version);

    // Parse version string (e.g., "3.0.0")
    const versionParts = version.split(".");
    const majorVersion = parseInt(versionParts[0], 10);

    // Smart accounts are supported in version 3.0.0 and above
    const supports = majorVersion >= 3;
    console.log(
      `Coinbase Wallet version ${version} ${
        supports ? "supports" : "does not support"
      } smart accounts`
    );

    return supports;
  } catch (error) {
    console.error("Error in supportsSmartAccounts:", error);
    return false;
  }
}
