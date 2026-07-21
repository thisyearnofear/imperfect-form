/**
 * Coaching Session Manager
 *
 * Manages persistent user coaching sessions across workout duration.
 * Replaces arbitrary rep-based session IDs with user-based sessions.
 *
 * Key Features:
 * - Per-user persistent sessions
 * - Real-time session tracking
 * - Session history for insights
 * - Cross-device consistency
 */

export interface SessionMetadata {
  userId: string; // User wallet address or ID
  sessionId: string; // Persistent for entire workout
  mode: 'pushups' | 'squats';
  startTime: number;
  repsAnalyzed: number;
  issuesRaised: number;
  totalCost: number;
  successRate: number;
}

// In-memory session tracking
const activeUserSessions = new Map<string, SessionMetadata>();

/**
 * Create or get persistent session ID
 *
 * Format: user_address:mode:timestamp
 * Persists for entire workout session (1 hour timeout)
 */
export function getOrCreateSessionId(
  userId: string,
  mode: 'pushups' | 'squats'
): { sessionId: string; isNewSession: boolean } {
  if (!userId) {
    throw new Error('userId is required for session management');
  }

  const sessionKey = `${userId}:${mode}`;
  const existing = activeUserSessions.get(sessionKey);

  // Check if session is still active (within 1 hour)
  if (existing) {
    const ageMs = Date.now() - existing.startTime;
    const MAX_SESSION_AGE = 60 * 60 * 1000; // 1 hour

    if (ageMs < MAX_SESSION_AGE) {
      return { sessionId: existing.sessionId, isNewSession: false };
    } else {
      // Session expired, clean up
      activeUserSessions.delete(sessionKey);
    }
  }

  // Create new session
  const timestamp = Date.now();
  const sessionId = `${userId}:${mode}:${timestamp}`;

  activeUserSessions.set(sessionKey, {
    userId,
    sessionId,
    mode,
    startTime: timestamp,
    repsAnalyzed: 0,
    issuesRaised: 0,
    totalCost: 0,
    successRate: 1.0,
  });

  return { sessionId, isNewSession: true };
}

/**
 * Update session metrics after analysis
 */
export function updateSessionMetrics(sessionId: string, updates: Partial<SessionMetadata>): void {
  // Find session by ID
  let session: SessionMetadata | undefined;

  for (const s of activeUserSessions.values()) {
    if (s.sessionId === sessionId) {
      session = s;
      break;
    }
  }

  if (session) {
    Object.assign(session, updates);
  }
}

/**
 * Get current session metadata
 */
export function getSessionMetadata(sessionId: string): SessionMetadata | null {
  for (const session of activeUserSessions.values()) {
    if (session.sessionId === sessionId) {
      return { ...session };
    }
  }
  return null;
}

/**
 * Get session for user + mode (current active session)
 */
export function getUserModeSession(
  userId: string,
  mode: 'pushups' | 'squats'
): SessionMetadata | null {
  const key = `${userId}:${mode}`;
  const session = activeUserSessions.get(key);
  return session ? { ...session } : null;
}

/**
 * End session and return summary
 */
export function endSession(sessionId: string): SessionMetadata | null {
  for (const [key, session] of activeUserSessions.entries()) {
    if (session.sessionId === sessionId) {
      const summary = { ...session };
      activeUserSessions.delete(key);
      return summary;
    }
  }

  return null;
}

/**
 * Get all active sessions (for monitoring/debugging)
 */
export function getAllActiveSessions(): SessionMetadata[] {
  return Array.from(activeUserSessions.values()).map((s) => ({ ...s }));
}

/**
 * Clear all sessions (useful for testing/cleanup)
 */
export function clearAllSessions(): void {
  activeUserSessions.clear();
}

/**
 * Extract userId from sessionId
 */
export function extractUserIdFromSessionId(sessionId: string): string {
  // Format: userId:mode:timestamp
  const parts = sessionId.split(':');
  if (parts.length >= 2) {
    // Handle wallet addresses with colons (shouldn't happen but be safe)
    return parts.slice(0, -2).join(':');
  }
  return '';
}
