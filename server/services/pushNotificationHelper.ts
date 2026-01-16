import { notificationService } from "./notificationService";
import { db } from "../db";
import { users, events, teams, programs, products } from "../../shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { IStorage } from "../storage";

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  channels?: ('in_app' | 'push' | 'email')[];
}

async function sendNotification(storage: IStorage, params: NotificationParams) {
  const { userId, title, message, channels = ['in_app', 'push'] } = params;
  
  try {
    const createdNotification = await storage.createNotificationRequest({
      title,
      message,
      types: ["notification"],
      recipientTarget: "users",
      recipientUserIds: [userId],
      status: "sent",
      deliveryChannels: channels,
      sentBy: "system",
    });

    if (createdNotification?.id && channels.includes('push')) {
      await notificationService.sendPushNotification(
        createdNotification.id,
        userId,
        title,
        message
      );
    }
    
    return createdNotification;
  } catch (error) {
    console.error(`Failed to send notification to ${userId}:`, error);
    return null;
  }
}

async function getUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user;
}

async function getEventById(eventId: number) {
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  return event;
}

async function getTeamById(teamId: number) {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  return team;
}

async function getProgramById(programId: string) {
  const [program] = await db.select().from(programs).where(eq(programs.id, programId)).limit(1);
  return program;
}

async function getProductById(productId: number) {
  const [product] = await db.select().from(products).where(eq(products.id, productId)).limit(1);
  return product;
}

