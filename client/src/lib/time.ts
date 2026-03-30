export type TimeUnit = "minutes" | "hours" | "days";
export type Direction = "before" | "after";

export const TIMEZONE_OPTIONS = [
  { value: 'Pacific/Midway', label: '(GMT-11:00) Midway Island' },
  { value: 'Pacific/Pago_Pago', label: '(GMT-11:00) American Samoa' },
  { value: 'Pacific/Honolulu', label: '(GMT-10:00) Hawaii' },
  { value: 'America/Anchorage', label: '(GMT-09:00) Alaska' },
  { value: 'America/Los_Angeles', label: '(GMT-08:00) Pacific Time (US & Canada)' },
  { value: 'America/Tijuana', label: '(GMT-08:00) Tijuana' },
  { value: 'America/Phoenix', label: '(GMT-07:00) Arizona (no DST)' },
  { value: 'America/Denver', label: '(GMT-07:00) Mountain Time (US & Canada)' },
  { value: 'America/Chihuahua', label: '(GMT-07:00) Chihuahua, Mazatlan' },
  { value: 'America/Chicago', label: '(GMT-06:00) Central Time (US & Canada)' },
  { value: 'America/Mexico_City', label: '(GMT-06:00) Mexico City' },
  { value: 'America/Guatemala', label: '(GMT-06:00) Central America' },
  { value: 'America/Regina', label: '(GMT-06:00) Saskatchewan' },
  { value: 'America/New_York', label: '(GMT-05:00) Eastern Time (US & Canada)' },
  { value: 'America/Bogota', label: '(GMT-05:00) Bogota, Lima, Quito' },
  { value: 'America/Indiana/Indianapolis', label: '(GMT-05:00) Indiana (East)' },
  { value: 'America/Caracas', label: '(GMT-04:00) Caracas' },
  { value: 'America/Halifax', label: '(GMT-04:00) Atlantic Time (Canada)' },
  { value: 'America/Santiago', label: '(GMT-04:00) Santiago' },
  { value: 'America/La_Paz', label: '(GMT-04:00) La Paz' },
  { value: 'America/Manaus', label: '(GMT-04:00) Manaus' },
  { value: 'America/St_Johns', label: '(GMT-03:30) Newfoundland' },
  { value: 'America/Sao_Paulo', label: '(GMT-03:00) Brasilia' },
  { value: 'America/Argentina/Buenos_Aires', label: '(GMT-03:00) Buenos Aires' },
  { value: 'America/Montevideo', label: '(GMT-03:00) Montevideo' },
  { value: 'America/Godthab', label: '(GMT-03:00) Greenland' },
  { value: 'Atlantic/South_Georgia', label: '(GMT-02:00) Mid-Atlantic' },
  { value: 'Atlantic/Azores', label: '(GMT-01:00) Azores' },
  { value: 'Atlantic/Cape_Verde', label: '(GMT-01:00) Cape Verde Islands' },
  { value: 'Europe/London', label: '(GMT+00:00) London, Dublin, Edinburgh' },
  { value: 'Africa/Casablanca', label: '(GMT+00:00) Casablanca' },
  { value: 'Africa/Monrovia', label: '(GMT+00:00) Monrovia' },
  { value: 'UTC', label: '(GMT+00:00) UTC' },
  { value: 'Europe/Berlin', label: '(GMT+01:00) Berlin, Vienna, Rome' },
  { value: 'Europe/Paris', label: '(GMT+01:00) Brussels, Copenhagen, Madrid, Paris' },
  { value: 'Europe/Amsterdam', label: '(GMT+01:00) Amsterdam' },
  { value: 'Europe/Belgrade', label: '(GMT+01:00) Belgrade, Bratislava, Ljubljana' },
  { value: 'Europe/Warsaw', label: '(GMT+01:00) Warsaw, Sarajevo, Zagreb' },
  { value: 'Africa/Lagos', label: '(GMT+01:00) West Central Africa' },
  { value: 'Europe/Athens', label: '(GMT+02:00) Athens, Bucharest' },
  { value: 'Europe/Helsinki', label: '(GMT+02:00) Helsinki, Kyiv, Riga, Tallinn' },
  { value: 'Europe/Istanbul', label: '(GMT+03:00) Istanbul' },
  { value: 'Africa/Cairo', label: '(GMT+02:00) Cairo' },
  { value: 'Africa/Johannesburg', label: '(GMT+02:00) Harare, Pretoria' },
  { value: 'Asia/Jerusalem', label: '(GMT+02:00) Jerusalem' },
  { value: 'Europe/Moscow', label: '(GMT+03:00) Moscow, St. Petersburg' },
  { value: 'Asia/Kuwait', label: '(GMT+03:00) Kuwait, Riyadh' },
  { value: 'Africa/Nairobi', label: '(GMT+03:00) Nairobi' },
  { value: 'Asia/Baghdad', label: '(GMT+03:00) Baghdad' },
  { value: 'Asia/Tehran', label: '(GMT+03:30) Tehran' },
  { value: 'Asia/Dubai', label: '(GMT+04:00) Abu Dhabi, Muscat' },
  { value: 'Asia/Baku', label: '(GMT+04:00) Baku' },
  { value: 'Asia/Tbilisi', label: '(GMT+04:00) Tbilisi' },
  { value: 'Indian/Mauritius', label: '(GMT+04:00) Port Louis' },
  { value: 'Asia/Kabul', label: '(GMT+04:30) Kabul' },
  { value: 'Asia/Karachi', label: '(GMT+05:00) Islamabad, Karachi' },
  { value: 'Asia/Tashkent', label: '(GMT+05:00) Tashkent' },
  { value: 'Asia/Yekaterinburg', label: '(GMT+05:00) Ekaterinburg' },
  { value: 'Asia/Kolkata', label: '(GMT+05:30) Chennai, Kolkata, Mumbai, New Delhi' },
  { value: 'Asia/Colombo', label: '(GMT+05:30) Sri Jayawardenepura' },
  { value: 'Asia/Kathmandu', label: '(GMT+05:45) Kathmandu' },
  { value: 'Asia/Almaty', label: '(GMT+06:00) Almaty' },
  { value: 'Asia/Dhaka', label: '(GMT+06:00) Dhaka' },
  { value: 'Asia/Rangoon', label: '(GMT+06:30) Yangon (Rangoon)' },
  { value: 'Asia/Bangkok', label: '(GMT+07:00) Bangkok, Hanoi, Jakarta' },
  { value: 'Asia/Novosibirsk', label: '(GMT+07:00) Novosibirsk' },
  { value: 'Asia/Shanghai', label: '(GMT+08:00) Beijing, Chongqing, Hong Kong' },
  { value: 'Asia/Singapore', label: '(GMT+08:00) Singapore' },
  { value: 'Asia/Taipei', label: '(GMT+08:00) Taipei' },
  { value: 'Australia/Perth', label: '(GMT+08:00) Perth' },
  { value: 'Asia/Kuala_Lumpur', label: '(GMT+08:00) Kuala Lumpur' },
  { value: 'Asia/Ulaanbaatar', label: '(GMT+08:00) Ulaanbaatar' },
  { value: 'Asia/Tokyo', label: '(GMT+09:00) Tokyo, Osaka, Sapporo' },
  { value: 'Asia/Seoul', label: '(GMT+09:00) Seoul' },
  { value: 'Asia/Yakutsk', label: '(GMT+09:00) Yakutsk' },
  { value: 'Australia/Adelaide', label: '(GMT+09:30) Adelaide' },
  { value: 'Australia/Darwin', label: '(GMT+09:30) Darwin' },
  { value: 'Australia/Sydney', label: '(GMT+10:00) Sydney, Melbourne, Canberra' },
  { value: 'Australia/Brisbane', label: '(GMT+10:00) Brisbane' },
  { value: 'Australia/Hobart', label: '(GMT+10:00) Hobart' },
  { value: 'Pacific/Guam', label: '(GMT+10:00) Guam, Port Moresby' },
  { value: 'Asia/Vladivostok', label: '(GMT+10:00) Vladivostok' },
  { value: 'Pacific/Noumea', label: '(GMT+11:00) New Caledonia' },
  { value: 'Asia/Magadan', label: '(GMT+11:00) Magadan' },
  { value: 'Pacific/Fiji', label: '(GMT+12:00) Fiji' },
  { value: 'Pacific/Auckland', label: '(GMT+12:00) Auckland, Wellington' },
  { value: 'Asia/Kamchatka', label: '(GMT+12:00) Kamchatka' },
  { value: 'Pacific/Tongatapu', label: '(GMT+13:00) Nuku\'alofa' },
  { value: 'Pacific/Apia', label: '(GMT+13:00) Samoa' },
] as const;

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Los_Angeles';
  }
}

/**
 * Converts a raw DB timestamp string (which may have a space separator and no
 * timezone info) to a proper UTC ISO string so it can be passed to `new Date()`.
 *
 * PostgreSQL `timestamp` columns (mode: 'string') return values like
 * "2026-03-31 03:00:00" — without a 'T' separator or 'Z' suffix.
 * This function normalises all such formats to "YYYY-MM-DDTHH:mm:ssZ".
 */
export function ensureUtcString(t: string): string {
  if (!t) return t;
  if (t.includes('Z') || t.match(/[+-]\d{2}:/)) return t;
  if (!t.includes('T')) return t.replace(' ', 'T') + 'Z';
  return t + 'Z';
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
