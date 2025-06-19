// Mobile debugger utility for persistent logging and debugging
// Designed to work in various mobile environments including wallet WebViews

// Extend Window interface to include our debugging properties
declare global {
  interface Window {
    _debugLogs: DebugLog[];
    _originalConsole: OriginalConsole;
    _debuggingEnabled: boolean;
    toggleDebugging: () => boolean;
    clearDebugLogs: () => void;
    getDebugLogs: () => DebugLog[];
    saveDebugSnapshot: () => void;
  }
}

// Types for our logging system
export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface DebugLog {
  timestamp: string;
  level: LogLevel;
  message: string;
  details?: unknown;
  context?: string;
}

interface OriginalConsole {
  log: typeof console.log;
  info: typeof console.info;
  warn: typeof console.warn;
  error: typeof console.error;
  debug: typeof console.debug;
}

/**
 * Initialize the mobile debugging system
 * @param options Configuration options
 */
export function initMobileDebugger(options: {
  maxLogs?: number;
  startEnabled?: boolean;
  persistLogs?: boolean;
} = {}) {
  // Only run in browser environment
  if (typeof window === 'undefined') return;

  const {
    maxLogs = 500,
    startEnabled = true,
    persistLogs = true
  } = options;

  // Don't initialize twice
  if (window._debugLogs) return;

  // Initialize log storage
  window._debugLogs = [];
  window._debuggingEnabled = startEnabled;

  // Load persisted logs if enabled (client-side only)
  if (persistLogs && typeof window !== "undefined") {
    try {
      const savedLogs = localStorage.getItem('_mobileDebugLogs');
      if (savedLogs) {
        window._debugLogs = JSON.parse(savedLogs);
      }
    } catch {
      // Ignore errors from localStorage
    }
  }

  // Store original console methods
  window._originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  // Add log entry with context
  const addLogEntry = (level: LogLevel, args: unknown[], context?: string) => {
    if (!window._debuggingEnabled) return;

    let message = '';
    let details = null;

    // Process arguments
    if (args.length === 1) {
      // Single argument
      const arg = args[0];
      if (typeof arg === 'string') {
        message = arg;
      } else {
        message = 'Object';
        details = arg;
      }
    } else if (args.length > 1) {
      // Multiple arguments - first one is usually a message
      if (typeof args[0] === 'string') {
        message = args[0];
        details = args.slice(1);
      } else {
        message = 'Multiple objects';
        details = args;
      }
    }

    // Create log entry
    const logEntry: DebugLog = {
      timestamp: new Date().toISOString(),
      level,
      message,
      details,
      context
    };

    // Add to log storage with size limit
    window._debugLogs.unshift(logEntry);
    if (window._debugLogs.length > maxLogs) {
      window._debugLogs = window._debugLogs.slice(0, maxLogs);
    }

    // Persist logs if enabled (client-side only)
    if (persistLogs && typeof window !== "undefined") {
      try {
        localStorage.setItem('_mobileDebugLogs', JSON.stringify(window._debugLogs));
      } catch {
        // Ignore errors from localStorage
      }
    }

    return logEntry;
  };

  // Override console methods
  console.log = function(...args) {
    window._originalConsole.log.apply(console, args);
    addLogEntry('log', args);
  };

  console.info = function(...args) {
    window._originalConsole.info.apply(console, args);
    addLogEntry('info', args);
  };

  console.warn = function(...args) {
    window._originalConsole.warn.apply(console, args);
    addLogEntry('warn', args);
  };

  console.error = function(...args) {
    window._originalConsole.error.apply(console, args);
    addLogEntry('error', args);
  };

  console.debug = function(...args) {
    window._originalConsole.debug.apply(console, args);
    addLogEntry('debug', args);
  };

  // Add global error handler
  window.addEventListener('error', (event) => {
    addLogEntry('error', [`GLOBAL ERROR: ${event.message}`, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    }], 'window.onerror');
  });

  // Add promise rejection handler
  window.addEventListener('unhandledrejection', (event) => {
    addLogEntry('error', [`UNHANDLED PROMISE REJECTION: ${event.reason}`, {
      reason: event.reason
    }], 'unhandledrejection');
  });

  // Add utility methods to window
  window.toggleDebugging = () => {
    window._debuggingEnabled = !window._debuggingEnabled;
    return window._debuggingEnabled;
  };

  window.clearDebugLogs = () => {
    window._debugLogs = [];
    if (persistLogs && typeof window !== "undefined") {
      try {
        localStorage.removeItem('_mobileDebugLogs');
      } catch {
        // Ignore errors from localStorage
      }
    }
  };

  window.getDebugLogs = () => {
    return [...window._debugLogs];
  };

  window.saveDebugSnapshot = () => {
    try {
      const snapshot = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        logs: window._debugLogs
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(snapshot));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `mobile-debug-${new Date().toISOString()}.json`);
      document.body.appendChild(downloadAnchorNode); // Required for firefox
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error("Failed to save debug snapshot", err);
    }
  };

  // Create a dedicated logging function for modules to use
  return {
    log: (message: string, details?: unknown, context?: string) => {
      return addLogEntry('log', [message, details], context);
    },

    info: (message: string, details?: unknown, context?: string) => {
      return addLogEntry('info', [message, details], context);
    },

    warn: (message: string, details?: unknown, context?: string) => {
      return addLogEntry('warn', [message, details], context);
    },

    error: (message: string, details?: unknown, context?: string) => {
      return addLogEntry('error', [message, details], context);
    }
  };
}

/**
 * Get a logger for a specific module
 * @param moduleName Name of the module for context
 */
export function getModuleLogger(moduleName: string) {
  if (typeof window === 'undefined') {
    // Server-side stub
    return {
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    };
  }

  return {
    log: (message: string, details?: unknown) => {
      console.log(`[${moduleName}] ${message}`, details);
    },

    info: (message: string, details?: unknown) => {
      console.info(`[${moduleName}] ${message}`, details);
    },

    warn: (message: string, details?: unknown) => {
      console.warn(`[${moduleName}] ${message}`, details);
    },

    error: (message: string, details?: unknown) => {
      console.error(`[${moduleName}] ${message}`, details);
    }
  };
}
