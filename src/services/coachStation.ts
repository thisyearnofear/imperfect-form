/**
 * Coach Station bridge - streams live form events to the physical AI coach
 * (SO-101 arm) over WebSocket. See coach-station/ and docs/NORTH_STAR.md.
 *
 * Opt-in: does nothing unless NEXT_PUBLIC_COACH_STATION is set
 * (e.g. ws://localhost:8765). Fail-silent by design - the web app must never
 * degrade because the robot is off.
 *
 * Inbound: station may send `demonstration`, `robot_state`,
 * `trajectory_progress`, and `command_result` events. The versioned lifecycle
 * and adapter feedback boundary is correlated by `command_id`; all inbound
 * messages remain fail-silent.
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

/** Station → browser when a demo starts (voice sync cue). */
export interface StationDemonstrationEvent {
  type: 'demonstration';
  version?: '1.0';
  command_id?: string;
  name: string;
  narration: string;
  personality: CoachPersonality;
  duration_s: number;
  issue: string;
  mode: string;
}

/** Station-internal normalized intent mirror for protocol documentation/tests. */
export interface StationDemonstrationIntentV1 {
  type: 'demonstration_intent';
  version: '1.0';
  command_id: string;
  name: string;
  mode: string;
  issue: string;
  personality: CoachPersonality;
  joint: string;
  from_deg: number;
  to_deg: number;
  speed_deg_s: number;
  pause_s: number;
  repeats: number;
  narration: string;
  duration_s: number;
}

export interface StationCommandResultEvent {
  type: 'command_result';
  version: '1.0';
  command_id: string;
  status: 'succeeded' | 'aborted' | 'rejected';
  adapter: string;
  affect: string;
  duration_s: number;
  error?: string | null;
  completed_at_ms: number;
}

export interface StationRobotStateEvent {
  type: 'robot_state';
  version: '1.0';
  status: 'executing' | 'idle' | 'error';
  adapter: string;
  affect: string;
  command_id?: string | null;
  detail?: string | null;
  updated_at_ms: number;
}

export interface StationTrajectoryProgressEvent {
  type: 'trajectory_progress';
  version: '1.0';
  command_id: string;
  joint: 'elbow_flex';
  current_deg: number;
  progress_pct: number;
  timestamp_ms: number;
}

export type DemonstrationListener = (event: StationDemonstrationEvent) => void;
export type CommandResultListener = (event: StationCommandResultEvent) => void;
export type RobotStateListener = (event: StationRobotStateEvent) => void;
export type TrajectoryProgressListener = (event: StationTrajectoryProgressEvent) => void;
/** Fired when a form cue is bridged to the station (bay pulse / twin peek). */
export type FormCueListener = (event: StationFormEvent) => void;
export type StationStatus = 'offline' | 'connecting' | 'connected';
export type StationStatusListener = (status: StationStatus) => void;

const SAME_ISSUE_THROTTLE_MS = 2500;

function isPersonality(value: string | null): value is CoachPersonality {
  return value === 'SNEL' || value === 'STEDDIE' || value === 'RASTA';
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Read the persisted persona without React (pose loop / worker bridge). */
export function getStoredPersonality(): CoachPersonality {
  if (typeof window === 'undefined') return getDefaultPersonality();
  const stored = window.localStorage.getItem(PERSONALITY_STORAGE_KEY);
  return isPersonality(stored) ? stored : getDefaultPersonality();
}

function parseDemonstration(raw: unknown): StationDemonstrationEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.type !== 'demonstration') return null;
  if (typeof o.name !== 'string' || typeof o.narration !== 'string') return null;
  const personality = isPersonality(String(o.personality ?? ''))
    ? (o.personality as CoachPersonality)
    : getStoredPersonality();
  return {
    type: 'demonstration',
    version: o.version === '1.0' ? '1.0' : undefined,
    command_id: typeof o.command_id === 'string' ? o.command_id : undefined,
    name: o.name,
    narration: o.narration,
    personality,
    duration_s: isFiniteNumber(o.duration_s) ? o.duration_s : 0,
    issue: typeof o.issue === 'string' ? o.issue : '',
    mode: typeof o.mode === 'string' ? o.mode : '',
  };
}

function parseCommandResult(raw: unknown): StationCommandResultEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    o.type !== 'command_result' ||
    o.version !== '1.0' ||
    typeof o.command_id !== 'string' ||
    !['succeeded', 'aborted', 'rejected'].includes(String(o.status)) ||
    typeof o.adapter !== 'string' ||
    typeof o.affect !== 'string' ||
    !isFiniteNumber(o.completed_at_ms)
  ) {
    return null;
  }
  return {
    type: 'command_result',
    version: '1.0',
    command_id: o.command_id,
    status: o.status as StationCommandResultEvent['status'],
    adapter: o.adapter,
    affect: o.affect,
    duration_s: isFiniteNumber(o.duration_s) ? o.duration_s : 0,
    error: typeof o.error === 'string' || o.error === null ? o.error : undefined,
    completed_at_ms: o.completed_at_ms,
  };
}

function parseTrajectoryProgress(raw: unknown): StationTrajectoryProgressEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    o.type !== 'trajectory_progress' ||
    o.version !== '1.0' ||
    typeof o.command_id !== 'string' ||
    o.joint !== 'elbow_flex' ||
    !isFiniteNumber(o.current_deg) ||
    !isFiniteNumber(o.progress_pct) ||
    o.current_deg < 0 ||
    o.current_deg > 180 ||
    o.progress_pct < 0 ||
    o.progress_pct > 1 ||
    !isFiniteNumber(o.timestamp_ms)
  ) {
    return null;
  }
  return {
    type: 'trajectory_progress',
    version: '1.0',
    command_id: o.command_id,
    joint: 'elbow_flex',
    current_deg: o.current_deg,
    progress_pct: o.progress_pct,
    timestamp_ms: o.timestamp_ms,
  };
}

