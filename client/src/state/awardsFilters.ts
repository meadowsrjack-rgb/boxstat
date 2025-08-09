export interface AwardsFilterState {
  tier?: string;
  category?: string;
  sort?: "alpha" | "tier" | "completion" | "recent";
  showOnlyEarned?: boolean;
}

export const defaultAwardsFilters: AwardsFilterState = { 
  sort: "tier",
  showOnlyEarned: false 
};

export const FILTER_OPTIONS = {
  tiers: [
    { value: "", label: "All Tiers" },
    { value: "Prospect", label: "Prospect (Grey)" },
    { value: "Starter", label: "Starter (Green)" },
    { value: "AllStar", label: "All-Star (Blue)" },
    { value: "Superstar", label: "Superstar (Purple)" },
    { value: "HallOfFamer", label: "Hall of Famer (Yellow)" },
    { value: "Team", label: "Team Trophies" },
    { value: "Legacy", label: "Legacy Trophies" }
  ],
  categories: [
    { value: "", label: "All Categories" },
    { value: "InGamePerformance", label: "In-Game Performance" },
    { value: "Attendance", label: "Attendance" },
    { value: "TrainingProgram", label: "Training Program" },
    { value: "SeasonalLegacy", label: "Seasonal/Legacy" }
  ],
  sorts: [
    { value: "tier", label: "By Tier" },
    { value: "alpha", label: "Alphabetical" },
    { value: "completion", label: "By Progress" },
    { value: "recent", label: "Recently Earned" }
  ]
};

export function loadAwardsFilters(): AwardsFilterState {
  try {
    const stored = localStorage.getItem('uyp-awards-filters');
    return stored ? { ...defaultAwardsFilters, ...JSON.parse(stored) } : defaultAwardsFilters;
  } catch {
    return defaultAwardsFilters;
  }
}

export function saveAwardsFilters(filters: AwardsFilterState): void {
  try {
    localStorage.setItem('uyp-awards-filters', JSON.stringify(filters));
  } catch {
    // Ignore localStorage errors
  }
}