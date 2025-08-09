import { AWARDS } from "./awards.registry";
import { getAwardProgress } from "./awards.progress";
import { UserStats } from "./awards.types";

export function handleAwardTrigger(
  userStats: UserStats, 
  trigger: "attendance" | "coachAward" | "onlineTraining" | "rsvp"
): string[] {
  const newlyEarned: string[] = [];
  
  for (const award of AWARDS) {
    if (!award.triggerSources?.includes(trigger)) continue;
    
    const progress = getAwardProgress(award, userStats);
    const already = userStats.awardsEarned?.includes(award.id);
    
    if (progress.earned && !already) { 
      newlyEarned.push(award.id); 
    }
  }
  
  return newlyEarned;
}

// Integration points for the trigger system:
// After QR scan check-in → handleAwardTrigger(stats, "attendance")
// After coach grants award → handleAwardTrigger(stats, "coachAward")
// After training video completes → handleAwardTrigger(stats, "onlineTraining")
// After successful RSVP → handleAwardTrigger(stats, "rsvp")
// If newlyEarned.length > 0, update app state and show toast: "🏆 New Award Unlocked!"