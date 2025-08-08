export interface UserPreferences {
  eventTypes: string[];
  ageTags: string[];
  teamTags: string[];
  coaches: string[];
}

const DEFAULT_PREFERENCES: UserPreferences = {
  eventTypes: [],
  ageTags: [],
  teamTags: [],
  coaches: []
};

const STORAGE_KEY = 'uyp_schedule_preferences';

export function getUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  return DEFAULT_PREFERENCES;
}

export function saveUserPreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}