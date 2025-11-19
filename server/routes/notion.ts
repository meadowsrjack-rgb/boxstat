import { Router } from "express";
import { notionService } from "../notion";
import { requireJwt } from "../auth";

const router = Router();

router.post("/sync", requireJwt, async (_req, res) => {
  try {
    if (!process.env.NOTION_API_KEY || !process.env.NOTION_DB_ID) {
      return res.status(400).json({ ok: false, error: "NOTION env not set" });
    }
    const result = await notionService.syncFromNotion();
    res.json({ 
      ok: true, 
      result: {
        players: result.players.length,
        teams: result.teams.length,
        lastSync: notionService.getLastSync()
      }
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "sync failed" });
  }
});

export default router;