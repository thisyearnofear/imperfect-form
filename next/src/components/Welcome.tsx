"use client";

import React, { useState, useEffect, useRef } from "react";

interface WelcomeProps {
  onComplete: () => void;
}

const Welcome: React.FC<WelcomeProps> = ({ onComplete }) => {
  const [text, setText] = useState("");
  const fullText = "Beauty is imperfection.";
  const typingSpeed = 50; // milliseconds per character
  const typingRef = useRef<NodeJS.Timeout | null>(null);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    let currentIndex = 0;

    const typeText = () => {
      if (currentIndex < fullText.length) {
        setText(fullText.substring(0, currentIndex + 1));
        currentIndex++;
        typingRef.current = setTimeout(typeText, typingSpeed);
      } else {
        setCompleted(true);
        // Wait a moment after typing is complete before calling onComplete
        setTimeout(() => {
          onComplete();
        }, 1000);
      }
    };

    typingRef.current = setTimeout(typeText, typingSpeed);

    return () => {
      if (typingRef.current) {
        clearTimeout(typingRef.current);
      }
    };
  }, [onComplete]);

  return (
    <div className="typewriter" aria-live="polite">
      <p>{text}</p>
      {completed && (
        <button
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={onComplete}
        >
          Stay Hard
        </button>
      )}
    </div>
  );
};

export default Welcome;
