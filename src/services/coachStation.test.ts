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
      3
    );

    expect(sent).toHaveLength(1);
    const payload = JSON.parse(sent[0]);
    expect(payload.type).toBe('form_event');
    expect(payload.mode).toBe('curls');
    expect(payload.issue).toBe('elbow_swing');
    expect(payload.cue).toBe('Pin your elbows');
    expect(payload.rep_count).toBe(3);
    expect(payload.personality).toBe('RASTA');
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
});
