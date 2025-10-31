export type TimeUnit = "minutes" | "hours" | "days";
export type Direction = "before" | "after";

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
