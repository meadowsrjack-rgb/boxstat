import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";

const router = Router();

router.get("/", isAuthenticated, async (req: any, res) => {
  const accountId = req.user?.claims?.sub as string | undefined;
  if (!accountId) return res.status(401).json({ ok: false });
  
  // Get the user's active profile ID
  const userResult = await pool.query(`SELECT active_profile_id FROM users WHERE id=$1`, [accountId]);
  if (!userResult.rowCount || !userResult.rows[0].active_profile_id) {
    return res.json({ ok: true, settings: {}, searchable: true });
  }
  
  const activeProfileId = userResult.rows[0].active_profile_id;
  const r = await pool.query(`SELECT settings FROM profile_privacy WHERE profile_id=$1`, [activeProfileId]);
  res.json({ ok: true, settings: r.rows[0]?.settings || {}, searchable: (r.rows[0]?.settings?.searchable ?? true) });
});

router.post("/", isAuthenticated, async (req: any, res) => {
  const accountId = req.user?.claims?.sub as string | undefined;
  if (!accountId) return res.status(401).json({ ok: false });
  
  // Get the user's active profile ID
  const userResult = await pool.query(`SELECT active_profile_id FROM users WHERE id=$1`, [accountId]);
  if (!userResult.rowCount || !userResult.rows[0].active_profile_id) {
    return res.status(400).json({ ok: false, error: "No active profile" });
  }
  
  const activeProfileId = userResult.rows[0].active_profile_id;
  const { settings = {} } = req.body || {};
  await pool.query(
    `INSERT INTO profile_privacy (profile_id, settings, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (profile_id) DO UPDATE SET settings=EXCLUDED.settings, updated_at=now()`,
    [activeProfileId, settings]
  );
  res.json({ ok: true });
});

export default router;