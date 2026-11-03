import { describe, expect, it } from 'vitest';
import { parseNiggleParam, sanitizeSenderName } from '@/lib/niggleIntents';

describe('parseNiggleParam', () => {
  it('parses joint and context from a shared link', () => {
    expect(parseNiggleParam('neck-shoulders:desk')).toEqual({
      joint: 'neck-shoulders',
      context: 'desk',
    });
  });

  it('falls back to the joint first context when missing or unknown', () => {
    expect(parseNiggleParam('knee')).toEqual({ joint: 'knee', context: 'stairs' });
    expect(parseNiggleParam('knee:bogus')).toEqual({ joint: 'knee', context: 'stairs' });
  });

  it('ignores unknown joints and empty input', () => {
    expect(parseNiggleParam('elbow')).toBeNull();
    expect(parseNiggleParam('')).toBeNull();
    expect(parseNiggleParam(null)).toBeNull();
    expect(parseNiggleParam(undefined)).toBeNull();
  });
});

describe('sanitizeSenderName', () => {
  it('trims and collapses whitespace', () => {
    expect(sanitizeSenderName('  Udi   Neta ')).toBe('Udi Neta');
  });

  it('strips angle brackets and control characters', () => {
    expect(sanitizeSenderName('<b>Udi</b>')).toBe('bUdi/b');
    expect(sanitizeSenderName('Udi')).toBe('Udi');
  });

  it('caps at 24 characters', () => {
    expect(sanitizeSenderName('A'.repeat(40))).toBe('A'.repeat(24));
  });

  it('returns null for empty or missing input', () => {
    expect(sanitizeSenderName('   ')).toBeNull();
    expect(sanitizeSenderName('')).toBeNull();
    expect(sanitizeSenderName(null)).toBeNull();
  });
});
