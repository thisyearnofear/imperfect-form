'use client';

/**
 * Remote Logger
 *
 * Sends logs from client devices to the server console via API endpoints
 * This is especially useful for debugging mobile issues where browser dev tools
 * might not be easily accessible.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  level: LogLevel;
  message: string;
  details?: unknown;
  context?: string;
  timestamp: string;
  clientInfo: {
    userAgent: string;
    url: string;
    viewport?: {
      width: number;
      height: number;
    };
    deviceMemory?: number;
    networkType?: string;
  };
}

// Flag to enable/disable remote logging
let remoteLoggingEnabled = false;

// Guard against double-init (dev HMR re-evaluates modules; this flag survives
// on window so console is never wrapped twice and listeners never double-fire).
declare global {
  interface Window {
    __remoteLoggerCaptureInstalled?: boolean;
  }
}

/**
 * Initialize remote logging
 *
 * Call once at app boot. Production defaults to capturing console.warn/error
 * (plus unhandled errors and promise rejections) and forwarding them to
 * `/api/log`; pass `captureLevel: 'all'` to also forward info/debug noise.
 * Explicit module logging via `createRemoteLogger` always forwards every level.
 */
export function initRemoteLogger(
  options: {
    enabled?: boolean;
    captureConsole?: boolean;
    captureLevel?: 'all' | 'warn-error';
    logEndpoint?: string;
  } = {}
) {
  const { enabled = true, captureConsole = true, captureLevel = 'all' } = options;

  remoteLoggingEnabled = enabled;

  // Don't proceed if we're on the server or remote logging is disabled
  if (typeof window === 'undefined' || !remoteLoggingEnabled) return;

  // Idempotency guard: console wrappers + listeners are installed exactly once.
  // A repeated init (HMR, duplicate call) only flips the enabled flag above.
  if (window.__remoteLoggerCaptureInstalled) return;
  window.__remoteLoggerCaptureInstalled = true;

  const forwardLevels: ReadonlySet<LogLevel> =
    captureLevel === 'all'
      ? new Set(['debug', 'info', 'warn', 'error'])
      : new Set(['warn', 'error']);

  // Store original console methods if we're capturing them
  if (captureConsole) {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Override console methods. Original output is always preserved; only the
    // configured levels are additionally forwarded to the server.
    console.log = function (...args) {
      originalConsole.log.apply(console, args);
      if (forwardLevels.has('debug')) sendLogToServer('debug', args);
    };

    console.info = function (...args) {
      originalConsole.info.apply(console, args);
      if (forwardLevels.has('info')) sendLogToServer('info', args);
    };

    console.warn = function (...args) {
      originalConsole.warn.apply(console, args);
      if (forwardLevels.has('warn')) sendLogToServer('warn', args);
    };

    console.error = function (...args) {
      originalConsole.error.apply(console, args);
      if (forwardLevels.has('error')) sendLogToServer('error', args);
    };

    console.debug = function (...args) {
      originalConsole.debug.apply(console, args);
      if (forwardLevels.has('debug')) sendLogToServer('debug', args);
    };
  }

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    sendLog(
      'error',
      `UNHANDLED ERROR: ${event.message}`,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      },
      'window.onerror'
    );
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    sendLog('error', 'UNHANDLED PROMISE REJECTION', event.reason, 'unhandledrejection');
  });

  // Flush any buffered logs when the page is being torn down (keepalive in
  // flushPendingLogs ensures the request survives unload).
  window.addEventListener('pagehide', () => {
    if (pendingLogs.length > 0) flushPendingLogs();
  });

  /**
   * Process args and send log to server
   */
  function sendLogToServer(level: LogLevel, args: unknown[]) {
    let message = '';
    let details = undefined;

    // Process arguments
    if (args.length === 1) {
      const arg = args[0];
      message = typeof arg === 'string' ? arg : 'Object';
      if (typeof arg !== 'string') details = arg;
    } else if (args.length > 1) {
      message = typeof args[0] === 'string' ? args[0] : 'Multiple objects';
      details = typeof args[0] === 'string' ? args.slice(1) : args;
    }

    sendLog(level, message, details);
  }

  /**
   * Actually send the log to the server
   */
  return {
    debug: (message: string, details?: unknown, context?: string) => {
      sendLog('debug', message, details, context);
    },
    info: (message: string, details?: unknown, context?: string) => {
      sendLog('info', message, details, context);
    },
    warn: (message: string, details?: unknown, context?: string) => {
      sendLog('warn', message, details, context);
    },
    error: (message: string, details?: unknown, context?: string) => {
      sendLog('error', message, details, context);
    },
    setEnabled: (enabled: boolean) => {
      remoteLoggingEnabled = enabled;
      // Don't strand buffered logs when logging is turned off.
      if (!enabled) flushPendingLogs();
    },
  };
}

