'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface MotivationalMessagesProps {
  phase: 'initial' | 'camera' | 'ai' | 'positioning' | 'ready';
  className?: string;
}

const MotivationalMessages: React.FC<MotivationalMessagesProps> = ({ phase, className = '' }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [messageOpacity, setMessageOpacity] = useState(1);

  const motivationalMessages = useMemo(
    () => ({
      initial: ['🚀 Ready, Fire, Aim!', '💪 Every rep counts', '🎯 Consistency > perfection'],
      camera: [
        '📸 Perfect! Camera connecting...',
        '🎬 Imperfect -> Perfect',
        '📹 Good lighting = better results',
      ],
      ai: ['💪 Stay ready...'],
      positioning: ['🎯 Almost there!', '👤 Form!', '💡 Lighting is key', '📐 Vamos'],
      ready: ["🔥 LET'S GOOO!", '💪 Time to cook!', '🏆 Champion'],
    }),
    []
  );

  useEffect(() => {
    const messages = motivationalMessages[phase] || motivationalMessages.initial;

    // Only cycle messages for AI phase (longer wait time)
    if (phase === 'ai') {
      const messageInterval = setInterval(() => {
        setMessageOpacity(0);

        setTimeout(() => {
          setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
          setMessageOpacity(1);
        }, 300);
      }, 4000); // Change message every 4 seconds during AI loading

      return () => clearInterval(messageInterval);
    } else {
      // For other phases, just show the first message
      setCurrentMessageIndex(0);
      setMessageOpacity(1);
    }
  }, [phase, motivationalMessages]);

  const currentMessages = motivationalMessages[phase] || motivationalMessages.initial;

  return (
    <div className={`text-center px-2 ${className}`}>
      <div
        className="text-sm sm:text-base font-medium transition-opacity duration-300 max-w-xs"
        style={{ opacity: messageOpacity }}
      >
        {currentMessages[currentMessageIndex]}
      </div>

      {/* Show dots indicator only during AI phase */}
      {phase === 'ai' && currentMessages.length > 1 && (
        <div className="flex justify-center space-x-1 mt-2">
          {currentMessages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                index === currentMessageIndex ? 'bg-purple-400' : 'bg-gray-600'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MotivationalMessages;
