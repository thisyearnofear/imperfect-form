import { describe, expect, it } from 'vitest';
import { beatForPhase, deliverCoachingLine } from '@/lib/personaDelivery';
import { type CoachPersonality } from '@/lib/coachPersonalities';
import type { CoachingMomentPhase } from '@/lib/coachingMoment';

const PERSONAS: CoachPersonality[] = ['SNEL', 'STEDDIE', 'RASTA'];
const INSTRUCTION = 'One fix: pin your elbows — match the target line.';

function deliver(
  persona: CoachPersonality,
  overrides: Partial<Parameters<typeof deliverCoachingLine>[0]> = {}
) {
  return deliverCoachingLine({
    instruction: INSTRUCTION,
    phase: 'observed',
    personality: persona,
    ...overrides,
  });
}

describe('persona beat mapping', () => {
  it('gives a voice to the non-instructional phases', () => {
    expect(beatForPhase('framing')).toBe('session_start');
    expect(beatForPhase('observed')).toBe('encouragement');
    expect(beatForPhase('your_turn')).toBe('your_turn');
  });

  it('leaves a concrete correction unvoiced so the fix stays identical', () => {
    // When a specific correction is being named, the instruction IS the
    // product. A persona reword would make coaching inconsistent.
    expect(beatForPhase('correction', { hasWarning: true })).toBeNull();
  });

  it('voices a correction only when there is no specific fix to name', () => {
    expect(beatForPhase('correction', { hasWarning: false })).toBe('form_feedback');
  });

  it('promotes the first signal above whatever phase it lands in', () => {
    expect(beatForPhase('observed', { firstSignal: true })).toBe('first_signal');
    expect(beatForPhase('correction', { firstSignal: true, hasWarning: true })).toBe(
      'first_signal'
    );
  });
});

describe('persona delivery preserves the instruction', () => {
  it('always contains the original instruction', () => {
    for (const persona of PERSONAS) {
      for (const phase of ['framing', 'observed', 'your_turn'] as CoachingMomentPhase[]) {
        expect(deliver(persona, { phase })).toContain(INSTRUCTION);
      }
    }
  });

  it('names the same fix for every persona during a correction', () => {
    const lines = PERSONAS.map((persona) =>
      deliver(persona, { phase: 'correction', hasWarning: true })
    );
    for (const line of lines) {
      expect(line).toBe(INSTRUCTION);
    }
    expect(new Set(lines).size).toBe(1);
  });

  it('gives each persona a distinct delivery', () => {
    const lines = PERSONAS.map((persona) => deliver(persona, { phase: 'observed' }));
    expect(new Set(lines).size).toBeGreaterThan(1);
    for (const line of lines) expect(line).toContain(INSTRUCTION);
  });

  it('uses the persona’s own written voice for the beat', () => {
    // `observed` maps to the encouragement beat, which has per-persona copy
    // distinct from supportivePhrase (that is the session_start fallback).
    expect(deliver('SNEL', { phase: 'observed' })).toContain('Good. Keep that steady rhythm');
    expect(deliver('RASTA', { phase: 'observed' })).toContain('crowd is watching');
  });

  it('uses supportivePhrase on the session-start beat', () => {
    expect(deliver('SNEL', { phase: 'framing' })).toContain('Ready when you are');
    expect(deliver('STEDDIE', { phase: 'framing' })).toContain('Center yourself');
  });

  it('leaves arcade copy alone rather than stacking two voices', () => {
    // The arcade register already has a loud scripted voice; layering a persona
    // on top produced two competing registers.
    for (const persona of PERSONAS) {
      expect(deliver(persona, { arcade: true })).toBe(INSTRUCTION);
    }
  });

  it('passes the form score through when grading a rep', () => {
    const high = deliver('SNEL', { phase: 'correction', formScore: 92 });
    const low = deliver('SNEL', { phase: 'correction', formScore: 40 });
    expect(high).not.toBe(low);
    expect(high).toContain(INSTRUCTION);
    expect(low).toContain(INSTRUCTION);
  });
});
