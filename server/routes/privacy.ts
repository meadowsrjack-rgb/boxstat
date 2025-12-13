import { Router } from "express";
import { pool } from "../db";
import { requireAuth } from "../auth";

const router = Router();

router.get("/", requireAuth, async (req: any, res) => {
  const accountId = req.user?.claims?.sub as string | undefined;
  if (!accountId) return res.status(401).json({ ok: false });
  
  // Use profileId from query param or fall back to active_profile_id
  let profileId = req.query.profileId as string | undefined;
  
  if (!profileId) {
    const userResult = await pool.query(`SELECT active_profile_id FROM users WHERE id=$1`, [accountId]);
    profileId = userResult.rows[0]?.active_profile_id;
  }
  
  if (!profileId) {
    return res.json({ ok: true, settings: {}, searchable: true });
  }
  
  const r = await pool.query(`SELECT settings FROM profile_privacy WHERE profile_id=$1`, [profileId]);
  res.json({ ok: true, settings: r.rows[0]?.settings || {}, searchable: (r.rows[0]?.settings?.searchable ?? true) });
});

router.post("/", requireAuth, async (req: any, res) => {
  const accountId = req.user?.claims?.sub as string | undefined;
  console.log("POST /api/privacy - accountId:", accountId, "body:", JSON.stringify(req.body));
  
  if (!accountId) return res.status(401).json({ ok: false });
  
  // Use profileId from body or fall back to active_profile_id
  let profileId = req.body.profileId as string | undefined;
  
  if (!profileId) {
    const userResult = await pool.query(`SELECT active_profile_id FROM users WHERE id=$1`, [accountId]);
    profileId = userResult.rows[0]?.active_profile_id;
    console.log("POST /api/privacy - fell back to active_profile_id:", profileId);
  }
  
  if (!profileId) {
    console.log("POST /api/privacy - no profileId, returning 400");
    return res.status(400).json({ ok: false, error: "No profile specified" });
  }
  
  const { settings = {} } = req.body || {};
  console.log("POST /api/privacy - saving for profileId:", profileId, "settings:", JSON.stringify(settings));
  
  try {
    await pool.query(
      `INSERT INTO profile_privacy (profile_id, settings, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (profile_id) DO UPDATE SET settings=EXCLUDED.settings, updated_at=now()`,
      [profileId, settings]
    );
    console.log("POST /api/privacy - success");
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /api/privacy - error:", err);
    res.status(500).json({ ok: false, error: "Database error" });
  }
});

export default router;