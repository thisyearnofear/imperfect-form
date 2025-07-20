import React, { memo, useMemo } from "react";
import { useChainTheme } from "@/contexts/ChainThemeContext";

// Types
interface ShapeConfig {
  key: string;
  type: string;
  style: React.CSSProperties;
}

interface ChainShapeConfig {
  count: number;
  types: string[];
}

// Constants - Chain-specific shape configurations
const CHAIN_SHAPE_CONFIGS: Record<string, ChainShapeConfig> = {
  base: { count: 6, types: ["square", "circle"] },
  polygon: { count: 7, types: ["hexagon"] },
  celo: { count: 8, types: ["circle", "circle", "circle"] }, // Triple circles for Celo
  monad: { count: 8, types: ["diamond"] },
};

const DEFAULT_SHAPE_CONFIG: ChainShapeConfig = { count: 8, types: ["circle"] };

// Utility functions
const generateDeterministicPosition = (seed: number): { left: string; top: string } => {
  // Deterministic pseudo-random for SSR consistency
  const x = Math.abs(Math.sin(seed) * 100) % 100;
  const y = Math.abs(Math.cos(seed * 2.1) * 100) % 100;
  return { left: `${x}%`, top: `${y}%` };
};

const generateAnimationDelay = (index: number): string => {
  return `${(index * 2) % 16}s`;
};

const generateShapeKey = (chainId: string, type: string, index: number): string => {
  return `${chainId}-${type}-${index}`;
};

// Shape generation hook
const useChainShapes = (chainId: string): ShapeConfig[] => {
  return useMemo(() => {
    const config = CHAIN_SHAPE_CONFIGS[chainId] || DEFAULT_SHAPE_CONFIG;
    const { count, types } = config;

    return Array.from({ length: count }, (_, index) => {
      const type = types[index % types.length];
      const seed = index * 31 + type.length * 17; // Deterministic seed
      
      return {
        key: generateShapeKey(chainId, type, index),
        type,
        style: {
          ...generateDeterministicPosition(seed),
          animationDelay: generateAnimationDelay(index),
        },
      };
    });
  }, [chainId]);
};

// Main component
const ChainAmbient: React.FC = memo(() => {
  const { currentChain, isLoading } = useChainTheme();
  const shapes = useChainShapes(currentChain.id);

  // Don't render during loading to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <div 
      className="chain-ambient"
      role="presentation"
      aria-hidden="true"
    >
      {shapes.map(({ key, type, style }) => (
        <div 
          key={key} 
          className={type} 
          style={style}
          data-chain={currentChain.id}
          data-shape={type}
        />
      ))}
    </div>
  );
});

ChainAmbient.displayName = "ChainAmbient";

export default ChainAmbient;

// Export types for external use
export type { ShapeConfig, ChainShapeConfig };