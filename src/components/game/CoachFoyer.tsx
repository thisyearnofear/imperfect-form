'use client';

import React from 'react';
import { ArrowRight, Camera, LockKeyhole, MoveUpRight, PersonStanding, Trophy } from 'lucide-react';
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
  icon: typeof PersonStanding;
}> = [
  { mode: 'pushups', label: 'Push-ups', detail: 'Chest, shoulders, elbows', icon: MoveUpRight },
  { mode: 'squats', label: 'Squats', detail: 'Depth, knees, tempo', icon: PersonStanding },
  { mode: 'curls', label: 'Curls', detail: 'Elbow control, range', icon: MoveUpRight },
  { mode: 'pullups', label: 'Pull-ups', detail: 'Extension, symmetry', icon: MoveUpRight },
  { mode: 'jumps', label: 'Jumps', detail: 'Landing, knee tracking', icon: PersonStanding },
];

export function CoachFoyer({ mode, onModeChange, onStart }: CoachFoyerProps) {
  return (
    <section className="coach-foyer" aria-labelledby="coach-foyer-title">
      <div className="coach-foyer__eyebrow">
        <span className="coach-foyer__signal" aria-hidden="true" />
        Private camera coaching
      </div>
      <h2 id="coach-foyer-title">Move with better form.</h2>
      <p className="coach-foyer__lede">
        Pick a movement. Your camera gives live, on-device feedback while you train.
      </p>

      <fieldset className="coach-foyer__exercise-list">
        <legend>Choose a movement</legend>
        {exercises.map((exercise) => {
          const Icon = exercise.icon;
          const selected = exercise.mode === mode;
          return (
            <button
              key={exercise.mode}
              type="button"
              className={`coach-foyer__exercise${selected ? ' is-selected' : ''}`}
              aria-pressed={selected}
              onClick={() => onModeChange(exercise.mode)}
            >
              <span className="coach-foyer__exercise-icon">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <span className="coach-foyer__exercise-copy">
                <strong>{exercise.label}</strong>
                <small>{exercise.detail}</small>
              </span>
              <span className="coach-foyer__radio" aria-hidden="true" />
            </button>
          );
        })}
      </fieldset>

      <button type="button" className="coach-foyer__start" onClick={onStart}>
        <Camera size={18} strokeWidth={2} />
        Start camera coaching
        <ArrowRight size={18} strokeWidth={2} />
      </button>

      <div className="coach-foyer__trust">
        <span>
          <LockKeyhole size={14} /> Video stays on this device
        </span>
        <span>
          <Trophy size={14} /> Progress saves automatically
        </span>
      </div>
    </section>
  );
}

export default CoachFoyer;
