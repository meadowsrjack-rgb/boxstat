
import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";

async function isAdmin(userId: string) {
  const r = await pool.query(`SELECT user_type FROM users WHERE id=$1`, [userId]);
  return r.rowCount && r.rows[0].user_type === 'admin';
}

const router = Router();

router.get('/join-requests', isAuthenticated, async (req: any, res) => {
  const userId = req.user?.claims?.sub as string;
  if (!await isAdmin(userId)) return res.status(403).json({ ok: false, error: 'Forbidden' });

  const status = (req.query.status as string) || 'pending';
  const r = await pool.query(
    `SELECT jr.id, jr.status, jr.created_at,
            p.id as profile_id, p.first_name, p.last_name, p.profile_image_url,
            t.id as team_id, t.name as team_name
     FROM team_join_requests jr
     JOIN profiles p ON p.id = jr.profile_id
     JOIN teams t ON t.id = jr.team_id
     WHERE jr.status = $1
     ORDER BY jr.created_at ASC
     LIMIT 200`,
    [status]
  );
  res.json({ ok: true, requests: r.rows });
});

router.post('/join-requests/:id/approve', isAuthenticated, async (req: any, res) => {
  const userId = req.user?.claims?.sub as string;
  if (!await isAdmin(userId)) return res.status(403).json({ ok: false, error: 'Forbidden' });

  const id = parseInt(req.params.id, 10);
  const r = await pool.query(`SELECT profile_id, team_id FROM team_join_requests WHERE id=$1`, [id]);
  if (!r.rowCount) return res.status(404).json({ ok: false, error: 'Not found' });
  const { profile_id, team_id } = r.rows[0];

  await pool.query(`UPDATE profiles SET team_id=$1 WHERE id=$2`, [team_id, profile_id]);
  await pool.query(`UPDATE team_join_requests SET status='approved' WHERE id=$1`, [id]);

  res.json({ ok: true });
});

router.post('/join-requests/:id/reject', isAuthenticated, async (req: any, res) => {
  const userId = req.user?.claims?.sub as string;
  if (!await isAdmin(userId)) return res.status(403).json({ ok: false, error: 'Forbidden' });

  const id = parseInt(req.params.id, 10);
  const r = await pool.query(`UPDATE team_join_requests SET status='rejected' WHERE id=$1 RETURNING id`, [id]);
  if (!r.rowCount) return res.status(404).json({ ok: false, error: 'Not found' });
  res.json({ ok: true });
});

export default router;
