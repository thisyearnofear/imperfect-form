'use client';

import { useEffect, useRef, useState } from 'react';
import {
  coachStation,
  type StationChoreographyProgressEvent,
  type StationCommandResultEvent,
  type StationDemonstrationEvent,
  type StationDemonstrationIntentV1,
  type StationDemoSkippedEvent,
  type StationRobotStateEvent,
  type StationTrajectoryProgressEvent,
  type StationStatus,
} from '@/services/coachStation';
import type { CoachPersonality } from '@/lib/coachPersonalities';

const TRAIL_LENGTH = 5;
/** How long a deliberate demo drop stays visible as an acknowledgment. */
const SKIPPED_TTL_MS = 4000;

export type TwinExecution =
  | { kind: 'executing'; detail?: string | null }
  | { kind: 'succeeded'; detail: string }
  | { kind: 'aborted' | 'rejected' | 'error'; detail: string };

type DemoBus = {
  connect: () => void;
  disconnect?: () => void;
  onStatus: (fn: (s: StationStatus) => void) => () => void;
  onDemonstration: (fn: (e: StationDemonstrationEvent) => void) => () => void;
  onDemonstrationIntent: (fn: (e: StationDemonstrationIntentV1) => void) => () => void;
  onTrajectoryProgress: (fn: (e: StationTrajectoryProgressEvent) => void) => () => void;
  onChoreographyProgress: (fn: (e: StationChoreographyProgressEvent) => void) => () => void;
  onRobotState: (fn: (e: StationRobotStateEvent) => void) => () => void;
  onCommandResult: (fn: (e: StationCommandResultEvent) => void) => () => void;
  onDemoSkipped: (fn: (e: StationDemoSkippedEvent) => void) => () => void;
};

/**
 * Scripted demo bus for ?twin=1 and curls-without-station. Real station takes
 * precedence when both are configured; the demo never drives a real arm.
 */
function makeDemoBus(): DemoBus {
  type AnyListener = (e: never) => void;
  const listeners = new Map<string, Set<AnyListener>>();
  const add = (kind: string) => (fn: AnyListener) => {
    if (!listeners.has(kind)) listeners.set(kind, new Set());
    listeners.get(kind)!.add(fn);
    return () => listeners.get(kind)!.delete(fn);
  };
  const emit = (kind: string, payload: unknown) => {
    for (const fn of listeners.get(kind) ?? []) {
      try {
        fn(payload as never);
      } catch {
        // scripted demo must never break the app shell
      }
    }
  };

  const timers: number[] = [];
  let loopTimer: number | null = null;
  let stopped = false;
  const commandId = 'demo-cmd';

  const arm = (fn: () => void, ms: number) => {
    if (stopped) return;
    const id = window.setTimeout(() => {
      if (!stopped) fn();
    }, ms);
    timers.push(id);
  };

  const playSweep = () => {
    if (stopped) return;
    const personality: CoachPersonality = 'RASTA';
    const intent: StationDemonstrationIntentV1 = {
      type: 'demonstration_intent',
      version: '1.0',
      command_id: commandId,
      name: 'demonstrate_strict_curl',
      mode: 'curls',
      issue: 'elbow_swing',
      personality,
      joint: 'elbow_flex',
      from_deg: 160,
      to_deg: 50,
      speed_deg_s: 80,
      pause_s: 0.5,
      repeats: 2,
      narration: 'Elbow pinned — watch the gap.',
      duration_s: 4.2,
    };
    const demo: StationDemonstrationEvent = {
      type: 'demonstration',
      name: 'demonstrate_strict_curl',
      narration: 'Elbow pinned — watch the gap.',
      personality,
      duration_s: 4.2,
      issue: 'elbow_swing',
      mode: 'curls',
      command_id: commandId,
      version: '1.0',
    };

    emit('status', 'connected');
    emit('intent', intent);

    arm(() => {
      emit('robot_state', {
        type: 'robot_state',
        version: '1.0',
        status: 'executing',
        adapter: 'demo',
        affect: 'demo',
        command_id: commandId,
        detail: intent.name,
        updated_at_ms: Date.now(),
      } satisfies StationRobotStateEvent);
      emit('demonstration', demo);
    }, 900);

    const steps = 24;
    const durationMs = 4200;
    for (let i = 0; i <= steps; i += 1) {
      const t = i / steps;
      const deg = 160 + (50 - 160) * t;
      const ms = 900 + (i / steps) * durationMs;
      arm(() => {
        emit('progress', {
          type: 'trajectory_progress',
          version: '1.0',
          command_id: commandId,
          joint: 'elbow_flex',
          current_deg: deg,
          progress_pct: t,
          timestamp_ms: Date.now(),
          measured_deg: deg,
        } satisfies StationTrajectoryProgressEvent);
      }, ms);
    }

    arm(
      () => {
        emit('command_result', {
          type: 'command_result',
          version: '1.0',
          command_id: commandId,
          status: 'succeeded',
          adapter: 'demo',
          affect: 'demo',
          duration_s: 4.2,
          completed_at_ms: Date.now(),
        } satisfies StationCommandResultEvent);
        emit('robot_state', {
          type: 'robot_state',
          version: '1.0',
          status: 'idle',
          adapter: 'demo',
          affect: 'demo',
          command_id: null,
          detail: null,
          updated_at_ms: Date.now(),
        } satisfies StationRobotStateEvent);
      },
      900 + durationMs + 400
    );
  };

  return {
    connect: () => {
      if (loopTimer !== null) return;
      stopped = false;
      arm(playSweep, 600);
      loopTimer = window.setInterval(() => {
        if (!stopped) playSweep();
      }, 14000);
    },
    disconnect: () => {
      stopped = true;
      for (const id of timers) window.clearTimeout(id);
      timers.length = 0;
      if (loopTimer !== null) {
        window.clearInterval(loopTimer);
        loopTimer = null;
      }
    },
    onStatus: add('status'),
    onDemonstration: add('demonstration'),
    onDemonstrationIntent: add('intent'),
    onTrajectoryProgress: add('progress'),
    onChoreographyProgress: add('choreography_progress'),
    onRobotState: add('robot_state'),
    onCommandResult: add('command_result'),
    // The scripted demo never drops a cue — no skip beat to acknowledge.
    onDemoSkipped: () => () => {},
  };
}

