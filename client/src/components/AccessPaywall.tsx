import { useLocation } from "wouter";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AccessUntilLine } from "@/components/AccessUntilLine";
import type { PlayerAccess } from "@shared/access-gate";

interface AccessPaywallProps {
  access: PlayerAccess;
  feature?: string;
}

/**
 * Consistent paywall shown whenever a player tries to enter a gated feature
 * without active enrollment. Uses the same wording as the unified
 * access-until line so every blocked surface tells the player the same story
 * and points them to Payments to renew or pay by the deadline.
 */
export function AccessPaywall({ access, feature }: AccessPaywallProps) {
  const [, setLocation] = useLocation();
  const status = {
    accessUntil: access.accessUntil,
    reason: access.reason,
    sourceLabel: access.sourceLabel,
  };
  return (
    <div className="min-h-screen-safe bg-background flex items-center justify-center p-6 safe-bottom safe-top">
      <Card className="max-w-md w-full" data-testid="access-paywall">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
            <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h2 className="text-xl font-semibold">
            {feature ? `${feature} is locked` : "This feature is locked"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {access.message}
          </p>
          <div className="flex justify-center">
            <AccessUntilLine status={status} testId="paywall-access-line" />
          </div>
          <Button
            className="w-full"
            onClick={() => setLocation("/unified-account?tab=payments")}
            data-testid="button-paywall-pay"
          >
            Go to Payments
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
