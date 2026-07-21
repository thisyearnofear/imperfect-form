/**
 * Enhanced Chain Theme Context
 *
 * This is the enhanced version of the ChainThemeContext that provides
 * comprehensive theming capabilities with full type safety and utilities.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';

import type {
  ChainTheme,
  ChainId,
  ThemeContextValue,
  ThemeOptions,
  ComponentVariant,
  ComponentSize,
  CSSCustomProperties,
} from '@/types/theme';

import { CHAIN_THEMES, DEFAULT_THEME, getThemeByChainId } from '@/lib/themes/chainThemes';

import {
  generateCSSCustomProperties,
  applyCSSCustomProperties,
  removeCSSCustomProperties,
  getThemeColor,
  getThemeSpacing,
  getThemeRadius,
  getThemeShadow,
  getButtonTheme,
  getCardTheme,
  getModalTheme,
  getInputTheme,
  validateTheme,
  mergeThemes,
  themeUtils,
  enhanceDarkModeContrast,
} from '@/lib/themes/themeUtils';

// Constants
const LOCAL_STORAGE_KEY = 'selectedNetwork';
const THEME_OPTIONS_KEY = 'themeOptions';
const _CHAIN_EFFECTS_CSS_ID = 'chain-effects-css';
const ENHANCED_THEME_CSS_ID = 'enhanced-theme-css';

// Default theme options
const DEFAULT_THEME_OPTIONS: ThemeOptions = {
  enableAnimations: true,
  enableAmbientBackground: true,
  enableTransitions: true,
  respectReducedMotion: true,
  enableHighContrast: false,
  forcedThemeId: undefined,
};

// Context
const EnhancedChainThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Custom hook
export const useEnhancedChainTheme = (): ThemeContextValue => {
  const context = useContext(EnhancedChainThemeContext);
  if (!context) {
    throw new Error('useEnhancedChainTheme must be used within EnhancedChainThemeProvider');
  }
  return context;
};

// Utility functions
const isValidChainId = (id: string): id is ChainId => {
  return id in CHAIN_THEMES;
};

const readChainFromStorage = (): ChainId => {
  if (typeof window === 'undefined') return DEFAULT_THEME.id;

  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored && isValidChainId(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to read chain from localStorage:', error);
  }

  return DEFAULT_THEME.id;
};

const writeChainToStorage = (chainId: ChainId): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, chainId);
  } catch (error) {
    console.warn('Failed to write chain to localStorage:', error);
  }
};

const readThemeOptionsFromStorage = (): ThemeOptions => {
  if (typeof window === 'undefined') return DEFAULT_THEME_OPTIONS;

  try {
    const stored = localStorage.getItem(THEME_OPTIONS_KEY);
    if (stored) {
      return { ...DEFAULT_THEME_OPTIONS, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.warn('Failed to read theme options from localStorage:', error);
  }

  return DEFAULT_THEME_OPTIONS;
};

const writeThemeOptionsToStorage = (options: ThemeOptions): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(THEME_OPTIONS_KEY, JSON.stringify(options));
  } catch (error) {
    console.warn('Failed to write theme options to localStorage:', error);
  }
};

const injectEnhancedThemeCSS = (): void => {
  if (typeof document === 'undefined') return;

  // Check if CSS is already injected
  if (document.getElementById(ENHANCED_THEME_CSS_ID)) return;

  const link = document.createElement('link');
  link.id = ENHANCED_THEME_CSS_ID;
  link.rel = 'stylesheet';
  link.href = '/enhanced-theme.css';
  link.onload = () => console.debug('Enhanced theme CSS loaded');
  link.onerror = () => console.warn('Failed to load enhanced theme CSS');

  document.head.appendChild(link);
};

const updateBodyAttribute = (chainId: ChainId): void => {
  if (typeof document === 'undefined') return;
  document.body.setAttribute('data-chain', chainId);
};

const applyThemeOptions = (options: ThemeOptions): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;

  // Apply animation preferences
  root.style.setProperty('--animations-enabled', options.enableAnimations ? '1' : '0');
  root.style.setProperty('--transitions-enabled', options.enableTransitions ? '1' : '0');
  root.style.setProperty('--ambient-enabled', options.enableAmbientBackground ? '1' : '0');

  // Apply accessibility preferences
  if (options.respectReducedMotion) {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      root.style.setProperty('--animations-enabled', '0');
      root.style.setProperty('--transitions-enabled', '0');
    }
  }

  if (options.enableHighContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }
};

// Debounced theme application for performance
const createDebouncedApplyTheme = () => {
  let timeout: NodeJS.Timeout;

  return (theme: ChainTheme, options: ThemeOptions) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      // Enhance dark mode contrast if enabled
      const enhancedTheme = options.enableHighContrast ? enhanceDarkModeContrast(theme) : theme;

      const properties = generateCSSCustomProperties(enhancedTheme);
      applyCSSCustomProperties(properties);
      applyThemeOptions(options);

      // Day-0 / studio shell owns the page chrome — do not paint chain colours over it.
      if (typeof document !== 'undefined') {
        const studioShell = document.body.getAttribute('data-shell') === 'studio';
        if (!studioShell) {
          document.body.style.setProperty('background-color', enhancedTheme.palette.background);
          document.body.style.setProperty('color', enhancedTheme.palette.text);
        } else {
          document.body.style.removeProperty('background-color');
          document.body.style.removeProperty('color');
        }
      }

      console.log(`Theme applied: ${theme.id}`, {
        background: theme.palette.background,
        text: theme.palette.text,
        primary: theme.palette.primary,
        shell: typeof document !== 'undefined' ? document.body.getAttribute('data-shell') : null,
      });
    }, 100);
  };
};

const debouncedApplyTheme = createDebouncedApplyTheme();

// Provider component
interface EnhancedChainThemeProviderProps {
  children: ReactNode;
  initialTheme?: ChainId;
  initialOptions?: Partial<ThemeOptions>;
}

export const EnhancedChainThemeProvider: React.FC<EnhancedChainThemeProviderProps> = ({
  children,
  initialTheme,
  initialOptions = {},
}) => {
  const [chainId, setChainId] = useState<ChainId>(initialTheme || DEFAULT_THEME.id);
  const [themeOptions, setThemeOptions] = useState<ThemeOptions>({
    ...DEFAULT_THEME_OPTIONS,
    ...initialOptions,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [currentProperties, setCurrentProperties] = useState<CSSCustomProperties>({});

  // Get current theme with validation and fallback
  const currentTheme = useMemo(() => {
    // Prioritize forcedThemeId if it exists
    const effectiveChainId = themeOptions.forcedThemeId || chainId;
    const theme = getThemeByChainId(effectiveChainId);

    // Apply custom overrides if any
    if (themeOptions.customOverrides) {
      return mergeThemes(theme, themeOptions.customOverrides);
    }

    return theme;
  }, [chainId, themeOptions.forcedThemeId, themeOptions.customOverrides]);

  // Initialize theme from storage
  useEffect(() => {
    const storedChain = readChainFromStorage();
    const storedOptions = readThemeOptionsFromStorage();

    setChainId(storedChain);
    setThemeOptions((prev) => ({ ...prev, ...storedOptions }));

    updateBodyAttribute(storedOptions.forcedThemeId || storedChain);
    injectEnhancedThemeCSS();

    setIsHydrated(true);
    setIsLoading(false);
  }, []);

  // Listen for storage changes (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue && isValidChainId(e.newValue)) {
        setChainId(e.newValue);
        // Prioritize forcedThemeId if it exists in current state
        updateBodyAttribute(themeOptions.forcedThemeId || e.newValue);
      } else if (e.key === THEME_OPTIONS_KEY && e.newValue) {
        try {
          const newOptions = JSON.parse(e.newValue);
          setThemeOptions((prev) => ({ ...prev, ...newOptions }));
        } catch (error) {
          console.warn('Failed to parse theme options from storage:', error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [themeOptions]);

  // Apply theme when it changes
  useEffect(() => {
    if (!isHydrated) return;

    updateBodyAttribute(currentTheme.id);
    debouncedApplyTheme(currentTheme, themeOptions);

    // Store current properties for cleanup
    const properties = generateCSSCustomProperties(currentTheme);
    setCurrentProperties(properties);

    // Validate theme in development
    if (process.env.NODE_ENV === 'development') {
      const validation = validateTheme(currentTheme);
      if (!validation.isValid) {
        console.warn('Theme validation failed:', validation.errors);
      }
      if (validation.warnings.length > 0) {
        console.warn('Theme validation warnings:', validation.warnings);
      }
    }
  }, [chainId, currentTheme, themeOptions, isHydrated]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (Object.keys(currentProperties).length > 0) {
        removeCSSCustomProperties(currentProperties);
      }
    };
  }, [currentProperties]);

  // Memoized theme setter
  const setTheme = useCallback(
    (id: ChainId) => {
      if (id === chainId) return; // Prevent unnecessary updates

      setChainId(id);
      writeChainToStorage(id);
      updateBodyAttribute(themeOptions.forcedThemeId || id);
    },
    [chainId, themeOptions.forcedThemeId]
  );

  // Theme options setter
  const updateThemeOptions = useCallback((newOptions: Partial<ThemeOptions>) => {
    setThemeOptions((prev) => {
      const updated = { ...prev, ...newOptions };
      writeThemeOptionsToStorage(updated);
      return updated;
    });
  }, []);

  // Utility functions for the context
  const getColor = useCallback(
    (path: string) => {
      return getThemeColor(currentTheme, path);
    },
    [currentTheme]
  );

  const getSpacing = useCallback(
    (size: keyof ChainTheme['spacing']) => {
      return getThemeSpacing(currentTheme, size);
    },
    [currentTheme]
  );

  const getRadius = useCallback(
    (size: keyof ChainTheme['borderRadius']) => {
      return getThemeRadius(currentTheme, size);
    },
    [currentTheme]
  );

  const getShadow = useCallback(
    (type: keyof ChainTheme['shadows']) => {
      return getThemeShadow(currentTheme, type);
    },
    [currentTheme]
  );

  const getButtonThemeConfig = useCallback(
    (variant: ComponentVariant, size: ComponentSize) => {
      return getButtonTheme(currentTheme, variant, size);
    },
    [currentTheme]
  );

  const getCardThemeConfig = useCallback(() => {
    return getCardTheme(currentTheme);
  }, [currentTheme]);

  const getModalThemeConfig = useCallback(() => {
    return getModalTheme(currentTheme);
  }, [currentTheme]);

  const getInputThemeConfig = useCallback(() => {
    return getInputTheme(currentTheme);
  }, [currentTheme]);

  // Memoized context value
  const contextValue = useMemo(
    (): ThemeContextValue => ({
      currentTheme,
      setTheme,
      isLoading,
      isHydrated,
      themeOptions,
      updateThemeOptions,

      // Utility functions
      getColor,
      getSpacing,
      getRadius,
      getShadow,

      // Component theme getters
      getButtonTheme: getButtonThemeConfig,
      getCardTheme: getCardThemeConfig,
      getModalTheme: getModalThemeConfig,
      getInputTheme: getInputThemeConfig,

      // CSS Properties
      currentProperties,
      generateProperties: () => generateCSSCustomProperties(currentTheme),

      // Theme validation
      validateTheme: () => validateTheme(currentTheme),

      // Available themes
      availableThemes: Object.keys(CHAIN_THEMES) as ChainId[],

      // Theme utilities
      utils: themeUtils,
    }),
    [
      currentTheme,
      setTheme,
      isLoading,
      isHydrated,
      themeOptions,
      updateThemeOptions,
      getColor,
      getSpacing,
      getRadius,
      getShadow,
      getButtonThemeConfig,
      getCardThemeConfig,
      getModalThemeConfig,
      getInputThemeConfig,
      currentProperties,
    ]
  );

  // Prevent hydration mismatch by not rendering until client-side hydration is complete
  if (!isHydrated) {
    return (
      <EnhancedChainThemeContext.Provider value={contextValue}>
        <div style={{ opacity: 0 }}>{children}</div>
      </EnhancedChainThemeContext.Provider>
    );
  }

  return (
    <EnhancedChainThemeContext.Provider value={contextValue}>
      {children}
    </EnhancedChainThemeContext.Provider>
  );
};

// Export additional utilities
export const useThemeUtils = () => {
  const theme = useEnhancedChainTheme();

  return {
    ...themeUtils,
    currentTheme: theme.currentTheme,
    // Add theme-specific utilities
    generateCurrentProperties: () => generateCSSCustomProperties(theme.currentTheme),
    validateCurrentTheme: () => validateTheme(theme.currentTheme),
  };
};

// Export theme validation hook
export const useThemeValidation = () => {
  const { currentTheme } = useEnhancedChainTheme();

  return useMemo(() => {
    return validateTheme(currentTheme);
  }, [currentTheme]);
};

// Export theme options hook
export const useThemeOptions = () => {
  const [options, setOptions] = useState<ThemeOptions>(DEFAULT_THEME_OPTIONS);

  useEffect(() => {
    setOptions(readThemeOptionsFromStorage());
  }, []);

  const updateOptions = useCallback((newOptions: Partial<ThemeOptions>) => {
    setOptions((prev) => {
      const updated = { ...prev, ...newOptions };
      writeThemeOptionsToStorage(updated);
      return updated;
    });
  }, []);

  return { options, updateOptions };
};

// Export for backward compatibility
export { EnhancedChainThemeContext as ChainThemeContext };
export { useEnhancedChainTheme as useChainTheme };

// Export all theme-related utilities
export * from '@/lib/themes/chainThemes';
export * from '@/lib/themes/themeUtils';
