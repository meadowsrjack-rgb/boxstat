export type TimeUnit = "minutes" | "hours" | "days";
export type Direction = "before" | "after";

export const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Chicago', label: 'Central (CT)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HT)' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
] as const;

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Los_Angeles';
  }
}

export function localDatetimeToUTC(naiveDatetime: string, timezone: string): string {
  if (!naiveDatetime) return '';
  const [datePart, timePart] = naiveDatetime.split('T');
  if (!datePart || !timePart) return naiveDatetime;
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcGuess);
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  const tzDateAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') === 24 ? 0 : get('hour'), get('minute'), get('second'));
  const offsetMs = tzDateAsUTC - utcGuess.getTime();
  const correctUTC = new Date(utcGuess.getTime() - offsetMs);
  return correctUTC.toISOString();
}

export function utcToLocalDatetime(utcString: string, timezone: string): string {
  if (!utcString) return '';
  const date = new Date(utcString);
  if (isNaN(date.getTime())) return '';

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '00';
  let h = get('hour');
  if (h === '24') h = '00';
  return `${get('year')}-${get('month')}-${get('day')}T${h}:${get('minute')}`;
}

export function formatDateTimeInTimezone(date: Date | string, timezone: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', {
    timeZone: timezone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getTimezoneAbbreviation(timezone: string, date?: Date): string {
  const d = date || new Date();
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(d);
  return parts.find(p => p.type === 'timeZoneName')?.value || timezone;
}

/**
 * Calculate a date offset from the event start time
 */
export function offsetFromStart(
  eventStart: Date,
  amount: number,
  unit: TimeUnit,
  direction: Direction
): Date {
  const result = new Date(eventStart);
  let milliseconds = 0;

  switch (unit) {
    case "minutes":
      milliseconds = amount * 60 * 1000;
      break;
    case "hours":
      milliseconds = amount * 60 * 60 * 1000;
      break;
    case "days":
      milliseconds = amount * 24 * 60 * 60 * 1000;
      break;
  }

  if (direction === "before") {
    result.setTime(result.getTime() - milliseconds);
  } else {
    result.setTime(result.getTime() + milliseconds);
  }

  return result;
}

/**
 * Format a date in a readable format: "Sat Nov 1, 6:00 PM"
 */
export function formatDateTime(dt: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return dt.toLocaleString("en-US", options);
}

/**
 * Pluralize time units: "1 hour" vs "2 hours"
 */
export function pluralize(n: number, unit: TimeUnit): string {
  if (n === 1) {
    return `1 ${unit.slice(0, -1)}`; // Remove 's' for singular
  }
  return `${n} ${unit}`;
}

/**
 * Calculate time remaining until a target date
 * Returns a human-readable string like "1 day 4 h 30 m" or "in 2 h 15 m"
 */
export function timeUntil(targetDate: Date, prefix = ""): string {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return "now";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes} m`);

  const timeStr = parts.join(' ') || "less than a minute";
  return prefix ? `${prefix} ${timeStr}` : timeStr;
}

/**
 * Calculate time since a past date
 * Returns a human-readable string like "2 hours ago" or "3 days ago"
 */
export function timeSince(pastDate: Date): string {
  const now = new Date();
  const diff = now.getTime() - pastDate.getTime();

  if (diff <= 0) {
    return "just now";
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return "just now";
}

/**
 * Check if current time is within a time window
 */
export function isWithinWindow(
  openTime: Date,
  closeTime: Date,
  now: Date = new Date()
): boolean {
  return now >= openTime && now <= closeTime;
}

/**
 * Get the status of a time window relative to current time
 */
export function getWindowStatus(
  openTime: Date,
  closeTime: Date,
  now: Date = new Date()
): "before" | "open" | "closed" {
  if (now < openTime) return "before";
  if (now > closeTime) return "closed";
  return "open";
}

/**
 * Format a time range: "7:00 PM - 9:00 PM"
 */
export function formatTimeRange(startDate: Date, endDate: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  const start = startDate.toLocaleString("en-US", options);
  const end = endDate.toLocaleString("en-US", options);
  return `${start} - ${end}`;
}

/**
 * Generate a timeline preview sentence
 * Example: "RSVP opens 3 days before and closes 1 day before the event"
 */
export function generateTimelineSentence(
  windowType: "RSVP" | "Check-In",
  openAmount: number,
  openUnit: TimeUnit,
  openDirection: Direction,
  closeAmount: number,
  closeUnit: TimeUnit,
  closeDirection: Direction
): string {
  const openPhrase = `${pluralize(openAmount, openUnit)} ${openDirection}`;
  const closePhrase = `${pluralize(closeAmount, closeUnit)} ${closeDirection}`;
  return `${windowType} opens ${openPhrase} and closes ${closePhrase} the event`;
}
