import type { Express } from "express";
import { z } from "zod";
import {
  storePendingClaim,
  consumePendingClaimByCode,
  peekPendingClaimByEmail,
} from "../lib/pending-claim-store";

const handoffBodySchema = z.object({
  email: z.string().email(),
  organizationId: z.string().min(1).max(128).optional().nullable(),
  accountId: z.string().min(1).max(128).optional().nullable(),
});

// Lightweight per-IP rate limiter for the unauthenticated by-email lookup so
// the endpoint can't be used to enumerate which emails recently went through
// the claim flow. The TTL on the underlying store is already short (10 min);
// this just blunts brute-force probing.
const PENDING_BY_EMAIL_WINDOW_MS = 60_000;
const PENDING_BY_EMAIL_MAX = 10;
const pendingByEmailHits = new Map<string, { count: number; windowStart: number }>();
function pendingByEmailRateLimited(ip: string): boolean {
  const now = Date.now();
  const rec = pendingByEmailHits.get(ip);
  if (!rec || now - rec.windowStart > PENDING_BY_EMAIL_WINDOW_MS) {
    pendingByEmailHits.set(ip, { count: 1, windowStart: now });
    return false;
  }
  rec.count += 1;
  return rec.count > PENDING_BY_EMAIL_MAX;
}

export function registerClaimHandoffRoutes(app: Express): void {
  // Mint a short handoff code for a verified pending claim. Called by the web
  // /claim-verify page after /api/auth/verify-claim/:token succeeds. The
  // returned code is then passed to the native app via the boxstat:// custom
  // scheme so the URL stays short and survives the iOS handoff.
  app.post("/api/auth/claim/handoff", async (req, res) => {
    try {
      const parsed = handoffBodySchema.parse(req.body);
      const { code, record } = storePendingClaim({
        email: parsed.email,
        organizationId: parsed.organizationId ?? null,
        accountId: parsed.accountId ?? null,
      });
      console.log(
        `[ClaimResume] handoff minted code=${code} email=${record.email} org=${record.organizationId ?? "-"}`,
      );
      res.json({ success: true, handoffCode: code, expiresInMs: 10 * 60 * 1000 });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid handoff payload", errors: error.errors });
      }
      console.error("[ClaimResume] handoff mint error", error);
      res.status(500).json({ success: false, message: "Could not record pending claim." });
    }
  });

  // Single-use lookup by handoff code. Deleted on read.
  app.get("/api/auth/claim/pending", async (req, res) => {
    const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
    if (!code) {
      return res.status(400).json({ success: false, message: "Missing code" });
    }
    const record = consumePendingClaimByCode(code);
    if (!record) {
      console.log(`[ClaimResume] pending lookup MISS code=${code}`);
      return res.status(404).json({ success: false, message: "No pending claim for that code" });
    }
    console.log(`[ClaimResume] pending lookup HIT code=${code} email=${record.email}`);
    res.json({
      success: true,
      pending: {
        email: record.email,
        organizationId: record.organizationId,
        accountId: record.accountId,
        createdAt: record.createdAt,
      },
    });
  });

  // Best-effort lookup by email when the handoff code is lost. Non-destructive
  // so the regular code path can still consume the record.
  app.get("/api/auth/claim/pending-by-email", async (req, res) => {
    const ip = (req.ip || req.socket.remoteAddress || "unknown").toString();
    if (pendingByEmailRateLimited(ip)) {
      return res
        .status(429)
        .json({ success: false, message: "Too many requests; please try again shortly." });
    }
    const email = typeof req.query.email === "string" ? req.query.email.trim() : "";
    if (!email) {
      return res.status(400).json({ success: false, message: "Missing email" });
    }
    const record = peekPendingClaimByEmail(email);
    if (!record) {
      return res.status(404).json({ success: false, message: "No pending claim for that email" });
    }
    console.log(`[ClaimResume] pending-by-email HIT email=${record.email}`);
    // Minimal payload — only what the app needs to resume registration step
    // 3. Don't expose accountId or createdAt to an unauthenticated caller.
    res.json({
      success: true,
      pending: {
        email: record.email,
        organizationId: record.organizationId,
      },
    });
  });
}
