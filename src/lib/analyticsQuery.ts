/**
 * Durable analytics read path.
 *
 * Engagement events are captured to PostHog through the privacy allowlist in
 * posthogSink.ts (write path). This module reads them back with HogQL so the
 * operator dashboard renders real aggregates instead of a serverless-local
 * in-memory Map that resets on every cold start.
 *
 * Honest limits, by design: the write allowlist deliberately drops durations,
 * chain names, and free text, so those dashboard fields return zero/empty —
 * the dashboard says "not captured" rather than inventing numbers.
 */

import type { EngagementAnalytics } from './engagementTracker';

const DEFAULT_POSTHOG_HOST = 'https://us.i.posthog.com';
const QUERY_TIMEOUT_MS = 8000;

/** Every event type the durable sink can carry (mirrors the POST route). */
export const ENGAGEMENT_EVENT_TYPES = [
  'mini_app_added',
  'mini_app_removed',
  'notifications_enabled',
  'notifications_disabled',
  'workout_completed',
  'score_submitted',
  'leaderboard_viewed',
  'app_launched',
  'app_shared',
  'challenge_opened',
  'challenge_started',
  'challenge_completed',
  'challenge_replied',
  'challenge_shared',
  'assessment_card_shared',
  'assessment_challenge_opened',
  'assessment_started',
  'assessment_completed',
  'assessment_replied',
  'chain_switched',
  'wallet_connected',
  'pose_detection_started',
  'pose_detection_failed',
  'transaction_initiated',
  'transaction_completed',
  'transaction_failed',
] as const;

const ASSESSMENT_FUNNEL_TYPES = [
  'assessment_card_shared',
  'assessment_challenge_opened',
  'assessment_started',
  'assessment_completed',
  'assessment_replied',
] as const;

export function isAnalyticsQueryConfigured(): boolean {
  return process.env.POSTHOG_DISABLED !== 'true' && Boolean(process.env.POSTHOG_PERSONAL_API_KEY);
}

function posthogHost(): string {
  return (process.env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST).replace(/\/+$/, '');
}

function quotedList(values: readonly string[]): string {
  return values.map((v) => `'${v}'`).join(', ');
}

let cachedProjectId: string | null = null;

