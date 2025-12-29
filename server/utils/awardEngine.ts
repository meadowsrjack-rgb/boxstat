import { db } from "../db";
import { users, awardDefinitions, userAwards, attendances, productEnrollments, rsvpResponses } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import type { IStorage } from "../storage";
import type { TriggerCategory, SelectAwardDefinition } from "@shared/schema";

interface AwardSummary {
  id: number;
  name: string;
  tier: string;
  description: string | null;
  imageUrl: string | null;
  earnedAt?: string;
}

interface EvaluationResult {
  awarded: AwardSummary[];
  progress: Map<number, { current: number; target: number }>;
}

interface AwardNotification {
  userId: string;
  awardId: number;
  awardName: string;
  awardTier: string;
  imageUrl: string | null;
}

export async function evaluateAwardsForUser(
  userId: string,
  storage: IStorage,
  triggerContext?: {
    category?: TriggerCategory;
    eventType?: string;
  }
): Promise<{ newlyAwarded: AwardSummary[]; allAwards: AwardSummary[] }> {
  try {
    const user = await storage.getUser(userId);
    if (!user) {
      console.warn(`⚠️ User ${userId} not found`);
      return { newlyAwarded: [], allAwards: [] };
    }

    const activeAwards = await db
      .select()
      .from(awardDefinitions)
      .where(eq(awardDefinitions.active, true));

    const existingAwards = await db
      .select()
      .from(userAwards)
      .where(eq(userAwards.userId, userId));

    const existingAwardIds = new Set(existingAwards.map(ua => ua.awardId));
    const newlyAwarded: AwardSummary[] = [];
    const notifications: AwardNotification[] = [];

    for (const award of activeAwards) {
      if (existingAwardIds.has(award.id)) continue;
      
      const category = award.triggerCategory || 'manual';
      if (category === 'manual') continue;

      if (triggerContext?.category && triggerContext.category !== category) {
        continue;
      }

      let qualifies = false;

      switch (category) {
        case 'checkin':
          qualifies = await evaluateCheckinAward(userId, award);
          break;
        case 'rsvp':
          qualifies = await evaluateRsvpAward(userId, award);
          break;
        case 'system':
          qualifies = await evaluateSystemAward(userId, award, existingAwardIds);
          break;
        case 'time':
          qualifies = await evaluateTimeAward(user, award);
          break;
        case 'store':
          qualifies = await evaluateStoreAward(userId, award);
          break;
      }

      if (qualifies) {
        try {
          await db.insert(userAwards).values({
            userId: userId,
            awardId: award.id,
            awardedAt: new Date().toISOString(),
            visible: true,
          });

          console.log(`🏆 Awarded "${award.name}" to user ${userId}`);

          const awardSummary: AwardSummary = {
            id: award.id,
            name: award.name,
            tier: award.tier,
            description: award.description,
            imageUrl: award.imageUrl,
            earnedAt: new Date().toISOString(),
          };
          newlyAwarded.push(awardSummary);

          notifications.push({
            userId,
            awardId: award.id,
            awardName: award.name,
            awardTier: award.tier,
            imageUrl: award.imageUrl,
          });
        } catch (error) {
          console.error(`Error awarding ${award.name} to user ${userId}:`, error);
        }
      }
    }

    const allUserAwards = await db
      .select({
        id: awardDefinitions.id,
        name: awardDefinitions.name,
        tier: awardDefinitions.tier,
        description: awardDefinitions.description,
        imageUrl: awardDefinitions.imageUrl,
        earnedAt: userAwards.awardedAt,
      })
      .from(userAwards)
      .innerJoin(awardDefinitions, eq(userAwards.awardId, awardDefinitions.id))
      .where(eq(userAwards.userId, userId));

    const allAwards: AwardSummary[] = allUserAwards.map(a => ({
      id: a.id,
      name: a.name,
      tier: a.tier,
      description: a.description,
      imageUrl: a.imageUrl,
      earnedAt: a.earnedAt || undefined,
    }));

    await db
      .update(users)
      .set({ 
        awards: allAwards,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    if (notifications.length > 0) {
      for (const notification of notifications) {
        await sendAwardNotification(notification, storage);
      }
    }

    return { newlyAwarded, allAwards };
  } catch (error) {
    console.error(`Error evaluating awards for user ${userId}:`, error);
    throw error;
  }
}

async function evaluateCheckinAward(userId: string, award: SelectAwardDefinition): Promise<boolean> {
  const threshold = award.threshold || 0;
  const eventFilter = award.eventFilter || 'any';
  const countMode = award.countMode || 'total';

  let query = db.select({ count: sql<number>`count(*)` }).from(attendances).where(eq(attendances.userId, userId));
  
  if (eventFilter !== 'any') {
    const eventTypeMap: Record<string, string> = {
      'game': 'game',
      'practice': 'practice',
      'skills': 'skills_session',
      'fnh': 'friday_night_hoops',
    };
    const mappedEventType = eventTypeMap[eventFilter] || eventFilter;
  }

  const [result] = await query;
  const totalCheckins = Number(result?.count || 0);

  if (countMode === 'total') {
    return totalCheckins >= threshold;
  }

  if (countMode === 'streak') {
    const streak = await calculateCheckinStreak(userId, eventFilter);
    return streak >= threshold;
  }

  return false;
}

async function calculateCheckinStreak(userId: string, eventFilter: string): Promise<number> {
  const checkins = await db
    .select({ date: attendances.checkedInAt })
    .from(attendances)
    .where(eq(attendances.userId, userId))
    .orderBy(desc(attendances.checkedInAt));

  if (checkins.length === 0) return 0;

  let streak = 1;
  let lastDate: Date | null = null;

  for (const checkin of checkins) {
    if (!checkin.date) continue;
    const currentDate = new Date(checkin.date);
    currentDate.setHours(0, 0, 0, 0);

    if (lastDate) {
      const daysDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 7) {
        streak++;
      } else {
        break;
      }
    }
    lastDate = currentDate;
  }

  return streak;
}

async function evaluateRsvpAward(userId: string, award: SelectAwardDefinition): Promise<boolean> {
  const threshold = award.threshold || 0;
  const countMode = award.countMode || 'total';

  // Count RSVPs with "attending" response for this user
  const [result] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rsvpResponses)
    .where(and(
      eq(rsvpResponses.userId, userId),
      eq(rsvpResponses.response, 'attending')
    ));
  
  const totalRsvps = Number(result?.count || 0);

  if (countMode === 'total') {
    return totalRsvps >= threshold;
  }

  if (countMode === 'streak') {
    const streak = await calculateRsvpStreak(userId);
    return streak >= threshold;
  }

  return false;
}

