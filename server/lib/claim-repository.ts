import { db } from '../db';
import { 
  players, 
  teams, 
  guardians, 
  claimCodes, 
  approvals,
  users,
  type Player,
  type Team,
  type Guardian,
  type ClaimCode,
  type Approval,
  type InsertPlayer,
  type InsertGuardian,
  type InsertClaimCode,
  type InsertApproval
} from '@shared/schema';
import { eq, and, desc, asc, sql, or, like, inArray } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import type { NotionPlayerData, NotionTeamData } from './notion-adapter';

export class ClaimRepository {
  
  // ========== TEAM OPERATIONS ==========
  
  async upsertTeam(input: { 
    name: string; 
    division?: string | null; 
    coachNames?: string | null; 
    notionId: string;
    ageGroup?: string;
    color?: string;
  }): Promise<Team> {
    const [team] = await db
      .insert(teams)
      .values({
        name: input.name,
        division: input.division || null,
        coachNames: input.coachNames || null,
        notionId: input.notionId,
        ageGroup: input.ageGroup || 'Youth',
        color: input.color || '#1E40AF'
      })
      .onConflictDoUpdate({
        target: [teams.notionId],
        set: {
          name: input.name,
          division: input.division || null,
          coachNames: input.coachNames || null,
        }
      })
      .returning();
    
    return team;
  }

  async getTeamByNotionId(notionId: string): Promise<Team | undefined> {
    const [team] = await db
      .select()
      .from(teams)
      .where(eq(teams.notionId, notionId));
    return team;
  }

  async getAllTeams(): Promise<Team[]> {
    return db
      .select()
      .from(teams)
      .orderBy(asc(teams.name));
  }

  async getTeamWithPlayers(teamId: number): Promise<{ team: Team; players: Player[] } | null> {
    const team = await db.select().from(teams).where(eq(teams.id, teamId));
    if (!team[0]) return null;

    const teamPlayers = await db
      .select()
      .from(players)
      .where(and(
        eq(players.teamId, teamId),
        eq(players.status, 'active')
      ))
      .orderBy(asc(players.fullName));

    return { team: team[0], players: teamPlayers };
  }

  // ========== PLAYER OPERATIONS ==========
  
  async upsertPlayer(input: NotionPlayerData & { teamId?: number | null }): Promise<Player> {
    const [player] = await db
      .insert(players)
      .values({
        fullName: input.fullName,
        dob: input.dob || null,
        jerseyNumber: input.jerseyNumber || null,
        photoUrl: input.photoUrl || null,
        teamId: input.teamId || null,
        status: input.status || 'active',
        claimState: 'unclaimed', // Don't overwrite existing claim state
        guardianEmail: input.guardianEmail || null,
        guardianPhone: input.guardianPhone || null,
        notionId: input.notionId
      })
      .onConflictDoUpdate({
        target: [players.notionId],
        set: {
          fullName: input.fullName,
          dob: input.dob || null,
          jerseyNumber: input.jerseyNumber || null,
          photoUrl: input.photoUrl || null,
          teamId: input.teamId || null,
          status: input.status || 'active',
          guardianEmail: input.guardianEmail || null,
          guardianPhone: input.guardianPhone || null,
          updatedAt: new Date(),
        }
      })
      .returning();
    
    return player;
  }

  async markPlayersInactiveByMissingNotionIds(activeNotionIds: string[]): Promise<void> {
    if (activeNotionIds.length === 0) return;
    
    await db
      .update(players)
      .set({ status: 'inactive', updatedAt: new Date() })
      .where(
        and(
          sql`notion_id NOT IN (${activeNotionIds.map(id => `'${id}'`).join(',')})`,
          eq(players.status, 'active')
        )
      );
  }

