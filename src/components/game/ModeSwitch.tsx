import React, { memo } from 'react';
import { useEnhancedChainTheme } from '@/contexts/ChainThemeContext';
import '@/styles/mode-switch.css';

// Types
export type Mode = 'pushups' | 'squats';

interface ModeSwitchProps {
  value: Mode;
  disabled?: boolean;
  onChange: (mode: Mode) => void;
  id?: string;
  className?: string;
  availableModes?: Mode[]; // Allow filtering which modes to show
  layout?: 'horizontal' | 'grid'; // Support different layouts for many options
}

interface ModeOption {
  value: Mode;
  label: string;
  ariaLabel?: string;
  icon?: string;
  category?: 'upper-body' | 'lower-body' | 'full-body' | 'cardio';
}

// Constants
const ALL_MODE_OPTIONS: ModeOption[] = [
  {
    value: 'pushups',
    label: 'Push-ups',
    icon: '💪',
    ariaLabel: 'Switch to push-ups mode',
    category: 'upper-body',
  },
  {
    value: 'squats',
    label: 'Squats',
    icon: '🏋️',
    ariaLabel: 'Switch to squats mode',
    category: 'lower-body',
  },
];

// Component
const ModeSwitch: React.FC<ModeSwitchProps> = memo(
  ({
    value,
    disabled = false,
    onChange,
    id = 'modeSwitch',
    className = '',
    availableModes = ['pushups', 'squats'], // Default to current supported modes
    layout = 'horizontal',
  }) => {
    const { currentTheme } = useEnhancedChainTheme();
    const { palette } = currentTheme;

    // Only show currently supported exercises
    const supportedModes = ['pushups', 'squats'] as Mode[];
    const modeOptions = ALL_MODE_OPTIONS; // Now ALL_MODE_OPTIONS only contains supported modes

    // Dynamic styles based on chain theme
    const containerStyle: React.CSSProperties = {
      borderColor: palette.accent,
    };

    const handleModeChange = (mode: Mode) => {
      if (!disabled && mode !== value && supportedModes.includes(mode)) {
        onChange(mode);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent, mode: Mode) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleModeChange(mode);
      }
    };

    return (
      <div
        className={`imf-mode-switch font-press border-2 ${className}`.trim()}
        style={containerStyle}
        id={id}
        role="group"
        aria-label="Workout mode selection"
        data-testid="mode-switch"
      >
        {modeOptions.map((mode) => {
          const isSelected = value === mode.value;
          return (
            <button
              key={mode.value}
              type="button"
              className={`imf-mode-segment font-press${isSelected ? ' selected' : ''} touch-target`}
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={mode.ariaLabel || `Select ${mode.label}`}
              onClick={() => handleModeChange(mode.value)}
              onKeyDown={(e) => handleKeyDown(e, mode.value)}
              data-testid={`mode-${mode.value}`}
              data-category={mode.category}
            >
              <span className="mode-icon" aria-hidden="true">
                {mode.icon}
              </span>
              <span className="mode-label">{mode.label}</span>
            </button>
          );
        })}
      </div>
    );
  }
);

ModeSwitch.displayName = 'ModeSwitch';

export default ModeSwitch;

// Export types for external use
export type { ModeSwitchProps, ModeOption };
