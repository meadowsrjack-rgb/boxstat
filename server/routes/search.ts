
import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";

type PrivacyLevel = 'public' | 'team-only' | 'private';

type PrivacySettings = {
  searchable?: boolean;
  fields?: {
    name?: PrivacyLevel;
    image?: PrivacyLevel;
    trophies?: PrivacyLevel;
    badges?: PrivacyLevel;
    skills?: PrivacyLevel;
    profileInfo?: PrivacyLevel;
  };
};

function canShow(level: PrivacyLevel | undefined, viewerTeams: number[] | null): boolean {
  if (!level || level === 'public') return true;
  if (level === 'private') return false;
  // team-only
  return !!(viewerTeams && viewerTeams.length);
}

async function getViewerTeamIds(accountId?: string): Promise<number[]> {
  if (!accountId) return [];
  const { rows } = await pool.query(
    `SELECT DISTINCT team_id FROM profiles WHERE account_id = (SELECT account_id FROM profiles WHERE id = $1) AND team_id IS NOT NULL`,
    [accountId]
  );
  return rows.map(r => r.team_id);
}

const router = Router();

// Search players
router.get('/players', isAuthenticated, async (req: any, res) => {
  const q = (req.query.q as string || '').trim();
  const accountId = req.user?.claims?.sub as string | undefined;
  const viewerTeams = await getViewerTeamIds(accountId);

  const { rows } = await pool.query(
    `SELECT p.id, p.first_name, p.last_name, p.profile_image_url, p.team_id,
            t.name as team_name, t.age_group, t.color,
            COALESCE(pp.settings, '{}'::jsonb) as privacy
     FROM profiles p
     LEFT JOIN teams t ON t.id = p.team_id
     LEFT JOIN profile_privacy pp ON pp.profile_id = p.id
     WHERE p.profile_type = 'player'
       AND ($1 = '' OR (p.first_name || ' ' || p.last_name) ILIKE '%' || $1 || '%')
     ORDER BY p.first_name ASC
     LIMIT 50`,
    [q]
  );

  const result = rows.map(r => {
    const settings = (r.privacy || {}) as PrivacySettings;
    const fields = settings.fields || {};
    const searchable = settings.searchable !== false;
    if (!searchable && q) return null;

    const showName = canShow(fields.name || 'public', viewerTeams);
    const showImage = canShow(fields.image || 'public', viewerTeams);
    const showProfile = canShow(fields.profileInfo || 'public', viewerTeams);

    return {
      id: r.id,
      name: showName ? `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() : null,
      profileImageUrl: showImage ? r.profile_image_url : null,
      team: {
        id: r.team_id,
        name: r.team_name
      },
      profileVisible: showProfile,
      // placeholders for badge/trophy/skills privacy
      badgesVisible: canShow(fields.badges || 'public', viewerTeams),
      trophiesVisible: canShow(fields.trophies || 'public', viewerTeams),
      skillsVisible: canShow(fields.skills || 'team-only', viewerTeams),
    };
  }).filter(Boolean);

  res.json({ players: result });
});

// Search teams
router.get('/teams', isAuthenticated, async (req: any, res) => {
  const q = (req.query.q as string || '').trim();
  const { rows } = await pool.query(
    `SELECT t.id, t.name, t.age_group, t.color,
            (SELECT COUNT(*) FROM profiles p WHERE p.team_id = t.id AND p.profile_type = 'player') as roster_count,
            (SELECT CONCAT(u.first_name, ' ', u.last_name) FROM users u WHERE u.id = t.coach_id) as coach_name
     FROM teams t
     WHERE $1 = '' OR t.name ILIKE '%' || $1 || '%'
     ORDER BY t.name ASC
     LIMIT 50`,
    [q]
  );
  res.json({ teams: rows });
});

// Request to join a team
router.post('/teams/:teamId/request-join', isAuthenticated, async (req: any, res) => {
  try {
    const teamId = parseInt(req.params.teamId, 10);
    const accountId = req.user?.claims?.sub;
    const message = req.body?.message ?? null;
    if (!teamId || !accountId) return res.status(400).json({ ok: false, error: 'Missing teamId/accountId' });

    await pool.query(
      `INSERT INTO team_join_requests (profile_id, team_id, message, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (profile_id, team_id, status) DO NOTHING`,
      [(await (await pool.query(`SELECT id FROM profiles WHERE account_id=$1 LIMIT 1`, [accountId])).rows[0]?.id), teamId, message]
    );
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'Unknown error' });
  }
});

// Get team snapshot (roster + coach)
router.get('/teams/:teamId', isAuthenticated, async (req: any, res) => {
  const teamId = parseInt(req.params.teamId, 10);
  const teamRes = await pool.query(`SELECT id, name, age_group, color, coach_id FROM teams WHERE id=$1`, [teamId]);
  if (!teamRes.rowCount) return res.status(404).json({ ok: false, error: 'Team not found' });

  const team = teamRes.rows[0];
  const roster = await pool.query(
    `SELECT id, first_name, last_name, profile_image_url FROM profiles WHERE team_id=$1 AND profile_type='player' ORDER BY first_name ASC`,
    [teamId]
  );
  let coachName: string | null = null;
  if (team.coach_id) {
    const c = await pool.query(`SELECT first_name, last_name FROM users WHERE id=$1`, [team.coach_id]);
    if (c.rowCount) coachName = `${c.rows[0].first_name ?? ''} ${c.rows[0].last_name ?? ''}`.trim();
  }
  res.json({ ok: true, team: { id: team.id, name: team.name, ageGroup: team.age_group, color: team.color, coachName }, roster: roster.rows });
});

export default router;
