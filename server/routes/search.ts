import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";
import { notionService } from "../notion";

const router = Router();

router.get("/players", isAuthenticated, async (req: any, res) => {
  const q = (req.query.q as string || "").trim();
  const accountId = req.user?.claims?.sub as string | undefined;
  const viewerTeams = await getViewerTeamIds(accountId);

  const params: any[] = [];
  let where = "p.profile_type='player'";
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (LOWER(p.first_name||' '||p.last_name) LIKE LOWER($${params.length}))`;
  }
  const sql = `
    SELECT p.id, p.first_name, p.last_name, p.team_id, p.profile_image_url,
           COALESCE(pp.settings, '{}'::jsonb) AS settings
    FROM profiles p
    LEFT JOIN profile_privacy pp ON pp.profile_id = p.id
    WHERE ${where}
    ORDER BY p.first_name NULLS LAST, p.last_name NULLS LAST
    LIMIT 50;
  `;
  const r = await pool.query(sql, params);
  const rows = r.rows.map(row => {
    const s = row.settings || {};
    const vis = (field: string) => (s[field] ?? "public");
    const canSeeTeamOnly = viewerTeams?.length > 0;
    const mask = (field: string, value: any) => {
      const level = vis(field);
      if (level === "public") return value;
      if (level === "team") return canSeeTeamOnly ? value : null;
      return null; // private
    };
    return {
      id: row.id,
      first_name: mask("first_name", row.first_name) ?? "🔒",
      last_name: mask("last_name", row.last_name) ?? "",
      profile_image_url: mask("profile_image_url", row.profile_image_url),
      team_id: row.team_id,
      badges_public: vis("badges") !== "private",
      trophies_public: vis("trophies") !== "private",
      skills_public: vis("skills") !== "private",
    };
  });
  res.json({ ok: true, players: rows });
});

router.get("/teams", isAuthenticated, async (req: any, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    
    try {
      const allTeams = notionService.getAllTeams();
      console.log(`Searching teams with query: "${q}"`);
      console.log(`Available teams: ${allTeams.map(t => t.name).join(', ')}`);
      
      const teams = notionService.searchTeams(q);
      console.log(`Found ${teams.length} matching teams:`, teams.map(t => t.name));
      
      res.json({ ok: true, teams: teams.map(team => ({
        id: team.slug,
        name: team.name,
        roster_count: team.roster.length,
        roster: team.roster.map(p => ({
          name: p.name,
          id: p.id
        }))
      })) });
    } catch (notionError: any) {
      console.error("Notion search failed:", notionError.message);
      
      // No fallback - only return real Notion data
      res.json({ 
        ok: false, 
        error: "Unable to load team data. Please ensure Notion integration is properly configured.",
        teams: []
      });
    }
  } catch (error) {
    console.error("Error searching teams:", error);
    res.status(500).json({ ok: false, error: "Failed to search teams" });
  }
});

router.get("/teams/:teamId", isAuthenticated, async (req: any, res) => {
  try {
    const teamId = req.params.teamId;
    const team = notionService.getTeam(teamId);
    if (!team) {
      return res.status(404).json({ ok: false, error: "Team not found" });
    }
    res.json({ 
      ok: true, 
      roster: team.roster.map(p => ({
        name: p.name,
        id: p.id,
        position: 'Player',
        jersey: ''
      })),
      roster_count: team.roster.length 
    });
  } catch (error) {
    console.error("Error getting team details:", error);
    res.status(500).json({ ok: false, error: "Failed to get team details" });
  }
});

router.post("/teams/:teamId/request-join", isAuthenticated, async (req: any, res) => {
  const accountId = req.user?.claims?.sub as string;
  const teamId = parseInt(req.params.teamId, 10);
  const message = (req.body?.message as string | undefined) || null;

  if (!accountId || !teamId) return res.status(400).json({ ok: false, error: "Missing account/team" });
  const prof = await pool.query(`SELECT id FROM profiles WHERE account_id=$1 LIMIT 1`, [accountId]);
  if (!prof.rowCount) return res.status(400).json({ ok: false, error: "Create your player profile first" });
  const profileId = prof.rows[0].id;

  await pool.query(
    `INSERT INTO team_join_requests (profile_id, team_id, message, status, created_at)
     VALUES ($1,$2,$3,'pending',now())`,
    [profileId, teamId, message]
  );

  res.json({ ok: true });
});

// Search Notion players with rich data (name, team, program)
router.get("/notion-players", isAuthenticated, async (req: any, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    
    if (!q || q.length < 2) {
      return res.json({ ok: true, players: [] });
    }

    try {
      const players = notionService.searchPlayers(q);
      res.json({ 
        ok: true, 
        players: players.map(player => ({
          id: player.id,
          fullName: player.name,
          team: player.team,
          currentProgram: player.currentProgram,
          profileUrl: player.profileUrl,
          displayText: `${player.name}${player.team ? `, ${player.team}` : ''}${player.currentProgram ? ` (${player.currentProgram})` : ''}`
        }))
      });
    } catch (notionError: any) {
      console.error("Notion player search failed:", notionError.message);
      res.json({ 
        ok: false, 
        error: "Unable to load player data. Please ensure Notion integration is properly configured.",
        players: []
      });
    }
  } catch (error) {
    console.error("Error searching Notion players:", error);
    res.status(500).json({ ok: false, error: "Failed to search players" });
  }
});

async function getViewerTeamIds(accountId?: string): Promise<number[]> {
  if (!accountId) return [];
  const r = await pool.query(`SELECT DISTINCT team_id FROM profiles WHERE account_id=$1 AND team_id IS NOT NULL`, [accountId]);
  return r.rows.map((x: any) => x.team_id);
}

export default router;