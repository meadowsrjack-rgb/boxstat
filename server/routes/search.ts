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
           p.date_of_birth, p.phone_number, p.emergency_contact, p.emergency_phone,
           p.address, p.medical_info, p.allergies, p.jersey_number, p.position,
           p.school_grade, a.email as account_email, a.registration_status,
           COALESCE(pp.settings, '{}'::jsonb) AS settings
    FROM profiles p
    LEFT JOIN profile_privacy pp ON pp.profile_id = p.id
    LEFT JOIN accounts a ON a.id = p.account_id
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
    // Calculate age from date of birth
    const age = row.date_of_birth ? 
      new Date().getFullYear() - new Date(row.date_of_birth).getFullYear() : undefined;
    
    return {
      id: row.id,
      first_name: mask("first_name", row.first_name) ?? "🔒",
      last_name: mask("last_name", row.last_name) ?? "",
      profile_image_url: mask("profile_image_url", row.profile_image_url),
      team_id: row.team_id,
      age: mask("date_of_birth", age),
      date_of_birth: mask("date_of_birth", row.date_of_birth),
      registration_status: row.registration_status,
      parent_name: mask("emergency_contact", row.emergency_contact), // Use emergency contact as parent name
      parent_email: mask("email", row.account_email), // Use account email as parent contact
      account_email: mask("email", row.account_email),
      phone_number: mask("phone_number", row.phone_number),
      emergency_contact: mask("emergency_contact", row.emergency_contact),
      emergency_phone: mask("emergency_phone", row.emergency_phone),
      grade: mask("school_grade", row.school_grade),
      school_grade: mask("school_grade", row.school_grade),
      session: mask("position", row.position) || 'Youth Basketball', // Use position or default program
      position: mask("position", row.position),
      jersey_number: mask("jersey_number", row.jersey_number),
      address: mask("address", row.address),
      medical_info: mask("medical_info", row.medical_info),
      allergies: mask("allergies", row.allergies),
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
          first_name: player.name.split(' ')[0] || '',
          last_name: player.name.split(' ').slice(1).join(' ') || '',
          fullName: player.name,
          team_name: player.team,
          team_id: player.teamSlug ? player.teamSlug : undefined,
          age: undefined, // Not available in current NotionPlayer type
          date_of_birth: undefined, // Not available in current NotionPlayer type
          registration_status: player.status, // Using status field
          parent_name: undefined, // Not available in current NotionPlayer type
          parent_email: undefined, // Not available in current NotionPlayer type
          account_email: undefined, // Not available in current NotionPlayer type
          phone_number: undefined, // Not available in current NotionPlayer type
          emergency_contact: undefined, // Not available in current NotionPlayer type
          emergency_phone: undefined, // Not available in current NotionPlayer type
          grade: player.grade,
          school_grade: player.grade,
          session: player.currentProgram,
          position: undefined, // Not available in current NotionPlayer type
          jersey_number: undefined, // Not available in current NotionPlayer type
          address: undefined, // Not available in current NotionPlayer type
          medical_info: undefined, // Not available in current NotionPlayer type
          allergies: undefined, // Not available in current NotionPlayer type
          profile_image_url: undefined, // Not available in current NotionPlayer type
          currentProgram: player.currentProgram,
          profileUrl: player.profileUrl,
          badges_public: true,
          trophies_public: true,
          skills_public: true,
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