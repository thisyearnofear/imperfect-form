import React from "react";
import "@/styles/mode-switch.css";

export type Mode = "pushups" | "squats";

interface ModeSwitchProps {
  value: Mode;
  disabled?: boolean;
  onChange: (v: Mode) => void;
  id?: string;
}

const MODES: { value: Mode; label: string }[] = [
  { value: "pushups", label: "Push-ups" },
  { value: "squats", label: "Squats" },
];

export default function ModeSwitch({ value, disabled, onChange, id = "modeSwitch" }: ModeSwitchProps) {
  return (
    <div
      className="imf-mode-switch"
      style={{
        borderColor: "var(--accent)",
        fontFamily: "'PressStart2P', monospace",
      }}
      id={id}
      role="group"
      aria-label="Mode switch"
    >
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          className={`imf-mode-segment${value === mode.value ? " selected" : ""}`}
          style={{
            background: value === mode.value ? "var(--accent)" : "transparent",
            color: "#fff",
            fontFamily: "'PressStart2P', monospace",
          }}
          disabled={disabled}
          aria-pressed={value === mode.value}
          onClick={() => !disabled && onChange(mode.value)}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}