import type { Express } from "express";
import { z } from "zod";
import { isAuthenticated } from "../replitAuth";
import { claimRepo } from "../lib/claim-repository";
import { emailService, smsService, generateVerificationCode, getDevModeCode } from "../lib/email-service";
import { fetchNotionData } from "../lib/notion-adapter";

// Rate limiting store (in-memory for simplicity)
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();
const RATE_LIMIT_WINDOW = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

// Validation schemas
const searchPlayerSchema = z.object({
  search: z.string().min(2).max(100),
  limit: z.number().optional().default(50)
});

const claimRequestSchema = z.object({
  playerId: z.string().uuid(),
  contact: z.string().email().or(z.string().min(10)) // email or phone
});

const verifyClaimSchema = z.object({
  playerId: z.string().uuid(),
  contact: z.string(),
  code: z.string().length(6)
});

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record) {
    rateLimitStore.set(key, { attempts: 1, lastAttempt: now });
    return true;
  }
  
  // Reset if window expired
  if (now - record.lastAttempt > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(key, { attempts: 1, lastAttempt: now });
    return true;
  }
  
  // Check if exceeded
  if (record.attempts >= MAX_ATTEMPTS) {
    return false;
  }
  
  // Increment attempts
  record.attempts++;
  record.lastAttempt = now;
  return true;
}

