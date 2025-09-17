/**
 * Provider Conflict Resolution Utility
 *
 * Addresses the "Backpack couldn't override window.ethereum" error and similar conflicts
 * by implementing intelligent provider detection and conflict resolution strategies.
 */

import { createRemoteLogger } from './remoteLogger';

const logger = createRemoteLogger('ProviderConflictResolver');

interface EthereumProvider {
  isMetaMask?: boolean;
  isCoinbaseWallet?: boolean;
  isTrust?: boolean;
  isRainbow?: boolean;
  isBackpack?: boolean;
  isPhantom?: boolean;
  isBinance?: boolean;
  isOKX?: boolean;
  isBitget?: boolean;
  providers?: EthereumProvider[];
  request?: (args: { method: string; params?: any[] }) => Promise<any>;
  on?: (event: string, handler: (...args: any[]) => void) => void;
  removeListener?: (event: string, handler: (...args: any[]) => void) => void;
  selectedProvider?: EthereumProvider;
  _metamask?: any;
  _events?: any;
}

interface ProviderInfo {
  provider: EthereumProvider;
  name: string;
  priority: number;
  isInjected: boolean;
  isActive: boolean;
}

/**
 * Provider priority rankings - higher number = higher priority
 * This helps resolve conflicts by preferring certain wallets over others
 */
const PROVIDER_PRIORITIES = {
  coinbase: 10, // Highest priority for Base network compatibility
  metamask: 9, // Most common wallet
  trust: 8, // Mobile-friendly
  rainbow: 7, // Good mobile support
  backpack: 6, // Popular but sometimes conflicts
  phantom: 5, // Solana-focused but supports Ethereum
  binance: 4, // Exchange wallet
  okx: 3, // Exchange wallet
  bitget: 2, // Exchange wallet
  unknown: 1, // Lowest priority for unidentified providers
};

/**
 * Safely access window.ethereum without triggering override errors
 */
export function safelyAccessEthereum(): EthereumProvider | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // Method 1: Use Object.getOwnPropertyDescriptor for safe access
    const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
    if (descriptor) {
      if (descriptor.get) {
        // If it's a getter, call it safely
        return descriptor.get.call(window) as EthereumProvider;
      } else if (descriptor.value) {
        // If it's a direct value, return it
        return descriptor.value as EthereumProvider;
      }
    }

    // Method 2: Direct access with error handling
    const ethereum = (window as any).ethereum;
    if (ethereum && typeof ethereum === 'object') {
      return ethereum as EthereumProvider;
    }

    return null;
  } catch (error) {
    logger.warn('Failed to safely access window.ethereum:', error);

    // Method 3: Try alternative access patterns
    try {
      // Some wallets store the provider in different locations
      const alternatives = [
        (window as any).web3?.currentProvider,
        (window as any).web3Provider,
        (window as any).coinbaseWalletExtension,
        (window as any).trustWallet,
        (window as any).phantom?.ethereum,
      ];

      for (const alt of alternatives) {
        if (alt && typeof alt === 'object' && typeof alt.request === 'function') {
          logger.info('Found alternative provider:', alt);
          return alt as EthereumProvider;
        }
      }
    } catch (altError) {
      logger.warn('Alternative provider access failed:', altError);
    }

    return null;
  }
}

/**
 * Detect all available providers in the environment
 */
