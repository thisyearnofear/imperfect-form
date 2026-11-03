/**
 * Next-reading cadence — a niggle is re-read on a weekly rhythm (the
 * protocol repeats, the setup repeats; docs/DESIGN_EVOLUTION.md). Pure date
 * + ICS helpers so the recap and the readings tab share one clock.
 */

/** Same time of day, `days` later. */
export function nextReadingDate(lastValidAt: number, days = 7): Date {
  const next = new Date(lastValidAt);
  next.setDate(next.getDate() + days);
  return next;
}

/** Whole calendar days until `target` — 0 when due or overdue, never negative. */
export function daysUntil(target: Date, now = Date.now()): number {
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  return Math.max(0, Math.round((startOfDay(target.getTime()) - startOfDay(now)) / 86_400_000));
}

function icsEscape(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function icsStamp(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

export interface ReadingEvent {
  start: Date;
  title: string;
  url: string;
  description: string;
}

/** RFC 5545 VCALENDAR with one 10-minute VEVENT — CRLF line endings throughout. */
export function buildReadingIcs({ start, title, url, description }: ReadingEvent): string {
  const end = new Date(start.getTime() + 10 * 60 * 1000);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Niggleometer//Reading//EN',
    'BEGIN:VEVENT',
    `UID:${start.getTime()}@niggleometer`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `URL:${icsEscape(url)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
