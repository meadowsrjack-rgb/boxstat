import type { Express } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { storage, type IStorage } from "../storage";
import { emailService } from "../lib/email-service";
import { notionAccountSync } from "../services/notionAccountSync.js";
import type { User } from "@shared/schema";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const rateLimitStore = new Map<string, { attempts: number; lastAttempt: number }>();

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now - record.lastAttempt > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(key, { attempts: 1, lastAttempt: now });
    return true;
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    return false;
  }
  record.attempts++;
  record.lastAttempt = now;
  return true;
}

const requestAccountClaimSchema = z.object({
  email: z.string().email(),
});

// Build claim links against the canonical app domain so they trigger the
// installed app's iOS Universal Link / Android App Link handler for
// `/claim-verify` (registered in apple-app-site-association and
// AndroidManifest.xml). Falling back to APP_URL/REPL_URL would resolve to
// hostnames that aren't claimed by the app and would always open the
// browser first. `CLAIM_LINK_BASE_URL` lets staging/test environments
// override the host while still preserving deep-link correctness in prod.
// In dev we keep using the Replit dev domain since the route
// short-circuits and never sends an email anyway.
function getClaimLinkBaseUrl(): string {
  if (process.env.CLAIM_LINK_BASE_URL) {
    return process.env.CLAIM_LINK_BASE_URL.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "development" && process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  return "https://boxstat.app";
}

type AccountLookupStorage = IStorage & {
  getUserByEmailAnyOrg: (email: string) => Promise<User | undefined>;
  updateUser: (id: string, updates: Partial<User>) => Promise<User | undefined>;
};

export function registerRequestClaimRoute(app: Express): void {
  app.post("/api/auth/request-claim", async (req, res) => {
    try {
      const { email } = requestAccountClaimSchema.parse(req.body);
      const normalizedEmail = email.toLowerCase().trim();

      const rateLimitKey = `claim:${normalizedEmail}`;
      if (!checkRateLimit(rateLimitKey)) {
        return res.status(429).json({
          message: "Too many attempts. Please wait 5 minutes before trying again.",
        });
      }

      const accountStorage = storage as AccountLookupStorage;

      // Look up the account for this email (any organization).
      let account = await accountStorage.getUserByEmailAnyOrg(normalizedEmail);

      if (!account) {
        console.log(`Account not found for ${normalizedEmail}, running Notion sync...`);
        try {
          await notionAccountSync.syncAccountsFromNotion();
          account = await accountStorage.getUserByEmailAnyOrg(normalizedEmail);
        } catch (syncError) {
          console.error("Notion sync failed during claim request:", syncError);
        }
      }

      if (!account) {
        return res.status(404).json({
          message:
            "No account found for this email address. Please contact the academy if you believe this is an error.",
          suggestions: [
            "Check that you're using the same email address provided to the academy",
            "Contact the academy administration to verify your registration",
          ],
        });
      }

      const magicLinkToken = nanoid(32);
      const magicLinkExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      await accountStorage.updateUser(account.id, {
        magicLinkToken,
        magicLinkExpiry,
      } as Partial<User>);

      const claimLink = `${getClaimLinkBaseUrl()}/claim-verify?token=${magicLinkToken}`;

      try {
        if (process.env.NODE_ENV === "development") {
          console.log(`\n🎯 ACCOUNT CLAIM LINK for ${normalizedEmail}:`);
          console.log(`${claimLink}`);
          console.log(`🚀 Development mode: Use the link above to skip email verification\n`);

          return res.json({
            success: true,
            message: `Development mode: Account claim link generated for ${normalizedEmail}`,
            autoRedirect: true,
            redirectUrl: `/claim-verify?token=${magicLinkToken}`,
          });
        }

        const accountType =
          (account as { primaryAccountType?: string; registrationType?: string })
            .primaryAccountType ||
          (account as { registrationType?: string }).registrationType ||
          "account";
        await emailService.sendClaimEmail(normalizedEmail, claimLink, accountType);

        res.json({
          success: true,
          message: `Account claim instructions have been sent to ${normalizedEmail}`,
          autoRedirect: false,
        });
      } catch (emailError) {
        console.error("Failed to send claim email:", emailError);
        res.status(500).json({
          message: "Failed to send claim email. Please try again or contact support.",
        });
      }
    } catch (error) {
      console.error("Error requesting account claim:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid email format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process claim request" });
    }
  });
}
