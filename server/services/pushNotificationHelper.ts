import { notificationService } from "./notificationService";
import { db } from "../db";
import { users, events, teams, programs, products } from "../../shared/schema";
import type { Event } from "../../shared/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { IStorage } from "../storage";

interface NotificationParams {
  userId: string;
  title: string;
  message: string;
  channels?: ('in_app' | 'push' | 'email')[];
  url?: string;
  customData?: Record<string, any>;
}

async function sendNotification(storage: IStorage, params: NotificationParams) {
  const { userId, title, message, channels = ['in_app', 'push'], url, customData } = params;
  
  try {
    // Get user's organization for notification
    const user = await getUserById(userId);
    const organizationId = user?.organizationId || 'default';
    
    const createdNotification = await storage.createNotification({
      organizationId,
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
      const pushCustomData: Record<string, any> = {};
      if (url) pushCustomData.url = url;
      if (customData) Object.assign(pushCustomData, customData);
      await notificationService.sendPushNotification(
        createdNotification.id,
        userId,
        title,
        message,
        undefined,
        Object.keys(pushCustomData).length > 0 ? pushCustomData : undefined
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

async function getProductById(productId: string) {
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
      url: `/home?eventId=${eventId}`,
    });
  },

  async playerCheckInOpen(storage: IStorage, playerId: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📍 Check-in Now Open",
      message: `Check-in is now open for ${event.title}`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async playerCheckInClosingSoon(storage: IStorage, playerId: string, eventId: number, minutesLeft: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "⏰ Check-in Closing Soon",
      message: `Check-in closes in ${minutesLeft} minutes for ${event.title}`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async playerNearLocation(storage: IStorage, playerId: string, eventId: number, locationName: string) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📍 You're Near the Venue",
      message: `You're within check-in distance for ${event.title} - ready to check in?`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async playerRsvpRequested(storage: IStorage, playerId: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📋 RSVP Requested",
      message: `Please RSVP for ${event.title} on ${new Date(event.startTime).toLocaleDateString()}`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async playerRsvpReminder(storage: IStorage, playerId: string, eventId: number, dueDate: string) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "📋 RSVP Reminder",
      message: `Don't forget to RSVP for ${event.title} by ${dueDate}`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async playerSkillsEvaluated(storage: IStorage, playerId: string, coachName: string, oldOvr?: number, newOvr?: number) {
    await sendNotification(storage, {
      userId: playerId,
      title: "📊 Skills Evaluated",
      message: `Coach ${coachName} evaluated your skills - check your progress!`,
      url: '/player-dashboard?tab=profile&popup=eval',
      customData: {
        notificationType: 'skill_evaluation',
        ...(oldOvr !== undefined && { oldOvr }),
        ...(newOvr !== undefined && { newOvr }),
      },
    });
  },

  async playerTeamMessage(storage: IStorage, playerId: string, teamId: number, senderName: string) {
    const team = await getTeamById(teamId);
    if (!team) return;
    
    await sendNotification(storage, {
      userId: playerId,
      title: "💬 New Team Message",
      message: `${senderName} sent a message in ${team.name} chat`,
      url: '/unified-account?tab=messages',
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
      url: `/home?eventId=${eventId}`,
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
      url: `/home?eventId=${eventId}`,
    });
  },

  async parentPlayerCheckedIn(storage: IStorage, parentId: string, playerName: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: parentId,
      title: "✅ Player Checked In",
      message: `${playerName} checked in to ${event.title}`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async parentSessionsRunningLow(storage: IStorage, parentId: string, playerName: string, sessionsRemaining: number, programName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "⚠️ Sessions Running Low",
      message: `${playerName} has ${sessionsRemaining} session${sessionsRemaining === 1 ? '' : 's'} remaining in ${programName}`,
      url: '/unified-account?tab=payments',
    });
  },

  async parentPaymentDue(storage: IStorage, parentId: string, playerName: string, programName: string, amount?: number) {
    const amountText = amount ? ` ($${(amount / 100).toFixed(2)})` : '';
    await sendNotification(storage, {
      userId: parentId,
      title: "💳 Payment Due",
      message: `Payment due for ${playerName}: ${programName}${amountText}`,
      url: '/unified-account?tab=payments',
    });
  },

  async parentPaymentSuccessful(storage: IStorage, parentId: string, playerName: string, amount: number) {
    await sendNotification(storage, {
      userId: parentId,
      title: "✅ Payment Confirmed",
      message: `Payment of $${(amount / 100).toFixed(2)} confirmed for ${playerName}`,
      url: '/unified-account?tab=payments',
    });
  },

  async parentSubscriptionExpiring(storage: IStorage, parentId: string, playerName: string, programName: string, daysRemaining: number) {
    await sendNotification(storage, {
      userId: parentId,
      title: "📅 Subscription Expiring",
      message: `${playerName}'s enrollment in ${programName} expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
      url: '/unified-account?tab=payments',
    });
  },

  async parentWaiverRequired(storage: IStorage, parentId: string, playerName: string, waiverName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "📝 Waiver Required",
      message: `New waiver "${waiverName}" requires your signature for ${playerName}`,
      url: '/unified-account?tab=home',
    });
  },

  async parentPlayerSkillsUpdated(storage: IStorage, parentId: string, playerName: string, coachName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "📊 Skills Update",
      message: `${playerName}'s skills were evaluated by ${coachName}`,
      url: '/unified-account?tab=home',
    });
  },

  async parentPlayerTeamAssignment(storage: IStorage, parentId: string, playerName: string, teamName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "🏀 Team Assignment",
      message: `${playerName} has been added to ${teamName}`,
      url: '/unified-account?tab=home',
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
      url: '/coach-dashboard',
    });
  },

  async coachRsvpSummary(storage: IStorage, coachId: string, eventId: number, confirmedCount: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: coachId,
      title: "📋 RSVP Summary",
      message: `${confirmedCount} player${confirmedCount === 1 ? '' : 's'} confirmed for ${event.title}`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async coachLowAttendanceWarning(storage: IStorage, coachId: string, eventId: number, confirmedCount: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: coachId,
      title: "⚠️ Low Attendance",
      message: `Only ${confirmedCount} player${confirmedCount === 1 ? '' : 's'} confirmed for ${event.title}`,
      url: `/home?eventId=${eventId}`,
    });
  },

  async coachPlayerCheckedIn(storage: IStorage, coachId: string, playerName: string, eventId: number) {
    const event = await getEventById(eventId);
    if (!event) return;
    
    await sendNotification(storage, {
      userId: coachId,
      title: "✅ Player Check-in",
      message: `${playerName} checked in to ${event.title}`,
      url: `/home?eventId=${eventId}`,
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
      url: `/home?eventId=${eventId}`,
    });
  },

  async coachNewPlayerAssigned(storage: IStorage, coachId: string, playerName: string, teamName: string) {
    await sendNotification(storage, {
      userId: coachId,
      title: "👋 New Player",
      message: `${playerName} joined ${teamName}`,
      url: '/coach-dashboard?tab=team',
    });
  },

  async coachRosterUpdate(storage: IStorage, coachId: string, teamName: string) {
    await sendNotification(storage, {
      userId: coachId,
      title: "📋 Roster Updated",
      message: `Your roster for ${teamName} has been updated`,
      url: '/coach-dashboard?tab=team',
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
      url: '/admin-dashboard?tab=payments',
    });
  },

  async adminPaymentFailed(storage: IStorage, adminId: string, parentName: string, programName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "❌ Payment Failed",
      message: `Payment failed for ${parentName} - ${programName}`,
      url: '/admin-dashboard?tab=payments',
    });
  },

  async adminNewRegistration(storage: IStorage, adminId: string, email: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "👤 New Registration",
      message: `New account created: ${email}`,
      url: '/admin-dashboard?tab=users',
    });
  },

  async adminEnrollmentCompleted(storage: IStorage, adminId: string, playerName: string, programName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "✅ New Enrollment",
      message: `${playerName} enrolled in ${programName}`,
      url: '/admin-dashboard?tab=programs',
    });
  },

  async adminLowInventory(storage: IStorage, adminId: string, productName: string, remainingCount: number) {
    await sendNotification(storage, {
      userId: adminId,
      title: "📦 Low Inventory",
      message: `${productName} has only ${remainingCount} item${remainingCount === 1 ? '' : 's'} left`,
      url: '/admin-dashboard?tab=store',
    });
  },

  async adminMessageFlagged(storage: IStorage, adminId: string, teamName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "🚩 Message Flagged",
      message: `Message flagged for review in ${teamName} chat`,
      url: '/admin-dashboard?tab=messages',
    });
  },

  async adminWaiverSigned(storage: IStorage, adminId: string, parentName: string, waiverName: string, playerName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "📝 Waiver Signed",
      message: `${parentName} signed "${waiverName}" for ${playerName}`,
      url: '/admin-dashboard?tab=waivers',
    });
  },

  async adminSubscriptionCancelled(storage: IStorage, adminId: string, parentName: string, programName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "🚫 Subscription Cancelled",
      message: `${parentName} cancelled ${programName}`,
      url: '/admin-dashboard?tab=programs',
    });
  },

  async adminDailySummary(storage: IStorage, adminId: string, checkIns: number, payments: number, newUsers: number) {
    await sendNotification(storage, {
      userId: adminId,
      title: "📊 Daily Summary",
      message: `Today: ${checkIns} check-ins, ${payments} payments, ${newUsers} new users`,
      channels: ['in_app', 'push', 'email'],
      url: '/admin-dashboard?tab=overview',
    });
  },

  // ============================================
  // UTILITY: Send to all admins
  // ============================================

  async notifyAllAdmins(storage: IStorage, title: string, message: string, organizationId?: string, url?: string) {
    const conditions = [eq(users.role, 'admin')];
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId));
    }
    const admins = await db.select({ id: users.id })
      .from(users)
      .where(and(...conditions));
    
    for (const admin of admins) {
      await sendNotification(storage, {
        userId: admin.id,
        title,
        message,
        url: url || '/admin-dashboard',
      });
    }
  },

  async notifyTeamCoaches(storage: IStorage, teamId: number, title: string, message: string, url?: string) {
    const team = await getTeamById(teamId);
    if (!team || !team.coachId) return;
    
    await sendNotification(storage, {
      userId: team.coachId,
      title,
      message,
      url: url || '/coach-dashboard',
    });
  },

  // ============================================
  // ATTENDANCE PATTERN NOTIFICATIONS
  // ============================================

  // --- Player attendance notifications ---

  async playerMissedStreak(storage: IStorage, playerId: string, missCount: number) {
    const messages: Record<number, { title: string; message: string }> = {
      2: { title: "💪 Get Back in the Grind!", message: "You've missed your last 2 events. Your team needs you out there!" },
      3: { title: "⚠️ 3 Events Missed", message: "3 events missed in a row — your team needs you out there!" },
      5: { title: "😟 We Miss You!", message: "5 events missed — don't let your hard work go to waste. We miss you!" },
    };
    const msg = messages[missCount] || (missCount >= 7
      ? { title: "🚨 Time to Come Back", message: `You've missed ${missCount} events in a row. Your spot is waiting — come back stronger!` }
      : null);
    if (!msg) return;
    await sendNotification(storage, { userId: playerId, url: '/player-dashboard?tab=activity', ...msg });
  },

  async playerAttendStreak(storage: IStorage, playerId: string, streakCount: number) {
    const messages: Record<number, { title: string; message: string }> = {
      3: { title: "🔥 3 in a Row!", message: "3 events in a row! You're building momentum — keep showing up!" },
      5: { title: "🔥 5-Event Streak!", message: "5 in a row! You're on fire — keep that streak alive!" },
      10: { title: "🏆 10-Event Streak!", message: "10 straight events! You're setting the standard. Legendary commitment!" },
    };
    const msg = messages[streakCount] || (streakCount >= 15 && streakCount % 5 === 0
      ? { title: "👑 Unstoppable!", message: `${streakCount} events in a row! You're in a league of your own.` }
      : null);
    if (!msg) return;
    await sendNotification(storage, { userId: playerId, url: '/player-dashboard?tab=activity', ...msg });
  },

  async playerPerfectMonth(storage: IStorage, playerId: string, monthName: string) {
    await sendNotification(storage, {
      userId: playerId,
      title: "⭐ Perfect Month!",
      message: `You attended every event in ${monthName}. That's elite dedication!`,
      url: '/player-dashboard?tab=activity',
    });
  },

  async playerWelcomeBack(storage: IStorage, playerId: string) {
    await sendNotification(storage, {
      userId: playerId,
      title: "👋 Welcome Back!",
      message: "Great to see you out there again. Let's keep the momentum going!",
      url: '/player-dashboard?tab=activity',
    });
  },

  // --- Parent attendance notifications ---

  async parentPlayerMissedStreak(storage: IStorage, parentId: string, playerName: string, missCount: number) {
    const messages: Record<number, { title: string; message: string }> = {
      2: { title: "📋 Attendance Update", message: `Heads up — ${playerName} has missed the last 2 events.` },
      3: { title: "🤔 Everything OK?", message: `Everything ok? ${playerName} has missed the last 3 events.` },
      5: { title: "😟 We're Concerned", message: `We're concerned — ${playerName} has missed 5 events in a row. Is everything alright?` },
    };
    const msg = messages[missCount] || (missCount >= 7
      ? { title: "⚠️ Extended Absence", message: `${playerName} has missed ${missCount} events in a row. Please reach out if we can help.` }
      : null);
    if (!msg) return;
    await sendNotification(storage, { userId: parentId, url: '/unified-account?tab=home', ...msg });
  },

  async parentPlayerAttendStreak(storage: IStorage, parentId: string, playerName: string, streakCount: number) {
    const messages: Record<number, { title: string; message: string }> = {
      3: { title: "🌟 Great Consistency!", message: `${playerName} has attended 3 events in a row — great consistency!` },
      5: { title: "🔥 Amazing Commitment!", message: `${playerName} is on a 5-event streak! Amazing commitment.` },
      10: { title: "🏆 Incredible Streak!", message: `${playerName} hit a 10-event streak! Outstanding dedication.` },
    };
    const msg = messages[streakCount];
    if (!msg) return;
    await sendNotification(storage, { userId: parentId, url: '/unified-account?tab=home', ...msg });
  },

  async parentPlayerPerfectMonth(storage: IStorage, parentId: string, playerName: string, monthName: string) {
    await sendNotification(storage, {
      userId: parentId,
      title: "⭐ Perfect Month!",
      message: `${playerName} attended every event in ${monthName}. Outstanding!`,
      url: '/unified-account?tab=home',
    });
  },

  // --- Coach attendance notifications (team players only) ---

  async coachPlayerMissedStreak(storage: IStorage, coachId: string, playerName: string, missCount: number) {
    const messages: Record<number, { title: string; message: string }> = {
      2: { title: "📋 Player Absence", message: `${playerName} has missed 2 events. Might be worth a quick check-in.` },
      3: { title: "⚠️ Player Missing Events", message: `${playerName} has missed 3 events — time to check in.` },
      5: { title: "🚨 Extended Player Absence", message: `${playerName} has missed 5 events in a row. A conversation may be needed.` },
    };
    const msg = messages[missCount] || (missCount >= 7
      ? { title: "🚨 Player Alert", message: `${playerName} has missed ${missCount} events in a row. Follow-up recommended.` }
      : null);
    if (!msg) return;
    await sendNotification(storage, { userId: coachId, url: '/coach-dashboard?tab=team', ...msg });
  },

  async coachPlayerAttendStreak(storage: IStorage, coachId: string, playerName: string, streakCount: number) {
    if (streakCount === 5) {
      await sendNotification(storage, {
        userId: coachId,
        title: "🌟 Player Streak",
        message: `${playerName} is on a 5-event streak. Great to see!`,
        url: '/coach-dashboard?tab=team',
      });
    }
  },

  async coachPlayerPerfectPracticeMonth(storage: IStorage, coachId: string, playerName: string, monthName: string) {
    await sendNotification(storage, {
      userId: coachId,
      title: "🤝 Handshake-Worthy!",
      message: `Maybe a handshake is in order — ${playerName} has attended every practice in ${monthName}!`,
      url: '/coach-dashboard?tab=team',
    });
  },

  async coachPlayerPerfectMonth(storage: IStorage, coachId: string, playerName: string, monthName: string) {
    await sendNotification(storage, {
      userId: coachId,
      title: "⭐ Perfect Attendance",
      message: `${playerName} hasn't missed a single event in ${monthName}. That's commitment!`,
      url: '/coach-dashboard?tab=team',
    });
  },

  // --- Admin attendance notifications ---

  async adminPlayerMissedStreak(storage: IStorage, adminId: string, playerName: string, missCount: number) {
    const messages: Record<number, { title: string; message: string }> = {
      3: { title: "⚠️ Player Attendance Alert", message: `${playerName} has missed 3 events in a row — time to check in.` },
      5: { title: "🚨 Player Attendance Alert", message: `${playerName} has missed 5 events in a row. May need follow-up.` },
    };
    const msg = messages[missCount] || (missCount >= 7
      ? { title: "🚨 Intervention Needed", message: `Alert: ${playerName} has missed ${missCount} events in a row. Intervention recommended.` }
      : null);
    if (!msg) return;
    await sendNotification(storage, { userId: adminId, url: '/admin-dashboard?tab=overview', ...msg });
  },

  async adminPlayerAttendStreak(storage: IStorage, adminId: string, playerName: string, streakCount: number) {
    if (streakCount >= 10) {
      await sendNotification(storage, {
        userId: adminId,
        title: "🏆 Outstanding Dedication",
        message: `${playerName} has hit a ${streakCount}-event streak — outstanding dedication!`,
        url: '/admin-dashboard?tab=overview',
      });
    }
  },

  async adminPlayerPerfectMonth(storage: IStorage, adminId: string, playerName: string, monthName: string) {
    await sendNotification(storage, {
      userId: adminId,
      title: "⭐ Perfect Attendance",
      message: `${playerName} attended every event in ${monthName}.`,
      url: '/admin-dashboard?tab=overview',
    });
  },

  async adminMultiplePlayersMissing(storage: IStorage, adminId: string, count: number) {
    await sendNotification(storage, {
      userId: adminId,
      title: "📊 Attendance Report",
      message: `${count} player${count === 1 ? ' has' : 's have'} missed 3+ events this week. Review attendance report.`,
      url: '/admin-dashboard?tab=overview',
    });
  },

  // ============================================
  // ABANDONED CART NOTIFICATIONS
  // ============================================

  async cartReminder1Hour(storage: IStorage, userId: string, productName: string, playerName?: string) {
    const msg = playerName
      ? `You started enrolling ${playerName} in ${productName} but didn't finish. Complete checkout before the spot fills up!`
      : `You left ${productName} in your cart. Complete checkout before it's gone!`;
    await sendNotification(storage, {
      userId,
      title: "🛒 You Left Something Behind!",
      message: msg,
      url: '/unified-account?tab=home',
    });
  },

  async cartReminder24Hours(storage: IStorage, userId: string, productName: string, playerName?: string) {
    const msg = playerName
      ? `${playerName}'s enrollment in ${productName} is still waiting. Don't miss out — finish checkout today!`
      : `${productName} is still in your cart. Don't miss out — finish checkout today!`;
    await sendNotification(storage, {
      userId,
      title: "⏰ Still Interested?",
      message: msg,
      url: '/unified-account?tab=home',
    });
  },

  async cartReminder3Days(storage: IStorage, userId: string, productName: string, playerName?: string) {
    const msg = playerName
      ? `Last reminder — ${playerName}'s spot in ${productName} won't be held forever. Complete checkout now!`
      : `Last reminder — ${productName} is still in your cart. Complete checkout before it's too late!`;
    await sendNotification(storage, {
      userId,
      title: "🔔 Last Chance!",
      message: msg,
      url: '/unified-account?tab=home',
    });
  },
};