let sharedDemoBus: DemoBus | null = null;
let sharedDemoBusRefs = 0;

function acquireDemoBus(): DemoBus {
  if (!sharedDemoBus) sharedDemoBus = makeDemoBus();
  sharedDemoBusRefs += 1;
  return sharedDemoBus;
}

function releaseDemoBus() {
  sharedDemoBusRefs = Math.max(0, sharedDemoBusRefs - 1);
  if (sharedDemoBusRefs === 0) {
    sharedDemoBus?.disconnect?.();
    sharedDemoBus = null;
  }
}

/** Read ?twin=1 from the URL so a judge can drop it onto any deep link. */
export function isTwinDemoRequested(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('twin') === '1';
  } catch {
    return false;
  }
}

export type CoachTwinState = {
  enabled: boolean;
  isDemo: boolean;
  isCurlsFormRef: boolean;
  status: StationStatus;
  demo: StationDemonstrationEvent | null;
  progress: StationTrajectoryProgressEvent | null;
  choreographyProgress: StationChoreographyProgressEvent | null;
  execution: TwinExecution | null;
  intent: StationDemonstrationIntentV1 | null;
  affect: string | null;
  personality: CoachPersonality | null;
  trail: number[];
  booted: boolean;
  now: number;
  /** Deliberate demo drop (cooldown/busy) shown briefly as an acknowledgment. */
  skipped: StationDemoSkippedEvent | null;
};

const IDLE_TWIN: CoachTwinState = {
  enabled: false,
  isDemo: false,
  isCurlsFormRef: false,
  status: 'offline',
  demo: null,
  progress: null,
  choreographyProgress: null,
  execution: null,
  intent: null,
  affect: null,
  personality: null,
  trail: [],
  booted: false,
  now: 0,
  skipped: null,
};

/**
 * Shared station / scripted-demo subscription. GameCanvas owns one instance
 * during a workout so the twin peek and the see→show moment stay in lockstep.
 * Pass `subscribe: false` when a parent already owns the subscription.
 */
