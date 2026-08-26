/**
 * Persona suggestion from measured rep tempo.
 *
 * The three coach personas are a *tempo* choice (SNEL slow-deliberate,
 * STEDDIE smooth-centered, RASTA fast-energetic), and the app already
 * measures the user's rep cadence. This module connects the two: after a few
 * sessions with a consistent tempo that mismatches the current persona, it
 * proposes a better fit — once, dismissible, never again for that persona.
 *
 * Pure decision logic only; persistence + UI live in usePersonaSuggestion.
 */

import type { CoachPersonality } from '@/lib/coachPersonalities';

/** Average seconds per rep that characterises each persona's tempo band. */
export const PERSONA_TEMPO_BANDS: Record<CoachPersonality, { min: number; max: number }> = {
  // Slow and deliberate: long, controlled reps.
  SNEL: { min: 4.0, max: Infinity },
  // Smooth and centered: the middle band.
  STEDDIE: { min: 2.5, max: 4.0 },
  // Fast and energetic: quick reps.
  RASTA: { min: 0, max: 2.5 },
};

/** Sessions required before we trust the measured tempo. */
export const MIN_SESSIONS_FOR_SUGGESTION = 3;

/** A session only counts toward tempo if it has enough reps to measure. */
export const MIN_REPS_FOR_TEMPO = 4;

export interface TempoSessionSample {
  /** Average seconds per rep for one session. */
  secondsPerRep: number;
  repCount: number;
}

export interface PersonaSuggestionState {
  /** Most recent session tempo samples (newest last), capped. */
  samples: TempoSessionSample[];
  /** Personas already suggested or dismissed — never suggest again. */
  dismissed: CoachPersonality[];
}

export interface PersonaSuggestionDecision {
  /** Persona to suggest, or null if no suggestion is warranted. */
  suggest: CoachPersonality | null;
  /** Updated state (sample appended) — assign back to storage. */
  state: PersonaSuggestionState;
}

/** Cap stored samples so the key stays tiny. */
export const MAX_TEMPO_SAMPLES = 8;

/** Which tempo band does a seconds-per-rep value fall into? */
export function tempoBandFor(secondsPerRep: number): CoachPersonality {
  if (secondsPerRep >= PERSONA_TEMPO_BANDS.SNEL.min) return 'SNEL';
  if (secondsPerRep >= PERSONA_TEMPO_BANDS.STEDDIE.min) return 'STEDDIE';
  return 'RASTA';
}

/**
 * Compute the average seconds-per-rep for a session from rep timestamps.
 * Returns null when there aren't enough reps to measure a meaningful tempo.
 */
export function sessionTempo(repTimestamps: number[]): number | null {
  if (repTimestamps.length < MIN_REPS_FOR_TEMPO) return null;
  const sorted = [...repTimestamps].sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const gap = (sorted[i] - sorted[i - 1]) / 1000;
    // Ignore implausible gaps (>30s rests) so pauses don't skew the tempo.
    if (gap > 0 && gap <= 30) intervals.push(gap);
  }
  if (intervals.length < MIN_REPS_FOR_TEMPO - 1) return null;
  return intervals.reduce((sum, v) => sum + v, 0) / intervals.length;
}

/**
 * Decide whether to suggest a persona after recording this session's tempo.
 *
 * Rules:
 * - Need MIN_SESSIONS_FOR_SUGGESTION valid samples before suggesting anything.
 * - The recent samples must agree on a band (median), not just one session.
 * - Never suggest the persona the user already has.
 * - Never re-suggest a dismissed/already-suggested persona.
 */
export function decidePersonaSuggestion(
  currentPersona: CoachPersonality,
  sessionSecondsPerRep: number | null,
  state: PersonaSuggestionState
): PersonaSuggestionDecision {
  const samples =
    sessionSecondsPerRep === null
      ? state.samples
      : [...state.samples, { secondsPerRep: sessionSecondsPerRep, repCount: 0 }].slice(
          -MAX_TEMPO_SAMPLES
        );

  const nextState: PersonaSuggestionState = { ...state, samples };

  if (samples.length < MIN_SESSIONS_FOR_SUGGESTION) {
    return { suggest: null, state: nextState };
  }

  // Median of the recent samples — robust to one odd session.
  const recent = samples.slice(-MIN_SESSIONS_FOR_SUGGESTION).map((s) => s.secondsPerRep);
  const sorted = [...recent].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const band = tempoBandFor(median);

  if (band === currentPersona) return { suggest: null, state: nextState };
  if (state.dismissed.includes(band)) return { suggest: null, state: nextState };

  return { suggest: band, state: nextState };
}

export function createPersonaSuggestionState(): PersonaSuggestionState {
  return { samples: [], dismissed: [] };
}
