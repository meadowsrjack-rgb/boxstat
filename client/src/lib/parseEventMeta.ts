
export type EventType = "skills" | "practice" | "game" | "camp" | "tryout" | "tournament" | "scrimmage" | "other";

export interface ParsedEvent {
  id: string;
  start: string; // ISO
  end: string;   // ISO
  title: string;
  location?: string;
  coaches: string[];
  ageTags: string[];   // ["12U", "4-6th"]
  teamTags: string[];  // ["11U Red", "HS Black", etc.]
  type: EventType;
  raw: any; // original event
}

const TYPE_RULES: Array<[EventType, RegExp]> = [
  ["skills", /\b(skill|skills|clinic|workout)\b/i],
  ["practice", /\b(practice|training|session)\b/i],
  ["game", /\b(game|vs\.?|match)\b/i],
  ["camp", /\b(camp)\b/i],
  ["tryout", /\b(tryout)\b/i],
  ["tournament", /\b(tourney|tournament)\b/i],
  ["scrimmage", /\b(scrim|scrimmage)\b/i],
];

const AGE_RULES: RegExp[] = [
  /\b(\d{1,2})U\b/i,                  // 10U, 11U, 12U
  /\b([1-8])(?:st|nd|rd|th)\s*-\s*([1-8])(?:st|nd|rd|th)\s*grade\b/i, // 4-6th grade
  /\b([1-8])(?:st|nd|rd|th)\s*grade\b/i
];

const TEAM_RULES: RegExp[] = [
  /\b(11U|12U|13U|14U|HS)\s*(Black|Red|White)?\b/i
];

const COACH_RULE: RegExp = /\b(coach(?:es)?|coach:)\s*([A-Za-z ,&]+)/i;

export function parseEventMeta(ev: any): ParsedEvent {
  const haystack = `${ev.summary || ""} ${ev.description || ""} ${ev.location || ""}`.trim();

  // type
  let type: EventType = "other";
  for (const [t, rx] of TYPE_RULES) {
    if (rx.test(haystack)) {
      type = t;
      break;
    }
  }

  // coaches
  const coachesMatch = haystack.match(COACH_RULE);
  const coaches = coachesMatch
    ? coachesMatch[2].split(/[,&/]+/).map(s => s.trim()).filter(Boolean)
    : [];

  // ages
  const ageTags: string[] = [];
  const uMatch = haystack.match(/\b(\d{1,2})U\b/i);
  if (uMatch) ageTags.push(`${uMatch[1]}U`);
  
  const spanMatch = haystack.match(/\b([1-8])(?:st|nd|rd|th)\s*-\s*([1-8])(?:st|nd|rd|th)\s*grade\b/i);
  if (spanMatch) ageTags.push(`${spanMatch[1]}-${spanMatch[2]}th`);
  
  const singleGradeMatch = haystack.match(/\b([1-8])(?:st|nd|rd|th)\s*grade\b/i);
  if (singleGradeMatch && !spanMatch) ageTags.push(`${singleGradeMatch[1]}th`);

  // teams
  const teamTags: string[] = [];
  const teamMatch = haystack.match(/\b(11U|12U|13U|14U|HS)\s*(Black|Red|White)?\b/i);
  if (teamMatch) {
    teamTags.push([teamMatch[1], teamMatch[2]].filter(Boolean).join(" "));
  }

  return {
    id: ev.id,
    start: ev.start?.dateTime || ev.start?.date,
    end: ev.end?.dateTime || ev.end?.date,
    title: ev.summary || "Untitled",
    location: ev.location,
    coaches,
    ageTags,
    teamTags,
    type,
    raw: ev
  };
}

export function getEventTypeColor(type: EventType): string {
  switch (type) {
    case "skills": return "bg-gray-100 text-gray-700";
    case "practice": return "bg-blue-100 text-blue-700";
    case "game": return "bg-green-100 text-green-700";
    case "camp": return "bg-orange-100 text-orange-700";
    case "tryout": return "bg-purple-100 text-purple-700";
    case "tournament": return "bg-red-100 text-red-700";
    case "scrimmage": return "bg-yellow-100 text-yellow-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

export function getEventTypeDotColor(type: EventType): string {
  switch (type) {
    case "skills": return "bg-gray-400";
    case "practice": return "bg-blue-500";
    case "game": return "bg-green-500";
    case "camp": return "bg-orange-500";
    case "tryout": return "bg-purple-500";
    case "tournament": return "bg-red-500";
    case "scrimmage": return "bg-yellow-500";
    default: return "bg-gray-400";
  }
}
