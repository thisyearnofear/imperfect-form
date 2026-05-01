'use client';

import React from 'react';
import { useChainTheme } from '@/contexts/ChainThemeContext';
import { useXpProgress } from '@/hooks/useXpProgress';
import { ChainId } from '@/types/theme';

export const ThemeSwitcher: React.FC = () => {
  const { themeOptions, updateThemeOptions, availableThemes } = useChainTheme();
  const { progress } = useXpProgress();

  if (progress.currentLevel < 10) {
    return (
      <div className="mt-6 p-4 bg-black/40 border border-gray-800 rounded-xl backdrop-blur-sm grayscale opacity-60">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-gray-500 uppercase font-mono tracking-widest flex items-center gap-2">
            <span>Elite Theme Switcher</span>
            <span className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-[8px]">
              LOCKED
            </span>
          </div>
          <span className="text-[10px] text-gray-600 font-mono">UNLOCK AT LVL 10</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-8 flex-1 bg-gray-900/50 border border-gray-800 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  const handleThemeSelect = (chainId: ChainId | undefined) => {
    updateThemeOptions({ forcedThemeId: chainId });
  };

  return (
    <div className="mt-6 p-4 bg-black/40 border-2 border-[#FFD700]/30 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(255,215,0,0.1)] relative overflow-hidden group">
      {/* Elite Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 via-transparent to-transparent pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="text-[10px] text-[#FFD700] uppercase font-mono tracking-widest flex items-center gap-2">
          <span>Elite Status Theme Switcher</span>
          <span className="bg-[#FFD700]/20 text-[#FFD700] px-1.5 py-0.5 rounded text-[8px] animate-pulse">
            VETERAN
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
        <button
          onClick={() => handleThemeSelect(undefined)}
          className={`px-2 py-2 text-[8px] font-mono uppercase transition-all duration-300 rounded-md border ${
            themeOptions.forcedThemeId === undefined
              ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]'
              : 'bg-black/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
          }`}
        >
          Network Default
        </button>
        {availableThemes.map((id) => (
          <button
            key={id}
            onClick={() => handleThemeSelect(id)}
            className={`px-2 py-2 text-[8px] font-mono uppercase transition-all duration-300 rounded-md border ${
              themeOptions.forcedThemeId === id
                ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700]'
                : 'bg-black/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="mt-3 text-[9px] font-mono text-gray-500 uppercase flex items-center gap-2">
        <span className="text-[#FFD700] animate-pulse">●</span>
        <span>
          UI Style Override: {themeOptions.forcedThemeId ? themeOptions.forcedThemeId : 'OFF'}
        </span>
      </div>
    </div>
  );
};
