'use client';

import React from 'react';
import { ArrowRight, Camera, LockKeyhole } from 'lucide-react';
import { BRAND, getIntentDef } from '@/lib/brandPositioning';
import { playStudioCue } from '@/lib/uiSound';
import type { ExerciseMode } from '@/utils/biomechanics';
import '@/styles/coach-foyer.css';

type CoachFoyerProps = {
  mode: ExerciseMode;
  onModeChange: (mode: ExerciseMode) => void;
  onStart: () => void;
};

const exercises: Array<{
  mode: ExerciseMode;
  label: string;
  detail: string;
}> = [
  { mode: 'pushups', label: 'Push-ups', detail: 'Chest · elbows · line' },
  { mode: 'squats', label: 'Squats', detail: 'Depth · knees · tempo' },
  { mode: 'curls', label: 'Curls', detail: 'Elbow control · range' },
  { mode: 'pullups', label: 'Pull-ups', detail: 'Extension · symmetry' },
  { mode: 'jumps', label: 'Jumps', detail: 'Landing · knee track' },
];

export function CoachFoyer({ mode, onModeChange, onStart }: CoachFoyerProps) {
  const foyer = getIntentDef('understand').foyer;

  return (
    <section className="coach-foyer" aria-labelledby="coach-foyer-title">
      <div className="coach-foyer__atmosphere" aria-hidden="true">
        <div className="coach-foyer__glow" />
        <div className="coach-foyer__grid" />
        <div className="coach-foyer__orbit" />
      </div>

      <div className="coach-foyer__inner">
        <p className="coach-foyer__brand motion-enter">{foyer.brand}</p>

        <h2 id="coach-foyer-title" className="coach-foyer__title motion-enter motion-delay-1">
          {foyer.line1}
        </h2>
        <p className="coach-foyer__lede motion-enter motion-delay-2">{BRAND.visionLine}</p>

        <fieldset className="coach-foyer__exercise-list motion-enter motion-delay-2">
          <legend>Choose a movement</legend>
          {exercises.map((exercise, index) => {
            const selected = exercise.mode === mode;
            return (
              <button
                key={exercise.mode}
                type="button"
                className={`coach-foyer__exercise${selected ? ' is-selected' : ''}`}
                style={{ animationDelay: `${180 + index * 40}ms` }}
                aria-pressed={selected}
                onClick={() => {
                  playStudioCue('soft');
                  onModeChange(exercise.mode);
                }}
              >
                <span className="coach-foyer__exercise-copy">
                  <strong>{exercise.label}</strong>
                  <small>{exercise.detail}</small>
                </span>
                <span className="coach-foyer__radio" aria-hidden="true" />
              </button>
            );
          })}
        </fieldset>

        <button
          type="button"
          id="startButton"
          className="coach-foyer__start feel-press motion-enter"
          style={{ animationDelay: '320ms' }}
          aria-label={foyer.cta}
          onClick={() => {
            playStudioCue('press');
            onStart();
          }}
        >
          <Camera size={18} strokeWidth={2} />
          {foyer.cta}
          <ArrowRight size={18} strokeWidth={2} />
        </button>

        <p className="coach-foyer__trust motion-enter" style={{ animationDelay: '380ms' }}>
          <LockKeyhole size={14} strokeWidth={2} aria-hidden="true" />
          {BRAND.trustLine}
        </p>
      </div>
    </section>
  );
}

export default CoachFoyer;
