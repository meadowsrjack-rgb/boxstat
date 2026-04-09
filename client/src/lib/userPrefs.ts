export type EventType = 'game' | 'tournament' | 'camp' | 'exhibition' | 'practice' | 'skills' | 'workshop' | 'talk' | 'combine' | 'training' | 'meeting' | 'course' | 'tryout' | 'skills-assessment' | 'team-building' | 'parent-meeting' | 'equipment-pickup' | 'photo-day' | 'award-ceremony' | 'fnh' | 'other';

export const EVENT_TYPE_PRESET_COLORS = [
  '#DC2626', '#2563EB', '#16A34A', '#7C3AED', '#F59E0B',
  '#EC4899', '#0891B2', '#1D4ED8', '#4F46E5', '#059669',
];

export const ALL_EVENT_TYPES: EventType[] = [
  'game', 'tournament', 'camp', 'exhibition', 'practice', 'skills',
  'workshop', 'talk', 'combine', 'training', 'meeting', 'course',
  'tryout', 'skills-assessment', 'team-building', 'parent-meeting',
  'equipment-pickup', 'photo-day', 'award-ceremony', 'fnh', 'other'
];

export const DEFAULT_EVENT_TYPE_COLORS: Record<EventType, string> = {
  game: '#22c55e',
  tournament: '#a855f7',
  camp: '#f97316',
  exhibition: '#ec4899',
  practice: '#3b82f6',
  skills: '#eab308',
  workshop: '#6366f1',
  talk: '#14b8a6',
  combine: '#06b6d4',
  training: '#0ea5e9',
  meeting: '#64748b',
  course: '#f59e0b',
  tryout: '#ef4444',
  'skills-assessment': '#84cc16',
  'team-building': '#10b981',
  'parent-meeting': '#8b5cf6',
  'equipment-pickup': '#d946ef',
  'photo-day': '#f43f5e',
  'award-ceremony': '#f59e0b',
  fnh: '#78716c',
  other: '#6b7280',
};

export interface UserPreferences {
  eventTypes: string[];
  ageTags: string[];
  teamTags: string[];
  coaches: string[];
  hiddenEventTypes: string[];
  eventTypeColors: Record<string, string>;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  eventTypes: [],
  ageTags: [],
  teamTags: [],
  coaches: [],
  hiddenEventTypes: [],
  eventTypeColors: { ...DEFAULT_EVENT_TYPE_COLORS },
};

const STORAGE_KEY = 'uyp_schedule_preferences';

export function getUserPreferences(): UserPreferences {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...DEFAULT_PREFERENCES,
        ...parsed,
        eventTypeColors: { ...DEFAULT_EVENT_TYPE_COLORS, ...(parsed.eventTypeColors || {}) },
      };
    }
  } catch (error) {
    console.error('Error loading user preferences:', error);
  }
  return { ...DEFAULT_PREFERENCES };
}

export function saveUserPreferences(preferences: UserPreferences): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

export function getEventColor(type: string, eventTypeColors: Record<string, string>): string {
  if (eventTypeColors[type]) return eventTypeColors[type];
  return DEFAULT_EVENT_TYPE_COLORS[type as EventType] || DEFAULT_EVENT_TYPE_COLORS.other;
}
