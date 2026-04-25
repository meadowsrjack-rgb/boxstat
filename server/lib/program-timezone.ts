// Centralised time-zone helpers for the schedule-request booking flow.
//
// Programs/orgs do not currently store an IANA time zone, so we fall back to
// the same default the events table uses (`America/Los_Angeles`). When a
// program/org grows a `timezone` column in the future, this is the single
// place that needs to read it.

const DEFAULT_PROGRAM_TIMEZONE = 'America/Los_Angeles';

export function getProgramTimezone(program: any, organization?: any): string {
  const candidates = [
    program?.timezone,
    program?.timeZone,
    organization?.timezone,
    organization?.timeZone,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return DEFAULT_PROGRAM_TIMEZONE;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  dayOfWeek: number; // 0 = Sunday ... 6 = Saturday
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '';
  const hourRaw = parseInt(get('hour'), 10);
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    hour: hourRaw === 24 ? 0 : hourRaw,
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    dayOfWeek: WEEKDAY_TO_INDEX[get('weekday')] ?? 0,
  };
}

/**
 * Convert a wall-clock time in the given IANA time zone to a UTC `Date`.
 * Handles DST transitions correctly.
 */
export function zonedWallTimeToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  // We want a UTC instant U such that the wall-clock in `timeZone` at U
  // equals the requested HH:mm on the requested calendar date. Iterate to
  // converge across DST transitions where the UTC offset at the initial
  // guess differs from the offset at the corrected time.
  const wallAsUtcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  let guess = wallAsUtcMs;
  for (let i = 0; i < 3; i++) {
    const parts = getZonedParts(new Date(guess), timeZone);
    const wallAtGuessAsUtc = Date.UTC(
      parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second,
    );
    const error = wallAsUtcMs - wallAtGuessAsUtc;
    if (error === 0) break;
    guess = guess + error;
  }
  return new Date(guess);
}

/** Return the calendar day-of-week (0 = Sunday) for a YYYY-MM-DD string. */
export function dayOfWeekForDateString(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Format an HH:mm wall-clock string from zoned parts. */
export function partsToHHmm(parts: { hour: number; minute: number }): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** Format a date in the program time zone, e.g. "Feb 10". */
export function formatShortDateInZone(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone });
}

/** Format a date as long weekday + date in the program time zone. */
export function formatLongDateInZone(date: Date, timeZone: string): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone });
}

/** Format a time-of-day in the program time zone, e.g. "8:00 AM". */
export function formatTimeInZone(date: Date, timeZone: string): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone });
}
