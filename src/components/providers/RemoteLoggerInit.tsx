'use client';

/**
 * Boots the remote logger.
 *
 * Called at module-evaluation time (before React hydration), so console.warn/
 * error output — including from the earliest client code paths — is captured
 * and forwarded to `/api/log`. Renders nothing.
 *
 * Gating:
 *  - Production builds log by default.
 *  - `NEXT_PUBLIC_REMOTE_LOGGING=0|false` disables (e.g. cheap preview deploys).
 *  - `NEXT_PUBLIC_REMOTE_LOGGING=1|true` forces it on (e.g. local dev against a
 *    deployed backend, or a targeted staging session).
 *  - `NEXT_PUBLIC_REMOTE_LOGGING_VERBOSE=1|true` captures ALL console levels
 *    instead of warn/error only. Explicit module logs via createRemoteLogger
 *    always forward every level regardless.
 */
import { initRemoteLogger } from '@/utils/remoteLogger';

function isTruthyEnv(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'TRUE';
}

const REMOTE_LOGGING_ENV = process.env.NEXT_PUBLIC_REMOTE_LOGGING;
const VERBOSE_ENV = process.env.NEXT_PUBLIC_REMOTE_LOGGING_VERBOSE;

const enabled =
  REMOTE_LOGGING_ENV !== undefined
    ? isTruthyEnv(REMOTE_LOGGING_ENV)
    : process.env.NODE_ENV === 'production';

const captureLevel = isTruthyEnv(VERBOSE_ENV) ? ('all' as const) : ('warn-error' as const);

initRemoteLogger({ enabled, captureConsole: true, captureLevel });

export default function RemoteLoggerInit() {
  return null;
}