async function calculateRsvpStreak(userId: string): Promise<number> {
  const rsvps = await db
    .select({ date: rsvpResponses.respondedAt })
    .from(rsvpResponses)
    .where(and(
      eq(rsvpResponses.userId, userId),
      eq(rsvpResponses.response, 'attending')
    ))
    .orderBy(desc(rsvpResponses.respondedAt));

  if (rsvps.length === 0) return 0;

  let streak = 1;
  let lastDate: Date | null = null;

  for (const rsvp of rsvps) {
    if (!rsvp.date) continue;
    const currentDate = new Date(rsvp.date);
    currentDate.setHours(0, 0, 0, 0);

    if (lastDate) {
      const daysDiff = Math.floor((lastDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Allow up to 14 days between RSVPs (events may be weekly or bi-weekly)
      if (daysDiff <= 14) {
        streak++;
      } else {
        break;
      }
    }
    lastDate = currentDate;
  }

  return streak;
}

async function evaluateSystemAward(
  userId: string, 
  award: SelectAwardDefinition, 
  existingAwardIds: Set<number>
): Promise<boolean> {
  if (!award.referenceId) return false;
  
  const threshold = award.threshold || 1;
  const targetAwardId = parseInt(award.referenceId, 10);
  
  if (isNaN(targetAwardId)) return false;

  const userAwardRecords = await db
    .select()
    .from(userAwards)
    .where(and(
      eq(userAwards.userId, userId),
      eq(userAwards.awardId, targetAwardId)
    ));

  return userAwardRecords.length >= threshold;
}

async function evaluateTimeAward(user: any, award: SelectAwardDefinition): Promise<boolean> {
  if (!user.createdAt) return false;
  
  const threshold = award.threshold || 1;
  const timeUnit = award.timeUnit || 'years';
  
  const createdAt = new Date(user.createdAt);
  const now = new Date();
  
  let elapsed = 0;
  
  switch (timeUnit) {
    case 'years':
      elapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365);
      break;
    case 'months':
      elapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30);
      break;
    case 'days':
      elapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
      break;
  }
  
  return elapsed >= threshold;
}

async function evaluateStoreAward(userId: string, award: SelectAwardDefinition): Promise<boolean> {
  if (!award.referenceId) return false;
  
  const purchases = await db
    .select()
    .from(productEnrollments)
    .where(and(
      eq(productEnrollments.accountHolderId, userId),
      eq(productEnrollments.status, 'active')
    ));
  
  return purchases.length > 0;
}

