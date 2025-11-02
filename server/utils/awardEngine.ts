import { db } from "../db";
import { users, awardDefinitions, userAwards } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import type { IStorage } from "../storage";

/**
 * Award Engine - Automatically evaluates and grants awards to users based on trigger conditions
 * 
 * This utility checks if a user qualifies for any awards based on their current stats and
 * automatically grants awards they've earned.
 * 
 * @example Usage after a check-in
 * ```typescript
 * import { evaluateAwardsForUser } from "./utils/awardEngine";
 * import { storage } from "./storage";
 * 
 * // After creating an attendance record
 * await createAttendance(attendanceData);
 * 
 * // Update user stats (e.g., increment totalPractices)
 * await storage.updateUser(userId, {
 *   totalPractices: (user.totalPractices || 0) + 1
 * });
 * 
 * // Evaluate and grant awards
 * const updatedAwards = await evaluateAwardsForUser(userId, storage);
 * ```
 * 
 * @example Usage after completing a video
 * ```typescript
 * // After tracking video completion
 * await storage.updateUser(userId, {
 *   videosCompleted: (user.videosCompleted || 0) + 1
 * });
 * 
 * // Evaluate and grant awards
 * await evaluateAwardsForUser(userId, storage);
 * ```
 */

interface AwardSummary {
  name: string;
  tier: string;
  prestige: string;
  imageUrl: string | null;
}

/**
 * Evaluates awards for a user and grants any newly earned awards
 * 
 * @param userId - The user ID to evaluate awards for
 * @param storage - The storage interface for data operations
 * @returns Promise<AwardSummary[]> - The updated awards array for the user
 */
export async function evaluateAwardsForUser(
  userId: string,
  storage: IStorage
): Promise<AwardSummary[]> {
  try {
    // Load the user from storage
    const user = await storage.getUser(userId);
    if (!user) {
      console.warn(`⚠️ User ${userId} not found`);
      return [];
    }

    // Load all active award definitions for the user's organization
    const activeAwards = await db
      .select()
      .from(awardDefinitions)
      .where(
        and(
          eq(awardDefinitions.active, true),
          eq(awardDefinitions.organizationId, user.organizationId)
        )
      );

    // Get user's existing awards to avoid duplicates
    const existingAwards = await db
      .select()
      .from(userAwards)
      .where(eq(userAwards.userId, userId));

    const existingAwardIds = new Set(existingAwards.map(ua => ua.awardId));

    // Track newly granted awards
    const newlyGrantedAwards: AwardSummary[] = [];

    // Evaluate each award definition
    for (const award of activeAwards) {
      // Skip if user already has this award
      if (existingAwardIds.has(award.id)) {
        continue;
      }

      // Skip manual trigger types (these are coach-awarded)
      if (award.triggerType === 'manual') {
        continue;
      }

      // Skip if no trigger field is defined
      if (!award.triggerField) {
        continue;
      }

      // Check if the user qualifies for this award
      const qualifies = checkAwardQualification(user, award);

      if (qualifies) {
        // Create a new user_awards record
        try {
          await db.insert(userAwards).values({
            userId: userId,
            awardId: award.id,
            awardedAt: new Date().toISOString(),
            visible: true,
          });

          // Log the award
          console.log(`🏆 Awarded ${award.name} to ${user.firstName} ${user.lastName}`);

          // Add to newly granted awards for summary
          newlyGrantedAwards.push({
            name: award.name,
            tier: award.tier,
            prestige: award.prestige || 'Prospect',
            imageUrl: award.imageUrl || null,
          });
        } catch (error) {
          console.error(`Error awarding ${award.name} to user ${userId}:`, error);
        }
      }
    }

    // Update the user's cached awards array with all awards (existing + new)
    const allUserAwards = await db
      .select({
        name: awardDefinitions.name,
        tier: awardDefinitions.tier,
        prestige: awardDefinitions.prestige,
        imageUrl: awardDefinitions.imageUrl,
      })
      .from(userAwards)
      .innerJoin(awardDefinitions, eq(userAwards.awardId, awardDefinitions.id))
      .where(eq(userAwards.userId, userId));

    const awardsSummary: AwardSummary[] = allUserAwards.map(a => ({
      name: a.name,
      tier: a.tier,
      prestige: a.prestige || 'Prospect',
      imageUrl: a.imageUrl || null,
    }));

    // Update the user's cached awards field
    await db
      .update(users)
      .set({ 
        awards: awardsSummary,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, userId));

    return awardsSummary;
  } catch (error) {
    console.error(`Error evaluating awards for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Checks if a user qualifies for a specific award based on trigger conditions
 * 
 * @param user - The user object
 * @param award - The award definition
 * @returns boolean - True if user qualifies, false otherwise
 */
function checkAwardQualification(
  user: any,
  award: any
): boolean {
  const { triggerField, triggerOperator, triggerValue } = award;

  // Get the user's value for the trigger field
  const userValue = user[triggerField];

  // Skip if the field doesn't exist on the user
  if (userValue === undefined || userValue === null) {
    return false;
  }

  // Convert values to numbers for comparison
  const userNumericValue = Number(userValue);
  const targetNumericValue = Number(triggerValue);

  // Check if conversion was successful
  if (isNaN(userNumericValue) || isNaN(targetNumericValue)) {
    console.warn(
      `⚠️ Invalid numeric values for award ${award.name}: user value = ${userValue}, target = ${triggerValue}`
    );
    return false;
  }

  // Evaluate based on operator
  switch (triggerOperator) {
    case '>=':
      return userNumericValue >= targetNumericValue;
    case '>':
      return userNumericValue > targetNumericValue;
    case '=':
    case '==':
      return userNumericValue === targetNumericValue;
    case '<=':
      return userNumericValue <= targetNumericValue;
    case '<':
      return userNumericValue < targetNumericValue;
    case '!=':
    case '<>':
      return userNumericValue !== targetNumericValue;
    default:
      console.warn(`⚠️ Unknown operator ${triggerOperator} for award ${award.name}`);
      return false;
  }
}
