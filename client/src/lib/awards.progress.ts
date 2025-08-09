import { Award, UserStats } from "./awards.types";

export function getAwardProgress(award: Award, stats: UserStats) {
  if (award.progressKind === "none" || award.progressKind === "manual") {
    // Trophies granted by coach flow - check if already earned
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

  if (award.progressKind === "completeAll" && award.completeAll) {
    const f = stats.foundation || {};
    if (award.completeAll.setId === "foundation_all") {
      const earned = (f.skillsCompleted >= 36) && (f.scCompleted >= 12) && (f.iqCompleted >= 12);
      return { 
        earned, 
        current: (f.skillsCompleted + f.scCompleted + f.iqCompleted), 
        target: 60,
        label: award.completeAll.label || "All videos"
      };
    }
  }

  if (award.composite?.length) {
    const results = award.composite.map((rule: any) => {
      const pool = rule.seasonScoped ? stats.season : stats;
      const value = getStatValue(pool, rule.stat);
      return value >= (rule.min ?? 1);
    });
    const earned = results.every((r: boolean) => r);
    return { 
      earned,
      label: "Requirements met"
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

// Mock user stats for demo purposes - showing player with some earned awards but many still locked
export const MOCK_USER_STATS: UserStats = {
  mvpCount: 2,
  clutchCount: 1,
  comebackCount: 0,
  hustleCount: 3,
  teammateCount: 1,
  sportsmanshipCount: 0,
  studentCount: 0,
  leadByExampleCount: 0,
  practicesTotal: 15,
  trainingProgramsCompleted: 3,
  skillsTotal: 25,
  gamesTotal: 8,
  fnhGamesTotal: 2,
  practiceStreak: 5,
  rsvpStreak: 3,
  tournamentAllGamesCheckedIn: false,
  playedEveryPracticeSeason: false,
  playedEveryGameSeason: false,
  playedEveryFnhSeason: false,
  rsvpedEveryEventSeason: false,
  referrals: 0,
  holidayGamesCount: 0,
  rsvpsOnTimeSeason: 0,
  yearsActive: 1,
  season: {
    mvp: 1,
    hustle: 2,
    teammate: 1,
    sportsmanship: 0,
    clutch: 0,
    comeback: 0,
    student: 0,
    leadByExample: 0
  },
  foundation: {
    totalVideos: 15,
    skillsCompleted: 10,
    scCompleted: 3,
    iqCompleted: 2,
    weeklyCompleted12: false,
    weeklyCompleted6: false,
    monthly4: false,
    completedOnce: true,
    completedTwice: false
  },
  // Only a few awards earned to show the greyout functionality
  awardsEarned: ["first-mvp", "first-hustle", "first-practice", "first-training", "rising-star", "hustler"]
};