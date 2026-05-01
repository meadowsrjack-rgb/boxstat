import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { computeAccessStatus, type AccessStatusInput } from "@shared/access-status";
import { AccessUntilLine } from "@/components/AccessUntilLine";

interface Enrollment {
  id: number;
  programId: string;
  profileId: string | null;
  endDate: string | null;
  gracePeriodEndDate: string | null;
  status: string;
  source?: string | null;
  paymentId?: string | null;
  stripeSubscriptionId?: string | null;
  isSelfClaimed?: boolean | null;
  selfClaimedEndDate?: string | null;
}

interface Player {
  id: string;
  firstName: string;
  lastName: string;
}

const SELF_KEY = "__self__";

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function EnrollmentExpiryBanner() {
  const [, setLocation] = useLocation();

  const { data: enrollments = [] } = useQuery<Enrollment[]>({
    queryKey: ["/api/enrollments"],
  });

  const { data: players = [] } = useQuery<Player[]>({
    queryKey: ["/api/account/players"],
  });

  const playerMap = Object.fromEntries(
    players.map((p) => [p.id, `${p.firstName} ${p.lastName}`.trim()]),
  );

  // Group enrollments by profile (player). null profileId is the parent's own
  // self-enrollment.
  const groups = new Map<string, Enrollment[]>();
  for (const e of enrollments) {
    const key = e.profileId || SELF_KEY;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  // Compute the unified access status per player and only surface banners
  // for states the parent should act on: grace, admin_grant (unpaid), or a
  // paid window that's about to lapse in the next 7 days.
  const playerStatuses = new Map<string, ReturnType<typeof computeAccessStatus>>();
  for (const [key, list] of Array.from(groups.entries())) {
    playerStatuses.set(key, computeAccessStatus(list as AccessStatusInput[]));
  }

  // Jeremy Zhang fix: an active admin grant whose program already has a
  // sibling enrollment with proof of payment shouldn't nag the parent. We
  // scope this strictly to (player, program) pairs so a paid history for
  // one program never silences a genuine unpaid grant for a different one.
  const adminGrantCoveredByPaid = (key: string): boolean => {
    const list = groups.get(key) || [];
    const adminGrants = list.filter(
      (e) => e.status === "active" && !e.paymentId && !e.stripeSubscriptionId,
    );
    if (adminGrants.length === 0) return false;
    return adminGrants.every((g) =>
      list.some(
        (x) =>
          x.id !== g.id &&
          x.programId === g.programId &&
          (x.paymentId || x.stripeSubscriptionId),
      ),
    );
  };

  const banners = Array.from(groups.entries())
    .map(([key, _list]) => {
      const status = playerStatuses.get(key)!;
      const subject = key === SELF_KEY ? "Your" : `${playerMap[key] || "Player"}'s`;
      const days = daysUntil(status.accessUntil);

      let show = false;
      let icon: typeof AlertTriangle | typeof Clock = AlertTriangle;
      let tone = "border-l-amber-500 bg-amber-50";
      let iconClass = "text-amber-600";
      let cta = "Payments";

      if (status.reason === "grace") {
        show = true;
        icon = Clock;
        tone = "border-l-yellow-500 bg-yellow-50";
        iconClass = "text-yellow-600";
        cta = "Re-enroll";
      } else if (status.reason === "admin_grant") {
        // Suppress only if EVERY active admin grant for this player is
        // already covered by a paid sibling for the same program.
        show = !adminGrantCoveredByPaid(key);
      } else if (status.reason === "paid" && days !== null && days <= 7 && days >= 0) {
        show = true;
      }

      if (!show) return null;
      const Icon = icon;
      return (
        <Alert
          key={`access-${key}`}
          className={`border-l-4 ${tone}`}
          data-testid={`banner-access-${key}`}
        >
          <Icon className={`h-4 w-4 ${iconClass}`} />
          <AlertDescription className="flex items-center justify-between gap-4">
            <span className="text-sm flex items-center gap-2 text-gray-800">
              <strong>{subject} access:</strong>
              <AccessUntilLine status={status} className="text-sm" />
            </span>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-500 text-amber-800 hover:bg-amber-100 shrink-0"
              onClick={() => setLocation("/unified-account?tab=payments")}
            >
              {cta}
            </Button>
          </AlertDescription>
        </Alert>
      );
    })
    .filter(Boolean);

  // Surface "no expiry on file" enrollments separately so admins/parents can
  // backfill the date — this is a data-quality nudge that the unified line
  // can't express on its own.
  //
  // Task #326: Compute per player (not per enrollment row) and skip when the
  // player's unified access is already `paid` or `grace`. Otherwise a stale
  // unpaid admin_assignment / self_claim row with no end date keeps tripping
  // the banner even though a separate paid enrollment for the same program
  // already covers the player.
  //
  // Jeremy Zhang fix: also skip when the player has any sibling enrollment
  // with proof of payment (paymentId / stripeSubscriptionId) for the same
  // program — even if that paid row was later cancelled. This prevents the
  // "no expiry on file" nag from firing on admin courtesy grants that were
  // issued on top of an already-paid (but cancelled) enrollment.
  const playerHasPaidForProgram = (key: string, programId: string): boolean => {
    const list = groups.get(key) || [];
    return list.some(
      (x) => x.programId === programId && (x.paymentId || x.stripeSubscriptionId),
    );
  };

  const noExpiryGroups = new Map<string, string[]>();
  for (const e of enrollments) {
    if (e.status !== "active" || e.endDate) continue;
    const key = e.profileId || SELF_KEY;
    const playerStatus = playerStatuses.get(key);
    if (playerStatus && (playerStatus.reason === "paid" || playerStatus.reason === "grace")) {
      continue;
    }
    if (playerHasPaidForProgram(key, e.programId)) {
      continue;
    }
    const programLabel = e.programId || "your program";
    if (!noExpiryGroups.has(key)) noExpiryGroups.set(key, []);
    noExpiryGroups.get(key)!.push(programLabel);
  }

  const noExpiryBanners = Array.from(noExpiryGroups.entries()).map(([key]) => {
    const subject = key === SELF_KEY ? "Your" : `${playerMap[key] || "Player"}'s`;
    return (
      <Alert
        key={`no-expiry-${key}`}
        className="border-l-4 border-l-amber-500 bg-amber-50"
        data-testid={`banner-no-expiry-${key}`}
      >
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-amber-800 text-sm">
            {subject} enrollment has no expiry date on file. Enroll through the Payments tab to keep
            access active. If your player is on a club team, you can enter the club subscription end
            date so we know when access should renew.
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-500 text-amber-800 hover:bg-amber-100 shrink-0"
            onClick={() => setLocation("/unified-account?tab=payments")}
          >
            Payments
          </Button>
        </AlertDescription>
      </Alert>
    );
  });

  if (banners.length === 0 && noExpiryBanners.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {banners}
      {noExpiryBanners}
    </div>
  );
}