// ── Batching ────────────────────────────────────────────────────────────────
// Logs are buffered client-side and flushed as one batch every few seconds, so
// a noisy session cannot flood /api/log with one request per console call. The
// buffer is capped; when full, the oldest non-error entries are dropped first
// to preserve the newest signal.
const FLUSH_INTERVAL_MS = 5000;
const MAX_BUFFER_SIZE = 50;

let pendingLogs: LogPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer !== null || pendingLogs.length === 0) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flushPendingLogs();
  }, FLUSH_INTERVAL_MS);
}

function flushPendingLogs() {
  if (pendingLogs.length === 0) return;
  const batch = pendingLogs;
  pendingLogs = [];
  // Use keepalive so the final batch survives page unload.
  fetch('/api/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ logs: batch }),
    keepalive: true,
  }).catch(() => {
    // Silent fail - we don't want to cause infinite logging loops
  });
}

function pushLog(payload: LogPayload) {
  // Cap the buffer: drop the oldest non-error entry first, falling back to the
  // oldest entry when everything buffered is already an error.
  if (pendingLogs.length >= MAX_BUFFER_SIZE) {
    const oldestNonError = pendingLogs.findIndex((entry) => entry.level !== 'error');
    if (oldestNonError >= 0) {
      pendingLogs.splice(oldestNonError, 1);
    } else {
      pendingLogs.shift();
    }
  }
  pendingLogs.push(payload);

  // Errors flush immediately so critical signal is never delayed by the timer.
  if (payload.level === 'error') {
    flushPendingLogs();
  } else {
    scheduleFlush();
  }
}

/**
 * Send a log to the server
 */
function sendLog(level: LogLevel, message: string, details?: unknown, context?: string) {
  if (!remoteLoggingEnabled || typeof window === 'undefined') return;

  const payload: LogPayload = {
    level,
    message,
    details,
    context,
    timestamp: new Date().toISOString(),
    clientInfo: {
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    },
  };

  // Add device memory if available
  if ('deviceMemory' in navigator) {
    payload.clientInfo.deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory;
  }

  // Add network info if available
  if (
    'connection' in navigator &&
    (navigator as { connection?: { effectiveType?: string } }).connection
  ) {
    payload.clientInfo.networkType = (
      navigator as { connection: { effectiveType?: string } }
    ).connection.effectiveType;
  }

  // Buffer and send as part of a batch
  pushLog(payload);
}

/**
 * Create a logger for a specific module
 */
export function createRemoteLogger(moduleName: string) {
  if (typeof window === 'undefined') {
    // Server-side stub
    return {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    };
  }

  return {
    debug: (message: string, details?: unknown) => {
      sendLog('debug', message, details, moduleName);
    },
    info: (message: string, details?: unknown) => {
      sendLog('info', message, details, moduleName);
    },
    warn: (message: string, details?: unknown) => {
      sendLog('warn', message, details, moduleName);
    },
    error: (message: string, details?: unknown) => {
      sendLog('error', message, details, moduleName);
    },
  };
}
