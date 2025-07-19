import React, { createContext, useContext, useEffect, useState, useMemo, ReactNode } from "react";

type ChainId = "base" | "polygon" | "celo" | "monad";

interface ChainTheme {
  id: ChainId;
  name: string;
  palette: {
    accent: string;
    accentLight?: string;
    accent2?: string;
  };
}

const CHAIN_THEMES: Record<ChainId, ChainTheme> = {
  base:    { id: "base", name: "Base",    palette: { accent: "#0052ff", accentLight: "#3b82f6" }},
  polygon: { id: "polygon", name: "Polygon", palette: { accent: "#8247e5" }},
  celo:    { id: "celo", name: "Celo",    palette: { accent: "#10b981", accent2: "#eab308" }},
  monad:   { id: "monad", name: "Monad",   palette: { accent: "#555" }},
};

interface ChainThemeContextValue {
  currentChain: ChainTheme;
  setChain: (id: ChainId) => void;
  palette: ChainTheme["palette"];
}

const DEFAULT_CHAIN: ChainId = "base";
const LOCAL_STORAGE_KEY = "selectedNetwork";

const ChainThemeContext = createContext<ChainThemeContextValue | undefined>(undefined);

export const useChainTheme = () => {
  const ctx = useContext(ChainThemeContext);
  if (!ctx) throw new Error("useChainTheme must be used within ChainThemeProvider");
  return ctx;
};

function readChainFromStorage(): ChainId {
  if (typeof window === "undefined") return DEFAULT_CHAIN;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored && stored in CHAIN_THEMES) return stored as ChainId;
  return DEFAULT_CHAIN;
}

function injectChainEffectsCSS() {
  if (typeof document === "undefined") return;
  const id = "chain-effects-css";
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = "/chain-effects.css";
    document.head.appendChild(link);
  }
}

export const ChainThemeProvider = ({ children }: { children: ReactNode }) => {
  const [chainId, setChainId] = useState<ChainId>(readChainFromStorage());

  useEffect(() => {
    injectChainEffectsCSS();
    document.body.setAttribute("data-chain", chainId);
    const onStorage = (e: StorageEvent) => {
      if (e.key === LOCAL_STORAGE_KEY && e.newValue && e.newValue in CHAIN_THEMES) {
        setChainId(e.newValue as ChainId);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [chainId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = readChainFromStorage();
      if (stored !== chainId) setChainId(stored);
    }, 1000);
    return () => clearInterval(interval);
  }, [chainId]);

  const setChain = (id: ChainId) => {
    setChainId(id);
    localStorage.setItem(LOCAL_STORAGE_KEY, id);
    document.body.setAttribute("data-chain", id);
  };

  const value = useMemo(() => ({
    currentChain: CHAIN_THEMES[chainId],
    setChain,
    palette: CHAIN_THEMES[chainId].palette,
  }), [chainId]);

  return (
    <ChainThemeContext.Provider value={value}>
      {children}
    </ChainThemeContext.Provider>
  );
};
