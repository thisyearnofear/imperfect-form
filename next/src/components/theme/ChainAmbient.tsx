import React, { memo, useMemo } from "react";
import { useChainTheme } from "@/contexts/ChainThemeContext";

// Util: randomize positions for shapes
function randomPos(seed: number) {
  // Deterministic pseudo-random for SSR consistency
  const x = Math.abs(Math.sin(seed) * 100) % 100;
  const y = Math.abs(Math.cos(seed * 2.1) * 100) % 100;
  return { left: `${x}%`, top: `${y}%` };
}

const SHAPE_COUNT: Record<string, number> = {
  base: 6,
  polygon: 7,
  celo: 8,
  monad: 8,
};

const SHAPE_TYPES: Record<string, string[]> = {
  base: ["square", "circle"],
  polygon: ["hexagon"],
  celo: ["circle", "circle", "circle"],
  monad: ["diamond"],
};

const ChainAmbient: React.FC = memo(() => {
  const { currentChain } = useChainTheme();
  const shapes = useMemo(() => {
    const count = SHAPE_COUNT[currentChain.id] || 8;
    const types = SHAPE_TYPES[currentChain.id] || ["circle"];
    // Choose shape types in round-robin
    return Array.from({ length: count }, (_, i) => {
      const type = types[i % types.length];
      return {
        key: `${currentChain.id}-${type}-${i}`,
        type,
        style: {
          ...randomPos(i * 31 + type.length * 17),
          animationDelay: `${(i * 2) % 16}s`,
        }
      };
    });
  }, [currentChain.id]);
  return (
    <div className="chain-ambient">
      {shapes.map(({ key, type, style }) => (
        <div key={key} className={type} style={style} />
      ))}
    </div>
  );
});
ChainAmbient.displayName = "ChainAmbient";

export default ChainAmbient;