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

const CHAIN_THEMES: Record&lt;ChainId, ChainTheme&gt; = {
  base:    { id: "base", name: "Base",    palette: { accent: "#0052ff", accentLight: "#3b82f6" }},
  polygon: { id: "polygon", name: "Polygon", palette: { accent: "#8247e5" }},
  celo:    { id: "celo", name: "Celo",    palette: { accent: "#10b981", accent2: "#eab308" }},
  monad:   { id: "monad", name: "Monad",   palette: { accent: "#555" }},
};

interface ChainThemeContextValue {
  currentChain: ChainTheme;
  setChain: (id: ChainId) =&gt; void;
  palette: ChainTheme["palette"];
}

const DEFAULT_CHAIN: ChainId = "base";
const LOCAL_STORAGE_KEY = "selectedNetwork";

const ChainThemeContext = createContext&lt;ChainThemeContextValue | undefined&gt;(undefined);

export const useChainTheme = () =&gt; {
  const ctx = useContext(ChainThemeContext);
  if (!ctx) throw new Error("useChainTheme must be used within ChainThemeProvider");
  return ctx;
};

function readChainFromStorage(): ChainId {
  if (typeof window === "undefined") return DEFAULT_CHAIN;
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (stored &amp;&amp; stored in CHAIN_THEMES) return stored as ChainId;
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

export const ChainThemeProvider = ({ children }: { children: ReactNode }) =&gt; {
  const [chainId, setChainId] = useState&lt;ChainId&gt;(readChainFromStorage());

  // Set body attribute and inject CSS on mount and whenever chainId changes
  useEffect(() =&gt; {
    injectChainEffectsCSS();
    document.body.setAttribute("data-chain", chainId);
    // Listen for storage events to sync across tabs
    const onStorage = (e: StorageEvent) =&gt; {
      if (e.key === LOCAL_STORAGE_KEY &amp;&amp; e.newValue &amp;&amp; e.newValue in CHAIN_THEMES) {
        setChainId(e.newValue as ChainId);
      }
    };
    window.addEventListener("storage", onStorage);
    return () =&gt; window.removeEventListener("storage", onStorage);
  }, [chainId]);

  // Listen for direct changes to localStorage in this tab
  useEffect(() =&gt; {
    const interval = setInterval(() =&gt; {
      const stored = readChainFromStorage();
      if (stored !== chainId) setChainId(stored);
    }, 1000);
    return () =&gt; clearInterval(interval);
  }, [chainId]);

  const setChain = (id: ChainId) =&gt; {
    setChainId(id);
    localStorage.setItem(LOCAL_STORAGE_KEY, id);
    document.body.setAttribute("data-chain", id);
  };

  const value = useMemo(() =&gt; ({
    currentChain: CHAIN_THEMES[chainId],
    setChain,
    palette: CHAIN_THEMES[chainId].palette,
  }), [chainId]);

  return (
    &lt;ChainThemeContext.Provider value={value}&gt;
      {children}
    &lt;/ChainThemeContext.Provider&gt;
  );
};