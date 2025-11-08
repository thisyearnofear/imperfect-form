/**
 * Robust Theme Switching Hook
 *
 * This hook provides a comprehensive theme switching system with:
 * - Error handling and retry logic
 * - Loading states and visual feedback
 * - Cross-tab synchronization
 * - Automatic theme detection from chain
 * - Toast notifications
 * - Persistence with fallbacks
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { usePlatform } from '@/contexts/PlatformContext';
import { chainConfigs, SupportedChain } from '@/utils/chainSwitching';
import type { ChainId } from '@/types/theme';
import toast from 'react-hot-toast';

interface ThemeSwitchingState {
  isLoading: boolean;
  error: string | null;
  lastSuccessfulTheme: ChainId | null;
  retryCount: number;
}

interface UseRobustThemeSwitchingReturn {
  // State
  isLoading: boolean;
  error: string | null;
  currentTheme: ChainId;

  // Actions
  switchToChain: (chainId: number, options?: { silent?: boolean }) => Promise<boolean>;
  switchToTheme: (themeId: ChainId, options?: { silent?: boolean }) => Promise<boolean>;
  resetToDefault: () => void;
  retry: () => Promise<boolean>;

  // Utilities
  getThemeForChain: (chainId: number) => ChainId;
  isChainSupported: (chainId: number) => boolean;
  getAvailableThemes: () => { id: ChainId; name: string; chainId: number }[];
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second
const NOTIFICATION_THROTTLE_MS = 2000; // Throttle success notifications

export function useRobustThemeSwitching(): UseRobustThemeSwitchingReturn {
  const { currentTheme, setTheme } = useEnhancedChainTheme();
  const { wallet, actions } = usePlatform();

  const [state, setState] = useState<ThemeSwitchingState>({
    isLoading: false,
    error: null,
    lastSuccessfulTheme: null,
    retryCount: 0,
  });

  // Track last notification time to throttle success notifications
  const lastNotificationTime = useRef<number>(0);

  // Initialize last successful theme
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      lastSuccessfulTheme: currentTheme.id,
    }));
  }, [currentTheme.id]);

  // Map chain ID to theme ID with validation
  const getThemeForChain = useCallback((chainId: number): ChainId => {
    switch (chainId) {
      case chainConfigs[SupportedChain.BASE].id:
        return 'base';
      case chainConfigs[SupportedChain.POLYGON].id:
        return 'polygon';
      case chainConfigs[SupportedChain.CELO].id:
        return 'celo';
      case chainConfigs[SupportedChain.MONAD].id:
        return 'monad';
      default:
        console.warn(`Unsupported chain ID: ${chainId}, defaulting to base theme`);
        return 'base';
    }
  }, []);

  // Check if chain is supported
  const isChainSupported = useCallback((chainId: number): boolean => {
    return Object.values(chainConfigs).some((config) => config.id === chainId);
  }, []);

  // Get available themes with metadata
  const getAvailableThemes = useCallback(() => {
    return [
      { id: 'base' as ChainId, name: 'Base', chainId: chainConfigs[SupportedChain.BASE].id },
      {
        id: 'polygon' as ChainId,
        name: 'Polygon',
        chainId: chainConfigs[SupportedChain.POLYGON].id,
      },
      { id: 'celo' as ChainId, name: 'Celo', chainId: chainConfigs[SupportedChain.CELO].id },
      { id: 'monad' as ChainId, name: 'Monad', chainId: chainConfigs[SupportedChain.MONAD].id },
    ];
  }, []);

  // Apply theme with error handling and retries
  const applyThemeWithRetry = useCallback(
    async (themeId: ChainId, attemptCount = 0): Promise<boolean> => {
      try {
        console.log(`🎨 Applying theme: ${themeId} (attempt ${attemptCount + 1})`);

        // Update theme context
        setTheme(themeId);

        // Update localStorage for persistence
        if (typeof window !== 'undefined') {
          localStorage.setItem('selectedNetwork', themeId);
          localStorage.setItem('selectedChain', themeId);
          localStorage.setItem('lastSuccessfulTheme', themeId);
          localStorage.setItem('themeLastUpdated', Date.now().toString());
        }

        // Wait for theme to be applied
        await new Promise((resolve) => setTimeout(resolve, 150));

        // Dispatch a custom event to notify components that theme has changed
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('themeChanged', { detail: { themeId } }));
        }

        // Verify theme was applied by checking multiple CSS custom properties
        if (typeof document !== 'undefined') {
          const rootStyles = getComputedStyle(document.documentElement);
          const appliedBackground = rootStyles.getPropertyValue('--color-background').trim();
          const appliedPrimary = rootStyles.getPropertyValue('--color-primary').trim();
          const appliedText = rootStyles.getPropertyValue('--color-text').trim();

          // Check if at least the essential properties are applied
          const isBackgroundApplied =
            appliedBackground && appliedBackground !== 'initial' && appliedBackground !== '';
          const isPrimaryApplied =
            appliedPrimary && appliedPrimary !== 'initial' && appliedPrimary !== '';
          const isTextApplied = appliedText && appliedText !== 'initial' && appliedText !== '';

          if (!isBackgroundApplied || !isPrimaryApplied || !isTextApplied) {
            throw new Error('Theme CSS properties not applied correctly');
          }
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          lastSuccessfulTheme: themeId,
          retryCount: 0,
        }));

        console.log(`✅ Theme applied successfully: ${themeId}`);
        return true;
      } catch (error) {
        console.error(`❌ Theme application failed for ${themeId}:`, error);

        if (attemptCount < MAX_RETRY_ATTEMPTS) {
          console.log(`🔄 Retrying theme application in ${RETRY_DELAY}ms...`);

          setState((prev) => ({
            ...prev,
            retryCount: attemptCount + 1,
          }));

          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          return applyThemeWithRetry(themeId, attemptCount + 1);
        } else {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: `Failed to apply theme after ${MAX_RETRY_ATTEMPTS} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
            retryCount: 0,
          }));
          return false;
        }
      }
    },
    [setTheme]
  );

  // Switch to theme directly
  const switchToTheme = useCallback(
    async (themeId: ChainId, options: { silent?: boolean } = {}): Promise<boolean> => {
      if (themeId === currentTheme.id) {
        console.log(`Theme ${themeId} is already active`);
        return true;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        retryCount: 0,
      }));

      const shouldShowNotifications = !options.silent;
      const now = Date.now();
      const shouldThrottleSuccess = now - lastNotificationTime.current < NOTIFICATION_THROTTLE_MS;

      let toastId: string | undefined;
      if (shouldShowNotifications) {
        toastId = toast.loading(`Switching to ${themeId} theme...`);
      }

      try {
        const success = await applyThemeWithRetry(themeId);

        if (success) {
          if (shouldShowNotifications && !shouldThrottleSuccess) {
            toast.success(`Switched to ${themeId} theme!`, { id: toastId });
            lastNotificationTime.current = now;
          } else if (toastId) {
            // Dismiss loading toast silently
            toast.dismiss(toastId);
          }
        } else {
          if (shouldShowNotifications) {
            toast.error(`Failed to switch to ${themeId} theme`, { id: toastId });
          }
        }

        return success;
      } catch (error) {
        if (shouldShowNotifications) {
          toast.error(
            `Error switching theme: ${error instanceof Error ? error.message : 'Unknown error'}`,
            { id: toastId }
          );
        }
        return false;
      }
    },
    [currentTheme.id, applyThemeWithRetry]
  );

  // Switch chain and update theme
  const switchToChain = useCallback(
    async (chainId: number, options: { silent?: boolean } = {}): Promise<boolean> => {
      if (!isChainSupported(chainId)) {
        const errorMsg = `Chain ID ${chainId} is not supported`;
        console.error(errorMsg);

        if (!options.silent) {
          toast.error(errorMsg);
        }

        setState((prev) => ({
          ...prev,
          error: errorMsg,
          isLoading: false,
        }));

        return false;
      }

      setState((prev) => ({
        ...prev,
        isLoading: true,
        error: null,
        retryCount: 0,
      }));

      const themeId = getThemeForChain(chainId);
      const shouldShowNotifications = !options.silent;
      const now = Date.now();
      const shouldThrottleSuccess = now - lastNotificationTime.current < NOTIFICATION_THROTTLE_MS;

      let toastId: string | undefined;
      if (shouldShowNotifications) {
        toastId = toast.loading(`Switching to ${themeId} network...`);
      }

      try {
        // First switch the wallet chain
        console.log(`🔗 Switching wallet to chain ${chainId}`);
        const chainSwitchSuccess = await actions.switchChain(chainId);

        if (!chainSwitchSuccess) {
          throw new Error('Failed to switch wallet chain');
        }

        // Then apply the corresponding theme
        console.log(`🎨 Applying theme for chain ${chainId}: ${themeId}`);
        const themeSuccess = await applyThemeWithRetry(themeId);

        if (!themeSuccess) {
          throw new Error('Failed to apply theme after chain switch');
        }

        if (shouldShowNotifications && !shouldThrottleSuccess) {
          toast.success(`Switched to ${themeId} network!`, { id: toastId });
          lastNotificationTime.current = now;
        } else if (toastId) {
          // Dismiss loading toast silently
          toast.dismiss(toastId);
        }

        return true;
      } catch (error) {
        console.error('Chain switch failed:', error);
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMsg,
        }));

        if (shouldShowNotifications) {
          toast.error(`Failed to switch network: ${errorMsg}`, { id: toastId });
        }

        return false;
      }
    },
    [isChainSupported, getThemeForChain, applyThemeWithRetry, actions]
  );

  // Reset to default theme
  const resetToDefault = useCallback(() => {
    console.log('🔄 Resetting to default theme');
    setState((prev) => ({
      ...prev,
      error: null,
      retryCount: 0,
    }));

    switchToTheme('base');
  }, [switchToTheme]);

  // Retry last failed operation
  const retry = useCallback(async (): Promise<boolean> => {
    if (!state.error) {
      console.log('No error to retry');
      return true;
    }

    console.log('🔄 Retrying last theme operation');

    // Try to restore last successful theme or default to base
    const themeToRetry = state.lastSuccessfulTheme || 'base';
    return switchToTheme(themeToRetry);
  }, [state.error, state.lastSuccessfulTheme, switchToTheme]);

  // Auto-sync theme when chain changes externally
  useEffect(() => {
    if (wallet.chainId && wallet.isConnected) {
      const expectedTheme = getThemeForChain(wallet.chainId);

      if (expectedTheme !== currentTheme.id && !state.isLoading) {
        console.log(`🔄 Auto-syncing theme for chain ${wallet.chainId}: ${expectedTheme}`);
        // Auto-sync should be silent to avoid notification spam
        switchToTheme(expectedTheme, { silent: true });
      }
    }
  }, [
    wallet.chainId,
    wallet.isConnected,
    currentTheme.id,
    getThemeForChain,
    switchToTheme,
    state.isLoading,
  ]);

  // Cross-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'selectedNetwork' && e.newValue && e.newValue !== currentTheme.id) {
        console.log(`🔄 Cross-tab theme sync: ${e.newValue}`);
        // Cross-tab sync should be silent to avoid notification spam
        switchToTheme(e.newValue as ChainId, { silent: true });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [currentTheme.id, switchToTheme]);

  return {
    // State
    isLoading: state.isLoading,
    error: state.error,
    currentTheme: currentTheme.id,

    // Actions
    switchToChain,
    switchToTheme,
    resetToDefault,
    retry,

    // Utilities
    getThemeForChain,
    isChainSupported,
    getAvailableThemes,
  };
}
