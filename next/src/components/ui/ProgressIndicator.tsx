"use client";

import React from "react";

interface ProgressIndicatorProps {
  phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  phase, 
  className = "" 
}) => {
  const phases = [
    { key: 'initial', label: 'Setup', icon: '⚡' },
    { key: 'camera', label: 'Camera', icon: '📹' },
    { key: 'ai', label: 'AI Loading', icon: '🤖' },
    { key: 'positioning', label: 'Position', icon: '🎯' },
    { key: 'ready', label: 'Ready', icon: '✅' },
  ];

  const currentIndex = phases.findIndex(p => p.key === phase);

  return (
    <div className={`flex items-center justify-center space-x-2 ${className}`}>
      {phases.map((phaseItem, index) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;
        const isPending = index > currentIndex;

        return (
          <div key={phaseItem.key} className="flex items-center">
            <div
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all duration-300
                ${isActive ? 'bg-yellow-400 text-black animate-pulse' : ''}
                ${isCompleted ? 'bg-green-500 text-white' : ''}
                ${isPending ? 'bg-gray-600 text-gray-400' : ''}
              `}
            >
              {isCompleted ? '✓' : phaseItem.icon}
            </div>
            
            {index < phases.length - 1 && (
              <div
                className={`
                  w-8 h-0.5 mx-1 transition-all duration-300
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-600'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProgressIndicator;
