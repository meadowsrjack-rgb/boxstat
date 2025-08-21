import { Router } from "express";

// Minimal calendar router to unblock server start.
// Replace with real Google Calendar sync later.
const router = Router();

router.get("/health", (_req, res) => {
  res.json({ ok: true, route: "calendar" });
});

router.post("/sync", (_req, res) => {
  // TODO: wire real sync if needed
  res.status(501).json({ ok: false, message: "Calendar sync not configured" });
});

router.post("/scheduled-sync", (_req, res) => {
  res.json({ ok: true, message: "Scheduled calendar sync (stub)" });
});

export default router;
