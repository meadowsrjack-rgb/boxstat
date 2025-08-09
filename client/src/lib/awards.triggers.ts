
import { AWARDS } from "./awards.registry";
import { getAwardProgress, UserStats } from "./awards.progress";

export function handleAwardTrigger(
  userStats: UserStats, 
  trigger: "attendance" | "coachAward" | "onlineTraining" | "rsvp"
): string[] {
  const newlyEarned: string[] = [];
  
  for (const award of AWARDS) {
    if (!award.triggerSources?.includes(trigger)) continue;
    
    const progress = getAwardProgress(award, userStats);
    const alreadyEarned = userStats.awardsEarned?.includes(award.id);
    
    if (progress.earned && !alreadyEarned) {
      newlyEarned.push(award.id);
    }
  }
  
  return newlyEarned;
}

// Helper function to show toast notification for new awards
export function showAwardNotification(awardIds: string[]) {
  if (awardIds.length === 0) return;
  
  const awardNames = awardIds.map(id => {
    const award = AWARDS.find(a => a.id === id);
    return award?.name || id;
  });
  
  // This would integrate with your existing toast system
  console.log(`🏆 New Award${awardIds.length > 1 ? 's' : ''} Unlocked: ${awardNames.join(', ')}`);
}

// Integration points - call these in your existing event handlers:

export function onQRScanCheckIn(userStats: UserStats) {
  const newAwards = handleAwardTrigger(userStats, "attendance");
  showAwardNotification(newAwards);
  return newAwards;
}

export function onCoachAwardGrant(userStats: UserStats) {
  const newAwards = handleAwardTrigger(userStats, "coachAward");
  showAwardNotification(newAwards);
  return newAwards;
}

export function onTrainingVideoComplete(userStats: UserStats) {
  const newAwards = handleAwardTrigger(userStats, "onlineTraining");
  showAwardNotification(newAwards);
  return newAwards;
}

export function onRSVPSubmit(userStats: UserStats) {
  const newAwards = handleAwardTrigger(userStats, "rsvp");
  showAwardNotification(newAwards);
  return newAwards;
}
