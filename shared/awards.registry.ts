// Shared awards registry for both client and server
export type Tier = "HallOfFamer" | "Superstar" | "AllStar" | "Starter" | "Prospect" | "Legacy" | "Team";
export type Category = "Attendance" | "TrainingProgram" | "InGamePerformance" | "SeasonalLegacy";
export type ProgressKind = "none" | "counter" | "streak" | "completeAll" | "manual";

export interface Award {
  id: string;
  kind: "Trophy" | "Badge";
  name: string;
  tier: Tier;
  category: Category;
  description: string;
  iconName: string;
  progressKind: ProgressKind;
  counterOf?: { stat: string; target: number; label?: string };
  streakOf?: { stat: string; target: number; label?: string };
  completeAll?: { setId: string; label?: string };
  composite?: Array<{ stat: string; min?: number; seasonScoped?: boolean }>;
  programTag?: "Foundation";
  tags?: string[];
  triggerSources?: Array<"attendance"|"coachAward"|"onlineTraining"|"rsvp"|"trainingCompletion">;
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
  practicesTotal: number;
  trainingProgramsCompleted: number; 
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
  rsvpCount?: number;
  season: { 
    mvp: number; 
    hustle: number; 
    teammate: number; 
    sportsmanship: number; 
    clutch: number; 
    comeback: number; 
    student: number; 
    leadByExample: number; 
  };
  foundation: {
    totalVideos: number; 
    skillsCompleted: number; 
    scCompleted: number; 
    iqCompleted: number;
    weeklyCompleted12?: boolean; 
    weeklyCompleted6?: boolean; 
    monthly4?: boolean;
    completedOnce?: boolean; 
    completedTwice?: boolean;
  };
  awardsEarned?: string[];
}

// Key awards for automatic triggering (subset of full awards)
export const AUTO_AWARDS: Award[] = [
  // RSVP Awards
  {
    id: "first-rsvp",
    kind: "Badge",
    name: "First RSVP",
    tier: "Prospect",
    category: "Attendance",
    description: "For submitting your first RSVP to any event.",
    iconName: "badge-first-rsvp",
    progressKind: "counter",
    counterOf: { stat: "rsvpCount", target: 1 },
    triggerSources: ["rsvp"],
    tags: ["RSVP", "First"]
  },
  {
    id: "game-planner",
    kind: "Badge", 
    name: "Game Planner",
    tier: "Prospect",
    category: "Attendance",
    description: "For RSVPing to 5 events (Practice, Skills, or Games).",
    iconName: "badge-game-planner",
    progressKind: "counter",
    counterOf: { stat: "rsvpCount", target: 5 },
    triggerSources: ["rsvp"],
    tags: ["RSVP", "Milestone"]
  },
  
  // Attendance Awards
  {
    id: "first-reps",
    kind: "Badge",
    name: "First Reps",
    tier: "Prospect", 
    category: "Attendance",
    description: "For attending your first 10 practices.",
    iconName: "badge-first-reps",
    progressKind: "counter",
    counterOf: { stat: "practicesTotal", target: 10 },
    triggerSources: ["attendance"],
    tags: ["Practice", "Milestone"]
  },
  {
    id: "skill-starter",
    kind: "Badge",
    name: "Skill Starter", 
    tier: "Prospect",
    category: "Attendance",
    description: "For attending your first 10 skills sessions.",
    iconName: "badge-skill-starter",
    progressKind: "counter",
    counterOf: { stat: "skillsTotal", target: 10 },
    triggerSources: ["attendance"],
    tags: ["Skills", "Milestone"]
  },
  {
    id: "first-ten",
    kind: "Badge",
    name: "First Ten",
    tier: "Prospect",
    category: "Attendance", 
    description: "For playing in your first 10 games.",
    iconName: "badge-first-ten",
    progressKind: "counter",
    counterOf: { stat: "gamesTotal", target: 10 },
    triggerSources: ["attendance"],
    tags: ["Games", "Milestone"]
  },
  
  // Training Program Awards
  {
    id: "foundation-starter",
    kind: "Badge",
    name: "Foundation Starter",
    tier: "Prospect",
    category: "TrainingProgram",
    description: "For completing your first foundation training module.",
    iconName: "badge-foundation-starter", 
    progressKind: "counter",
    counterOf: { stat: "foundation.totalVideos", target: 1 },
    triggerSources: ["onlineTraining"],
    tags: ["Training", "First"]
  },
  {
    id: "foundation-scholar",
    kind: "Badge",
    name: "Foundation Scholar",
    tier: "Starter",
    category: "TrainingProgram",
    description: "For completing 25 foundation training modules.",
    iconName: "badge-foundation-scholar",
    progressKind: "counter", 
    counterOf: { stat: "foundation.totalVideos", target: 25 },
    triggerSources: ["onlineTraining"],
    tags: ["Training", "Advanced"]
  }
];

// Progress calculation function
export function getAwardProgress(award: Award, stats: UserStats) {
  if (award.progressKind === "none" || award.progressKind === "manual") {
    return { earned: stats.awardsEarned?.includes(award.id) || false };
  }

  if (award.progressKind === "counter" && award.counterOf) {
    const current = getStatValue(stats, award.counterOf.stat);
    return { 
      earned: current >= award.counterOf.target, 
      current, 
      target: award.counterOf.target,
      label: award.counterOf.label || "Progress"
    };
  }

  if (award.progressKind === "streak" && award.streakOf) {
    const current = getStatValue(stats, award.streakOf.stat);
    return { 
      earned: current >= award.streakOf.target, 
      current, 
      target: award.streakOf.target,
      label: award.streakOf.label || "Streak"
    };
  }

  return { earned: false };
}

function getStatValue(statsObj: any, statPath: string): number {
  const parts = statPath.split('.');
  let value = statsObj;
  
  for (const part of parts) {
    value = value?.[part];
    if (value === undefined || value === null) return 0;
  }
  
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return value;
  return 0;
}

// Trigger handler function
export function handleAwardTrigger(
  userStats: UserStats, 
  trigger: "attendance" | "coachAward" | "onlineTraining" | "rsvp"
): string[] {
  const newlyEarned: string[] = [];
  
  for (const award of AUTO_AWARDS) {
    if (!award.triggerSources?.includes(trigger)) continue;
    
    const progress = getAwardProgress(award, userStats);
    const already = userStats.awardsEarned?.includes(award.id);
    
    if (progress.earned && !already) { 
      newlyEarned.push(award.id); 
    }
  }
  
  return newlyEarned;
}