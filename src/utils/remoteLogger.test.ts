import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The remote logger patches the global console, so each test gets a pristine
 * console and a fresh module instance (module-level flags reset) via
 * vi.resetModules + dynamic import. `window` and `fetch` are stubbed globals.
 */

const originalConsole = {
  log: console.log,
  info: console.info,
  warn: console.warn,
  error: console.error,
  debug: console.debug,
};

const FLUSH_INTERVAL_MS = 5000;

function makeWindowStub() {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    location: { href: 'http://localhost:3000' },
    innerWidth: 1024,
    innerHeight: 768,
  };
}

async function loadRemoteLogger() {
  vi.resetModules();
  const mod = await import('./remoteLogger');
  return mod;
}

beforeEach(() => {
  Object.assign(console, originalConsole);
  vi.useFakeTimers();
  vi.stubGlobal('window', makeWindowStub());
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
});

afterEach(() => {
  Object.assign(console, originalConsole);
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function fetchMock() {
  return vi.mocked(fetch);
}

function lastBatchBody() {
  const call = fetchMock().mock.calls[fetchMock().mock.calls.length - 1];
  const body = call?.[1]?.body;
  return JSON.parse(String(body)) as { logs: Array<{ level: string; message: string }> };
}

describe('remoteLogger capture levels', () => {
  it('forwards console.warn/error but not log/info/debug with warn-error level', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'warn-error' });

    console.warn('boom');
    console.error('critical');
    console.log('noise');
    console.info('info noise');
    console.debug('debug noise');

    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 1);

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const { logs } = lastBatchBody();
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => l.level)).toEqual(['warn', 'error']);
  });

  it('forwards every level with captureLevel all', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'all' });

    console.log('trace');
    console.debug('dbg');

    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 1);

    const { logs } = lastBatchBody();
    expect(logs.map((l) => l.level)).toEqual(['debug', 'debug']);
  });

  it('does nothing when disabled', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: false, captureConsole: true, captureLevel: 'warn-error' });

    console.warn('ignored');

    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 1);

    expect(fetchMock()).not.toHaveBeenCalled();
  });
});

describe('remoteLogger batching', () => {
  it('buffers non-error logs and flushes them as a single batch', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'warn-error' });

    console.warn('a');
    console.warn('b');
    console.warn('c');

    expect(fetchMock()).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 1);

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const { logs } = lastBatchBody();
    expect(logs).toHaveLength(3);
    expect(logs.map((l) => l.message)).toEqual(['a', 'b', 'c']);
  });

  it('flushes errors immediately without waiting for the timer', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'warn-error' });

    console.warn('slow');
    console.error('urgent');

    // The error triggers an immediate flush carrying the whole buffer.
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const { logs } = lastBatchBody();
    expect(logs).toHaveLength(2);
    expect(logs.map((l) => l.message)).toEqual(['slow', 'urgent']);

    // The timer later fires on an empty buffer and sends nothing new.
    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 1);
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('caps the buffer at 50 entries, dropping oldest logs', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'warn-error' });

    for (let i = 0; i < 55; i++) {
      console.warn(`w${i}`);
    }

    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 1);

    const { logs } = lastBatchBody();
    expect(logs).toHaveLength(50);
    // Oldest entries were dropped; the newest 50 survive.
    expect(logs[0].message).toBe('w5');
    expect(logs[49].message).toBe('w54');
  });

  it('drops oldest non-error entries before errors when at capacity', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'warn-error' });

    for (let i = 0; i < 55; i++) {
      console.warn(`w${i}`);
    }
    // Buffer is at 50 (capped). The error must be preserved and flushed now.
    console.error('keep-me');

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const { logs } = lastBatchBody();
    expect(logs).toHaveLength(50);
    expect(logs.some((l) => l.level === 'error' && l.message === 'keep-me')).toBe(true);
    expect(logs.filter((l) => l.level === 'error')).toHaveLength(1);
    expect(logs.filter((l) => l.level === 'warn')).toHaveLength(49);
  });

  it('flushes buffered logs when setEnabled(false) is called', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    // Window is stubbed and logging is enabled, so init returns the logger API.
    const logger = initRemoteLogger({
      enabled: true,
      captureConsole: true,
      captureLevel: 'warn-error',
    })!;

    console.warn('flushed-on-disable');

    expect(fetchMock()).not.toHaveBeenCalled();

    logger.setEnabled(false);

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const { logs } = lastBatchBody();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('flushed-on-disable');
  });
});

describe('remoteLogger idempotency', () => {
  it('never double-wraps console on repeated init', async () => {
    const { initRemoteLogger } = await loadRemoteLogger();
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'warn-error' });
    initRemoteLogger({ enabled: true, captureConsole: true, captureLevel: 'warn-error' });

    console.warn('single');

    await vi.advanceTimersByTimeAsync(FLUSH_INTERVAL_MS + 1);

    expect(fetchMock()).toHaveBeenCalledTimes(1);
    const { logs } = lastBatchBody();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('single');
  });
});
