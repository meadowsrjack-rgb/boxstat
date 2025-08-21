
import { Router } from "express";
import { syncNotionRoster, hasNotionCreds } from "../notion";
import { isAuthenticated } from "../replitAuth";

const router = Router();

router.post("/sync", isAuthenticated, async (req, res) => {
  try {
    if (!hasNotionCreds()) {
      return res.status(400).json({ ok: false, error: "NOTION_TOKEN/NOTION_DATABASE_ID not configured" });
    }
    const result = await syncNotionRoster();
    res.json({ ok: true, ...result });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "Unknown error" });
  }
});

export default router;
