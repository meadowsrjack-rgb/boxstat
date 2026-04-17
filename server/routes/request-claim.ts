import type { Express } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { storage, type IStorage } from "../storage";
import { db } from "../db";
import { users } from "@shared/schema";
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
  email: z.string().email().optional(),
  // When present, this is the original token from the (possibly expired or
  // already-used) claim link. We use it to resolve the actual account so
  // we can resend even if the user mistypes the email on file.
  token: z.string().min(1).max(128).optional(),
}).refine((data) => Boolean(data.email || data.token), {
  message: "Either email or token must be provided",
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

// Mask an email like `someone@example.com` -> `s******e@example.com` so we
// can confirm an email was sent without revealing the full address (which
// might differ from what the user typed).
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? "*"}*@${domain}`;
  return `${local[0]}${"*".repeat(Math.max(1, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

export function registerRequestClaimRoute(app: Express): void {
  app.post("/api/auth/request-claim", async (req, res) => {
    try {
      const parsed = requestAccountClaimSchema.parse(req.body);
      const typedEmail = parsed.email ? parsed.email.toLowerCase().trim() : null;
      const token = parsed.token ?? null;

      const accountStorage = storage as AccountLookupStorage;

      // 1) Prefer token-based lookup so the user can recover even if they
      //    don't remember the exact email tied to their pending claim.
      let account: User | undefined;
      let resolvedVia: "token" | "email" | null = null;

      if (token) {
        try {
          const tokenRows = await db
            .select()
            .from(users)
            .where(eq(users.magicLinkToken, token))
            .limit(1);
          if (tokenRows.length > 0) {
            account = await accountStorage.getUser(tokenRows[0].id);
            if (account) resolvedVia = "token";
          }
        } catch (lookupError) {
          console.error("Token lookup failed during claim resend:", lookupError);
        }
      }

      // 2) Fall back to typed-email lookup (original behavior).
      if (!account && typedEmail) {
        account = await accountStorage.getUserByEmailAnyOrg(typedEmail);
        if (!account) {
          console.log(`Account not found for ${typedEmail}, running Notion sync...`);
          try {
            await notionAccountSync.syncAccountsFromNotion();
            account = await accountStorage.getUserByEmailAnyOrg(typedEmail);
          } catch (syncError) {
            console.error("Notion sync failed during claim request:", syncError);
          }
        }
        if (account) resolvedVia = "email";
      }

      if (!account || !account.email) {
        return res.status(404).json({
          success: false,
          message:
            "We couldn't find an account matching that email. The original invite link may have been issued to a different address — please double-check or reach out to your academy administrator.",
          suggestions: [
            "Check that you're using the same email address provided to the academy",
            "Contact the academy administration to verify your registration",
          ],
        });
      }

      // Rate-limit per resolved account (so a user can't bypass by trying
      // multiple emails) but only after we know who the account is. Falls
      // back to the typed email when we somehow have no account email.
      const rateLimitKey = `claim:${account.email.toLowerCase()}`;
      if (!checkRateLimit(rateLimitKey)) {
        return res.status(429).json({
          success: false,
          message: "Too many resend attempts for this account. Please wait 5 minutes and try again.",
        });
      }

      const accountEmail = account.email.toLowerCase();
      const magicLinkToken = nanoid(32);
      const magicLinkExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

      await accountStorage.updateUser(account.id, {
        magicLinkToken,
        magicLinkExpiry,
      } as Partial<User>);

      const claimLink = `${getClaimLinkBaseUrl()}/claim-verify?token=${magicLinkToken}`;

      try {
        if (process.env.NODE_ENV === "development") {
          console.log(`\n🎯 ACCOUNT CLAIM LINK for ${accountEmail} (resolved via ${resolvedVia}):`);
          console.log(`${claimLink}`);
          console.log(`🚀 Development mode: Use the link above to skip email verification\n`);

          return res.json({
            success: true,
            message: `Development mode: Account claim link generated for ${accountEmail}`,
            sentToEmail: accountEmail,
            sentToEmailMasked: maskEmail(accountEmail),
            resolvedVia,
            autoRedirect: true,
            redirectUrl: `/claim-verify?token=${magicLinkToken}`,
          });
        }

        const accountType =
          (account as { primaryAccountType?: string; registrationType?: string })
            .primaryAccountType ||
          (account as { registrationType?: string }).registrationType ||
          "account";
        await emailService.sendClaimEmail(accountEmail, claimLink, accountType);

        // If the typed email differs from the account email, tell the user
        // we sent it to the address on file (masked) instead of silently
        // succeeding to a different inbox.
        const sentToDifferentInbox = Boolean(
          typedEmail && typedEmail !== accountEmail,
        );

        const message = sentToDifferentInbox
          ? `A fresh claim link has been sent to the email on file for this account (${maskEmail(accountEmail)}). Please check that inbox.`
          : `A fresh claim link has been sent to ${accountEmail}. Please check your inbox (and spam folder).`;

        res.json({
          success: true,
          message,
          sentToEmail: sentToDifferentInbox ? undefined : accountEmail,
          sentToEmailMasked: maskEmail(accountEmail),
          sentToDifferentInbox,
          resolvedVia,
          autoRedirect: false,
        });
      } catch (emailError) {
        console.error("Failed to send claim email:", emailError);
        res.status(500).json({
          success: false,
          message: "We couldn't send the claim email right now. Please try again in a moment, or contact support if the problem continues.",
        });
      }
    } catch (error) {
      console.error("Error requesting account claim:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid email address so we can resend your claim link.",
          errors: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        message: "Something went wrong while processing your request. Please try again.",
      });
    }
  });
}
