import { describe, expect, it } from 'vitest';
import { FORM_CHECK_THRESHOLDS } from '@/lib/coachingEngine';
import type { ExerciseMode } from '@/utils/biomechanics';
import {
  describeChecks,
  getPainIntent,
  PAIN_INTENT_KEY,
  PAIN_INTENTS,
  parsePainIntent,
  resolveRestoredPainIntentMode,
} from '@/lib/painIntents';

const VALID_MODES: ExerciseMode[] = ['curls', 'pushups', 'squats', 'pullups', 'jumps'];
const BANNED =
  /\b(cure|cures|heal|heals|treat|treats|prevent|prevents|injur\w*|diagnos\w*|rehab\w*|clinically|guarantee\w*|accura\w*|proven|%)\b/i;

const allCopy = PAIN_INTENTS.flatMap((c) =>
  [c.label, c.subhead, c.pain, c.firstRepLine, c.recapLine, c.plateCallout ?? ''].filter(Boolean)
);

describe('painIntents', () => {
  it('every chip maps to a mode the engine knows', () => {
    for (const chip of PAIN_INTENTS) {
      expect(VALID_MODES).toContain(chip.mode);
    }
  });

  it('parsePainIntent rejects garbage and round-trips ids', () => {
    expect(parsePainIntent(null)).toBeNull();
    expect(parsePainIntent('')).toBeNull();
    expect(parsePainIntent('banana')).toBeNull();
    expect(parsePainIntent('SQUAT')).toBeNull();
    for (const chip of PAIN_INTENTS) {
      expect(parsePainIntent(chip.id)).toBe(chip.id);
      expect(getPainIntent(chip.id)?.label).toBe(chip.label);
    }
  });

  it('authored copy makes no medical or invented claims', () => {
    for (const text of allCopy) {
      expect(text, `banned claim word in: ${text}`).not.toMatch(BANNED);
    }
  });

  it('the squat chip carries the stop-if-hurts note', () => {
    const squat = getPainIntent('squat')!;
    expect(squat.pain).toContain('If anything hurts, stop');
    expect(squat.pain).toContain('not medical advice');
  });

  it('a restored chip maps its mode exactly once, with no redundant call', () => {
    const stored = getPainIntent(parsePainIntent('squat'));
    // Simulates the localStorage round-trip used by usePainIntent.
    expect(stored?.mode).toBe('squats');
    expect(resolveRestoredPainIntentMode(stored, 'curls', false)).toBe('squats');
    // No chip stored -> nothing to apply.
    expect(resolveRestoredPainIntentMode(null, 'curls', false)).toBeNull();
    expect(
      resolveRestoredPainIntentMode(getPainIntent(parsePainIntent(null)), 'curls', false)
    ).toBeNull();
    // An incoming challenge owns the movement.
    expect(resolveRestoredPainIntentMode(stored, 'curls', true)).toBeNull();
    // Already on the chip's move -> skip the redundant switch.
    const unsure = getPainIntent(parsePainIntent('unsure'));
    expect(resolveRestoredPainIntentMode(unsure, 'curls', false)).toBeNull();
    const stuck = getPainIntent(parsePainIntent('stuck'));
    expect(resolveRestoredPainIntentMode(stuck, 'curls', false)).toBeNull();
  });

  it('the stored key round-trips through the same parser the hook uses', () => {
    expect(parsePainIntent(PAIN_INTENT_KEY === 'imf_painIntent_v1' ? 'squat' : '')).toBe('squat');
  });

  it('describeChecks uses the real thresholds per mode', () => {
    const T = FORM_CHECK_THRESHOLDS;

    const curls = describeChecks('curls');
    expect(curls.join(' ')).not.toContain('Range of motion');
    expect(curls.join(' ')).not.toContain('Ankle');
    expect(curls.join(' ')).toContain(`flagged above ${T.trunkLean.warning} degrees`);
    expect(curls.join(' ')).toContain(`${T.kneeValgus.critical}`);

    const squats = describeChecks('squats');
    expect(squats.join(' ')).toContain(`critical below ${T.depth.critical}`);
    expect(squats.join(' ')).toContain(`${T.trunkLean.squatsWarning} degrees for squats`);
    expect(squats.join(' ')).toContain(`${T.trunkLean.critical}`);
    expect(squats.join(' ')).toContain(
      `${T.ankleFlexion.info} degrees, target ${T.ankleFlexion.target}`
    );
    expect(squats.join(' ')).toContain(`${T.symmetry.warning}, target ${T.symmetry.target}`);

    const pushups = describeChecks('pushups');
    expect(pushups.join(' ')).toContain('Range of motion');
    expect(pushups.join(' ')).toContain(`flagged above ${T.trunkLean.warning} degrees`);
    expect(pushups.join(' ')).not.toContain('Ankle');
  });
});