export async function grantManualAward(
  userId: string,
  awardId: number,
  awardedBy: string,
  notes?: string,
  storage?: IStorage
): Promise<AwardSummary | null> {
  try {
    const [award] = await db
      .select()
      .from(awardDefinitions)
      .where(eq(awardDefinitions.id, awardId));

    if (!award) {
      console.error(`Award ${awardId} not found`);
      return null;
    }

    const existingAward = await db
      .select()
      .from(userAwards)
      .where(and(
        eq(userAwards.userId, userId),
        eq(userAwards.awardId, awardId)
      ));

    if (existingAward.length > 0) {
      console.warn(`User ${userId} already has award ${awardId}`);
      return null;
    }

    await db.insert(userAwards).values({
      userId,
      awardId,
      awardedBy,
      notes,
      awardedAt: new Date().toISOString(),
      visible: true,
    });

    console.log(`🏆 Manually awarded "${award.name}" to user ${userId} by ${awardedBy}`);

    const awardSummary: AwardSummary = {
      id: award.id,
      name: award.name,
      tier: award.tier,
      description: award.description,
      imageUrl: award.imageUrl,
      earnedAt: new Date().toISOString(),
    };

    await updateUserAwardsCache(userId);

    if (storage) {
      await sendAwardNotification({
        userId,
        awardId: award.id,
        awardName: award.name,
        awardTier: award.tier,
        imageUrl: award.imageUrl,
      }, storage);
    }

    return awardSummary;
  } catch (error) {
    console.error(`Error granting manual award:`, error);
    return null;
  }
}

async function updateUserAwardsCache(userId: string): Promise<void> {
  const allUserAwards = await db
    .select({
      id: awardDefinitions.id,
      name: awardDefinitions.name,
      tier: awardDefinitions.tier,
      description: awardDefinitions.description,
      imageUrl: awardDefinitions.imageUrl,
      earnedAt: userAwards.awardedAt,
    })
    .from(userAwards)
    .innerJoin(awardDefinitions, eq(userAwards.awardId, awardDefinitions.id))
    .where(eq(userAwards.userId, userId));

  const allAwards: AwardSummary[] = allUserAwards.map(a => ({
    id: a.id,
    name: a.name,
    tier: a.tier,
    description: a.description,
    imageUrl: a.imageUrl,
    earnedAt: a.earnedAt || undefined,
  }));

  await db
    .update(users)
    .set({ 
      awards: allAwards,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(users.id, userId));
}

async function sendAwardNotification(
  notification: AwardNotification,
  storage: IStorage
): Promise<void> {
  try {
    const user = await storage.getUser(notification.userId);
    if (!user) return;

    await storage.createNotification({
      organizationId: user.organizationId,
      title: `🏆 New Award Earned: ${notification.awardName}`,
      message: `Congratulations! You've earned the "${notification.awardName}" (${notification.awardTier}) award!`,
      types: ["notification"],
      recipientTarget: "users",
      recipientUserIds: [notification.userId],
      status: "sent",
      sendAt: new Date().toISOString(),
    });

    console.log(`📣 Sent award notification to user ${notification.userId}`);
  } catch (error) {
    console.error(`Error sending award notification:`, error);
  }
}

export async function getAwardProgress(
  userId: string
): Promise<Map<number, { current: number; target: number; percentage: number }>> {
  const progress = new Map<number, { current: number; target: number; percentage: number }>();

  const activeAwards = await db
    .select()
    .from(awardDefinitions)
    .where(eq(awardDefinitions.active, true));

  for (const award of activeAwards) {
    const category = award.triggerCategory || 'manual';
    if (category === 'manual') continue;

    const threshold = award.threshold || 0;
    let current = 0;

    switch (category) {
      case 'checkin':
        const [checkinResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(attendances)
          .where(eq(attendances.userId, userId));
        current = Number(checkinResult?.count || 0);
        break;
      
      case 'rsvp':
        const [rsvpResult] = await db
          .select({ count: sql<number>`count(*)` })
          .from(rsvpResponses)
          .where(and(
            eq(rsvpResponses.userId, userId),
            eq(rsvpResponses.response, 'attending')
          ));
        current = Number(rsvpResult?.count || 0);
        break;
        
      case 'time':
        const user = await db.select().from(users).where(eq(users.id, userId));
        if (user[0]?.createdAt) {
          const createdAt = new Date(user[0].createdAt);
          const now = new Date();
          const timeUnit = award.timeUnit || 'years';
          
          switch (timeUnit) {
            case 'years':
              current = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365));
              break;
            case 'months':
              current = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30));
              break;
            case 'days':
              current = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
              break;
          }
        }
        break;
    }

    const percentage = threshold > 0 ? Math.min(100, Math.round((current / threshold) * 100)) : 0;
    progress.set(award.id, { current, target: threshold, percentage });
  }

  return progress;
}

export { AwardSummary, AwardNotification };
