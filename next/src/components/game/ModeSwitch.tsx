import React, { memo } from "react";
import { useEnhancedChainTheme } from "@/contexts/ChainThemeContext";
import "@/styles/mode-switch.css";

// Types
export type Mode = "pushups" | "squats";

interface ModeSwitchProps {
  value: Mode;
  disabled?: boolean;
  onChange: (mode: Mode) => void;
  id?: string;
  className?: string;
}

interface ModeOption {
  value: Mode;
  label: string;
  ariaLabel?: string;
}

// Constants
const MODE_OPTIONS: ModeOption[] = [
  { 
    value: "pushups", 
    label: "Push-ups",
    ariaLabel: "Switch to push-ups mode"
  },
  { 
    value: "squats", 
    label: "Squats",
    ariaLabel: "Switch to squats mode"
  },
];

// Component
const ModeSwitch: React.FC<ModeSwitchProps> = memo(({
  value,
  disabled = false,
  onChange,
  id = "modeSwitch",
  className = "",
}) => {
  const { currentTheme } = useEnhancedChainTheme();
  const { palette } = currentTheme;

  // Dynamic styles based on chain theme
  const containerStyle: React.CSSProperties = {
    borderColor: palette.accent,
    fontFamily: "'PressStart2P', monospace",
  };

  const getSegmentStyle = (isSelected: boolean): React.CSSProperties => ({
    background: isSelected ? palette.accent : "transparent",
    color: "#fff",
    fontFamily: "'PressStart2P', monospace",
  });

  const handleModeChange = (mode: Mode) => {
    if (!disabled && mode !== value) {
      onChange(mode);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent, mode: Mode) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleModeChange(mode);
    }
  };

  return (
    <div
      className={`imf-mode-switch ${className}`.trim()}
      style={containerStyle}
      id={id}
      role="group"
      aria-label="Workout mode selection"
      data-testid="mode-switch"
    >
      {MODE_OPTIONS.map((mode) => {
        const isSelected = value === mode.value;
        
        return (
          <button
            key={mode.value}
            type="button"
            className={`imf-mode-segment${isSelected ? " selected" : ""}`}
            style={getSegmentStyle(isSelected)}
            disabled={disabled}
            aria-pressed={isSelected}
            aria-label={mode.ariaLabel || `Select ${mode.label}`}
            onClick={() => handleModeChange(mode.value)}
            onKeyDown={(e) => handleKeyDown(e, mode.value)}
            data-testid={`mode-${mode.value}`}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
});

ModeSwitch.displayName = "ModeSwitch";

export default ModeSwitch;

// Export types for external use
export type { ModeSwitchProps, ModeOption };