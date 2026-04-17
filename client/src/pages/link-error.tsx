import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

type LinkType = "verify-email" | "magic-link" | "claim-verify" | "auth";
type LinkReason = "expired" | "used" | "invalid" | "network" | "unknown";

const TYPE_LABELS: Record<LinkType, { title: string; product: string; entry: string; entryLabel: string }> = {
  "verify-email": {
    title: "Verification link",
    product: "verification email",
    entry: "/register",
    entryLabel: "Start registration over",
  },
  "magic-link": {
    title: "Magic sign-in link",
    product: "magic sign-in link",
    entry: "/login",
    entryLabel: "Back to login",
  },
  "claim-verify": {
    title: "Account claim link",
    product: "claim email",
    entry: "/account-claim",
    entryLabel: "Back to account claim",
  },
  auth: {
    title: "Sign-in link",
    product: "sign-in link",
    entry: "/login",
    entryLabel: "Back to login",
  },
};

const REASON_COPY: Record<LinkReason, string> = {
  expired: "This link has expired. Links are only valid for a short time, so we'll need to send a fresh one.",
  used: "This link has already been used. For your safety, each link only works once — let's get you a new one.",
  invalid: "We couldn't recognize this link. It may have been copied incorrectly or replaced by a newer one.",
  network: "We couldn't reach the server to confirm this link. Check your connection and we'll try again.",
  unknown: "Something went wrong while opening this link. Let's try sending a fresh one.",
};

function parseType(value: string | null): LinkType {
  if (value === "verify-email" || value === "magic-link" || value === "claim-verify" || value === "auth") {
    return value;
  }
  return "auth";
}

function parseReason(value: string | null): LinkReason {
  if (value === "expired" || value === "used" || value === "invalid" || value === "network") {
    return value;
  }
  return "unknown";
}

export default function LinkError() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const initial = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      type: parseType(params.get("type")),
      reason: parseReason(params.get("reason")),
      email: params.get("email") || "",
      organizationId: params.get("organizationId") || "",
      message: params.get("message") || "",
    };
  }, []);

  const config = TYPE_LABELS[initial.type];
  const reasonCopy = REASON_COPY[initial.reason];

  const [email, setEmail] = useState(initial.email);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reset "sent" state if the user edits their email after a send.
  useEffect(() => {
    if (sent) setSent(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const isAuthOnly = initial.type === "auth";
  const needsEmail = !isAuthOnly && !email.trim();

  const handleSend = async () => {
    if (isAuthOnly) {
      setLocation(config.entry);
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      toast({
        title: "Email needed",
        description: `Enter the email you used so we can send a new ${config.product}.`,
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    try {
      if (initial.type === "verify-email") {
        await apiRequest("/api/auth/send-verification", {
          method: "POST",
          data: {
            email: trimmed,
            organizationId: initial.organizationId || "default-org",
          },
        });
      } else if (initial.type === "magic-link") {
        await apiRequest("/api/auth/request-magic-link", {
          method: "POST",
          data: { email: trimmed },
        });
      } else if (initial.type === "claim-verify") {
        await apiRequest("/api/auth/request-claim", {
          method: "POST",
          data: { email: trimmed },
        });
      }

      setSent(true);
      toast({
        title: "Fresh link on the way",
        description: `We've sent a new ${config.product} to ${trimmed}.`,
      });
    } catch (error: any) {
      const description =
        error?.message ||
        `We couldn't send a new ${config.product} just now. Please try again in a moment.`;
      toast({
        title: "Couldn't send link",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <div className="ios-full-bleed" />
      <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black z-0 pointer-events-none" />
      <div className="ios-fixed-page relative z-10 w-full bg-transparent flex items-center justify-center p-4">
        <Card className="w-full max-w-md md:max-w-lg" data-testid="card-link-error">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {sent ? (
                <CheckCircle className="h-16 w-16 text-green-600" data-testid="icon-link-sent" />
              ) : (
                <AlertTriangle className="h-16 w-16 text-amber-500" data-testid="icon-link-error" />
              )}
            </div>
            <CardTitle data-testid="text-link-error-title">
              {sent ? "Check your inbox" : `${config.title} didn't work`}
            </CardTitle>
            <CardDescription data-testid="text-link-error-description">
              {sent
                ? `We sent a new ${config.product} to ${email.trim()}. It can take a minute to arrive — be sure to check your spam folder.`
                : reasonCopy}
            </CardDescription>
            {!sent && initial.message && import.meta.env.DEV && (
              <p className="text-xs text-gray-500 mt-2" data-testid="text-link-error-detail">
                Details: {initial.message}
              </p>
            )}
          </CardHeader>

          <CardContent className="flex flex-col gap-3">
            {!sent && !isAuthOnly && (
              <div className="space-y-2">
                <Label htmlFor="link-error-email">Email address</Label>
                <Input
                  id="link-error-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-link-error-email"
                />
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            {!isAuthOnly && (
              <Button
                onClick={handleSend}
                disabled={isSending || sent || needsEmail}
                className="w-full"
                data-testid="button-resend-link"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : sent ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Link sent
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send a fresh {config.product}
                  </>
                )}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setLocation(config.entry)}
              className="w-full"
              data-testid="button-link-error-entry"
            >
              {config.entryLabel}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
