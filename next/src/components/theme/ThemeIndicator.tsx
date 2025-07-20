/**
 * Theme Indicator Component
 * 
 * A visual indicator that shows the current theme and provides
 * immediate feedback when themes change. Can be used anywhere
 * in the app to show theme state.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import { useRobustThemeSwitching } from '@/hooks/useRobustThemeSwitching';
import type { ChainId } from '@/types/theme';

interface ThemeIndicatorProps {
  className?: string;
  showLabel?: boolean;
  showColors?: boolean;
  compact?: boolean;
  interactive?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'static';
}

export function ThemeIndicator({
  className = '',
  showLabel = true,
  showColors = true,
  compact = false,
  interactive = false,
  position = 'static',
}: ThemeIndicatorProps) {
  const { currentTheme } = useEnhancedChainTheme();
  const {
    isLoading,
    error,
    getAvailableThemes,
    switchToTheme,
  } = useRobustThemeSwitching();

  const [isAnimating, setIsAnimating] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Animate when theme changes
  useEffect(() => {
    setIsAnimating(true);
    const timeout = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timeout);
  }, [currentTheme.id]);

  const positionClasses = {
    'top-left': 'fixed top-4 left-4 z-50',
    'top-right': 'fixed top-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'static': 'relative',
  };

  const handleThemeClick = (themeId: ChainId) => {
    if (interactive && themeId !== currentTheme.id) {
      switchToTheme(themeId);
    }
  };

  const baseClasses = `
    ${positionClasses[position]}
    ${compact ? 'p-2' : 'p-3'}
    rounded-lg
    border
    transition-all duration-300
    ${isAnimating ? 'scale-110 shadow-lg' : 'scale-100'}
    ${className}
  `;

  return (
    <div
      className={baseClasses}
      style={{
        backgroundColor: currentTheme.palette.surface,
        borderColor: currentTheme.palette.primary,
        color: currentTheme.palette.text,
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2">
        {/* Theme Colors */}
        {showColors && (
          <div className="flex gap-1">
            <div
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ backgroundColor: currentTheme.palette.primary }}
              title="Primary Color"
            />
            <div
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ backgroundColor: currentTheme.palette.secondary }}
              title="Secondary Color"
            />
            <div
              className="w-3 h-3 rounded-full border border-white/20"
              style={{ backgroundColor: currentTheme.palette.accent }}
              title="Accent Color"
            />
          </div>
        )}

        {/* Theme Label */}
        {showLabel && !compact && (
          <div className="flex flex-col">
            <span className="text-xs font-semibold">
              {currentTheme.displayName}
            </span>
            <span className="text-xs opacity-60">
              Theme
            </span>
          </div>
        )}

        {showLabel && compact && (
          <span className="text-xs font-semibold">
            {currentTheme.id}
          </span>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
        )}

        {/* Error indicator */}
        {error && (
          <div className="w-2 h-2 bg-red-400 rounded-full" title={error} />
        )}
      </div>

      {/* Interactive Theme Switcher */}
      {interactive && showTooltip && (
        <div className="absolute top-full left-0 mt-2 p-2 bg-black/90 border border-gray-600 rounded-lg shadow-xl min-w-48">
          <div className="text-xs text-gray-300 mb-2">Switch Theme:</div>
          <div className="grid grid-cols-2 gap-1">
            {getAvailableThemes().map((theme) => (
              <button
                key={theme.id}
                onClick={() => handleThemeClick(theme.id)}
                className={`
                  p-2 rounded text-xs transition-colors
                  ${
                    currentTheme.id === theme.id
                      ? 'bg-green-700 text-green-200 cursor-default'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }
                `}
                disabled={currentTheme.id === theme.id || isLoading}
              >
                <div className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: 
                        theme.id === 'base' ? '#0052ff' :
                        theme.id === 'polygon' ? '#e879f9' :
                        theme.id === 'celo' ? '#eab308' :
                        theme.id === 'monad' ? '#555555' :
                        '#0052ff'
                    }}
                  />
                  <span>{theme.name}</span>
                  {currentTheme.id === theme.id && <span>✓</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeIndicator;
