/**
 * Coach Station bridge - streams live form events to the physical AI coach
 * (SO-101 arm) over WebSocket. See coach-station/ and docs/NORTH_STAR.md.
 *
 * Opt-in: does nothing unless NEXT_PUBLIC_COACH_STATION is set
 * (e.g. ws://localhost:8765). Fail-silent by design - the web app must never
 * degrade because the robot is off.
 */

import type { CoachPersonality } from '@/lib/coachPersonalities';
import { getDefaultPersonality } from '@/lib/coachPersonalities';

const STATION_URL = process.env.NEXT_PUBLIC_COACH_STATION;
const PERSONALITY_STORAGE_KEY = 'coachPersonality';

// Matches coach-station/coach_station/schema.py - keep in sync.
export interface StationFormEvent {
  mode: string;
  issue: string;
  severity: 'info' | 'warning' | 'critical';
  current?: number;
  target?: number;
  cue: string;
  personality: CoachPersonality;
  repCount: number;
}

const SAME_ISSUE_THROTTLE_MS = 2500;

function isPersonality(value: string | null): value is CoachPersonality {
  return value === 'SNEL' || value === 'STEDDIE' || value === 'RASTA';
}

/** Read the persisted persona without React (pose loop / worker bridge). */
export function getStoredPersonality(): CoachPersonality {
  if (typeof window === 'undefined') return getDefaultPersonality();
  const stored = window.localStorage.getItem(PERSONALITY_STORAGE_KEY);
  return isPersonality(stored) ? stored : getDefaultPersonality();
}

class CoachStationClient {
  private ws: WebSocket | null = null;
  private lastSent = new Map<string, number>();

  get enabled(): boolean {
    return typeof window !== 'undefined' && !!STATION_URL;
  }

  private ensureConnection(): void {
    if (!this.enabled) return;
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }
    try {
      const ws = new WebSocket(STATION_URL as string);
      ws.onclose = () => {
        this.ws = null;
      };
      ws.onerror = () => {
        // fail-silent: station offline is a normal state
      };
      this.ws = ws;
    } catch {
      this.ws = null;
    }
  }

  private send(payload: Record<string, unknown>): void {
    if (!this.enabled) return;
    this.ensureConnection();
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(payload));
      } catch {
        // fail-silent
      }
    }
  }

  sendFormEvent(event: StationFormEvent): void {
    if (!this.enabled) return;
    const key = `${event.mode}:${event.issue}`;
    const now = Date.now();
    if (now - (this.lastSent.get(key) ?? 0) < SAME_ISSUE_THROTTLE_MS) return;
    this.lastSent.set(key, now);
    this.send({
      type: 'form_event',
      mode: event.mode,
      issue: event.issue,
      severity: event.severity,
      current: event.current,
      target: event.target,
      cue: event.cue,
      personality: event.personality,
      rep_count: event.repCount,
      timestamp_ms: now,
    });
  }

  /**
   * Bridge an exercise-engine formCheckSpeak (e.g. elbow_swing on curls)
   * into a StationFormEvent. Used from the pose loop where React hooks
   * aren't available.
   */
  sendEngineFormCheck(
    mode: string,
    speak: { issue: string; phrase: string },
    repCount: number
  ): void {
    this.sendFormEvent({
      mode,
      issue: speak.issue,
      severity: 'warning',
      cue: speak.phrase,
      personality: getStoredPersonality(),
      repCount,
    });
  }

  sendSessionEvent(
    type: 'session_start' | 'session_end',
    mode: string,
    personality: CoachPersonality = getStoredPersonality()
  ): void {
    this.send({ type, mode, personality, timestamp_ms: Date.now() });
  }
}

export const coachStation = new CoachStationClient();
