import React, { memo, useMemo } from 'react';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';

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

// Constants - Chain-specific pattern configurations
const CHAIN_PATTERN_CONFIGS: Record<string, ChainShapeConfig> = {
  base: { count: 12, types: ['square', 'circle'] },
  polygon: { count: 15, types: ['hexagon'] },
  celo: { count: 18, types: ['circle'] },
  monad: { count: 16, types: ['diamond'] },
};

const DEFAULT_SHAPE_CONFIG: ChainShapeConfig = { count: 12, types: ['circle'] };

// Golden ratio and fibonacci-based positioning for beautiful patterns
const GOLDEN_RATIO = 1.618033988749;
const FIBONACCI_SEQUENCE = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144];

// Utility functions for sophisticated pattern generation
const generateSpiralPosition = (index: number, total: number): { left: string; top: string } => {
  // Golden spiral positioning for natural, beautiful distribution
  const angle = index * 137.508; // Golden angle in degrees
  const radius = Math.sqrt(index / total) * 45; // Spiral outward

  const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
  const y = 50 + radius * Math.sin((angle * Math.PI) / 180);

  return {
    left: `${Math.max(5, Math.min(95, x))}%`,
    top: `${Math.max(5, Math.min(95, y))}%`,
  };
};

const generateGridPosition = (index: number, total: number): { left: string; top: string } => {
  // Fibonacci grid for structured beauty
  const cols = Math.ceil(Math.sqrt(total * GOLDEN_RATIO));
  const rows = Math.ceil(total / cols);

  const col = index % cols;
  const row = Math.floor(index / cols);

  // Add golden ratio offset for visual interest
  const offsetX = (col * 0.618) % 1;
  const offsetY = (row * 0.618) % 1;

  const x = (col / cols) * 80 + 10 + offsetX * 5;
  const y = (row / rows) * 80 + 10 + offsetY * 5;

  return { left: `${x}%`, top: `${y}%` };
};

const generateWavePosition = (index: number, total: number): { left: string; top: string } => {
  // Sine wave pattern for flowing beauty
  const progress = index / total;
  const waveCount = 3;
  const amplitude = 20;

  const x = progress * 90 + 5;
  const y = 50 + amplitude * Math.sin(progress * waveCount * 2 * Math.PI);

  return { left: `${x}%`, top: `${Math.max(10, Math.min(90, y))}%` };
};

const generatePatternPosition = (
  chainId: string,
  index: number,
  total: number
): { left: string; top: string } => {
  switch (chainId) {
    case 'base':
      return generateGridPosition(index, total);
    case 'polygon':
      return generateSpiralPosition(index, total);
    case 'celo':
      return generateWavePosition(index, total);
    case 'monad':
      return generateSpiralPosition(index, total);
    default:
      return generateSpiralPosition(index, total);
  }
};

const generateAnimationDelay = (index: number): string => {
  // Fibonacci-based delays for natural rhythm
  const fibIndex = index % FIBONACCI_SEQUENCE.length;
  return `${FIBONACCI_SEQUENCE[fibIndex] * 0.5}s`;
};

const generateShapeKey = (chainId: string, type: string, index: number): string => {
  return `${chainId}-${type}-${index}`;
};

// Enhanced shape generation hook
const useChainShapes = (chainId: string): ShapeConfig[] => {
  return useMemo(() => {
    const config = CHAIN_PATTERN_CONFIGS[chainId] || DEFAULT_SHAPE_CONFIG;
    const { count, types } = config;

    return Array.from({ length: count }, (_, index) => {
      const type = types[index % types.length];

      return {
        key: generateShapeKey(chainId, type, index),
        type,
        style: {
          ...generatePatternPosition(chainId, index, count),
          animationDelay: generateAnimationDelay(index),
          transform: `scale(${0.8 + (index % 3) * 0.2})`, // Varied sizes
        },
      };
    });
  }, [chainId]);
};

// Main component
const ChainAmbient: React.FC = memo(() => {
  const { currentTheme, isLoading } = useEnhancedChainTheme();
  const shapes = useChainShapes(currentTheme.id);

  // Don't render during loading to prevent flash
  if (isLoading) {
    return null;
  }

  return (
    <div className="chain-ambient" role="presentation" aria-hidden="true">
      {shapes.map(({ key, type, style }) => (
        <div
          key={key}
          className={`chain-ambient-shape ${type}`}
          style={style}
          data-chain={currentTheme.id}
          data-shape={type}
        />
      ))}
    </div>
  );
});

ChainAmbient.displayName = 'ChainAmbient';

export default ChainAmbient;

// Export types for external use
export type { ShapeConfig, ChainShapeConfig };
