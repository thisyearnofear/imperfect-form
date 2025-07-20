import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from "react";

// Types
export type ChainId = "base" | "polygon" | "celo" | "monad";

export interface ChainTheme {
  id: ChainId;
  name: string;
  palette: {
    accent: string;
    accentLight?: string;
    accent2?: string;
  };
}

interface ChainThemeContextValue {
  currentChain: ChainTheme;
  setChain: (id: ChainId) => void;
  palette: ChainTheme["palette"];
  isLoading: boolean;
}

// Constants
const CHAIN_THEMES: Record<ChainId, ChainTheme> = {
  base: { 
    id: "base", 
    name: "Base", 
    palette: { 
      accent: "#0052ff", 
      accentLight: "#3b82f6" 
    }
  },
  polygon: { 
    id: "polygon", 
    name: "Polygon", 
    palette: { 
      accent: "#8247e5" 
    }
  },
  celo: { 
    id: "celo", 
    name: "Celo", 
    palette: { 
      accent: "#10b981", 
      accent2: "#eab308" 
    }
  },
  monad: { 
    id: "monad", 
    name: "Monad", 
    palette: { 
      accent: "#555" 
    }
  },
};

const DEFAULT_CHAIN: ChainId = "base";
const LOCAL_STORAGE_KEY = "selectedNetwork";
const CHAIN_EFFECTS_CSS_ID = "chain-effects-css";

// Context
const ChainThemeContext = createContext<ChainThemeContextValue | undefined>(undefined);

// Custom hook
export const useChainTheme = () => {
  const context = useContext(ChainThemeContext);
  if (!context) {
    throw new Error("useChainTheme must be used within ChainThemeProvider");
  }
  return context;
};

// Utility functions
const isValidChainId = (id: string): id is ChainId => {
  return id in CHAIN_THEMES;
};

const readChainFromStorage = (): ChainId => {
  if (typeof window === "undefined") return DEFAULT_CHAIN;
  
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored && isValidChainId(stored)) {
      return stored;
    }
  } catch (error) {
    console.warn("Failed to read chain from localStorage:", error);
  }
  
  return DEFAULT_CHAIN;
};

const writeChainToStorage = (chainId: ChainId): void => {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, chainId);
  } catch (error) {
    console.warn("Failed to write chain to localStorage:", error);
  }
};

const injectChainEffectsCSS = (): void => {
  if (typeof document === "undefined") return;
  
  // Check if CSS is already injected
  if (document.getElementById(CHAIN_EFFECTS_CSS_ID)) return;
  
  const link = document.createElement("link");
  link.id = CHAIN_EFFECTS_CSS_ID;
  link.rel = "stylesheet";
  link.href = "/chain-effects.css";
  link.onload = () => console.debug("Chain effects CSS loaded");
  link.onerror = () => console.warn("Failed to load chain effects CSS");
  
  document.head.appendChild(link);
};

const updateBodyAttribute = (chainId: ChainId): void => {
  if (typeof document === "undefined") return;
  document.body.setAttribute("data-chain", chainId);
};

// Provider component
export const ChainThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chainId, setChainId] = useState<ChainId>(DEFAULT_CHAIN);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize chain from storage
  useEffect(() => {
    const storedChain = readChainFromStorage();
    setChainId(storedChain);
    updateBodyAttribute(storedChain);
    injectChainEffectsCSS();
    setIsHydrated(true);
    setIsLoading(false);
  }, []);

  // Listen for storage changes (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue && isValidChainId(e.newValue)) {
        setChainId(e.newValue);
        updateBodyAttribute(e.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Update body attribute when chain changes
  useEffect(() => {
    updateBodyAttribute(chainId);
  }, [chainId]);

  // Memoized chain setter
  const setChain = useCallback((id: ChainId) => {
    if (id === chainId) return; // Prevent unnecessary updates
    
    setChainId(id);
    writeChainToStorage(id);
    updateBodyAttribute(id);
  }, [chainId]);

  // Memoized context value
  const contextValue = useMemo(() => ({
    currentChain: CHAIN_THEMES[chainId],
    setChain,
    palette: CHAIN_THEMES[chainId].palette,
    isLoading,
  }), [chainId, setChain, isLoading]);

  // Prevent hydration mismatch by not rendering until client-side hydration is complete
  if (!isHydrated) {
    return (
      <ChainThemeContext.Provider value={contextValue}>
        <div style={{ opacity: 0 }}>{children}</div>
      </ChainThemeContext.Provider>
    );
  }

  return (
    <ChainThemeContext.Provider value={contextValue}>
      {children}
    </ChainThemeContext.Provider>
  );
};

// Export chain themes for external use
export { CHAIN_THEMES };