export const pushNotifications = {
  
  // ============================================
  // PLAYER NOTIFICATIONS
  // ============================================

  async playerCheckedIn(storage: IStorage, playerId: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "✅ You're Checked In!",
      message: `You've been checked in to ${event.title}`,
    });
  },

  async playerCheckInOpen(storage: IStorage, playerId: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📍 Check-in Now Open",
      message: `Check-in is now open for ${event.title}`,
    });
  },

  async playerCheckInClosingSoon(storage: IStorage, playerId: string, eventId: number, minutesLeft: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "⏰ Check-in Closing Soon",
      message: `Check-in closes in ${minutesLeft} minutes for ${event.title}`,
    });
  },

  async playerNearLocation(storage: IStorage, playerId: string, eventId: number, locationName: string) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📍 You're Near the Venue",
      message: `You're within check-in distance for ${event.title} - ready to check in?`,
    });
  },

  async playerRsvpRequested(storage: IStorage, playerId: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📋 RSVP Requested",
      message: `Please RSVP for ${event.title} on ${new Date(event.date).toLocaleDateString()}`,
    });
  },

  async playerRsvpReminder(storage: IStorage, playerId: string, eventId: number, dueDate: string) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📋 RSVP Reminder",
      message: `Don't forget to RSVP for ${event.title} by ${dueDate}`,
    });
  },

  async playerSkillsEvaluated(storage: IStorage, playerId: string, coachName: string) {
    await sendNotification(storage, {
      userId: playerId,
      title: "📊 Skills Evaluated",
      message: `Coach ${coachName} evaluated your skills - check your progress!`,
    });
  },

  async playerTeamMessage(storage: IStorage, playerId: string, teamId: number, senderName: string) {
    const team = await getTeamById(teamId);
    if (!team) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "💬 New Team Message",
      message: `${senderName} sent a message in ${team.name} chat`,
    });
  },

  async playerEventReminder(storage: IStorage, playerId: string, eventId: number, hoursUntil: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    const timeText = hoursUntil === 1 ? "1 hour" : `${hoursUntil} hours`;
    await sendNotification(storage, {
      userId: playerId,
      title: "⏰ Event Reminder",
      message: `${event.title} starts in ${timeText}`,
    });
  },

  // ============================================
  // PARENT NOTIFICATIONS
  // ============================================

  async parentPlayerRsvpNeeded(storage: IStorage, parentId: string, playerName: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: parentId,
      title: "📋 RSVP Needed",
      message: `${playerName} has an RSVP pending for ${event.title}`,
    });
  },

  async parentPlayerCheckedIn(storage: IStorage, parentId: string, playerName: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: parentId,
      title: "✅ Player Checked In",
      message: `${playerName} checked in to ${event.title}`,
    });
  },

  async parentSessionsRunningLow(storage: IStorage, parentId: string, playerName: string, sessionsRemaining: number, programName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "⚠️ Sessions Running Low",
      message: `${playerName} has ${sessionsRemaining} session${sessionsRemaining === 1 ? '' : 's'} remaining in ${programName}`,
    });
  },

  async parentPaymentDue(storage: IStorage, parentId: string, playerName: string, programName: string, amount?: number) {
    const amountText = amount ? ` ($${(amount / 100).toFixed(2)})` : '';
    await sendNotification(storage, {
      userId: parentId,
      title: "💳 Payment Due",
      message: `Payment due for ${playerName}: ${programName}${amountText}`,
    });
  },

  async parentPaymentSuccessful(storage: IStorage, parentId: string, playerName: string, amount: number) {
    await sendNotification(storage, {
      userId: parentId,
      title: "✅ Payment Confirmed",
      message: `Payment of $${(amount / 100).toFixed(2)} confirmed for ${playerName}`,
    });
  },

  async parentSubscriptionExpiring(storage: IStorage, parentId: string, playerName: string, programName: string, daysRemaining: number) {
    await sendNotification(storage, {
      userId: parentId,
      title: "📅 Subscription Expiring",
      message: `${playerName}'s enrollment in ${programName} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
    });
  },

  async parentWaiverRequired(storage: IStorage, parentId: string, playerName: string, waiverName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "📝 Waiver Required",
      message: `New waiver "${waiverName}" requires your signature for ${playerName}`,
    });
  },

  async parentPlayerSkillsUpdated(storage: IStorage, parentId: string, playerName: string, coachName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "📊 Skills Update",
      message: `${playerName}'s skills were evaluated by ${coachName}`,
    });
  },

  async parentPlayerTeamAssignment(storage: IStorage, parentId: string, playerName: string, teamName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "🏀 Team Assignment",
      message: `${playerName} has been added to ${teamName}`,
    });
  },

  // ============================================
  // COACH NOTIFICATIONS
  // ============================================

  async coachNewMessage(storage: IStorage, coachId: string, teamId: number, senderName: string, isFromParent: boolean) {
    const team = await getTeamById(teamId);
    if (!team) return;
    
    const chatType = isFromParent ? 'parent' : 'player';
    await sendNotification(storage, {
      userId: coachId,
      title: "💬 New Message",
      message: `${senderName} sent a ${chatType} message in ${team.name} chat`,
    });
  },

  async coachRsvpSummary(storage: IStorage, coachId: string, eventId: number, confirmedCount: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: coachId,
      title: "📋 RSVP Summary",
      message: `${confirmedCount} player${confirmedCount === 1 ? '' : 's'} confirmed for ${event.title}`,
    });
  },

  async coachLowAttendanceWarning(storage: IStorage, coachId: string, eventId: number, confirmedCount: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: coachId,
      title: "⚠️ Low Attendance",
      message: `Only ${confirmedCount} player${confirmedCount === 1 ? '' : 's'} confirmed for ${event.title}`,
    });
  },

  async coachPlayerCheckedIn(storage: IStorage, coachId: string, playerName: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: coachId,
      title: "✅ Player Check-in",
      message: `${playerName} checked in to ${event.title}`,
    });
  },

  async coachEventReminder(storage: IStorage, coachId: string, eventId: number, hoursUntil: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    const timeText = hoursUntil === 1 ? "1 hour" : `${hoursUntil} hours`;
    await sendNotification(storage, {
      userId: coachId,
      title: "⏰ Session Reminder",
      message: `Your session ${event.title} starts in ${timeText}`,
    });
  },

  async coachNewPlayerAssigned(storage: IStorage, coachId: string, playerName: string, teamName: string) {
    await sendNotification(storage, {
      userId: coachId,
      title: "👋 New Player",
      message: `${playerName} joined ${teamName}`,
    });
  },

  async coachRosterUpdate(storage: IStorage, coachId: string, teamName: string) {
    await sendNotification(storage, {
      userId: coachId,
      title: "📋 Roster Updated",
      message: `Your roster for ${teamName} has been updated`,
    });
  },

  // ============================================
  // ADMIN NOTIFICATIONS
  // ============================================

  async adminNewPayment(storage: IStorage, adminId: string, parentName: string, amount: number) {
    await sendNotification(storage, {
      userId: adminId,
      title: "💰 New Payment",
      message: `Payment of $${(amount / 100).toFixed(2)} received from ${parentName}`,
    });
  },

  async adminPaymentFailed(storage: IStorage, adminId: string, parentName: string, programName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "❌ Payment Failed",
      message: `Payment failed for ${parentName} - ${programName}`,
    });
  },

  async adminNewRegistration(storage: IStorage, adminId: string, email: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "👤 New Registration",
      message: `New account created: ${email}`,
    });
  },

  async adminEnrollmentCompleted(storage: IStorage, adminId: string, playerName: string, programName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "✅ New Enrollment",
      message: `${playerName} enrolled in ${programName}`,
    });
  },

  async adminLowInventory(storage: IStorage, adminId: string, productName: string, remainingCount: number) {
    await sendNotification(storage, {
      userId: adminId,
      title: "📦 Low Inventory",
      message: `${productName} has only ${remainingCount} item${remainingCount === 1 ? '' : 's'} left`,
    });
  },

  async adminMessageFlagged(storage: IStorage, adminId: string, teamName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "🚩 Message Flagged",
      message: `Message flagged for review in ${teamName} chat`,
    });
  },

  async adminWaiverSigned(storage: IStorage, adminId: string, parentName: string, waiverName: string, playerName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "📝 Waiver Signed",
      message: `${parentName} signed "${waiverName}" for ${playerName}`,
    });
  },

  async adminSubscriptionCancelled(storage: IStorage, adminId: string, parentName: string, programName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "🚫 Subscription Cancelled",
      message: `${parentName} cancelled ${programName}`,
    });
  },

  async adminDailySummary(storage: IStorage, adminId: string, checkIns: number, payments: number, newUsers: number) {
    await sendNotification(storage, {
      userId: adminId,
      title: "📊 Daily Summary",
      message: `Today: ${checkIns} check-ins, ${payments} payments, ${newUsers} new users`,
      channels: ['in_app', 'push', 'email'],
    });
  },

  // ============================================
  // UTILITY: Send to all admins
  // ============================================

  async notifyAllAdmins(storage: IStorage, title: string, message: string) {
    const admins = await db.select({ id: users.id })
      .from(users)
      .where(eq(users.role, 'admin'));
    
    for (const admin of admins) {
      await sendNotification(storage, {
        userId: admin.id,
        title,
        message,
      });
    }
  },

  async notifyTeamCoaches(storage: IStorage, teamId: number, title: string, message: string) {
    const team = await getTeamById(teamId);
    if (!team || !team.coachId) return;
    
    await sendNotification(storage, {
      userId: team.coachId,
      title,
      message,
    });
  },
};

export default pushNotifications;
