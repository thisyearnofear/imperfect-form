import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';
import type { MovementAssessment } from '@/types/movementAssessment';
import { buildMovementRetestReport } from '@/lib/movementRetest';

const DAY = 24 * 60 * 60 * 1000;

function assessment(partial: Partial<MovementAssessment> = {}): MovementAssessment {
  return {
    version: '1.0',
    protocolId: 'curls-baseline',
    protocolVersion: '1.0',
    mode: 'curls',
    capturedAt: 1_000,
    status: 'valid',
    confidence: 0.9,
    quality: {
      poseConfidence: 0.9,
      observedFrameRatio: 1,
      bilateralFrameRatio: 1,
      stableFrameRatio: 1,
      traceFrames: 12,
      repCount: 5,
    },
    measurements: {
      range: 0.5,
      control: 0.8,
      symmetry: 0.9,
      traceStability: 0.85,
    },
    ...partial,
  };
}

function record(
  id: string,
  capturedAt: number,
  partial: Partial<MovementAssessment> = {}
): StoredMovementAssessment {
  return {
    id,
    userId: 'study-1',
    sourceSessionId: id,
    savedAt: capturedAt,
    assessment: assessment({ capturedAt, ...partial }),
  };
}

describe('movement retest CLI parity', () => {
  it('matches the tested TypeScript aggregation for a representative fixture', () => {
    const records = [
      record('one', DAY),
      record('two', DAY * 8, {
        measurements: { range: 0.51, control: 0.8, symmetry: 0.9, traceStability: 0.85 },
      }),
      record('three', DAY * 15, {
        measurements: { range: 0.52, control: 0.79, symmetry: 0.9, traceStability: 0.84 },
      }),
      record('bad', DAY * 16, {
        status: 'inconclusive',
        measurements: null,
        inconclusiveReason: 'low_visibility',
      }),
      { ...record('malformed', DAY * 17), assessment: { status: 'valid' } as never },
    ];
    const directory = mkdtempSync(join(tmpdir(), 'imperfect-form-retest-'));
    const input = join(directory, 'records.json');
    const output = join(directory, 'report');
    const script = resolve(process.cwd(), 'scripts/evaluate-movement-retest.mjs');

    try {
      writeFileSync(input, JSON.stringify({ records }));
      execFileSync(process.execPath, [script, '--input', input, '--out', output], {
        cwd: process.cwd(),
        stdio: 'pipe',
      });
      const cliReport = JSON.parse(readFileSync(`${output}.json`, 'utf8'));
      const libraryReport = buildMovementRetestReport(
        records,
        'curls-baseline',
        cliReport.capturedAt
      );

      expect(cliReport).toEqual(libraryReport);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