export function detectAllProviders(): ProviderInfo[] {
  const providers: ProviderInfo[] = [];

  try {
    const ethereum = safelyAccessEthereum();
    if (!ethereum) {
      logger.info('No ethereum provider detected');
      return providers;
    }

    // Check if there are multiple providers in the providers array
    if (ethereum.providers && Array.isArray(ethereum.providers)) {
      logger.info('Multiple providers detected:', ethereum.providers.length);

      ethereum.providers.forEach((provider, index) => {
        const info = analyzeProvider(provider, `provider-${index}`);
        if (info) {
          providers.push(info);
        }
      });
    } else {
      // Single provider
      const info = analyzeProvider(ethereum, 'main');
      if (info) {
        providers.push(info);
      }
    }

    // Check for providers in other locations
    const additionalProviders = [
      { provider: (window as any).coinbaseWalletExtension, name: 'coinbase-extension' },
      { provider: (window as any).trustWallet, name: 'trust-standalone' },
      { provider: (window as any).phantom?.ethereum, name: 'phantom-ethereum' },
      { provider: (window as any).binance, name: 'binance-standalone' },
      { provider: (window as any).okxwallet, name: 'okx-standalone' },
      { provider: (window as any).bitget, name: 'bitget-standalone' },
    ];

    for (const { provider, name } of additionalProviders) {
      if (provider && typeof provider === 'object' && typeof provider.request === 'function') {
        const info = analyzeProvider(provider, name);
        if (info && !providers.find((p) => p.name === info.name)) {
          providers.push(info);
        }
      }
    }
  } catch (error) {
    logger.error('Failed to detect providers:', error);
  }

  // Sort by priority (highest first)
  providers.sort((a, b) => b.priority - a.priority);

  logger.info(
    'Detected providers:',
    providers.map((p) => ({ name: p.name, priority: p.priority, isActive: p.isActive }))
  );

  return providers;
}

/**
 * Analyze a provider to determine its type and capabilities
 */
function analyzeProvider(provider: any, fallbackName: string): ProviderInfo | null {
  if (!provider || typeof provider !== 'object') {
    return null;
  }

  try {
    let name = 'unknown';
    let priority = PROVIDER_PRIORITIES.unknown;

    // Identify the provider type
    if (provider.isCoinbaseWallet) {
      name = 'coinbase';
      priority = PROVIDER_PRIORITIES.coinbase;
    } else if (provider.isMetaMask && !provider.isBraveWallet) {
      // Exclude Brave's MetaMask-compatible provider
      name = 'metamask';
      priority = PROVIDER_PRIORITIES.metamask;
    } else if (provider.isTrust) {
      name = 'trust';
      priority = PROVIDER_PRIORITIES.trust;
    } else if (provider.isRainbow) {
      name = 'rainbow';
      priority = PROVIDER_PRIORITIES.rainbow;
    } else if (provider.isBackpack) {
      name = 'backpack';
      priority = PROVIDER_PRIORITIES.backpack;
    } else if (provider.isPhantom) {
      name = 'phantom';
      priority = PROVIDER_PRIORITIES.phantom;
    } else if (provider.isBinance) {
      name = 'binance';
      priority = PROVIDER_PRIORITIES.binance;
    } else if (provider.isOKX) {
      name = 'okx';
      priority = PROVIDER_PRIORITIES.okx;
    } else if (provider.isBitget) {
      name = 'bitget';
      priority = PROVIDER_PRIORITIES.bitget;
    } else {
      name = fallbackName;
    }

    return {
      provider,
      name,
      priority,
      isInjected: typeof provider.request === 'function',
      isActive: true, // We'll determine this based on actual functionality
    };
  } catch (error) {
    logger.warn('Failed to analyze provider:', error);
    return null;
  }
}

/**
 * Test if a provider is functional
 */
export async function testProviderFunctionality(provider: EthereumProvider): Promise<boolean> {
  if (!provider || typeof provider.request !== 'function') {
    return false;
  }

  try {
    // Test basic functionality with a timeout
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Provider test timeout')), 2000)
    );

    // Try eth_accounts first (less likely to fail)
    const accountsPromise = provider.request({ method: 'eth_accounts' });

    await Promise.race([accountsPromise, timeout]);
    return true;
  } catch (error) {
    logger.debug('Provider functionality test failed:', error);

    // Try a secondary test with eth_chainId
    try {
      const chainIdTimeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('ChainId test timeout')), 1000)
      );

      const chainIdPromise = provider.request({ method: 'eth_chainId' });
      await Promise.race([chainIdPromise, chainIdTimeout]);
      return true;
    } catch (secondError) {
      logger.debug('Secondary provider test also failed:', secondError);
      return false;
    }
  }
}

/**
 * Get the best available provider based on priority and functionality
 */
