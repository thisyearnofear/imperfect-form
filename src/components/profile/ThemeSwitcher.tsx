'use client';

import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useChainTheme, CHAIN_THEMES } from '@/contexts/ChainThemeContext';
import { useXpProgress } from '@/hooks/useXpProgress';
import { ChainId } from '@/types/theme';
import { toast } from 'react-hot-toast';

export const ThemeSwitcher: React.FC = () => {
  const { themeOptions, updateThemeOptions, availableThemes } = useChainTheme();
  const { progress } = useXpProgress();

  if (progress.currentLevel < 10) {
    return (
      <div className="p-4 bg-[rgba(9,33,34,0.5)] border border-[color:var(--studio-border)] rounded-xl grayscale opacity-60 relative overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div className="studio-card__section-title flex items-center gap-2">
            <span>Elite Theme Switcher</span>
            <span className="studio-card__badge">LOCKED</span>
          </div>
          <span className="text-[11px] text-[var(--studio-muted)] font-mono">UNLOCK AT LVL 10</span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-8 flex-1 bg-[rgba(139,227,212,0.05)] border border-[color:var(--studio-border)] rounded-md"
            />
          ))}
        </div>
        {/* Lock Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Lock size={28} className="opacity-25 text-[var(--studio-muted)]" aria-hidden="true" />
        </div>
      </div>
    );
  }

  const handleThemeSelect = (chainId: ChainId | undefined) => {
    updateThemeOptions({ forcedThemeId: chainId });

    const themeName = chainId ? CHAIN_THEMES[chainId].name : 'Network Default';
    toast.success(`Elite Theme: ${themeName} applied`, {
      icon: <Sparkles size={16} style={{ color: 'var(--sandow-brass)' }} />,
      style: {
        background: 'var(--studio-ink-elevated)',
        color: 'var(--studio-paper-soft)',
        border: '1px solid var(--sandow-rule-quiet)',
      },
    });
  };

  return (
    <div className="p-4 bg-[rgba(9,33,34,0.5)] border border-[color:var(--sandow-rule-quiet)] rounded-xl relative overflow-hidden group transition-colors duration-500 hover:border-[color:var(--sandow-rule)]">
      {/* Elite Background Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(252,177,49,0.06)] via-transparent to-transparent pointer-events-none" />

      {/* Animated Shine Effect */}
      <div className="absolute -inset-[100%] group-hover:inset-0 bg-gradient-to-r from-transparent via-[rgba(252,177,49,0.06)] to-transparent skew-x-[-20deg] transition-all duration-1000 pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="text-[11px] text-[var(--sandow-brass)] uppercase font-mono tracking-widest flex items-center gap-2">
          <Sparkles size={12} className="animate-pulse" aria-hidden="true" />
          <span>Elite Status Theme Switcher</span>
          <span className="bg-[rgba(252,177,49,0.16)] text-[var(--sandow-brass)] px-1.5 py-0.5 rounded text-[11px] border border-[color:var(--sandow-rule-quiet)]">
            VETERAN
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 relative z-10">
        <button
          onClick={() => handleThemeSelect(undefined)}
          className={`px-2 py-2 text-[11px] font-mono uppercase transition-all duration-300 rounded-md border flex flex-col items-center justify-center gap-1 ${
            themeOptions.forcedThemeId === undefined
              ? 'bg-[rgba(252,177,49,0.16)] border-[color:var(--sandow-rule)] text-[var(--sandow-brass)] shadow-[0_0_10px_rgba(252,177,49,0.15)]'
              : 'bg-[rgba(5,17,20,0.5)] border-[color:var(--studio-border)] text-[var(--studio-muted)] hover:text-[var(--studio-paper-soft)] hover:border-[rgba(139,227,212,0.3)]'
          }`}
        >
          <span>Auto</span>
          <span className="opacity-60 text-[9px]">Default</span>
        </button>
        {availableThemes.map((id) => (
          <button
            key={id}
            onClick={() => handleThemeSelect(id)}
            className={`px-2 py-2 text-[11px] font-mono uppercase transition-all duration-300 rounded-md border flex flex-col items-center justify-center gap-1 ${
              themeOptions.forcedThemeId === id
                ? 'bg-[rgba(252,177,49,0.16)] border-[color:var(--sandow-rule)] text-[var(--sandow-brass)] shadow-[0_0_10px_rgba(252,177,49,0.15)]'
                : 'bg-[rgba(5,17,20,0.5)] border-[color:var(--studio-border)] text-[var(--studio-muted)] hover:text-[var(--studio-paper-soft)] hover:border-[rgba(139,227,212,0.3)]'
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

      <div className="mt-3 pt-3 border-t border-[color:var(--sandow-rule-quiet)] text-[11px] font-mono text-[var(--studio-muted)] uppercase flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-[var(--sandow-brass)] animate-pulse">●</span>
          <span>
            UI Override:{' '}
            {themeOptions.forcedThemeId
              ? CHAIN_THEMES[themeOptions.forcedThemeId].name
              : 'DISABLED'}
          </span>
        </div>
        <span className="text-[11px] text-[rgba(252,177,49,0.4)]">LEVEL 10 EXCLUSIVE</span>
      </div>
    </div>
  );
};