export function useCoachTwin({
  session = false,
  mode,
  subscribe = true,
}: {
  session?: boolean;
  mode?: string;
  subscribe?: boolean;
} = {}): CoachTwinState {
  const isDemo = !coachStation.enabled && (isTwinDemoRequested() || mode === 'curls');
  const enabled = Boolean(subscribe) && (coachStation.enabled || isDemo);
  const isCurlsFormRef = isDemo && mode === 'curls';

  const [status, setStatus] = useState<StationStatus>(coachStation.status);
  const [demo, setDemo] = useState<StationDemonstrationEvent | null>(null);
  const [progress, setProgress] = useState<StationTrajectoryProgressEvent | null>(null);
  const [choreographyProgress, setChoreographyProgress] =
    useState<StationChoreographyProgressEvent | null>(null);
  const [execution, setExecution] = useState<TwinExecution | null>(null);
  const [intent, setIntent] = useState<StationDemonstrationIntentV1 | null>(null);
  const [affect, setAffect] = useState<string | null>(null);
  const [personality, setPersonality] = useState<CoachPersonality | null>(null);
  const [trail, setTrail] = useState<number[]>([]);
  const [booted, setBooted] = useState(false);
  const [skipped, setSkipped] = useState<StationDemoSkippedEvent | null>(null);
  const [now, setNow] = useState(() => (typeof Date !== 'undefined' ? Date.now() : 0));
  const activeCommandIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const source: DemoBus = isDemo ? acquireDemoBus() : coachStation;
    source.connect();
    let demoTimeout = 0;
    let executionTimeout = 0;
    let progressTimeout = 0;
    let skippedTimeout = 0;
    const bootTimeout = window.setTimeout(() => setBooted(true), 900);
    const ageTicker = session ? window.setInterval(() => setNow(Date.now()), 5000) : 0;

    const resetInstrument = () => {
      activeCommandIdRef.current = null;
      setDemo(null);
      setProgress(null);
      setChoreographyProgress(null);
      setExecution(null);
      setIntent(null);
      setTrail([]);
    };

    const clearExecutionLater = () => {
      window.clearTimeout(executionTimeout);
      executionTimeout = window.setTimeout(() => setExecution(null), 2800);
    };

    const unsubStatus = source.onStatus((nextStatus) => {
      setStatus(nextStatus);
      if (nextStatus === 'offline') {
        resetInstrument();
        setAffect(null);
      }
    });
    const unsubIntent = source.onDemonstrationIntent((event) => {
      activeCommandIdRef.current = event.command_id;
      setIntent(event);
    });
    const unsubDemo = source.onDemonstration((event) => {
      if (event.command_id) activeCommandIdRef.current = event.command_id;
      window.clearTimeout(progressTimeout);
      setProgress(null);
      setTrail([]);
      setDemo(event);
      setPersonality(event.personality);
      window.clearTimeout(demoTimeout);
      demoTimeout = window.setTimeout(
        () => {
          setDemo(null);
          setTrail([]);
        },
        Math.max(2500, event.duration_s * 1000 || 3200)
      );
    });
    const unsubProgress = source.onTrajectoryProgress((event) => {
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      window.clearTimeout(executionTimeout);
      window.clearTimeout(progressTimeout);
      setProgress(event);
      setTrail((current) => [...current.slice(-(TRAIL_LENGTH - 1)), event.current_deg]);
    });
    const unsubChoreoProgress = source.onChoreographyProgress((event) => {
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      window.clearTimeout(executionTimeout);
      setChoreographyProgress(event);
    });
    const unsubState = source.onRobotState((event: StationRobotStateEvent) => {
      setAffect(event.affect);
      if (event.status === 'executing') {
        if (event.command_id) activeCommandIdRef.current = event.command_id;
        window.clearTimeout(executionTimeout);
        window.clearTimeout(progressTimeout);
        setProgress(null);
        setExecution({ kind: 'executing', detail: event.detail });
      } else if (event.status === 'error') {
        resetInstrument();
        setExecution({ kind: 'error', detail: event.detail || 'Station error' });
        clearExecutionLater();
      }
    });
    const unsubResult = source.onCommandResult((event: StationCommandResultEvent) => {
      setAffect(event.affect);
      if (!activeCommandIdRef.current || event.command_id !== activeCommandIdRef.current) return;
      resetInstrument();
      const detail =
        event.status === 'succeeded' ? 'Move complete' : event.error || `Move ${event.status}`;
      setExecution({ kind: event.status, detail });
      clearExecutionLater();
      window.clearTimeout(progressTimeout);
      progressTimeout = window.setTimeout(() => setProgress(null), 2800);
    });
    const unsubSkipped = source.onDemoSkipped((event) => {
      // A dropped cue is a beat too — acknowledge it briefly so the user
      // knows the station saw the form issue and chose not to parrot.
      setSkipped(event);
      window.clearTimeout(skippedTimeout);
      skippedTimeout = window.setTimeout(() => setSkipped(null), SKIPPED_TTL_MS);
    });

    return () => {
      unsubStatus();
      unsubIntent();
      unsubDemo();
      unsubProgress();
      unsubChoreoProgress();
      unsubState();
      unsubResult();
      unsubSkipped();
      window.clearTimeout(demoTimeout);
      window.clearTimeout(executionTimeout);
      window.clearTimeout(progressTimeout);
      window.clearTimeout(skippedTimeout);
      window.clearTimeout(bootTimeout);
      if (ageTicker) window.clearInterval(ageTicker);
      activeCommandIdRef.current = null;
      if (isDemo) releaseDemoBus();
    };
  }, [enabled, session, isDemo]);

  if (!subscribe) return IDLE_TWIN;

  return {
    enabled,
    isDemo,
    isCurlsFormRef,
    status,
    demo,
    progress,
    choreographyProgress,
    execution,
    intent,
    affect,
    personality,
    trail,
    booted,
    now,
    skipped,
  };
}

/** True while the arm is sweeping — the hero demonstration beat. */
export function isTwinHeroActive(twin: CoachTwinState): boolean {
  return (
    twin.demo != null ||
    twin.progress != null ||
    twin.choreographyProgress != null ||
    twin.execution?.kind === 'executing' ||
    twin.intent != null
  );
}
