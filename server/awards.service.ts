import { storage } from "./storage";
import { db } from "./db";
import { users, userBadges, userTrophies, attendances, events } from "@shared/schema";
import { eq, and, count, sql } from "drizzle-orm";

// Import awards system from shared
import { AUTO_AWARDS, handleAwardTrigger, getAwardProgress, type UserStats } from "../shared/awards.registry";

export class AwardsService {
  
  /**
   * Get comprehensive user stats for awards calculation
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Get basic user info
      const user = await storage.getUser(userId);
      if (!user) throw new Error("User not found");

      // Get check-in counts by event type
      const attendanceCounts = await db
        .select({
          eventType: events.eventType,
          count: count()
        })
        .from(attendances)
        .innerJoin(events, eq(attendances.eventId, events.id))
        .where(eq(attendances.userId, userId))
        .groupBy(events.eventType);

      // Get existing badges (skip trophies for now to avoid table issues)
      const earnedBadges = await db
        .select({ badgeId: userBadges.badgeId })
        .from(userBadges)
        .where(eq(userBadges.userId, userId));

      // Get RSVP count (advance type check-ins)
      const rsvpCount = await db
        .select({ count: count() })
        .from(attendances)
        .where(and(eq(attendances.userId, userId), eq(attendances.type, 'advance')));

      // Calculate totals from attendance counts
      const practicesTotal = attendanceCounts.find(a => a.eventType === 'practice')?.count || 0;
      const skillsTotal = attendanceCounts.find(a => a.eventType === 'skills')?.count || 0;
      const gamesTotal = attendanceCounts.find(a => a.eventType === 'game')?.count || 0;
      const fnhGamesTotal = 0; // TODO: Add FNH event type handling
      const totalRsvps = rsvpCount[0]?.count || 0;

      // Build user stats object
      const userStats: UserStats = {
        // Coach-awarded stats (would be tracked separately)
        mvpCount: 0,
        clutchCount: 0,
        comebackCount: 0,
        hustleCount: 0,
        teammateCount: 0,
        sportsmanshipCount: 0,
        studentCount: 0,
        leadByExampleCount: 0,
        
        // Attendance stats
        practicesTotal,
        skillsTotal,
        gamesTotal,
        fnhGamesTotal,
        trainingProgramsCompleted: 0, // TODO: Track training programs
        
        // Streaks (would need more complex calculation)
        practiceStreak: 0,
        rsvpStreak: 0,
        
        // Season stats
        season: {
          mvp: 0,
          hustle: 0,
          teammate: 0,
          sportsmanship: 0,
          clutch: 0,
          comeback: 0,
          student: 0,
          leadByExample: 0,
        },
        
        // Foundation program stats
        foundation: {
          totalVideos: 0,
          skillsCompleted: 0,
          scCompleted: 0,
          iqCompleted: 0,
        },
        
        // Additional stats
        referrals: 0,
        yearsActive: 1, // Calculate from user creation date
        
        // Additional stats
        rsvpCount: totalRsvps,
        
        // Already earned awards (badges only for now)
        awardsEarned: earnedBadges.map(b => String(b.badgeId))
      };

      return userStats;
    } catch (error) {
      console.error("Error getting user stats:", error);
      throw error;
    }
  }

  /**
   * Process award triggers for a user action
   */
  async processAwardTriggers(
    userId: string, 
    trigger: "attendance" | "coachAward" | "onlineTraining" | "rsvp"
  ): Promise<string[]> {
    try {
      console.log(`Processing award triggers for user ${userId}, trigger: ${trigger}`);
      
      // Get current user stats
      const userStats = await this.getUserStats(userId);
      
      // Check for newly earned awards
      const newlyEarned = handleAwardTrigger(userStats, trigger);
      
      if (newlyEarned.length > 0) {
        console.log(`User ${userId} earned new awards:`, newlyEarned);
        
        // Save newly earned awards to database
        for (const awardId of newlyEarned) {
          await this.saveEarnedAward(userId, awardId);
        }
      }
      
      return newlyEarned;
    } catch (error) {
      console.error("Error processing award triggers:", error);
      return [];
    }
  }

  /**
   * Save a newly earned award to the database
   */
  private async saveEarnedAward(userId: string, awardId: string): Promise<void> {
    try {
      // Find the award definition
      const award = AUTO_AWARDS.find(a => a.id === awardId);
      if (!award) {
        console.warn(`Award not found: ${awardId}`);
        return;
      }

      if (award.kind === "Badge") {
        // Extract numeric ID from award ID or use a hash
        const badgeNumericId = this.getBadgeNumericId(awardId);
        
        // Insert into userBadges table
        await db.insert(userBadges).values({
          userId,
          badgeId: badgeNumericId,
          earnedAt: new Date(),
        }).onConflictDoNothing(); // Prevent duplicates
        
      } else if (award.kind === "Trophy") {
        // Similar for trophies
        const trophyNumericId = this.getTrophyNumericId(awardId);
        
        await db.insert(userTrophies).values({
          userId,
          trophyId: trophyNumericId,
          earnedAt: new Date(),
        }).onConflictDoNothing();
      }

      console.log(`Saved award ${awardId} for user ${userId}`);
    } catch (error) {
      console.error(`Error saving award ${awardId} for user ${userId}:`, error);
    }
  }

  /**
   * Map award string IDs to numeric IDs (temporary solution)
   */
  private getBadgeNumericId(awardId: string): number {
    // Hash the string ID to a consistent numeric ID
    let hash = 0;
    for (let i = 0; i < awardId.length; i++) {
      const char = awardId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 10000; // Keep within reasonable range
  }

  private getTrophyNumericId(awardId: string): number {
    // Similar mapping for trophies, offset by 10000 to avoid conflicts
    return this.getBadgeNumericId(awardId) + 10000;
  }

  /**
   * Award a badge manually (for coach awards)
   */
  async awardBadgeManually(userId: string, awardId: string, awardedBy: string): Promise<void> {
    try {
      await this.saveEarnedAward(userId, awardId);
      console.log(`Badge ${awardId} manually awarded to user ${userId} by ${awardedBy}`);
    } catch (error) {
      console.error("Error manually awarding badge:", error);
      throw error;
    }
  }
}

export const awardsService = new AwardsService();