function parseRobotState(raw: unknown): StationRobotStateEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (
    o.type !== 'robot_state' ||
    o.version !== '1.0' ||
    !['executing', 'idle', 'error'].includes(String(o.status)) ||
    typeof o.adapter !== 'string' ||
    typeof o.affect !== 'string' ||
    !isFiniteNumber(o.updated_at_ms)
  ) {
    return null;
  }
  return {
    type: 'robot_state',
    version: '1.0',
    status: o.status as StationRobotStateEvent['status'],
    adapter: o.adapter,
    affect: o.affect,
    command_id: typeof o.command_id === 'string' ? o.command_id : null,
    detail: typeof o.detail === 'string' || o.detail === null ? o.detail : undefined,
    updated_at_ms: o.updated_at_ms,
  };
}

class CoachStationClient {
  private ws: WebSocket | null = null;
  private lastSent = new Map<string, number>();
  private demoListeners = new Set<DemonstrationListener>();
  private commandResultListeners = new Set<CommandResultListener>();
  private robotStateListeners = new Set<RobotStateListener>();
  private trajectoryProgressListeners = new Set<TrajectoryProgressListener>();
  private formCueListeners = new Set<FormCueListener>();
  private statusListeners = new Set<StationStatusListener>();
  private connectionStatus: StationStatus = 'offline';

  get enabled(): boolean {
    return typeof window !== 'undefined' && !!STATION_URL;
  }

  /** Subscribe to demonstration-start events from the station (voice sync). */
  onDemonstration(listener: DemonstrationListener): () => void {
    this.demoListeners.add(listener);
    return () => this.demoListeners.delete(listener);
  }

  /** Subscribe to versioned adapter execution results. */
  onCommandResult(listener: CommandResultListener): () => void {
    this.commandResultListeners.add(listener);
    return () => this.commandResultListeners.delete(listener);
  }

  /** Subscribe to versioned station/robot state snapshots. */
  onRobotState(listener: RobotStateListener): () => void {
    this.robotStateListeners.add(listener);
    return () => this.robotStateListeners.delete(listener);
  }

  /** Subscribe to throttled trajectory progress for the twin UI. */
  onTrajectoryProgress(listener: TrajectoryProgressListener): () => void {
    this.trajectoryProgressListeners.add(listener);
    return () => this.trajectoryProgressListeners.delete(listener);
  }

  /** Subscribe to outbound form cues for bay pulse and twin presence. */
  onFormCue(listener: FormCueListener): () => void {
    this.formCueListeners.add(listener);
    return () => this.formCueListeners.delete(listener);
  }

  get status(): StationStatus {
    return this.enabled ? this.connectionStatus : 'offline';
  }

  onStatus(listener: StationStatusListener): () => void {
    this.statusListeners.add(listener);
    try {
      listener(this.status);
    } catch {
      // fail-silent — initial status UI listeners must not affect the bridge
    }
    return () => this.statusListeners.delete(listener);
  }

  /** Eager connect for twin peek — fail-silent if station is off. */
  connect(): void {
    this.ensureConnection();
  }

  private setStatus(status: StationStatus): void {
    if (this.connectionStatus === status) return;
    this.connectionStatus = status;
    for (const listener of this.statusListeners) {
      try {
        listener(this.status);
      } catch {
        // fail-silent — status UI listeners must not affect the bridge
      }
    }
  }

  private emitDemonstration(event: StationDemonstrationEvent): void {
    for (const listener of this.demoListeners) {
      try {
        listener(event);
      } catch {
        // fail-silent — UI listeners must not break the bridge
      }
    }
  }

  private emitCommandResult(event: StationCommandResultEvent): void {
    for (const listener of this.commandResultListeners) {
      try {
        listener(event);
      } catch {
        // fail-silent
      }
    }
  }

  private emitRobotState(event: StationRobotStateEvent): void {
    for (const listener of this.robotStateListeners) {
      try {
        listener(event);
      } catch {
        // fail-silent
      }
    }
  }

  private emitTrajectoryProgress(event: StationTrajectoryProgressEvent): void {
    for (const listener of this.trajectoryProgressListeners) {
      try {
        listener(event);
      } catch {
        // fail-silent
      }
    }
  }

  private emitFormCue(event: StationFormEvent): void {
    for (const listener of this.formCueListeners) {
      try {
        listener(event);
      } catch {
        // fail-silent
      }
    }
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
      this.setStatus('connecting');
      const ws = new WebSocket(STATION_URL as string);
      ws.onopen = () => this.setStatus('connected');
      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(String(msg.data));
          const demo = parseDemonstration(data);
          if (demo) {
            this.emitDemonstration(demo);
            return;
          }
          const result = parseCommandResult(data);
          if (result) {
            this.emitCommandResult(result);
            return;
          }
          const progress = parseTrajectoryProgress(data);
          if (progress) {
            this.emitTrajectoryProgress(progress);
            return;
          }
          const state = parseRobotState(data);
          if (state) this.emitRobotState(state);
        } catch {
          // ignore non-JSON
        }
      };
      ws.onclose = () => {
        this.ws = null;
        this.setStatus('offline');
      };
      ws.onerror = () => {
        // fail-silent: station offline is a normal state
        this.setStatus('offline');
      };
      this.ws = ws;
    } catch {
      this.ws = null;
      this.setStatus('offline');
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
    this.emitFormCue(event);
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
