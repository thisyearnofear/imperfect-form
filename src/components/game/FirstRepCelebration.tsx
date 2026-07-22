'use client';

import React, { useEffect, useMemo, useState } from 'react';
import './first-rep-celebration.css';

interface FirstRepCelebrationProps {
  show: boolean;
}

export function FirstRepCelebration({ show }: FirstRepCelebrationProps) {
  const [visible, setVisible] = useState(show);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        angle: `${(i / 18) * 360}deg`,
        distance: `${60 + Math.random() * 60}px`,
        delay: `${Math.random() * 0.2}s`,
        color: i % 2 === 0 ? '#56d9c3' : '#7aebd8',
      })),
    []
  );

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2200);
      return () => clearTimeout(timer);
    }
  }, [show]);

  if (!visible) return null;

  return (
    <div className="first-rep-celebration" aria-hidden="true">
      <div className="first-rep-celebration__burst" />
      <div className="first-rep-celebration__text">
        <span>First rep!</span>
        <small>Coach is watching</small>
      </div>
      {particles.map((particle, i) => (
        <span
          key={i}
          className="first-rep-celebration__particle"
          style={
            {
              '--frc-angle': particle.angle,
              '--frc-distance': particle.distance,
              '--frc-delay': particle.delay,
              '--frc-color': particle.color,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

export default FirstRepCelebration;