export default pushNotifications;

/**
 * Resolve all participant user IDs for an event using the standard targeting logic:
 * direct teamId, assignTo.teams, assignTo.users, assignTo.roles, assignTo.programs.
 *
 * This mirrors the private `getEventParticipants` method in NotificationScheduler so
 * that event-update notifications in routes.ts stay permanently aligned with reminder logic.
 */
export async function resolveEventParticipants(event: Event, storage: IStorage): Promise<string[]> {
  const participantIds = new Set<string>();

  if (event.teamId) {
    const teamMembers = await storage.getUsersByTeam(event.teamId.toString());
    teamMembers.forEach(m => participantIds.add(String(m.id)));
  }

  const assignTo = event.assignTo;
  if (assignTo) {
    if (assignTo.teams && assignTo.teams.length > 0) {
      for (const teamId of assignTo.teams) {
        const teamMembers = await storage.getUsersByTeam(teamId);
        teamMembers.forEach(m => participantIds.add(String(m.id)));
      }
    }
    if (assignTo.users && assignTo.users.length > 0) {
      for (const userId of assignTo.users) {
        participantIds.add(userId);
      }
    }
    if (assignTo.roles && assignTo.roles.length > 0) {
      const orgId = event.organizationId || 'default-org';
      for (const role of assignTo.roles) {
        const roleUsers = await storage.getUsersByRole(orgId, role);
        roleUsers.forEach(u => participantIds.add(String(u.id)));
      }
    }
    if (assignTo.programs && assignTo.programs.length > 0) {
      for (const programId of assignTo.programs) {
        const enrollments = await storage.getEnrollmentsByProgram(programId);
        for (const enrollment of enrollments) {
          if (enrollment.userId) participantIds.add(enrollment.userId);
        }
      }
    }
  }

  return Array.from(participantIds);
}
