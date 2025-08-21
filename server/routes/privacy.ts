
import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";

const router = Router();

router.get('/', isAuthenticated, async (req: any, res) => {
  const accountId = req.user?.claims?.sub;
  const profileId = accountId ? (await (await pool.query(`SELECT id FROM profiles WHERE account_id=$1 LIMIT 1`, [accountId])).rows[0]?.id) : null;
  if (!profileId) return res.status(401).json({ ok: false });
  const { rows } = await pool.query(`SELECT settings FROM profile_privacy WHERE profile_id=$1`, [profileId]);
  res.json({ ok: true, settings: rows[0]?.settings || {} });
});

router.post('/', isAuthenticated, async (req: any, res) => {
  const accountId = req.user?.claims?.sub;
  const profileId = accountId ? (await (await pool.query(`SELECT id FROM profiles WHERE account_id=$1 LIMIT 1`, [accountId])).rows[0]?.id) : null;
  if (!profileId) return res.status(401).json({ ok: false });
  const settings = req.body?.settings || {};
  await pool.query(
    `INSERT INTO profile_privacy (profile_id, settings) VALUES ($1, $2)
     ON CONFLICT (profile_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()`,
    [profileId, settings]
  );
  res.json({ ok: true });
});

export default router;
