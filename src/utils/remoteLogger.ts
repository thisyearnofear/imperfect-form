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

/**
 * Initialize remote logging
 */
export function initRemoteLogger(
  options: {
    enabled?: boolean;
    captureConsole?: boolean;
    logEndpoint?: string;
  } = {}
) {
  const { enabled = true, captureConsole = true } = options;

  remoteLoggingEnabled = enabled;

  // Don't proceed if we're on the server or remote logging is disabled
  if (typeof window === 'undefined' || !remoteLoggingEnabled) return;

  // Store original console methods if we're capturing them
  if (captureConsole) {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    // Override console methods
    console.log = function (...args) {
      originalConsole.log.apply(console, args);
      sendLogToServer('debug', args);
    };

    console.info = function (...args) {
      originalConsole.info.apply(console, args);
      sendLogToServer('info', args);
    };

    console.warn = function (...args) {
      originalConsole.warn.apply(console, args);
      sendLogToServer('warn', args);
    };

    console.error = function (...args) {
      originalConsole.error.apply(console, args);
      sendLogToServer('error', args);
    };

    console.debug = function (...args) {
      originalConsole.debug.apply(console, args);
      sendLogToServer('debug', args);
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
    },
  };
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

  // Send the log to the server
  fetch('/api/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    // Use keepalive to ensure logs are sent even if page is unloading
    keepalive: true,
  }).catch(() => {
    // Silent fail - we don't want to cause infinite logging loops
  });
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
