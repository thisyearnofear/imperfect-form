import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Fail-silent contract for the coach-station bridge:
 * - disabled when NEXT_PUBLIC_COACH_STATION is unset
 * - never throws when the station is offline / WebSocket errors
 */

describe('coachStation fail-silent', () => {
  const originalEnv = process.env.NEXT_PUBLIC_COACH_STATION;

  beforeEach(() => {
    vi.resetModules();
    // Minimal browser surface — the client gates on typeof window
    (globalThis as typeof globalThis & { window?: object }).window = {
      localStorage: {
        getItem: () => null,
        setItem: () => undefined,
      },
    } as unknown as Window & typeof globalThis;
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.NEXT_PUBLIC_COACH_STATION;
    } else {
      process.env.NEXT_PUBLIC_COACH_STATION = originalEnv;
    }
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { WebSocket?: unknown }).WebSocket;
    vi.restoreAllMocks();
  });

  it('is disabled and a no-op when NEXT_PUBLIC_COACH_STATION is unset', async () => {
    delete process.env.NEXT_PUBLIC_COACH_STATION;
    const { coachStation } = await import('@/services/coachStation');

    expect(coachStation.enabled).toBe(false);
    expect(() =>
      coachStation.sendFormEvent({
        mode: 'curls',
        issue: 'elbow_swing',
        severity: 'warning',
        cue: 'Pin your elbows',
        personality: 'RASTA',
        repCount: 0,
      })
    ).not.toThrow();
    expect(() => coachStation.sendSessionEvent('session_start', 'curls')).not.toThrow();
    expect(() =>
      coachStation.sendEngineFormCheck('curls', { issue: 'elbow_swing', phrase: 'Pin' }, 1)
    ).not.toThrow();
  });

  it('does not throw when the station WebSocket fails to connect', async () => {
    process.env.NEXT_PUBLIC_COACH_STATION = 'ws://localhost:8765';

    class FailingWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = FailingWebSocket.CONNECTING;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        queueMicrotask(() => {
          this.readyState = FailingWebSocket.CLOSED;
          this.onerror?.();
          this.onclose?.();
        });
      }
      send() {
        throw new Error('should not send while closed');
      }
    }
    (globalThis as { WebSocket: unknown }).WebSocket = FailingWebSocket;

    const { coachStation } = await import('@/services/coachStation');
    expect(coachStation.enabled).toBe(true);

    expect(() =>
      coachStation.sendFormEvent({
        mode: 'curls',
        issue: 'elbow_swing',
        severity: 'warning',
        cue: 'Pin your elbows',
        personality: 'RASTA',
        repCount: 2,
      })
    ).not.toThrow();
    expect(() => coachStation.sendSessionEvent('session_end', 'curls', 'SNEL')).not.toThrow();
  });

  it('sends JSON when the socket is open', async () => {
    process.env.NEXT_PUBLIC_COACH_STATION = 'ws://localhost:8765';
    const sent: string[] = [];

    class OpenWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      readyState = OpenWebSocket.OPEN;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      send(data: string) {
        sent.push(data);
      }
    }
    (globalThis as { WebSocket: unknown }).WebSocket = OpenWebSocket;

    const { coachStation } = await import('@/services/coachStation');
    coachStation.sendEngineFormCheck(
      'curls',
      { issue: 'elbow_swing', phrase: 'Pin your elbows' },
      3,
      132,
      50
    );

    expect(sent).toHaveLength(1);
    const payload = JSON.parse(sent[0]);
    expect(payload.type).toBe('form_event');
    expect(payload.mode).toBe('curls');
    expect(payload.issue).toBe('elbow_swing');
    expect(payload.cue).toBe('Pin your elbows');
    expect(payload.rep_count).toBe(3);
    expect(payload.current).toBe(132);
    expect(payload.target).toBe(50);
    expect(payload.personality).toBe('RASTA');
  });

  it('notifies form-cue subscribers when a form event is sent', async () => {
    process.env.NEXT_PUBLIC_COACH_STATION = 'ws://localhost:8765';

    class OpenWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      readyState = OpenWebSocket.OPEN;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      send() {}
    }
    (globalThis as { WebSocket: unknown }).WebSocket = OpenWebSocket;

    const { coachStation } = await import('@/services/coachStation');
    const cues: string[] = [];
    const unsub = coachStation.onFormCue((e) => cues.push(e.issue));

    coachStation.sendFormEvent({
      mode: 'curls',
      issue: 'elbow_swing',
      severity: 'warning',
      cue: 'Pin your elbows',
      personality: 'RASTA',
      repCount: 1,
    });

    expect(cues).toEqual(['elbow_swing']);
    unsub();
  });

  it('forwards versioned command results and robot states to subscribers', async () => {
    process.env.NEXT_PUBLIC_COACH_STATION = 'ws://localhost:8765';
    let wsInstance: { onmessage: ((ev: { data: string }) => void) | null } | null = null;

    class FeedbackWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      readyState = FeedbackWebSocket.OPEN;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      constructor() {
        wsInstance = this;
      }
      send() {}
    }
    (globalThis as { WebSocket: unknown }).WebSocket = FeedbackWebSocket;

    const { coachStation } = await import('@/services/coachStation');
    const results: string[] = [];
    const states: string[] = [];
    const progress: number[] = [];
    const unsubResult = coachStation.onCommandResult((event) => results.push(event.status));
    const unsubState = coachStation.onRobotState((event) => states.push(event.status));
    const unsubProgress = coachStation.onTrajectoryProgress((event) =>
      progress.push(event.progress_pct)
    );

    coachStation.sendSessionEvent('session_start', 'curls');
    expect(wsInstance).toBeTruthy();

    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'command_result',
        version: '1.0',
        command_id: 'cmd-1',
        status: 'succeeded',
        adapter: 'console',
        affect: 'simulation',
        duration_s: 0.4,
        completed_at_ms: 123,
      }),
    });
    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'robot_state',
        version: '1.0',
        status: 'executing',
        adapter: 'console',
        affect: 'simulation',
        command_id: 'cmd-1',
        updated_at_ms: 122,
      }),
    });
    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'trajectory_progress',
        version: '1.0',
        command_id: 'cmd-1',
        joint: 'elbow_flex',
        current_deg: 90,
        progress_pct: 0.5,
        timestamp_ms: 122,
      }),
    });
    // Unknown protocol versions are ignored rather than reaching UI listeners.
    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'command_result',
        version: '2.0',
        command_id: 'cmd-2',
        status: 'succeeded',
        adapter: 'console',
        affect: 'simulation',
        completed_at_ms: 124,
      }),
    });

    expect(results).toEqual(['succeeded']);
    expect(states).toEqual(['executing']);
    expect(progress).toEqual([0.5]);
    unsubResult();
    unsubState();
    unsubProgress();

    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'command_result',
        version: '1.0',
        command_id: 'cmd-3',
        status: 'aborted',
        adapter: 'console',
        affect: 'simulation',
        completed_at_ms: 125,
      }),
    });
    expect(results).toEqual(['succeeded']);
    expect(states).toEqual(['executing']);
  });

  it('forwards demonstration events to subscribers (voice sync)', async () => {
    process.env.NEXT_PUBLIC_COACH_STATION = 'ws://localhost:8765';
    let wsInstance: { onmessage: ((ev: { data: string }) => void) | null } | null = null;

    class CaptureWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      readyState = CaptureWebSocket.OPEN;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      constructor() {
        wsInstance = this;
      }
      send() {}
    }
    (globalThis as { WebSocket: unknown }).WebSocket = CaptureWebSocket;

    const { coachStation } = await import('@/services/coachStation');
    const received: Array<{ name: string; narration: string }> = [];
    const unsub = coachStation.onDemonstration((e) => {
      received.push({ name: e.name, narration: e.narration });
    });

    // open socket via a send
    coachStation.sendSessionEvent('session_start', 'curls');
    expect(wsInstance).toBeTruthy();

    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'demonstration',
        name: 'demonstrate_strict_curl',
        narration: 'Elbow pinned - only the forearm moves. Like this.',
        personality: 'RASTA',
        duration_s: 4.2,
        issue: 'elbow_swing',
        mode: 'curls',
      }),
    });

    expect(received).toHaveLength(1);
    expect(received[0].name).toBe('demonstrate_strict_curl');
    expect(received[0].narration).toMatch(/Elbow pinned/);
    unsub();
  });

  it('accepts trajectories with and without observed (measured) angle', async () => {
    process.env.NEXT_PUBLIC_COACH_STATION = 'ws://localhost:8765';
    let wsInstance: { onmessage: ((ev: { data: string }) => void) | null } | null = null;

    class CaptureWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      readyState = CaptureWebSocket.OPEN;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      constructor() {
        wsInstance = this;
      }
      send() {}
    }
    (globalThis as { WebSocket: unknown }).WebSocket = CaptureWebSocket;

    const { coachStation } = await import('@/services/coachStation');
    const events: Array<{ current: number; measured: number | undefined }> = [];
    const unsub = coachStation.onTrajectoryProgress((e) =>
      events.push({ current: e.current_deg, measured: e.measured_deg })
    );

    coachStation.sendSessionEvent('session_start', 'curls');
    expect(wsInstance).toBeTruthy();

    // Echo-only: no measured_deg → undefined (UI renders commanded, no badge)
    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'trajectory_progress',
        version: '1.0',
        command_id: 'cmd-echo',
        joint: 'elbow_flex',
        current_deg: 90,
        progress_pct: 0.5,
        timestamp_ms: 1,
      }),
    });
    // Observed: measured_deg present → surfaced for the dial
    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'trajectory_progress',
        version: '1.0',
        command_id: 'cmd-obs',
        joint: 'elbow_flex',
        current_deg: 90,
        progress_pct: 0.55,
        timestamp_ms: 2,
        measured_deg: 88.7,
      }),
    });
    // Out-of-range measured values get dropped (UI falls back to commanded)
    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'trajectory_progress',
        version: '1.0',
        command_id: 'cmd-bad',
        joint: 'elbow_flex',
        current_deg: 90,
        progress_pct: 0.6,
        timestamp_ms: 3,
        measured_deg: 999,
      }),
    });

    expect(events).toHaveLength(3);
    expect(events[0]).toEqual({ current: 90, measured: undefined });
    expect(events[1]).toEqual({ current: 90, measured: 88.7 });
    expect(events[2]).toEqual({ current: 90, measured: undefined });
    unsub();
  });

  it('forwards executable demonstration intents to subscribers', async () => {
    process.env.NEXT_PUBLIC_COACH_STATION = 'ws://localhost:8765';
    let wsInstance: { onmessage: ((ev: { data: string }) => void) | null } | null = null;

    class CaptureWebSocket {
      static CONNECTING = 0;
      static OPEN = 1;
      readyState = CaptureWebSocket.OPEN;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onmessage: ((ev: { data: string }) => void) | null = null;
      constructor() {
        wsInstance = this;
      }
      send() {}
    }
    (globalThis as { WebSocket: unknown }).WebSocket = CaptureWebSocket;

    const { coachStation } = await import('@/services/coachStation');
    const received: Array<{ name: string; from: number; to: number; commandId: string }> = [];
    const unsub = coachStation.onDemonstrationIntent((e) =>
      received.push({ name: e.name, from: e.from_deg, to: e.to_deg, commandId: e.command_id })
    );

    coachStation.sendSessionEvent('session_start', 'curls');
    expect(wsInstance).toBeTruthy();

    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'demonstration_intent',
        version: '1.0',
        command_id: 'cmd-42',
        name: 'demonstrate_strict_curl',
        mode: 'curls',
        issue: 'elbow_swing',
        personality: 'RASTA',
        joint: 'elbow_flex',
        from_deg: 160,
        to_deg: 50,
        speed_deg_s: 80,
        pause_s: 0.5,
        repeats: 2,
        narration: 'Elbow pinned',
        duration_s: 4.2,
      }),
    });
    // Out-of-band: no joint field / wrong version → dropped silently
    wsInstance!.onmessage?.({
      data: JSON.stringify({
        type: 'demonstration_intent',
        version: '2.0',
        command_id: 'cmd-99',
        name: 'nope',
        mode: 'curls',
        issue: 'x',
        personality: 'RASTA',
        joint: 'elbow_flex',
        from_deg: 0,
        to_deg: 0,
        speed_deg_s: 10,
        pause_s: 0,
        repeats: 1,
        narration: 'x',
        duration_s: 1,
      }),
    });
    wsInstance!.onmessage?.({
      data: JSON.stringify({ type: 'demonstration_intent', command_id: 'cmd-empty' }),
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({
      name: 'demonstrate_strict_curl',
      from: 160,
      to: 50,
      commandId: 'cmd-42',
    });
    unsub();
  });
});
