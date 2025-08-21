import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";
import { searchNotionTeams, getNotionTeamDetails } from "../notion";

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
      const teams = await searchNotionTeams(q);
      res.json({ ok: true, teams });
    } catch (notionError: any) {
      console.log("Notion search failed, using demo teams:", notionError.message);
      
      // Demo teams data for when Notion isn't properly connected
      const demoTeams = [
        {
          id: "blazers-u12",
          name: "Blazers U12",
          roster_count: 8,
          roster: [
            { name: "Alex Johnson", position: "Guard", jersey: "5" },
            { name: "Maya Chen", position: "Forward", jersey: "12" },
            { name: "Tyler Williams", position: "Center", jersey: "23" }
          ]
        },
        {
          id: "thunder-u14",
          name: "Thunder U14", 
          roster_count: 10,
          roster: [
            { name: "Jordan Smith", position: "Point Guard", jersey: "1" },
            { name: "Emma Davis", position: "Shooting Guard", jersey: "8" },
            { name: "Carlos Rodriguez", position: "Forward", jersey: "15" }
          ]
        },
        {
          id: "hawks-u16",
          name: "Hawks U16",
          roster_count: 12,
          roster: [
            { name: "Zoe Thompson", position: "Center", jersey: "34" },
            { name: "Michael Brown", position: "Guard", jersey: "7" },
            { name: "Ava Martinez", position: "Forward", jersey: "21" }
          ]
        }
      ].filter(team => 
        !q || team.name.toLowerCase().includes(q.toLowerCase()) ||
        team.roster.some(player => player.name.toLowerCase().includes(q.toLowerCase()))
      );

      res.json({ 
        ok: true, 
        teams: demoTeams,
        note: "Demo data - share Notion database with integration for live data"
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
    const teamDetails = await getNotionTeamDetails(teamId);
    res.json({ ok: true, ...teamDetails });
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

async function getViewerTeamIds(accountId?: string): Promise<number[]> {
  if (!accountId) return [];
  const r = await pool.query(`SELECT DISTINCT team_id FROM profiles WHERE account_id=$1 AND team_id IS NOT NULL`, [accountId]);
  return r.rows.map((x: any) => x.team_id);
}

export default router;