export async function getBestProvider(): Promise<EthereumProvider | null> {
  const allProviders = detectAllProviders();

  if (allProviders.length === 0) {
    logger.warn('No providers detected');
    return null;
  }

  // Test providers in priority order
  for (const providerInfo of allProviders) {
    logger.info(`Testing provider: ${providerInfo.name} (priority: ${providerInfo.priority})`);

    const isWorking = await testProviderFunctionality(providerInfo.provider);
    if (isWorking) {
      logger.info(`Selected working provider: ${providerInfo.name}`);
      return providerInfo.provider;
    } else {
      logger.warn(`Provider ${providerInfo.name} failed functionality test`);
    }
  }

  // If no provider passes the test, return the highest priority one anyway
  // (sometimes providers work even if they fail initial tests)
  const fallbackProvider = allProviders[0];
  logger.warn(`No provider passed tests, using fallback: ${fallbackProvider.name}`);
  return fallbackProvider.provider;
}

/**
 * Resolve provider conflicts by clearing problematic state
 */
export function resolveProviderConflicts(): boolean {
  try {
    logger.info('Attempting to resolve provider conflicts...');

    // Clear any cached provider state
    if (typeof window !== 'undefined') {
      // Clear WalletConnect related storage that might be causing conflicts
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('wc@2:') ||
            key.startsWith('walletconnect') ||
            key.includes('walletconnect') ||
            key.includes('reown') ||
            key.includes('w3m'))
        ) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => {
        try {
          localStorage.removeItem(key);
          logger.debug(`Removed conflicting storage key: ${key}`);
        } catch (error) {
          logger.warn(`Failed to remove storage key ${key}:`, error);
        }
      });

      // Clear session storage as well
      try {
        sessionStorage.removeItem('walletconnect');
        sessionStorage.removeItem('WEB3_CONNECT_CACHED_PROVIDER');
        sessionStorage.removeItem('ethereum-provider');
      } catch (error) {
        logger.warn('Failed to clear session storage:', error);
      }

      logger.info(`Resolved provider conflicts, cleared ${keysToRemove.length} storage keys`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Failed to resolve provider conflicts:', error);
    return false;
  }
}

/**
 * Wait for providers to be ready with timeout
 */
export async function waitForProvidersReady(timeoutMs: number = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkProviders = () => {
      const ethereum = safelyAccessEthereum();
      if (ethereum && typeof ethereum.request === 'function') {
        logger.info('Providers are ready');
        resolve(true);
        return;
      }

      if (Date.now() - startTime > timeoutMs) {
        logger.warn('Timeout waiting for providers to be ready');
        resolve(false);
        return;
      }

      // Check again in 100ms
      setTimeout(checkProviders, 100);
    };

    checkProviders();
  });
}

/**
 * Comprehensive provider initialization with conflict resolution
 */
export async function initializeProviderSafely(): Promise<EthereumProvider | null> {
  try {
    logger.info('Starting safe provider initialization...');

    // Step 1: Wait for providers to be available
    const providersReady = await waitForProvidersReady(5000);
    if (!providersReady) {
      logger.warn('Providers not ready within timeout, continuing anyway...');
    }

    // Step 2: Resolve any existing conflicts
    resolveProviderConflicts();

    // Step 3: Wait a bit for conflicts to clear
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Step 4: Get the best available provider
    const provider = await getBestProvider();

    if (provider) {
      logger.info('Provider initialization successful');
      return provider;
    } else {
      logger.error('No working provider found');
      return null;
    }
  } catch (error) {
    logger.error('Provider initialization failed:', error);
    return null;
  }
}

/**
 * Get provider diagnostic information for debugging
 */
export function getProviderDiagnostics(): any {
  try {
    const ethereum = safelyAccessEthereum();
    const allProviders = detectAllProviders();

    return {
      hasWindow: typeof window !== 'undefined',
      hasEthereum: !!ethereum,
      ethereumType: typeof ethereum,
      providersCount: allProviders.length,
      providers: allProviders.map((p) => ({
        name: p.name,
        priority: p.priority,
        isInjected: p.isInjected,
        hasRequest: typeof p.provider.request === 'function',
      })),
      windowKeys:
        typeof window !== 'undefined'
          ? Object.keys(window).filter(
              (key) => key.includes('ethereum') || key.includes('wallet') || key.includes('web3')
            )
          : [],
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}
