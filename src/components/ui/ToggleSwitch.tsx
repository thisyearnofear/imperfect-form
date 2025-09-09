import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => (
  <label className="flex items-center cursor-pointer gap-3">
    {label && <span className="text-sm font-medium">{label}</span>}
    <span className="relative inline-block w-10 h-6">
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-checked={checked}
        aria-label={label}
      />
      <span
        className={`absolute left-0 top-0 w-10 h-6 rounded-full 
          transition-colors duration-200
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}
          peer-focus:ring-2 peer-focus:ring-blue-400`}
      />
      <span
        className={`
          absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow 
          transition-transform duration-200
          ${checked ? 'translate-x-4' : ''}
        `}
      />
    </span>
  </label>
);

export default ToggleSwitch;
