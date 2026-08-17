import { afterEach, describe, expect, it } from 'vitest';
import {
  ANALYTICS_COOKIE,
  analyticsAuthCookieValue,
  isValidAnalyticsCode,
  secretsMatch,
} from './analyticsAuth';

const KEY = 'test-analytics-key-fixture';

describe('secretsMatch', () => {
  it('matches equal strings', () => {
    expect(secretsMatch(KEY, KEY)).toBe(true);
  });

  it('rejects mismatches and length tricks', () => {
    expect(secretsMatch(KEY, 'wrong-key-0123456789abc')).toBe(false);
    expect(secretsMatch(KEY, '')).toBe(false);
    expect(secretsMatch('', '')).toBe(false);
    expect(secretsMatch(KEY.slice(0, -1), KEY)).toBe(false);
  });
});

describe('isValidAnalyticsCode', () => {
  afterEach(() => {
    delete process.env.ANALYTICS_API_KEY;
  });

  it('validates the configured key only', () => {
    process.env.ANALYTICS_API_KEY = KEY;
    expect(isValidAnalyticsCode(KEY)).toBe(true);
    expect(isValidAnalyticsCode('nope')).toBe(false);
    expect(isValidAnalyticsCode('')).toBe(false);
  });

  it('denies everything when no key is configured', () => {
    delete process.env.ANALYTICS_API_KEY;
    expect(isValidAnalyticsCode('anything')).toBe(false);
    expect(isValidAnalyticsCode('')).toBe(false);
  });
});

describe('analyticsAuthCookieValue', () => {
  afterEach(() => {
    delete process.env.ANALYTICS_API_KEY;
  });

  it('never contains the key itself and is stable per key', () => {
    process.env.ANALYTICS_API_KEY = KEY;
    const value = analyticsAuthCookieValue();
    expect(value).toBeTruthy();
    expect(value).not.toContain(KEY);
    expect(analyticsAuthCookieValue()).toBe(value);

    process.env.ANALYTICS_API_KEY = 'other-test-analytics-fixture';
    expect(analyticsAuthCookieValue()).not.toBe(value);
  });

  it('is null when unconfigured', () => {
    delete process.env.ANALYTICS_API_KEY;
    expect(analyticsAuthCookieValue()).toBeNull();
  });

  it('exports the cookie name used by the auth route', () => {
    expect(ANALYTICS_COOKIE).toBe('imf_analytics_auth');
  });
});
