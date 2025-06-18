"use client";

import React, { useState, useEffect, useMemo } from "react";

interface MotivationalMessagesProps {
  phase: "initial" | "camera" | "ai" | "positioning" | "ready";
  className?: string;
}

const MotivationalMessages: React.FC<MotivationalMessagesProps> = ({
  phase,
  className = "",
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [messageOpacity, setMessageOpacity] = useState(1);

  const motivationalMessages = useMemo(
    () => ({
      initial: [
        "🚀 Ready, Fire, Aim!",
        "💪 Every rep counts, every second matters",
        "🎯 Consistency beats perfection",
      ],
      camera: [
        "📸 Perfect! Camera is connecting...",
        "🎬 You're about to be the star of your own fitness show",
        "📹 Good lighting = better tracking = better results",
      ],
      ai: [
        "🧠 AI is learning your movements...",
        "⚡ Neural networks are firing up!",
        "🤖 Teaching machines to count your gains",
        "🔥 This tech is pretty amazing, right?",
        "💡 Fun fact: Our AI can detect 17 key body points",
        "🏋️ While you wait, visualize crushing your goals",
        "🧘 Deep breaths... greatness is loading",
        "⏰ Good things take time, great things take a little longer",
        "🎯 Precision loading... worth the wait",
        "💪 Your future self will thank you for this patience",
      ],
      positioning: [
        "🎯 Almost there! Just need to see you clearly",
        "👤 Show that beautiful form!",
        "💡 Lighting is key - you've got this!",
        "📐 Perfect positioning = perfect tracking",
      ],
      ready: [
        "🔥 LET'S GOOO!",
        "💪 Time to show what you're made of!",
        "🏆 Champions are made in moments like this",
      ],
    }),
    []
  );

  useEffect(() => {
    const messages =
      motivationalMessages[phase] || motivationalMessages.initial;

    // Only cycle messages for AI phase (longer wait time)
    if (phase === "ai") {
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

  const currentMessages =
    motivationalMessages[phase] || motivationalMessages.initial;

  return (
    <div className={`text-center ${className}`}>
      <div
        className="text-sm font-medium transition-opacity duration-300"
        style={{ opacity: messageOpacity }}
      >
        {currentMessages[currentMessageIndex]}
      </div>

      {/* Show dots indicator only during AI phase */}
      {phase === "ai" && currentMessages.length > 1 && (
        <div className="flex justify-center space-x-1 mt-2">
          {currentMessages.map((_, index) => (
            <div
              key={index}
              className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                index === currentMessageIndex ? "bg-purple-400" : "bg-gray-600"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default MotivationalMessages;