async function resolveProjectId(): Promise<string> {
  if (process.env.POSTHOG_PROJECT_ID) return process.env.POSTHOG_PROJECT_ID;
  if (cachedProjectId) return cachedProjectId;

  const res = await fetch(`${posthogHost()}/api/projects/`, {
    headers: { Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}` },
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`PostHog projects lookup failed: ${res.status}`);
  const body = (await res.json()) as { results?: Array<{ id?: number | string }> };
  const id = body.results?.[0]?.id;
  if (id == null) throw new Error('No PostHog project found for this key');
  cachedProjectId = String(id);
  return cachedProjectId;
}

async function hogql(query: string): Promise<unknown[][]> {
  const projectId = await resolveProjectId();
  // PostHog Cloud serves HogQL through the Query API (the legacy
  // /api/projects/:id/hogql endpoint was removed).
  const res = await fetch(`${posthogHost()}/api/projects/${projectId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    signal: AbortSignal.timeout(QUERY_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HogQL query failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { results?: unknown[][] };
  return body.results ?? [];
}

function num(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

/** First cell of the first row as a number (0 on empty results). */
export function scalarCount(rows: unknown[][]): number {
  return rows.length > 0 ? num(rows[0][0]) : 0;
}

/** Map `SELECT event, count()` rows into the assessment funnel shape. */
export function mapFunnelCounts(rows: unknown[][]): EngagementAnalytics['assessmentFunnel'] {
  const funnel = Object.fromEntries(ASSESSMENT_FUNNEL_TYPES.map((t) => [t, 0])) as Record<
    (typeof ASSESSMENT_FUNNEL_TYPES)[number],
    number
  >;
  for (const row of rows) {
    const [event, count] = row;
    if (typeof event === 'string' && event in funnel) {
      funnel[event as keyof typeof funnel] = num(count);
    }
  }
  return funnel;
}

/** Assemble the dashboard payload from raw per-metric numbers. */
export function buildEngagementAnalytics(input: {
  totalUsers: number;
  daily: number;
  weekly: number;
  monthly: number;
  sessionEvents: number;
  workoutEvents: number;
  usersWithWorkouts: number;
  notificationEnabledUsers: number;
  miniAppAddedUsers: number;
  miniAppRemovedUsers: number;
  funnel: EngagementAnalytics['assessmentFunnel'];
  retention: Array<{ denom: number; numer: number }>; // [day1, day7, day30]
}): EngagementAnalytics {
  // With no users there is no meaningful rate — zeros, not >100% artifacts
  // from the divide-by-one guard.
  if (input.totalUsers <= 0) {
    return {
      totalUsers: 0,
      activeUsers: { daily: input.daily, weekly: input.weekly, monthly: input.monthly },
      retention: { day1: 0, day7: 0, day30: 0 },
      engagement: { averageSessionsPerUser: 0, averageWorkoutsPerUser: 0, conversionRate: 0 },
      notifications: { enabledUsers: 0, disabledUsers: 0, enablementRate: 0 },
      miniApp: { addedUsers: 0, removedUsers: 0, additionRate: 0 },
      assessmentFunnel: input.funnel,
      topChains: [],
    };
  }

  const users = input.totalUsers;
  const rate = (n: number) => n / users;
  const [day1, day7, day30] = input.retention;

  return {
    totalUsers: input.totalUsers,
    activeUsers: { daily: input.daily, weekly: input.weekly, monthly: input.monthly },
    retention: {
      day1: day1.denom > 0 ? day1.numer / day1.denom : 0,
      day7: day7.denom > 0 ? day7.numer / day7.denom : 0,
      day30: day30.denom > 0 ? day30.numer / day30.denom : 0,
    },
    engagement: {
      averageSessionsPerUser: input.sessionEvents / users,
      averageWorkoutsPerUser: input.workoutEvents / users,
      conversionRate: rate(input.usersWithWorkouts),
    },
    notifications: {
      enabledUsers: input.notificationEnabledUsers,
      disabledUsers: Math.max(input.totalUsers - input.notificationEnabledUsers, 0),
      enablementRate: rate(input.notificationEnabledUsers),
    },
    miniApp: {
      addedUsers: input.miniAppAddedUsers,
      removedUsers: input.miniAppRemovedUsers,
      additionRate: rate(input.miniAppAddedUsers),
    },
    assessmentFunnel: input.funnel,
    // Chain names are dropped by the privacy allowlist at the write boundary;
    // an empty list is the honest answer, not a bug.
    topChains: [],
  };
}

/**
 * Real per-user CSV export from the durable sink (fid/anonymous id, first and
 * last seen, session/workout/score counts). Columns the privacy allowlist
 * never captures (duration, chains, notification state) are omitted rather
 * than fabricated.
 */
export async function exportEngagementCsv(): Promise<string | null> {
  if (!isAnalyticsQueryConfigured()) return null;
  try {
    const rows = await hogql(`
      SELECT
        distinct_id,
        min(timestamp),
        max(timestamp),
        countIf(event = 'app_launched'),
        countIf(event = 'workout_completed'),
        countIf(event = 'score_submitted')
      FROM events
      WHERE event IN (${quotedList(ENGAGEMENT_EVENT_TYPES)})
      GROUP BY distinct_id
      ORDER BY min(timestamp)
    `);
    const headers = ['user', 'firstSeen', 'lastSeen', 'sessions', 'workouts', 'scoresSubmitted'];
    const lines = rows.map((row) =>
      [
        String(row[0] ?? ''),
        String(row[1] ?? ''),
        String(row[2] ?? ''),
        num(row[3]),
        num(row[4]),
        num(row[5]),
      ].join(',')
    );
    return [headers.join(','), ...lines].join('\n');
  } catch (error) {
    console.warn('Analytics CSV export failed:', error);
    return null;
  }
}

async function retentionBucket(days: number): Promise<{ denom: number; numer: number }> {
  const rows = await hogql(`
    SELECT
      countIf(first <= now() - INTERVAL ${days} DAY),
      countIf(first <= now() - INTERVAL ${days} DAY AND last >= first + INTERVAL ${days} DAY)
    FROM (
      SELECT distinct_id, min(timestamp) AS first, max(timestamp) AS last
      FROM events
      WHERE event IN (${quotedList(ENGAGEMENT_EVENT_TYPES)})
      GROUP BY distinct_id
    )
  `);
  const row = rows[0] ?? [];
  return { denom: num(row[0]), numer: num(row[1]) };
}

/**
 * Query real aggregates from the durable PostHog sink. Returns null when the
 * sink isn't configured or the query fails — callers surface an explicit
 * "not configured / unavailable" state instead of fabricated zeros.
 */
export async function queryEngagementAnalytics(): Promise<EngagementAnalytics | null> {
  if (!isAnalyticsQueryConfigured()) return null;

  try {
    const engagementEvents = quotedList(ENGAGEMENT_EVENT_TYPES);

    const [activityRows, volumeRows, funnelRows, notifyRows, r1, r7, r30] = await Promise.all([
      hogql(`
        SELECT
          count(DISTINCT distinct_id),
          count(DISTINCT if(timestamp >= now() - INTERVAL 1 DAY, distinct_id, null)),
          count(DISTINCT if(timestamp >= now() - INTERVAL 7 DAY, distinct_id, null)),
          count(DISTINCT if(timestamp >= now() - INTERVAL 30 DAY, distinct_id, null))
        FROM events
        WHERE event IN (${engagementEvents})
      `),
      hogql(`
        SELECT
          countIf(event = 'app_launched'),
          countIf(event = 'workout_completed'),
          count(DISTINCT if(event = 'workout_completed', distinct_id, null))
        FROM events
        WHERE event IN ('app_launched', 'workout_completed')
      `),
      hogql(`
        SELECT event, count()
        FROM events
        WHERE event IN (${quotedList(ASSESSMENT_FUNNEL_TYPES)})
        GROUP BY event
      `),
      hogql(`
        SELECT
          count(DISTINCT if(event = 'notifications_enabled', distinct_id, null)),
          count(DISTINCT if(event = 'mini_app_added', distinct_id, null)),
          count(DISTINCT if(event = 'mini_app_removed', distinct_id, null))
        FROM events
        WHERE event IN ('notifications_enabled', 'notifications_disabled', 'mini_app_added', 'mini_app_removed')
      `),
      retentionBucket(1),
      retentionBucket(7),
      retentionBucket(30),
    ]);

    const activity = activityRows[0] ?? [];
    const volume = volumeRows[0] ?? [];
    const notify = notifyRows[0] ?? [];

    return buildEngagementAnalytics({
      totalUsers: num(activity[0]),
      daily: num(activity[1]),
      weekly: num(activity[2]),
      monthly: num(activity[3]),
      sessionEvents: num(volume[0]),
      workoutEvents: num(volume[1]),
      usersWithWorkouts: num(volume[2]),
      notificationEnabledUsers: num(notify[0]),
      miniAppAddedUsers: num(notify[1]),
      miniAppRemovedUsers: num(notify[2]),
      funnel: mapFunnelCounts(funnelRows),
      retention: [r1, r7, r30],
    });
  } catch (error) {
    console.warn('Analytics query failed:', error);
    return null;
  }
}
