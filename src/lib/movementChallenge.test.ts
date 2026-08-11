import { describe, expect, it } from 'vitest';
import { CURL_BASELINE_PROTOCOL } from '@/types/movementAssessment';
import type { MovementAssessment } from '@/types/movementAssessment';
import {
  createMovementChallengePayload,
  createMovementChallengeUrl,
  decodeMovementChallenge,
  encodeMovementChallenge,
} from '@/lib/movementChallenge';

const assessment: MovementAssessment = {
  version: '1.0',
  protocolId: CURL_BASELINE_PROTOCOL.id,
  protocolVersion: CURL_BASELINE_PROTOCOL.version,
  mode: 'curls',
  capturedAt: 123,
  status: 'valid',
  confidence: 0.84,
  quality: {
    poseConfidence: 0.9,
    observedFrameRatio: 0.9,
    bilateralFrameRatio: 0.9,
    stableFrameRatio: 0.9,
    traceFrames: 20,
    repCount: 5,
  },
  measurements: { range: 0.7, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
};

describe('movementChallenge', () => {
  it('creates an aggregate-only payload without camera or identity data', () => {
    const payload = createMovementChallengePayload(assessment, 'Repeat the same setup next week.');

    expect(payload.version).toBe('1.0');
    expect(payload.mode).toBe('curls');
    expect(payload.confidence).toBe('clear');
    expect(JSON.stringify(payload)).not.toContain('trace');
    expect(JSON.stringify(payload)).not.toContain('capturedAt');
    expect(JSON.stringify(payload)).not.toContain('wallet');
  });

  it('round-trips through the share encoding and URL', () => {
    const payload = createMovementChallengePayload(assessment, 'Repeat the same setup next week.');
    const decoded = decodeMovementChallenge(encodeMovementChallenge(payload));
    const url = createMovementChallengeUrl(payload, 'https://example.test');

    expect(decoded).toEqual(payload);
    expect(url).toContain('https://example.test/challenge?assessment=');
    expect(url).not.toContain('trace');
  });

  it('rejects invalid and oversized payloads', () => {
    expect(
      decodeMovementChallenge(encodeURIComponent(JSON.stringify({ version: '0.1' })))
    ).toBeNull();
    expect(
      decodeMovementChallenge(
        encodeURIComponent(
          JSON.stringify({
            ...createMovementChallengePayload(assessment, 'Focus'),
            headline: 'x'.repeat(141),
          })
        )
      )
    ).toBeNull();
    expect(() =>
      createMovementChallengePayload(
        { ...assessment, status: 'inconclusive', measurements: null },
        'Try again'
      )
    ).toThrow();
  });
});
