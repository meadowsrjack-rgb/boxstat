
export type Tier = "HallOfFamer" | "Superstar" | "AllStar" | "Starter" | "Prospect" | "Legacy" | "Team";
export type Category = "Attendance" | "TrainingProgram" | "InGamePerformance" | "SeasonalLegacy";
export type ProgressKind = "none" | "counter" | "streak" | "completeAll";

export interface Award {
  id: string;                // kebab-case unique
  kind: "Trophy" | "Badge";
  name: string;
  tier: Tier;                // Legacy/Team for trophies; others for badges
  category: Category;
  description: string;
  iconName: string;          // e.g., "trophy-heart-hustle", "badge-ironman"
  progressKind: ProgressKind;
  counterOf?: { stat: string; target: number; label?: string };        // e.g., mvpCount:10
  streakOf?: { stat: string; target: number; label?: string };         // e.g., practiceStreak:10
  completeAll?: { setId: string; label?: string };                     // e.g., foundation_all
  composite?: Array<{ stat: string; min?: number; seasonScoped?: boolean }>;
  programTag?: "Foundation";
  tags?: string[];

  // NEW — which app events should re-check this award
  triggerSources?: Array<"attendance"|"coachAward"|"onlineTraining"|"rsvp">;
}

export interface UserStats {
  mvpCount: number; 
  clutchCount: number; 
  comebackCount: number; 
  hustleCount: number; 
  teammateCount: number; 
  sportsmanshipCount: number; 
  studentCount: number; 
  leadByExampleCount: number;
  practiceTotal: number; 
  skillsTotal: number; 
  gamesTotal: number; 
  fnhGamesTotal: number;
  practiceStreak: number; 
  rsvpStreak: number;
  tournamentAllGamesCheckedIn?: boolean;
  playedEveryPracticeSeason?: boolean; 
  playedEveryGameSeason?: boolean; 
  playedEveryFnhSeason?: boolean; 
  rsvpedEveryEventSeason?: boolean;
  referrals?: number; 
  holidayGamesCount?: number; 
  rsvpsOnTimeSeason?: number;
  yearsActive?: number;
  season: { mvp: number; hustle: number; teammate: number; sportsmanship: number };
  foundation: {
    totalVideos: number; 
    skillsCompleted: number; 
    scCompleted: number; 
    iqCompleted: number;
    weeklyCompleted12?: boolean; 
    weeklyCompleted6?: boolean; 
    weeklyCompleted2?: boolean;
    weeklyCompleted1?: boolean;
    monthly4?: boolean;
    completedOnce?: boolean; 
    completedTwice?: boolean;
  };
  awardsEarned?: string[]; // ids already earned (optional)
}