export function registerClaimRoutes(app: Express): void {
  
  // ========== SEARCH PLAYERS ==========
  app.get('/api/players/search', isAuthenticated, async (req: any, res) => {
    try {
      const { search, limit } = searchPlayerSchema.parse(req.query);
      
      const players = await claimRepo.searchPlayersByName(search, limit);
      
      // Return limited info for unclaimed players only (privacy protection)
      const publicPlayers = players
        .filter(p => p.claimState === 'unclaimed')
        .map(p => ({
          id: p.id,
          fullName: p.fullName,
          teamName: p.teamName,
          jerseyNumber: p.jerseyNumber,
          photoUrl: p.photoUrl, // Only include if it's not sensitive
        }));

      res.json(publicPlayers);
    } catch (error) {
      console.error('Error searching players:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid search parameters', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to search players' });
    }
  });

  // ========== REQUEST CLAIM CODE ==========
  app.post('/api/players/claim/request', isAuthenticated, async (req: any, res) => {
    try {
      const { playerId, contact } = claimRequestSchema.parse(req.body);
      const accountId = req.user.claims.sub;
      
      // Rate limiting
      const rateLimitKey = `${playerId}:${contact}`;
      if (!checkRateLimit(rateLimitKey)) {
        return res.status(429).json({ 
          message: 'Too many attempts. Please wait 5 minutes before trying again.' 
        });
      }
      
      // Get player details
      const player = await claimRepo.getPlayerById(playerId);
      if (!player) {
        return res.status(404).json({ message: 'Player not found' });
      }
      
      if (player.claimState === 'claimed') {
        return res.status(400).json({ message: 'Player has already been claimed' });
      }
      
      if (player.claimState === 'locked') {
        return res.status(400).json({ message: 'Player claiming is currently locked' });
      }

      // Check if contact matches guardian info on file
      const isValidContact = (
        (contact === player.guardianEmail) || 
        (contact === player.guardianPhone)
      );

      if (!isValidContact) {
        // Create approval request as fallback
        const approval = await claimRepo.createApproval({
          playerId,
          accountId
        });
        
        return res.json({
          success: true,
          type: 'approval',
          approvalId: approval.id,
          message: 'Contact info not on file. A coach approval request has been created.'
        });
      }

      // Generate and send verification code
      const code = generateVerificationCode();
      const ttlSeconds = 10 * 60; // 10 minutes
      
      await claimRepo.upsertClaimCode({
        playerId,
        contact,
        code,
        ttlSeconds
      });

      // Send code via email or SMS
      if (contact.includes('@')) {
        await emailService.sendVerificationCode(contact, code, player.fullName);
      } else {
        await smsService.sendVerificationCode(contact, code, player.fullName);
      }

      // Include dev mode code in response for testing
      const devCode = getDevModeCode();
      
      res.json({
        success: true,
        type: 'verification',
        message: `Verification code sent to ${contact}`,
        ...(devCode && { devCode }) // Only include in console mode
      });

    } catch (error) {
      console.error('Error requesting claim code:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to send verification code' });
    }
  });

  // ========== VERIFY CLAIM CODE ==========
  app.post('/api/players/claim/verify', isAuthenticated, async (req: any, res) => {
    try {
      const { playerId, contact, code } = verifyClaimSchema.parse(req.body);
      const accountId = req.user.claims.sub;
      
      // Verify the claim code
      const verification = await claimRepo.verifyClaimCode({
        playerId,
        contact,
        code
      });

      if (!verification.success) {
        const errorMessages = {
          no_code: 'No verification code found',
          expired: 'Verification code has expired',
          mismatch: 'Invalid verification code'
        };
        
        return res.status(400).json({ 
          message: errorMessages[verification.reason as keyof typeof errorMessages] || 'Verification failed'
        });
      }

      // Link guardian to player
      await claimRepo.linkGuardian({
        playerId,
        accountId,
        relationship: 'parent', // Default relationship
        isPrimary: true
      });

      // Get updated player info
      const player = await claimRepo.getPlayerById(playerId);
      
      res.json({
        success: true,
        message: `Successfully claimed ${player?.fullName}`,
        player: {
          id: player?.id,
          fullName: player?.fullName,
          teamId: player?.teamId,
          jerseyNumber: player?.jerseyNumber,
          photoUrl: player?.photoUrl,
        }
      });

    } catch (error) {
      console.error('Error verifying claim code:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Invalid verification data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to verify claim' });
    }
  });

  // ========== GET USER'S CLAIMED PLAYERS ==========
  app.get('/api/users/:userId/players', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const currentUserId = req.user.claims.sub;
      
      // Ensure user can only see their own players
      if (userId !== currentUserId) {
        return res.status(403).json({ message: 'Access denied' });
      }
      
      const players = await claimRepo.getGuardianPlayers(userId);
      res.json(players);
    } catch (error) {
      console.error('Error fetching user players:', error);
      res.status(500).json({ message: 'Failed to fetch players' });
    }
  });

  // ========== GET TEAM DETAILS WITH ROSTER ==========
  app.get('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const teamId = parseInt(req.params.id);
      
      const teamData = await claimRepo.getTeamWithPlayers(teamId);
      if (!teamData) {
        return res.status(404).json({ message: 'Team not found' });
      }
      
      // Return public info only for roster (protect privacy)
      const publicRoster = teamData.players.map(p => ({
        id: p.id,
        fullName: p.fullName,
        jerseyNumber: p.jerseyNumber,
        photoUrl: p.photoUrl
      }));
      
      res.json({
        ...teamData.team,
        players: publicRoster
      });
    } catch (error) {
      console.error('Error fetching team:', error);
      res.status(500).json({ message: 'Failed to fetch team' });
    }
  });

  // ========== GET ALL TEAMS ==========
  app.get('/api/teams', isAuthenticated, async (req: any, res) => {
    try {
      const teams = await claimRepo.getAllTeams();
      res.json(teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
      res.status(500).json({ message: 'Failed to fetch teams' });
    }
  });

  // ========== ADMIN: GET PENDING APPROVALS ==========
  app.get('/api/admin/approvals/pending', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      const approvals = await claimRepo.getPendingApprovals();
      res.json(approvals);
    } catch (error) {
      console.error('Error fetching pending approvals:', error);
      res.status(500).json({ message: 'Failed to fetch approvals' });
    }
  });

  // ========== SYNC NOTION DATA ==========
  app.post('/api/sync/notion', isAuthenticated, async (req: any, res) => {
    try {
      // TODO: Add admin role check
      console.log('Starting Notion sync...');
      
      const { players, teams } = await fetchNotionData();
      const syncResult = await claimRepo.syncNotionData(players, teams);
      
      console.log('Notion sync completed:', syncResult);
      
      res.json({
        success: true,
        ...syncResult,
        message: `Synced ${syncResult.playersUpserted} players and ${syncResult.teamsUpserted} teams`
      });
    } catch (error) {
      console.error('Error syncing Notion data:', error);
      res.status(500).json({ message: 'Failed to sync Notion data' });
    }
  });
}

export default registerClaimRoutes;