import { describe, expect, it } from 'vitest';
import { buildReadingIcs, daysUntil, nextReadingDate } from '@/lib/nextReading';

describe('nextReadingDate', () => {
  it('returns the same time of day plus the cadence', () => {
    const last = new Date(2025, 10, 3, 9, 30).getTime();
    const next = nextReadingDate(last);
    expect(next.getTime()).toBe(new Date(2025, 10, 10, 9, 30).getTime());
  });

  it('honours a custom cadence', () => {
    const last = new Date(2025, 10, 3, 9, 30).getTime();
    expect(nextReadingDate(last, 14).getTime()).toBe(new Date(2025, 10, 17, 9, 30).getTime());
  });
});

describe('daysUntil', () => {
  it('counts whole calendar days', () => {
    const now = new Date(2025, 10, 3, 23, 0).getTime();
    expect(daysUntil(new Date(2025, 10, 7, 8, 0), now)).toBe(4);
    expect(daysUntil(new Date(2025, 10, 4, 8, 0), now)).toBe(1);
  });

  it('clamps at 0 when due or overdue', () => {
    const now = new Date(2025, 10, 7, 12, 0).getTime();
    expect(daysUntil(new Date(2025, 10, 7, 8, 0), now)).toBe(0);
    expect(daysUntil(new Date(2025, 10, 1, 8, 0), now)).toBe(0);
  });
});

describe('buildReadingIcs', () => {
  const start = new Date(Date.UTC(2025, 10, 10, 9, 30, 0));
  const ics = buildReadingIcs({
    start,
    title: 'Niggleometer: weekly neck & shoulders reading',
    url: 'https://example.com/?niggle=neck-shoulders:desk',
    description: 'Same setup, again.\nSecond line; with, escapes\\',
  });

  it('uses CRLF line endings and the envelope fields', () => {
    expect(ics).toContain('\r\n');
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Niggleometer//Reading//EN');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('stamps a 10-minute UTC event with a stable UID', () => {
    expect(ics).toContain(`UID:${start.getTime()}@niggleometer`);
    expect(ics).toContain('DTSTART:20251110T093000Z');
    expect(ics).toContain('DTEND:20251110T094000Z');
    expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
  });

  it('escapes text fields', () => {
    expect(ics).toContain('SUMMARY:Niggleometer: weekly neck & shoulders reading');
    expect(ics).toContain('DESCRIPTION:Same setup\\, again.\\nSecond line\\; with\\, escapes\\\\');
  });
});
