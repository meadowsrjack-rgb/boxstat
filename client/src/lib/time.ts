type TimeUnit = "minutes" | "hours" | "days";
type Direction = "before" | "after";

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

export function formatDateTime(dt: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  
  const dayName = days[dt.getDay()];
  const monthName = months[dt.getMonth()];
  const day = dt.getDate();
  
  let hours = dt.getHours();
  const minutes = dt.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  const minutesStr = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${dayName} ${monthName} ${day}, ${hours}:${minutesStr} ${ampm}`;
}

export function pluralize(n: number, unit: TimeUnit): string {
  if (n === 1) {
    return `1 ${unit.slice(0, -1)}`;
  }
  return `${n} ${unit}`;
}
