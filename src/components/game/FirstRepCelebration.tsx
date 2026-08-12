'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { guidanceFor } from '@/lib/exerciseGuidance';
import type { ExerciseMode } from '@/utils/biomechanics';
import './first-rep-celebration.css';

interface FirstRepCelebrationProps {
  show: boolean;
  mode: ExerciseMode;
}

export function FirstRepCelebration({ show, mode }: FirstRepCelebrationProps) {
  const guidance = guidanceFor(mode);
  const [visible, setVisible] = useState(show);

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        angle: `${(i / 18) * 360}deg`,
        distance: `${60 + Math.random() * 60}px`,
        delay: `${Math.random() * 0.2}s`,
        // Teal chassis + brass punctuation — intentional mix on the first signal
        color: i % 3 === 0 ? '#fcb131' : i % 2 === 0 ? '#56d9c3' : '#7aebd8',
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
    <div className="first-rep-celebration" aria-hidden="true" data-exercise={mode}>
      <div className="first-rep-celebration__burst" />
      <div className="first-rep-celebration__text">
        <div className="first-rep-celebration__eyebrow">
          <span className="sandow-grade">FIRST SIGNAL</span>
          <span className="first-rep-celebration__index">01</span>
        </div>
        <span>First signal captured</span>
        <small>
          {guidance.label} · {guidance.focus}
        </small>
        <div className="first-rep-celebration__sequence" aria-hidden="true">
          <span className="is-complete">READ</span>
          <i />
          <span className="is-current">NOTICE</span>
          <i />
          <span>ADJUST</span>
        </div>
        <strong>Now try the one fix.</strong>
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
