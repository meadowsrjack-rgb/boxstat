
import { EventType } from "./parseEventMeta";

export interface UserPreferences {
  eventTypes: EventType[];
  ageTags: string[];
  teamTags: string[];
  coaches: string[];
  locations: string[];
  defaultRelevanceProfile?: {
    eventTypes: EventType[];
    ageTags: string[];
    teamTags: string[];
  };
}

const PREFS_KEY = "uyp.calendar.prefs";

export function getUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn("Failed to load user preferences:", error);
  }

  // Default preferences
  return {
    eventTypes: [],
    ageTags: [],
    teamTags: [],
    coaches: [],
    locations: [],
    defaultRelevanceProfile: {
      eventTypes: ["practice", "skills"],
      ageTags: ["12U", "4-6th"],
      teamTags: ["12U Red"]
    }
  };
}

export function saveUserPreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (error) {
    console.warn("Failed to save user preferences:", error);
  }
}

export function applyRelevanceProfile(prefs: UserPreferences): UserPreferences {
  if (!prefs.defaultRelevanceProfile) return prefs;

  return {
    ...prefs,
    eventTypes: prefs.defaultRelevanceProfile.eventTypes,
    ageTags: prefs.defaultRelevanceProfile.ageTags,
    teamTags: prefs.defaultRelevanceProfile.teamTags
  };
}
