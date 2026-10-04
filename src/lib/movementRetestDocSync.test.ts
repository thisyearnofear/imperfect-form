import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  RETEST_CONFIDENCE_FLOOR,
  RETEST_MAX_INCONCLUSIVE_RATE,
  RETEST_MAX_LOW_CONFIDENCE_RATE,
  RETEST_MINIMUM_PAIRS,
  RETEST_REPEATABLE_PAIR_RATE_FLOOR,
  RETEST_SIMILARITY_FLOOR,
} from '@/lib/movementRetest';
import { FORM_CHECK_THRESHOLDS } from '@/lib/coachingEngine';
import { readRepoFile } from './docSyncHelpers';

/**
 * The screening thresholds exist in three places: the TypeScript constants, the
 * plain-JS eval script, and the protocol doc. These tests fail if any one of
 * them drifts, so a published number can never quietly disagree with the code
 * that produced it.
 */

const CLI = 'scripts/evaluate-movement-retest.mjs';

/** Render a threshold the way the doc and the CLI both print it. */
const twoDp = (value: number) => value.toFixed(2);

describe('movement retest thresholds — doc sync', () => {
  it('docs/MOVEMENT_RETEST_PROTOCOL.md restates every threshold', () => {
    const doc = readRepoFile('docs/MOVEMENT_RETEST_PROTOCOL.md');

    expect(doc).toContain(`at least ${RETEST_MINIMUM_PAIRS} comparable pairs`);
    expect(doc).toContain(`\`${twoDp(RETEST_CONFIDENCE_FLOOR)}\``);
    expect(doc).toContain(`\`${twoDp(RETEST_SIMILARITY_FLOOR)}\``);
    expect(doc).toContain(`\`${twoDp(RETEST_REPEATABLE_PAIR_RATE_FLOOR)}\``);
    expect(doc).toContain(`\`${twoDp(RETEST_MAX_INCONCLUSIVE_RATE)}\``);
    expect(doc).toContain(`\`${twoDp(RETEST_MAX_LOW_CONFIDENCE_RATE)}\``);
  });

  it('the eval script uses the same thresholds as the library', () => {
    const dir = mkdtempSync(join(tmpdir(), 'imf-doc-sync-'));
    try {
      const input = join(dir, 'records.json');
      const out = join(dir, 'report');
      // The script only needs enough records to render every gate line.
      writeFileSync(
        input,
        JSON.stringify([
          {
            capturedAt: '2026-01-01T00:00:00.000Z',
            protocolId: 'curls-baseline',
            assessment: {
              rangeOfMotion: 0.7,
              control: 0.8,
              traceStability: 0.75,
              confidence: 0.8,
            },
          },
          {
            capturedAt: '2026-01-08T00:00:00.000Z',
            protocolId: 'curls-baseline',
            assessment: {
              rangeOfMotion: 0.72,
              control: 0.79,
              traceStability: 0.77,
              confidence: 0.82,
            },
          },
        ])
      );

      execFileSync('node', [CLI, '--input', input, '--out', out], { stdio: 'pipe' });
      const md = readFileSync(`${out}.md`, 'utf8');

      expect(md).toContain(`≥ ${RETEST_MINIMUM_PAIRS}`);
      expect(md).toContain(`≥ ${RETEST_CONFIDENCE_FLOOR}`);
      expect(md).toContain(`≥ ${RETEST_SIMILARITY_FLOOR}`);
      expect(md).toContain(`≥ ${RETEST_REPEATABLE_PAIR_RATE_FLOOR}`);
      expect(md).toContain(`≤ ${RETEST_MAX_INCONCLUSIVE_RATE}`);
      expect(md).toContain(`≤ ${RETEST_MAX_LOW_CONFIDENCE_RATE}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('coach gate thresholds — doc sync', () => {
  const doc = readRepoFile('docs/COACH_GATES.md');
  const T = FORM_CHECK_THRESHOLDS;

  it('documents every depth threshold', () => {
    expect(doc).toContain(String(T.depth.critical));
    expect(doc).toContain(String(T.depth.warning));
    expect(doc).toContain(String(T.depth.target));
    expect(doc).toContain(String(T.depth.good));
  });

  it('documents every trunk-lean threshold', () => {
    expect(doc).toContain(String(T.trunkLean.warning));
    expect(doc).toContain(String(T.trunkLean.squatsWarning));
    expect(doc).toContain(String(T.trunkLean.critical));
  });

  it('documents every knee-valgus threshold', () => {
    expect(doc).toContain(String(T.kneeValgus.warning));
    expect(doc).toContain(String(T.kneeValgus.critical));
    expect(doc).toContain(String(T.kneeValgus.target));
  });

  it('documents every ankle-flexion threshold', () => {
    expect(doc).toContain(String(T.ankleFlexion.info));
    expect(doc).toContain(String(T.ankleFlexion.target));
  });

  it('documents every symmetry threshold', () => {
    expect(doc).toContain(String(T.symmetry.warning));
    expect(doc).toContain(String(T.symmetry.target));
  });

  it('does not publish a threshold the code does not have', () => {
    // Guards against a stale number left behind in the doc: every decimal the
    // doc states for a known gate must be one the table actually contains.
    const known = new Set(
      Object.values(T).flatMap((group) => Object.values(group as Record<string, number>))
    );
    const stated = doc.match(/`(\d+(?:\.\d+)?)`/g) ?? [];
    const gateSection = doc.slice(doc.indexOf('## Form gates'));

    for (const literal of stated) {
      const value = Number(literal.replace(/`/g, ''));
      if (Number.isNaN(value)) continue;
      // Only check decimals that look like gate limits, not the gate ids.
      if (gateSection.includes(literal) && value < 100) {
        expect(known, `doc states ${literal}, absent from FORM_CHECK_THRESHOLDS`).toContain(value);
      }
    }
  });
});
