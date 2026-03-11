import { db } from "../db";
import { users, attendances, events, teamMemberships } from "../../shared/schema";
import { eq, and, sql, inArray, desc, lt } from "drizzle-orm";
import { pushNotifications } from "./pushNotificationHelper";
import type { IStorage } from "../storage-impl";

export interface AttendanceAnalysis {
  playerId: string;
  playerName: string;
  parentId: string | null;
  streak: number;
  eventsThisMonth: number;
  attendedThisMonth: number;
  practicesThisMonth: number;
  practicesAttendedThisMonth: number;
  isPerfectMonth: boolean;
  isPerfectPracticeMonth: boolean;
  wasReturning: boolean;
  teamIds: number[];
}

async function getPlayerTeamIds(playerId: string): Promise<number[]> {
  const memberships = await db.select({ teamId: teamMemberships.teamId })
    .from(teamMemberships)
    .where(and(
      eq(teamMemberships.profileId, playerId),
      eq(teamMemberships.status, 'active')
    ));
  return memberships.map(m => m.teamId);
}

async function getPastTeamEvents(teamIds: number[], organizationId: string, limit = 30): Promise<any[]> {
  if (teamIds.length === 0) return [];

  const results = await db.execute(
    sql`SELECT DISTINCT e.id, e.title, e.start_time, e.team_id, e.event_type AS "eventType"
        FROM events e
        WHERE e.organization_id = ${organizationId}
          AND e.start_time < NOW()
          AND (e.team_id IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})
               OR EXISTS (
                 SELECT 1 FROM event_targets et
                 WHERE et.event_id = e.id
                   AND et.target_type = 'team'
                   AND et.target_id::integer IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})
               ))
        ORDER BY e.start_time DESC
        LIMIT ${limit}`
  );
  return (results.rows || results) as any[];
}

async function getPlayerAttendanceForEvents(playerId: string, eventIds: number[]): Promise<Set<number>> {
  if (eventIds.length === 0) return new Set();

  const results = await db.execute(
    sql`SELECT DISTINCT event_id FROM attendances
        WHERE user_id = ${playerId}
          AND event_id IN (${sql.join(eventIds.map(id => sql`${id}`), sql`, `)})`
  );
  const rows = (results.rows || results) as any[];
  return new Set(rows.map(r => r.event_id));
}

export async function analyzePlayerAttendance(
  playerId: string,
  organizationId: string
): Promise<AttendanceAnalysis | null> {
  const [player] = await db.select().from(users).where(eq(users.id, playerId)).limit(1);
  if (!player || player.role !== 'player') return null;

  const teamIds = await getPlayerTeamIds(playerId);
  const pastEvents = await getPastTeamEvents(teamIds, organizationId, 30);
  if (pastEvents.length === 0) {
    return {
      playerId,
      playerName: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
      parentId: player.parentId || null,
      streak: 0,
      eventsThisMonth: 0,
      attendedThisMonth: 0,
      practicesThisMonth: 0,
      practicesAttendedThisMonth: 0,
      isPerfectMonth: false,
      isPerfectPracticeMonth: false,
      wasReturning: false,
      teamIds,
    };
  }

  const eventIds = pastEvents.map((e: any) => e.id);
  const attendedEvents = await getPlayerAttendanceForEvents(playerId, eventIds);

  let streak = 0;
  let wasReturning = false;

  for (let i = 0; i < pastEvents.length; i++) {
    const attended = attendedEvents.has(pastEvents[i].id);
    if (i === 0) {
      streak = attended ? 1 : -1;
    } else {
      if (attended && streak > 0) {
        streak++;
      } else if (!attended && streak < 0) {
        streak--;
      } else {
        break;
      }
    }
  }

  if (streak > 0 && pastEvents.length > streak) {
    const nextOldest = pastEvents[streak];
    if (nextOldest && !attendedEvents.has(nextOldest.id)) {
      wasReturning = true;
    }
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEvents = pastEvents.filter((e: any) => new Date(e.start_time) >= startOfMonth);
  const monthEventIds = monthEvents.map((e: any) => e.id);
  const monthAttendedSet = new Set(monthEventIds.filter((id: number) => attendedEvents.has(id)));

  const practiceTypes = ['practice', 'skills session', 'training'];
  const monthPractices = monthEvents.filter((e: any) => practiceTypes.includes(e.eventType?.toLowerCase()));
  const monthPracticeAttended = monthPractices.filter((e: any) => attendedEvents.has(e.id));

  return {
    playerId,
    playerName: `${player.firstName || ''} ${player.lastName || ''}`.trim(),
    parentId: player.parentId || null,
    streak,
    eventsThisMonth: monthEvents.length,
    attendedThisMonth: monthAttendedSet.size,
    practicesThisMonth: monthPractices.length,
    practicesAttendedThisMonth: monthPracticeAttended.length,
    isPerfectMonth: monthEvents.length > 0 && monthAttendedSet.size === monthEvents.length,
    isPerfectPracticeMonth: monthPractices.length > 0 && monthPracticeAttended.length === monthPractices.length,
    wasReturning,
    teamIds,
  };
}

export async function getOrgPlayers(organizationId: string): Promise<any[]> {
  return db.select().from(users).where(and(
    eq(users.organizationId, organizationId),
    eq(users.role, 'player')
  ));
}

export async function getTeamCoachIds(teamIds: number[]): Promise<string[]> {
  if (teamIds.length === 0) return [];
  const results = await db.execute(
    sql`SELECT DISTINCT profile_id FROM team_memberships
        WHERE team_id IN (${sql.join(teamIds.map(id => sql`${id}`), sql`, `)})
          AND role IN ('coach', 'assistant_coach', 'head_coach')
          AND status = 'active'`
  );
  const rows = (results.rows || results) as any[];
  return rows.map(r => r.profile_id).filter(Boolean);
}

export async function getOrgAdminIds(organizationId: string): Promise<string[]> {
  const admins = await db.select({ id: users.id }).from(users).where(and(
    eq(users.organizationId, organizationId),
    eq(users.role, 'admin')
  ));
  return admins.map(a => a.id);
}

const ATTEND_THRESHOLDS = [3, 5, 10, 15, 20];
const isAttendThreshold = (streak: number) => ATTEND_THRESHOLDS.includes(streak) || (streak >= 15 && streak % 5 === 0);

export async function triggerRealTimeAttendanceNotifications(
  storage: IStorage,
  playerId: string,
  organizationId: string
): Promise<void> {
  const analysis = await analyzePlayerAttendance(playerId, organizationId);
  if (!analysis) return;

  const { streak, playerName, parentId, teamIds } = analysis;

  if (streak >= 3 && isAttendThreshold(streak)) {
    await pushNotifications.playerAttendStreak(storage, playerId, streak);
    if (parentId) {
      await pushNotifications.parentPlayerAttendStreak(storage, parentId, playerName, streak);
    }
    if (streak >= 5) {
      const coachIds = await getTeamCoachIds(teamIds);
      for (const coachId of coachIds) {
        await pushNotifications.coachPlayerAttendStreak(storage, coachId, playerName, streak);
      }
    }
    if (streak >= 10) {
      const adminIds = await getOrgAdminIds(organizationId);
      for (const adminId of adminIds) {
        await pushNotifications.adminPlayerAttendStreak(storage, adminId, playerName, streak);
      }
    }
  }

  if (analysis.wasReturning && streak >= 1) {
    await pushNotifications.playerWelcomeBack(storage, playerId);
  }
}
