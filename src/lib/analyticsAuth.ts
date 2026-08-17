import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Real auth for the operator analytics surface.
 *
 * Two interchangeable credentials, one secret: the `ANALYTICS_API_KEY` env
 * var. The dashboard posts the code to /api/analytics/auth and gets an
 * httpOnly cookie; API routes accept either that cookie or a Bearer header.
 * The cookie value is a hash of the key (never the key itself).
 *
 * Default-deny: in production with no key configured, analytics is closed.
 * In development it stays open so local iteration works — visibly, not
 * silently.
 */

export const ANALYTICS_COOKIE = 'imf_analytics_auth';

export function isAnalyticsAuthConfigured(): boolean {
  return Boolean(process.env.ANALYTICS_API_KEY);
}

function analyticsCookieValue(): string | null {
  const key = process.env.ANALYTICS_API_KEY;
  if (!key) return null;
  return createHash('sha256').update(`imf-analytics:${key}`).digest('hex');
}

/** Constant-time comparison of two same-length secret strings. */
export function secretsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Validate an access code submitted to the auth route. */
export function isValidAnalyticsCode(code: string): boolean {
  const expected = process.env.ANALYTICS_API_KEY;
  if (!expected || !code) return false;
  return secretsMatch(code, expected);
}

/** The cookie value to set after a successful code exchange. */
export function analyticsAuthCookieValue(): string | null {
  return analyticsCookieValue();
}

/** Whether the request carries a valid credential (cookie or Bearer). */
export function isAnalyticsAuthorized(request: NextRequest): boolean {
  const expectedCookie = analyticsCookieValue();

  const bearer = request.headers.get('authorization');
  if (bearer?.startsWith('Bearer ') && expectedCookie) {
    // Bearer carries the raw key; compare against it directly.
    const key = process.env.ANALYTICS_API_KEY as string;
    if (secretsMatch(bearer.slice('Bearer '.length), key)) return true;
  }

  const cookie = request.cookies.get(ANALYTICS_COOKIE)?.value;
  if (cookie && expectedCookie && secretsMatch(cookie, expectedCookie)) return true;

  // Development stays open for local iteration — production without a
  // configured key is closed (default-deny).
  return process.env.NODE_ENV === 'development' && !expectedCookie;
}
