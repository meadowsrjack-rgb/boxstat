import { Router } from "express";
import { pool } from "../db";
import { isAuthenticated } from "../replitAuth";

const router = Router();

router.get("/", isAuthenticated, async (req: any, res) => {
  const accountId = req.user?.claims?.sub as string | undefined;
  if (!accountId) return res.status(401).json({ ok: false });
  const prof = await pool.query(`SELECT id FROM profiles WHERE account_id=$1 LIMIT 1`, [accountId]);
  if (!prof.rowCount) return res.json({ ok: true, settings: {}, searchable: true });
  const pid = prof.rows[0].id;
  const r = await pool.query(`SELECT settings FROM profile_privacy WHERE profile_id=$1`, [pid]);
  res.json({ ok: true, settings: r.rows[0]?.settings || {}, searchable: (r.rows[0]?.settings?.searchable ?? true) });
});

router.post("/", isAuthenticated, async (req: any, res) => {
  const accountId = req.user?.claims?.sub as string | undefined;
  if (!accountId) return res.status(401).json({ ok: false });
  const prof = await pool.query(`SELECT id FROM profiles WHERE account_id=$1 LIMIT 1`, [accountId]);
  if (!prof.rowCount) return res.status(400).json({ ok: false, error: "No profile" });
  const pid = prof.rows[0].id;
  const { settings = {} } = req.body || {};
  await pool.query(
    `INSERT INTO profile_privacy (profile_id, settings, updated_at)
     VALUES ($1, $2, now())
     ON CONFLICT (profile_id) DO UPDATE SET settings=EXCLUDED.settings, updated_at=now()`,
    [pid, settings]
  );
  res.json({ ok: true });
});

export default router;