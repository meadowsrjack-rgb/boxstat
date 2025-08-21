import { Router } from "express";
import { syncNotionRoster, hasNotionCreds } from "../notion";
import { isAuthenticated } from "../replitAuth";

const router = Router();

router.post("/sync", isAuthenticated, async (_req, res) => {
  try {
    if (!hasNotionCreds()) return res.status(400).json({ ok: false, error: "NOTION env not set" });
    const r = await syncNotionRoster();
    res.json({ ok: true, result: r });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "sync failed" });
  }
});

export default router;