import type { NiggleJointId } from '@/lib/niggleIntents';

/**
 * NiggleEntry — the logbook record (docs/DESIGN_EVOLUTION.md §F).
 * A subjective "how it felt" entry — CONTEXT, never a measurement. The
 * camera reading stays the instrument record; entries are local-first like
 * assessments.
 */

export interface NiggleEntry {
  joint: NiggleJointId;
  /** Context label at time of logging (e.g. 'Aches on stairs'). */
  context?: string;
  /** 1–5 self-reported severity, optional. */
  severity?: number;
  note?: string;
  timestamp: number;
}

export const NIGGLE_ENTRIES_KEY = 'imf_niggle_entries_v1';
const KEY = NIGGLE_ENTRIES_KEY;
const MAX_ENTRIES = 200;

/**
 * A "feel" entry is a 1–5 self-report — the shape the post-ease check-in
 * ("How does it feel now?", severity + 'After easing routine') and the
 * Today check-in both write. Note-only logbook lines (pain marks, stalled
 * reads) are context, not feels — the weekly pairing reads feel entries
 * only.
 */
export function isFeelEntry(entry: NiggleEntry): boolean {
  return (
    typeof entry.severity === 'number' &&
    Number.isFinite(entry.severity) &&
    entry.severity >= 1 &&
    entry.severity <= 5
  );
}

export function listNiggleEntries(): NiggleEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as NiggleEntry[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function addNiggleEntry(entry: Omit<NiggleEntry, 'timestamp'>): NiggleEntry {
  const record = { ...entry, timestamp: Date.now() };
  const all = [record, ...listNiggleEntries()].slice(0, MAX_ENTRIES);
  localStorage.setItem(KEY, JSON.stringify(all));
  return record;
}

export function clearNiggleEntries(): void {
  localStorage.removeItem(KEY);
}
