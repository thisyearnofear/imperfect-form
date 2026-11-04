import { EASE_ROUTINE_NOTE, isFeelEntry, type NiggleEntry } from '@/lib/niggleEntries';
import { formatSignedPercent, isMovementAssessment } from '@/lib/movementAssessmentHistory';
import type { MovementAssessment } from '@/types/movementAssessment';
import type { StoredMovementAssessment } from '@/services/integrations/MovementAssessmentDataAdapter';

/**
 * "Take this to a physio" — the week handoff artifact (four-moment medical
 * handoff §4, docs/DESIGN_EVOLUTION.md "Product positioning 2026-11").
 *
 * A plain-text summary of the week's LOCAL data — reads with dates and
 * status, key metrics with deltas vs the read before, the feel log, and
 * ease sessions done — built on-device and handed to the clipboard or the
 * share sheet. Nothing is rendered on a server and nothing is uploaded;
 * the text itself says what the meter is, so a stranger can read it
 * honestly: an on-device movement read, not a clinical test.
 *
 * The builder is pure — callers gather `stored` (IndexedDB via
 * MovementAssessmentDataAdapter) and `entries` (localStorage via
 * niggleEntries) and get the text back. Deterministic formatting keeps the
 * output stable across locales and unit-testable.
 */

export const HANDOFF_WINDOW = {
  /** Reads land weekly — two months is the stretch a physio asks about. */
  readsDays: 60,
  /** Feels + ease sessions cover roughly the pairing window. */
  feelsDays: 14,
  maxReads: 6,
  maxFeels: 8,
} as const;

const DAY_MS = 86_400_000;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** "Tue 4 Nov" — locale-independent so the log reads the same anywhere. */
function formatDay(ts: number): string {
  const d = new Date(ts);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** The mode named in the movement's own words, not the engine's. */
const MODE_LABEL: Record<string, string> = {
  reach: 'overhead reach',
  curls: 'curl',
};

const percent = (v: number): string => `${Math.round(v * 100)}%`;

const lowerFirst = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);

export interface HandoffNiggle {
  /** Joint label in the user's words — "My neck & shoulders". */
  joint?: string | null;
  /** Context label — "Tension after desk work". */
  context?: string | null;
}

/** A read's three honest signals, written as the meter names them. */
function metricsLine(assessment: MovementAssessment): string {
  const m = assessment.measurements;
  if (!m) return '';
  const parts = [`range ${percent(m.range)}`, `control ${percent(m.control)}`];
  if (m.symmetry !== null) parts.push(`balance ${percent(m.symmetry)}`);
  return parts.join(' · ');
}

/** Delta vs the read before — same protocol, both valid. */
function deltaLine(previous: MovementAssessment, current: MovementAssessment): string | null {
  const prev = previous.measurements;
  const cur = current.measurements;
  if (!prev || !cur) return null;
  const parts = [
    `range ${formatSignedPercent(cur.range - prev.range)}`,
    `control ${formatSignedPercent(cur.control - prev.control)}`,
  ];
  if (cur.symmetry !== null && prev.symmetry !== null) {
    parts.push(`balance ${formatSignedPercent(cur.symmetry - prev.symmetry)}`);
  }
  return `  vs the read before — ${parts.join(' · ')}`;
}

export function buildHandoffSummary({
  niggle,
  stored,
  entries,
  now = Date.now(),
}: {
  niggle?: HandoffNiggle | null;
  stored: StoredMovementAssessment[];
  entries: NiggleEntry[];
  now?: number;
}): string {
  const reads = stored
    .map((record) => record.assessment)
    .filter(isMovementAssessment)
    .sort((a, b) => a.capturedAt - b.capturedAt);
  const readsCutoff = now - HANDOFF_WINDOW.readsDays * DAY_MS;
  const recentReads = reads
    .filter((a) => a.capturedAt >= readsCutoff)
    .slice(-HANDOFF_WINDOW.maxReads);

  // The previous valid read on the same protocol — the delta anchor —
  // looked up across the full history, not just the printed window.
  const previousValidFor = (current: MovementAssessment): MovementAssessment | null => {
    const priors = reads.filter(
      (a) =>
        a.protocolId === current.protocolId &&
        a.status === 'valid' &&
        a.capturedAt < current.capturedAt
    );
    return priors[priors.length - 1] ?? null;
  };

  const readLines: string[] = [];
  for (const assessment of recentReads) {
    const mode = MODE_LABEL[assessment.mode] ?? assessment.mode;
    if (assessment.status !== 'valid' || !assessment.measurements) {
      readLines.push(
        `${formatDay(assessment.capturedAt)} · ${mode} — inconclusive — the meter could not get a clean read`
      );
      continue;
    }
    readLines.push(
      `${formatDay(assessment.capturedAt)} · ${mode} — a clean read — ${metricsLine(assessment)}`
    );
    const previous = previousValidFor(assessment);
    if (previous) {
      const delta = deltaLine(previous, assessment);
      if (delta) readLines.push(delta);
    }
  }

  const feelsCutoff = now - HANDOFF_WINDOW.feelsDays * DAY_MS;
  const feels = entries
    .filter(isFeelEntry)
    .filter((entry) => entry.timestamp >= feelsCutoff)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-HANDOFF_WINDOW.maxFeels);
  const easeCount = entries.filter(
    (entry) => entry.note === EASE_ROUTINE_NOTE && entry.timestamp >= feelsCutoff
  ).length;

  const sections: string[] = ['A niggle log — from Niggleometer, for a professional to read'];

  sections.push(
    niggle?.joint
      ? `The niggle — ${lowerFirst(niggle.joint)}${niggle.context ? ` · ${lowerFirst(niggle.context)}` : ''}`
      : 'The niggle — no joint named'
  );

  sections.push(
    [
      'The reads — an on-device movement read, not a clinical test',
      ...(readLines.length > 0 ? readLines : ['no reads yet — the first read starts the history']),
    ].join('\n')
  );

  sections.push(
    [
      'How it felt — self-reported: 1 barely there, 5 a lot',
      ...(feels.length > 0
        ? feels.map((entry) => `${formatDay(entry.timestamp)} — ${entry.severity}/5`)
        : ['no check-ins logged this week']),
    ].join('\n')
  );

  // Ease sessions are only ever claimed when the logbook actually recorded
  // them — the post-ease feel check-in is the completion's only trace.
  if (easeCount > 0) {
    sections.push(`The ease work — ${easeCount} gentle routine${easeCount === 1 ? '' : 's'} done`);
  }

  sections.push(
    'One honest line — Niggleometer is a private movement meter: the camera\n' +
      'never uploads and these numbers stayed on this phone. Wellness\n' +
      "tracking, not a diagnosis — the professional's read is the one that counts."
  );

  return sections.join('\n\n');
}
