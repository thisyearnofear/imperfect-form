'use client';

import React from 'react';
import { useChainTheme, CHAIN_THEMES } from '@/contexts/ChainThemeContext';
import { useXpProgress } from '@/hooks/useXpProgress';
import { ChainId } from '@/types/theme';
import { toast } from 'react-hot-toast';

export const ThemeSwitcher: React.FC = () => {
  const { themeOptions, updateThemeOptions, availableThemes } = useChainTheme();
  const { progress } = useXpProgress();

  if (progress.currentLevel < 10) {
    return (
      <div className="mt-6 p-4 bg-black/40 border border-gray-800 rounded-xl backdrop-blur-sm grayscale opacity-60 relative overflow-hidden">
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
        {/* Lock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-2xl opacity-20">🔒</span>
        </div>
      </div>
    );
  }

  const handleThemeSelect = (chainId: ChainId | undefined) => {
    updateThemeOptions({ forcedThemeId: chainId });

    const themeName = chainId ? CHAIN_THEMES[chainId].name : 'Network Default';
    toast.success(`Elite Theme: ${themeName} Applied!`, {
      icon: '✨',
      style: {
        background: '#000',
        color: '#FFD700',
        border: '1px solid #FFD700',
        fontSize: '10px',
        fontFamily: 'monospace',
        textTransform: 'uppercase',
      },
    });
  };

  return (
    <div className="mt-6 p-4 bg-black/40 border-2 border-[#FFD700]/30 rounded-xl backdrop-blur-sm shadow-[0_0_15px_rgba(255,215,0,0.1)] relative overflow-hidden group transition-all duration-500 hover:border-[#FFD700]/60">
      {/* Elite Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FFD700]/5 via-transparent to-transparent pointer-events-none" />

      {/* Animated Shine Effect */}
      <div className="absolute -inset-[100%] group-hover:inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/5 to-transparent skew-x-[-20deg] transition-all duration-1000 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="text-[10px] text-[#FFD700] uppercase font-mono tracking-widest flex items-center gap-2">
          <span className="animate-pulse">★</span>
          <span>Elite Status Theme Switcher</span>
          <span className="bg-[#FFD700]/20 text-[#FFD700] px-1.5 py-0.5 rounded text-[8px] border border-[#FFD700]/30 shadow-[0_0_5px_rgba(255,215,0,0.2)]">
            VETERAN
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
        <button
          onClick={() => handleThemeSelect(undefined)}
          className={`px-2 py-2 text-[8px] font-mono uppercase transition-all duration-300 rounded-md border flex flex-col items-center justify-center gap-1 ${
            themeOptions.forcedThemeId === undefined
              ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.2)]'
              : 'bg-black/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
          }`}
        >
          <span>Auto</span>
          <span className="opacity-60 text-[6px]">Default</span>
        </button>
        {availableThemes.map((id) => (
          <button
            key={id}
            onClick={() => handleThemeSelect(id)}
            className={`px-2 py-2 text-[8px] font-mono uppercase transition-all duration-300 rounded-md border flex flex-col items-center justify-center gap-1 ${
              themeOptions.forcedThemeId === id
                ? 'bg-[#FFD700]/20 border-[#FFD700] text-[#FFD700] shadow-[0_0_10px_rgba(255,215,0,0.2)]'
                : 'bg-black/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
            }`}
          >
            <span>{CHAIN_THEMES[id].name}</span>
            <div className="flex gap-1">
              <div
                className="w-2 h-2 rounded-full border border-white/20"
                style={{ backgroundColor: CHAIN_THEMES[id].palette.primary }}
              />
              <div
                className="w-2 h-2 rounded-full border border-white/20"
                style={{ backgroundColor: CHAIN_THEMES[id].palette.background }}
              />
            </div>
          </button>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-[#FFD700]/10 text-[9px] font-mono text-gray-500 uppercase flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[#FFD700] animate-pulse">●</span>
          <span>
            UI Override:{' '}
            {themeOptions.forcedThemeId
              ? CHAIN_THEMES[themeOptions.forcedThemeId].name
              : 'DISABLED'}
          </span>
        </div>
        <span className="text-[8px] text-[#FFD700]/40">LEVEL 10 EXCLUSIVE</span>
      </div>
    </div>
  );
};
