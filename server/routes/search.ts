import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";
import { notionService } from "../notion";

const router = Router();

router.get("/players", isAuthenticated, async (req: any, res) => {
  const q = (req.query.q as string || "").trim();

  const params: any[] = [];
  let where = "u.role='player' AND u.verified=TRUE";
  
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (LOWER(u.first_name||' '||u.last_name) LIKE LOWER($${params.length}))`;
  }
  
  const sql = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.team_id, u.profile_image_url,
           u.date_of_birth, u.phone_number, u.emergency_contact, u.emergency_phone,
           u.address, u.medical_info, u.allergies, u.jersey_number, u.position,
           u.school_grade, u.team_name, u.city, u.height, u.package_selected,
           u.payment_status
    FROM users u
    WHERE ${where}
    ORDER BY u.first_name NULLS LAST, u.last_name NULLS LAST
    LIMIT 50;
  `;
  
  const r = await pool.query(sql, params);
  const rows = r.rows.map(row => {
    // Calculate age from date of birth
    const age = row.date_of_birth ? 
      new Date().getFullYear() - new Date(row.date_of_birth).getFullYear() : undefined;
    
    return {
      id: row.id,
      first_name: row.first_name || "",
      last_name: row.last_name || "",
      profile_image_url: row.profile_image_url,
      team_id: row.team_id,
      team_name: row.team_name,
      age: age,
      date_of_birth: row.date_of_birth,
      payment_status: row.payment_status,
      parent_name: row.emergency_contact,
      parent_email: row.email,
      account_email: row.email,
      phone_number: row.phone_number,
      emergency_contact: row.emergency_contact,
      emergency_phone: row.emergency_phone,
      grade: row.school_grade,
      school_grade: row.school_grade,
      session: row.package_selected || 'Youth Basketball',
      position: row.position,
      jersey_number: row.jersey_number,
      address: row.address,
      city: row.city,
      height: row.height,
      medical_info: row.medical_info,
      allergies: row.allergies,
      badges_public: true,
      trophies_public: true,
      skills_public: true,
    };
  });
  res.json({ ok: true, players: rows });
});

router.get("/teams", isAuthenticated, async (req: any, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    
    const params: any[] = [];
    let where = "1=1";
    
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (LOWER(t.name) LIKE LOWER($${params.length}))`;
    }
    
    const sql = `
      SELECT t.id, t.name, t.age_group, t.color, t.coach_id,
             COUNT(u.id) as roster_count
      FROM teams t
      LEFT JOIN users u ON u.team_id = t.id AND u.role = 'player'
      WHERE ${where}
      GROUP BY t.id, t.name, t.age_group, t.color, t.coach_id
      ORDER BY t.name
      LIMIT 50;
    `;
    
    const r = await pool.query(sql, params);
    
    // For each team, get the roster
    const teamsWithRoster = await Promise.all(r.rows.map(async (team) => {
      const rosterSql = `
        SELECT id, first_name, last_name, jersey_number, position
        FROM users
        WHERE team_id = $1 AND role = 'player'
        ORDER BY last_name, first_name;
      `;
      const rosterResult = await pool.query(rosterSql, [team.id]);
      
      return {
        id: team.id.toString(),
        name: team.name,
        age_group: team.age_group,
        color: team.color,
        roster_count: parseInt(team.roster_count) || 0,
        roster: rosterResult.rows.map(p => ({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`.trim(),
          jersey: p.jersey_number?.toString() || '',
          position: p.position || 'Player'
        }))
      };
    }));
    
    console.log(`Found ${teamsWithRoster.length} teams with query: "${q}"`);
    res.json({ ok: true, teams: teamsWithRoster });
  } catch (error) {
    console.error("Error searching teams:", error);
    res.status(500).json({ ok: false, error: "Failed to search teams" });
  }
});

router.get("/teams/:teamId", isAuthenticated, async (req: any, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    
    // Get team info
    const teamResult = await pool.query(
      `SELECT id, name, age_group, color FROM teams WHERE id = $1`,
      [teamId]
    );
    
    if (teamResult.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Team not found" });
    }
    
    const team = teamResult.rows[0];
    
    // Get roster
    const rosterResult = await pool.query(
      `SELECT id, first_name, last_name, jersey_number, position
       FROM users
       WHERE team_id = $1 AND role = 'player'
       ORDER BY last_name, first_name`,
      [teamId]
    );
    
    res.json({ 
      ok: true,
      team: {
        id: team.id,
        name: team.name,
        age_group: team.age_group,
        color: team.color
      },
      roster: rosterResult.rows.map((p: any) => ({
        name: `${p.first_name} ${p.last_name}`.trim(),
        id: p.id,
        position: p.position || 'Player',
        jersey: p.jersey_number?.toString() || ''
      })),
      roster_count: rosterResult.rowCount || 0
    });
  } catch (error) {
    console.error("Error getting team details:", error);
    res.status(500).json({ ok: false, error: "Failed to get team details" });
  }
});

router.post("/teams/:teamId/request-join", isAuthenticated, async (req: any, res) => {
  const userId = req.user?.id as string;
  const teamId = parseInt(req.params.teamId, 10);

  if (!userId || !teamId) return res.status(400).json({ ok: false, error: "Missing user/team" });
  
  // Verify user exists and is a player
  const user = await pool.query(`SELECT id, role FROM users WHERE id=$1 LIMIT 1`, [userId]);
  if (!user.rowCount || user.rows[0].role !== 'player') {
    return res.status(400).json({ ok: false, error: "Only players can join teams" });
  }

  // Update the user's team_id directly
  await pool.query(
    `UPDATE users SET team_id=$1, updated_at=now() WHERE id=$2`,
    [teamId, userId]
  );

  res.json({ ok: true });
});

// Search Notion players with rich data (name, team, program)
router.get("/notion-players", isAuthenticated, async (req: any, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    const team = (req.query.team as string || "").trim();
    
    console.log(`Notion player search - Query: "${q}", Team: "${team}"`);
    
    // Allow empty query to show all players for debugging
    // if (!q || q.length < 1) {
    //   return res.json({ ok: true, players: [] });
    // }

    try {
      // Search players (sync runs in background on startup)
      let players = q ? notionService.searchPlayers(q) : notionService.getAllPlayers();
      
      console.log(`Found ${players.length} players from Notion service`);
      
      // Filter by team if specified
      if (team && team !== "all") {
        players = players.filter(player => player.teamSlug === team);
        console.log(`After team filter: ${players.length} players`);
      }
      
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

async function getViewerTeamIds(userId?: string): Promise<number[]> {
  if (!userId) return [];
  const r = await pool.query(`SELECT DISTINCT team_id FROM users WHERE id=$1 AND team_id IS NOT NULL`, [userId]);
  return r.rows.map((x: any) => x.team_id);
}

export default router;