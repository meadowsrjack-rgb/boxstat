import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { BanterLoader } from "@/components/BanterLoader";

export default function DashboardDispatcher() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const hasNavigated = useRef(false);

  const { data: players = [], isLoading: playersLoading } = useQuery<any[]>({
    queryKey: ["/api/account/players"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (isLoading || playersLoading || hasNavigated.current) return;

    if (!user) {
      setLocation("/");
      return;
    }

    // Check if user needs to claim legacy subscriptions
    if ((user as any)?.needsLegacyClaim) {
      hasNavigated.current = true;
      setLocation("/claim-subscription");
      return;
    }

    // Gate admin users behind active platform subscription
    if ((user as any)?.role === "admin") {
      const subscriptionStatus = (user as any)?.organizationPlatformSubscriptionStatus;
      if (subscriptionStatus !== "active") {
        hasNavigated.current = true;
        setLocation("/subscription-required");
        return;
      }
    }

    hasNavigated.current = true;

    const userRole = (user as any)?.role;
    const userId = (user as any)?.id;
    const activeProfileId = (user as any)?.activeProfileId;
    const defaultDashboardView = (user as any)?.defaultDashboardView;
    const isCoach = userRole === "coach";
    const isAdmin = userRole === "admin";
    const isParent = userRole === "parent";
    const isPlayer = userRole === "player";
    const hasManagedPlayers = players && players.length > 0;

    const lastViewedProfile = localStorage.getItem("lastViewedProfileType");
    const lastSelectedPlayerId = localStorage.getItem("selectedPlayerId");

    const currentParams = new URLSearchParams(window.location.search);
    const eventId = currentParams.get("eventId");
    const eventSuffix = eventId ? `?eventId=${eventId}` : "";

    const goToPlayerDashboard = (playerId: string, asParent: boolean) => {
      localStorage.setItem("selectedPlayerId", playerId);
      if (asParent) {
        localStorage.setItem("viewingAsParent", "true");
      } else {
        localStorage.removeItem("viewingAsParent");
      }
      setLocation(`/player-dashboard${eventSuffix}`);
    };

    const goToParentDashboard = () => {
      localStorage.removeItem("selectedPlayerId");
      localStorage.removeItem("viewingAsParent");
      setLocation(`/unified-account${eventSuffix}`);
    };

    if (defaultDashboardView) {
      if (defaultDashboardView === "player" && activeProfileId) {
        goToPlayerDashboard(activeProfileId, isParent || isAdmin);
        return;
      } else if (defaultDashboardView === "coach" && (isCoach || isAdmin)) {
        setLocation(`/coach-dashboard${eventSuffix}`);
        return;
      } else if (defaultDashboardView === "admin" && isAdmin) {
        setLocation(`/admin-dashboard${eventSuffix}`);
        return;
      } else if (defaultDashboardView === "parent") {
        goToParentDashboard();
        return;
      }
    }

    if (lastViewedProfile) {
      if (lastViewedProfile === "player" && lastSelectedPlayerId) {
        goToPlayerDashboard(lastSelectedPlayerId, isParent || isAdmin);
        return;
      } else if (lastViewedProfile === "coach" && (isCoach || isAdmin)) {
        setLocation(`/coach-dashboard${eventSuffix}`);
        return;
      } else if (lastViewedProfile === "admin" && isAdmin) {
        setLocation(`/admin-dashboard${eventSuffix}`);
        return;
      } else if (lastViewedProfile === "parent") {
        goToParentDashboard();
        return;
      }
    }

    if (isAdmin || isCoach) {
      setLocation("/profile-gateway");
    } else if (isParent) {
      // Always send parents to profile gateway - they'll see empty state if no players
      setLocation("/profile-gateway");
    } else if (isPlayer) {
      goToPlayerDashboard(userId, false);
    } else {
      goToParentDashboard();
    }
  }, [user, isLoading, players, playersLoading, setLocation]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <BanterLoader />
    </div>
  );
}
