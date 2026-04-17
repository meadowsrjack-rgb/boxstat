import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type PendingKind = "claim" | "invite" | "magic-link";

interface PendingHit {
  kind: PendingKind;
  path: string;
  label: string;
}

const TTL_MS = 10 * 60 * 1000;

function readPending(): PendingHit | null {
  try {
    const claimCode = localStorage.getItem("pendingClaimCode");
    const claimAt = Number(localStorage.getItem("pendingClaimCodeAt") || "0");
    if (claimCode && claimAt && Date.now() - claimAt < TTL_MS) {
      return {
        kind: "claim",
        path: `/claim-resume?code=${encodeURIComponent(claimCode)}`,
        label: "Continue account verification",
      };
    }

    const inviteToken = localStorage.getItem("pendingInviteToken");
    const inviteAt = Number(localStorage.getItem("pendingInviteTokenAt") || "0");
    if (inviteToken && inviteAt && Date.now() - inviteAt < TTL_MS) {
      return {
        kind: "invite",
        path: `/invite/${encodeURIComponent(inviteToken)}`,
        label: "Continue invite",
      };
    }

    const magicToken = localStorage.getItem("pendingMagicLinkToken");
    const magicAt = Number(localStorage.getItem("pendingMagicLinkTokenAt") || "0");
    if (magicToken && magicAt && Date.now() - magicAt < TTL_MS) {
      return {
        kind: "magic-link",
        path: `/magic-link-login?token=${encodeURIComponent(magicToken)}`,
        label: "Continue sign-in",
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

function parseVerificationLink(raw: string): string | null {
  const input = raw.trim();
  if (!input) return null;

  let url: URL | null = null;
  try {
    if (input.startsWith("boxstat://")) {
      url = new URL(input.replace("boxstat://", "https://boxstat.app/"));
    } else if (input.startsWith("http://") || input.startsWith("https://")) {
      url = new URL(input);
    } else if (input.startsWith("/")) {
      url = new URL(input, "https://boxstat.app");
    }
  } catch {
    url = null;
  }

  if (url) {
    const path = url.pathname;
    const search = url.search || "";

    if (path === "/claim-verify" || path.endsWith("/claim-verify")) {
      const token = url.searchParams.get("token");
      if (token) return `/claim-verify?token=${encodeURIComponent(token)}`;
    }
    if (path === "/claim-resume" || path.endsWith("/claim-resume")) {
      const code = url.searchParams.get("code");
      if (code) return `/claim-resume?code=${encodeURIComponent(code)}`;
    }
    if (path === "/magic-link-login" || path.endsWith("/magic-link-login")) {
      const token = url.searchParams.get("token");
      if (token) return `/magic-link-login?token=${encodeURIComponent(token)}`;
    }
    const inviteMatch = path.match(/\/invite\/([^/?#]+)/);
    if (inviteMatch) return `/invite/${encodeURIComponent(inviteMatch[1])}`;
    const verifyEmailMatch = path.match(/\/verify-email\/([^/?#]+)/);
    if (verifyEmailMatch) return `/verify-email/${encodeURIComponent(verifyEmailMatch[1])}`;

    if (path && path !== "/" && (path.startsWith("/claim") || path.startsWith("/invite") || path.startsWith("/magic-link") || path.startsWith("/verify-"))) {
      return `${path}${search}`;
    }
  }

  const tokenMatch = input.match(/[?&]token=([^&\s]+)/);
  if (tokenMatch) {
    if (/magic-link/i.test(input)) return `/magic-link-login?token=${tokenMatch[1]}`;
    if (/verify-email/i.test(input)) return `/verify-email/${tokenMatch[1]}`;
    return `/claim-verify?token=${tokenMatch[1]}`;
  }
  const codeMatch = input.match(/[?&]code=([^&\s]+)/);
  if (codeMatch) return `/claim-resume?code=${codeMatch[1]}`;

  return null;
}

export default function VerifyLinkResume() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingHit | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteValue, setPasteValue] = useState("");

  useEffect(() => {
    setPending(readPending());
    const onFocus = () => setPending(readPending());
    const onStorage = () => setPending(readPending());
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    const interval = window.setInterval(() => setPending(readPending()), 2000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      window.clearInterval(interval);
    };
  }, []);

  const goTo = useCallback(
    (path: string) => {
      setLocation(path);
    },
    [setLocation],
  );

  const handlePasteSubmit = () => {
    const path = parseVerificationLink(pasteValue);
    if (!path) {
      toast({
        title: "Couldn't read that link",
        description:
          "Paste the full link from your email (it should contain claim-verify, invite, or magic-link).",
        variant: "destructive",
      });
      return;
    }
    setPasteOpen(false);
    setPasteValue("");
    goTo(path);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setPasteValue(text);
    } catch {
      toast({
        title: "Clipboard unavailable",
        description: "Paste the link manually into the box below.",
      });
    }
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
          width: "100%",
          marginTop: "12px",
        }}
      >
        {pending && (
          <Button
            onClick={() => goTo(pending.path)}
            data-testid="button-resume-verification"
            style={{
              backgroundColor: "rgba(239,68,68,0.85)",
              color: "white",
              fontWeight: 700,
              padding: "14px 28px",
              borderRadius: "10px",
              minWidth: "280px",
              fontSize: "13px",
              letterSpacing: "0.08em",
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {pending.label.toUpperCase()}
          </Button>
        )}

        <button
          onClick={() => setPasteOpen(true)}
          data-testid="button-paste-verification-link"
          style={{
            color: "white",
            opacity: 0.7,
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            textDecoration: "underline",
            padding: "4px 8px",
          }}
        >
          Have a verification link from email? Tap to paste
        </button>
      </div>

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paste your verification link</DialogTitle>
            <DialogDescription>
              In your email, long-press the verification link and choose "Copy
              Link", then paste it here.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Textarea
              value={pasteValue}
              onChange={(e) => setPasteValue(e.target.value)}
              placeholder="https://boxstat.app/claim-verify?token=..."
              rows={4}
              data-testid="textarea-verification-link"
            />
            <Button
              variant="outline"
              type="button"
              onClick={handlePasteFromClipboard}
              data-testid="button-paste-from-clipboard"
            >
              Paste from clipboard
            </Button>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPasteOpen(false)}
              data-testid="button-cancel-paste"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasteSubmit}
              data-testid="button-submit-paste"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
