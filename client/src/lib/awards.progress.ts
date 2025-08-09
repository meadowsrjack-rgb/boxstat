import { Award, UserStats } from "./awards.types";

export function getAwardProgress(award: Award, stats: UserStats) {
  if (award.progressKind === "none") {
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

// Mock user stats for demo purposes
export const MOCK_USER_STATS: UserStats = {
  mvpCount: 2,
  clutchCount: 1,
  comebackCount: 1,
  hustleCount: 3,
  teammateCount: 2,
  sportsmanshipCount: 1,
  studentCount: 1,
  leadByExampleCount: 1,
  practiceTotal: 45,
  skillsTotal: 12,
  gamesTotal: 20,
  fnhGamesTotal: 6,
  practiceStreak: 8,
  rsvpStreak: 5,
  tournamentAllGamesCheckedIn: true,
  playedEveryPracticeSeason: false,
  playedEveryGameSeason: false,
  playedEveryFnhSeason: false,
  rsvpedEveryEventSeason: false,
  referrals: 1,
  holidayGamesCount: 1,
  rsvpsOnTimeSeason: 12,
  yearsActive: 1,
  season: {
    mvp: 1,
    hustle: 2,
    teammate: 1,
    sportsmanship: 0,
    clutch: 1,
    comeback: 1,
    student: 1,
    leadByExample: 0
  },
  foundation: {
    totalVideos: 25,
    skillsCompleted: 15,
    scCompleted: 5,
    iqCompleted: 5,
    weeklyCompleted12: false,
    weeklyCompleted6: true,
    monthly4: true,
    completedOnce: false,
    completedTwice: false
  },
  awardsEarned: ["game-mvp", "hustle-award", "comeback-kid", "first-ten", "skill-starter", "checked-in", "the-debut", "friday-follower"]
};