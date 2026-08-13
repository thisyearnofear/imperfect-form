'use client';

import React from 'react';
import { BRAND, SESSION_INTENTS, getIntentDef, type SessionIntent } from '@/lib/brandPositioning';
import { useSessionIntent } from '@/hooks/useSessionIntent';
import { FoyerStatus } from '@/components/game/FoyerStatus';
import type { ExerciseMode } from '@/utils/biomechanics';
import '@/styles/prestart-foyer.css';

/**
 * Register foyer (Train / Coach / Breathe) with the intent chooser.
 * Day-0 mass-market door is CoachFoyer (studio) — see docs/NORTH_STAR.md.
 * When `onStart` is provided (arcade entry), the CTA becomes a real START
 * button and a movement picker appears so "PICK A MOVE · START" is honest.
 * Without props it stays the legacy display-only foyer (SplitFlap fallback).
 */
export const PreStartFoyer: React.FC<PreStartFoyerProps> = ({
  onStart,
  mode,
  onModeChange,
  walletConnected,
  isConnecting,
  level,
  onConnect,
}) => {
  const { intent, setIntent, register } = useSessionIntent();
  const foyer = getIntentDef(intent).foyer;
  const interactive = Boolean(onStart && mode && onModeChange);

  return (
    <div
      id="instructions"
      className={`prestart-foyer prestart-foyer--${register}`}
      data-register={register}
      aria-label={`${BRAND.name} welcome`}
    >
      <p className="prestart-foyer__brand prestart-foyer__reveal" style={{ animationDelay: '0ms' }}>
        {foyer.brand}
      </p>
      <div
        className="prestart-foyer__rule prestart-foyer__reveal"
        style={{ animationDelay: '80ms' }}
      />

      <div
        className="prestart-foyer__intents prestart-foyer__reveal"
        style={{ animationDelay: '100ms' }}
        role="radiogroup"
        aria-label="Why are you here"
      >
        {SESSION_INTENTS.map((def) => (
          <IntentChip
            key={def.id}
            intent={def.id}
            label={def.label}
            ariaLabel={def.ariaLabel}
            selected={intent === def.id}
            onSelect={setIntent}
          />
        ))}
      </div>

      <p
        className="prestart-foyer__line prestart-foyer__reveal"
        style={{ animationDelay: '140ms' }}
      >
        {foyer.line1}
      </p>
      <p
        className="prestart-foyer__line prestart-foyer__line--accent prestart-foyer__reveal"
        style={{ animationDelay: '220ms' }}
      >
        {foyer.line2}
      </p>
      <p
        className="prestart-foyer__meta prestart-foyer__reveal"
        style={{ animationDelay: '320ms' }}
      >
        {foyer.trust}
      </p>
      <p
        className="prestart-foyer__meta prestart-foyer__meta--muted prestart-foyer__reveal"
        style={{ animationDelay: '400ms' }}
      >
        {foyer.hint}
      </p>

      {interactive &&
        walletConnected !== undefined &&
        isConnecting !== undefined &&
        level !== undefined &&
        onConnect && (
          <div className="prestart-foyer__reveal" style={{ animationDelay: '430ms' }}>
            <FoyerStatus
              isConnected={walletConnected}
              isConnecting={isConnecting}
              level={level}
              onConnect={onConnect}
              register="arcade"
            />
          </div>
        )}

      {interactive && (
        <div
          className="prestart-foyer__moves prestart-foyer__reveal"
          style={{ animationDelay: '460ms' }}
          role="radiogroup"
          aria-label="Choose a movement"
        >
          {ARCADE_MOVES.map((move) => {
            const selected = mode === move.mode;
            return (
              <button
                key={move.mode}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${move.label} movement`}
                className={`prestart-foyer__move${selected ? ' is-selected' : ''}`}
                onClick={() => onModeChange?.(move.mode)}
              >
                {move.label}
              </button>
            );
          })}
        </div>
      )}

      {interactive ? (
        <button
          type="button"
          className="prestart-foyer__cta prestart-foyer__reveal"
          style={{ animationDelay: '560ms' }}
          aria-label={foyer.cta}
          onClick={onStart}
        >
          {foyer.cta}
        </button>
      ) : (
        <p
          className="prestart-foyer__cta prestart-foyer__reveal"
          style={{ animationDelay: '520ms' }}
        >
          {foyer.cta}
        </p>
      )}
    </div>
  );
};

/** Same movement set as the studio foyer / mode switch — arcade-labelled.
 *  Only used by the interactive (arcade) entry today; the move chips carry
 *  arcade-only styling (.prestart-foyer--arcade .prestart-foyer__move), so
 *  extend those selectors before wiring the picker into another register. */
const ARCADE_MOVES: { mode: ExerciseMode; label: string }[] = [
  { mode: 'curls', label: 'CURLS' },
  { mode: 'pushups', label: 'PUSH-UPS' },
  { mode: 'squats', label: 'SQUATS' },
  { mode: 'pullups', label: 'PULL-UPS' },
  { mode: 'jumps', label: 'JUMPS' },
];

interface PreStartFoyerProps {
  /** When provided, the CTA becomes a real START button (functional foyer). */
  onStart?: () => void;
  /** Current exercise mode — only relevant when onStart is provided. */
  mode?: ExerciseMode;
  /** Pick a movement before starting — only relevant when onStart is provided. */
  onModeChange?: (mode: ExerciseMode) => void;
  /** Passive status strip: wallet + Level X/5 (computed once by Game). Optional
     so the legacy display-only <PreStartFoyer /> fallback keeps compiling. */
  walletConnected?: boolean;
  isConnecting?: boolean;
  level?: number;
  onConnect?: () => void;
}

function IntentChip({
  intent,
  label,
  ariaLabel,
  selected,
  onSelect,
}: {
  intent: SessionIntent;
  label: string;
  ariaLabel: string;
  selected: boolean;
  onSelect: (intent: SessionIntent) => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={ariaLabel}
      className={`prestart-foyer__intent${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect(intent)}
    >
      {label}
    </button>
  );
}

export default PreStartFoyer;
