
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

export function loadAwardsFilters(): AwardsFilterState {
  try {
    const stored = localStorage.getItem("uyp.awards.filters");
    return { ...defaultAwardsFilters, ...(stored ? JSON.parse(stored) : {}) };
  } catch {
    return defaultAwardsFilters;
  }
}

export function saveAwardsFilters(filters: AwardsFilterState): void {
  localStorage.setItem("uyp.awards.filters", JSON.stringify(filters));
}

export const FILTER_OPTIONS = {
  tiers: [
    { value: "", label: "All Tiers" },
    { value: "Legacy", label: "Legacy" },
    { value: "Team", label: "Team" },
    { value: "HallOfFamer", label: "Hall of Famer" },
    { value: "Superstar", label: "Superstar" },
    { value: "AllStar", label: "All-Star" },
    { value: "Starter", label: "Starter" },
    { value: "Prospect", label: "Prospect" }
  ],
  categories: [
    { value: "", label: "All Categories" },
    { value: "Attendance", label: "Attendance" },
    { value: "TrainingProgram", label: "Training Program" },
    { value: "InGamePerformance", label: "In-Game Performance" },
    { value: "SeasonalLegacy", label: "Seasonal Legacy" }
  ],
  sorts: [
    { value: "tier", label: "By Tier" },
    { value: "alpha", label: "A-Z" },
    { value: "completion", label: "Completion Status" },
    { value: "recent", label: "Recently Earned" }
  ]
};