  async searchPlayersByName(query: string, limit = 50): Promise<Array<Player & { teamName?: string }>> {
    if (!query || query.length < 2) return [];

    const searchTerm = `%${query.toLowerCase()}%`;
    
    const results = await db
      .select({
        id: players.id,
        fullName: players.fullName,
        photoUrl: players.photoUrl,
        jerseyNumber: players.jerseyNumber,
        teamId: players.teamId,
        status: players.status,
        claimState: players.claimState,
        dob: players.dob,
        guardianEmail: players.guardianEmail,
        guardianPhone: players.guardianPhone,
        notionId: players.notionId,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
        teamName: teams.name
      })
      .from(players)
      .leftJoin(teams, eq(players.teamId, teams.id))
      .where(
        and(
          like(sql`lower(${players.fullName})`, searchTerm),
          eq(players.status, 'active')
        )
      )
      .orderBy(asc(players.fullName))
      .limit(limit);

    return results.map(r => ({ ...r, teamName: r.teamName || undefined }));
  }

  async getPlayerById(id: string): Promise<Player | undefined> {
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.id, id));
    return player;
  }

  async getPlayerByNotionId(notionId: string): Promise<Player | undefined> {
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.notionId, notionId));
    return player;
  }

  // ========== GUARDIAN OPERATIONS ==========
  
  async linkGuardian(input: { 
    playerId: string; 
    accountId: string; 
    relationship?: string; 
    isPrimary?: boolean 
  }): Promise<void> {
    // Insert guardian relationship
    await db
      .insert(guardians)
      .values({
        playerId: input.playerId,
        accountId: input.accountId,
        relationship: (input.relationship as any) || 'parent',
        isPrimary: input.isPrimary ?? true
      })
      .onConflictDoUpdate({
        target: [guardians.playerId, guardians.accountId],
        set: {
          relationship: (input.relationship as any) || 'parent',
          isPrimary: input.isPrimary ?? true
        }
      });

    // Update player claim state
    await db
      .update(players)
      .set({ 
        claimState: 'claimed',
        updatedAt: new Date()
      })
      .where(eq(players.id, input.playerId));
  }

  async getPlayerGuardians(playerId: string): Promise<Array<Guardian & { accountEmail?: string; accountName?: string }>> {
    const results = await db
      .select({
        playerId: guardians.playerId,
        accountId: guardians.accountId,
        relationship: guardians.relationship,
        isPrimary: guardians.isPrimary,
        createdAt: guardians.createdAt,
        accountEmail: users.email,
        accountName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`
      })
      .from(guardians)
      .leftJoin(users, eq(guardians.accountId, users.id))
      .where(eq(guardians.playerId, playerId));
      
    return results.map(r => ({ ...r, accountEmail: r.accountEmail || undefined, accountName: r.accountName || undefined }));
  }

  async getGuardianPlayers(accountId: string): Promise<Array<Player & { teamName?: string }>> {
    const results = await db
      .select({
        id: players.id,
        fullName: players.fullName,
        photoUrl: players.photoUrl,
        jerseyNumber: players.jerseyNumber,
        teamId: players.teamId,
        status: players.status,
        claimState: players.claimState,
        dob: players.dob,
        guardianEmail: players.guardianEmail,
        guardianPhone: players.guardianPhone,
        notionId: players.notionId,
        createdAt: players.createdAt,
        updatedAt: players.updatedAt,
        teamName: teams.name
      })
      .from(players)
      .innerJoin(guardians, eq(players.id, guardians.playerId))
      .leftJoin(teams, eq(players.teamId, teams.id))
      .where(eq(guardians.accountId, accountId))
      .orderBy(asc(players.fullName));
      
    return results.map(r => ({ ...r, teamName: r.teamName || undefined }));
  }

  // ========== CLAIM CODE OPERATIONS ==========
  
  async upsertClaimCode(input: { 
    playerId: string; 
    contact: string; 
    code: string; 
    ttlSeconds: number 
  }): Promise<void> {
    const expiresAt = new Date(Date.now() + input.ttlSeconds * 1000);
    
    await db
      .insert(claimCodes)
      .values({
        playerId: input.playerId,
        contact: input.contact,
        code: input.code,
        expiresAt,
        attempts: 0
      })
      .onConflictDoUpdate({
        target: [claimCodes.playerId, claimCodes.contact],
        set: {
          code: input.code,
          expiresAt,
          attempts: 0,
          createdAt: new Date()
        }
      });
  }

  async verifyClaimCode(input: { 
    playerId: string; 
    contact: string; 
    code: string 
  }): Promise<{ success: boolean; reason?: string }> {
    const [claimCode] = await db
      .select()
      .from(claimCodes)
      .where(
        and(
          eq(claimCodes.playerId, input.playerId),
          eq(claimCodes.contact, input.contact)
        )
      );

    if (!claimCode) {
      return { success: false, reason: 'no_code' };
    }

    if (new Date() > claimCode.expiresAt) {
      return { success: false, reason: 'expired' };
    }

    if (claimCode.code !== input.code) {
      // Increment attempts
      await db
        .update(claimCodes)
        .set({ attempts: (claimCode.attempts || 0) + 1 })
        .where(
          and(
            eq(claimCodes.playerId, input.playerId),
            eq(claimCodes.contact, input.contact)
          )
        );
      return { success: false, reason: 'mismatch' };
    }

    // Valid code - delete it
    await db
      .delete(claimCodes)
      .where(
        and(
          eq(claimCodes.playerId, input.playerId),
          eq(claimCodes.contact, input.contact)
        )
      );

    return { success: true };
  }

  // ========== APPROVAL OPERATIONS ==========
  
  async createApproval(input: { playerId: string; accountId: string }): Promise<Approval> {
    const [approval] = await db
      .insert(approvals)
      .values({
        playerId: input.playerId,
        accountId: input.accountId,
        type: 'claim',
        status: 'pending'
      })
      .returning();
    
    return approval;
  }

  async getApprovalById(id: string): Promise<Approval | undefined> {
    const [approval] = await db
      .select()
      .from(approvals)
      .where(eq(approvals.id, id));
    return approval;
  }

  async getPendingApprovals(): Promise<Array<Approval & { 
    playerName?: string; 
    accountEmail?: string 
  }>> {
    const results = await db
      .select({
        id: approvals.id,
        playerId: approvals.playerId,
        accountId: approvals.accountId,
        type: approvals.type,
        status: approvals.status,
        createdAt: approvals.createdAt,
        resolvedAt: approvals.resolvedAt,
        playerName: players.fullName,
        accountEmail: users.email
      })
      .from(approvals)
      .leftJoin(players, eq(approvals.playerId, players.id))
      .leftJoin(users, eq(approvals.accountId, users.id))
      .where(eq(approvals.status, 'pending'))
      .orderBy(desc(approvals.createdAt));
      
    return results.map(r => ({ ...r, playerName: r.playerName || undefined, accountEmail: r.accountEmail || undefined }));
  }

  // ========== SYNC OPERATIONS ==========
  
  async syncNotionData(notionPlayers: NotionPlayerData[], notionTeams: NotionTeamData[]): Promise<{
    playersUpserted: number;
    teamsUpserted: number;
    playersMarkedInactive: number;
  }> {
    let playersUpserted = 0;
    let teamsUpserted = 0;

    // First, sync teams
    const teamIdMap = new Map<string, number>();
    for (const notionTeam of notionTeams) {
      const team = await this.upsertTeam(notionTeam);
      teamIdMap.set(notionTeam.notionId, team.id);
      teamsUpserted++;
    }

    // Then sync players with team relationships
    const activeNotionIds: string[] = [];
    for (const notionPlayer of notionPlayers) {
      const teamId = notionPlayer.teamRelationId 
        ? teamIdMap.get(notionPlayer.teamRelationId) 
        : null;
      
      await this.upsertPlayer({
        ...notionPlayer,
        teamId
      });
      
      activeNotionIds.push(notionPlayer.notionId);
      playersUpserted++;
    }

    // Mark inactive players
    await this.markPlayersInactiveByMissingNotionIds(activeNotionIds);
    
    // Count how many were marked inactive (approximate)
    const playersMarkedInactive = 0; // Could implement proper counting if needed

    return {
      playersUpserted,
      teamsUpserted,
      playersMarkedInactive
    };
  }
}

// Singleton instance
export const claimRepo = new ClaimRepository();