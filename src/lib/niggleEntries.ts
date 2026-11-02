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

const KEY = 'imf_niggle_entries_v1';
const MAX_ENTRIES = 200;

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
