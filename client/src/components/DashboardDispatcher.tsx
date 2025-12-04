import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

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

    const clearStalePlayerSelection = () => {
      console.log("[DashboardDispatcher] Clearing stale player selection from localStorage");
      localStorage.removeItem("selectedPlayerId");
      localStorage.removeItem("viewingAsParent");
      localStorage.removeItem("lastViewedProfileType");
    };

    const isValidPlayerId = (playerId: string): boolean => {
      if (!players || players.length === 0) return false;
      return players.some((p: any) => p.id === playerId);
    };

    const goToPlayerDashboard = (playerId: string, asParent: boolean) => {
      localStorage.setItem("selectedPlayerId", playerId);
      if (asParent) {
        localStorage.setItem("viewingAsParent", "true");
      } else {
        localStorage.removeItem("viewingAsParent");
      }
      setLocation("/player-dashboard");
    };

    const goToParentDashboard = () => {
      localStorage.removeItem("selectedPlayerId");
      localStorage.removeItem("viewingAsParent");
      setLocation("/parent-dashboard");
    };

    if (defaultDashboardView) {
      if (defaultDashboardView === "player" && activeProfileId) {
        if (isValidPlayerId(activeProfileId)) {
          goToPlayerDashboard(activeProfileId, isParent || isAdmin);
          return;
        } else {
          console.log("[DashboardDispatcher] activeProfileId not found in players, going to gateway");
        }
      } else if (defaultDashboardView === "coach" && (isCoach || isAdmin)) {
        setLocation("/coach-dashboard");
        return;
      } else if (defaultDashboardView === "admin" && isAdmin) {
        setLocation("/admin-dashboard");
        return;
      } else if (defaultDashboardView === "parent") {
        goToParentDashboard();
        return;
      }
    }

    if (lastViewedProfile) {
      if (lastViewedProfile === "player" && lastSelectedPlayerId) {
        if (isValidPlayerId(lastSelectedPlayerId)) {
          goToPlayerDashboard(lastSelectedPlayerId, isParent || isAdmin);
          return;
        } else {
          console.log("[DashboardDispatcher] lastSelectedPlayerId not valid, clearing stale data");
          clearStalePlayerSelection();
        }
      } else if (lastViewedProfile === "coach" && (isCoach || isAdmin)) {
        setLocation("/coach-dashboard");
        return;
      } else if (lastViewedProfile === "admin" && isAdmin) {
        setLocation("/admin-dashboard");
        return;
      } else if (lastViewedProfile === "parent") {
        goToParentDashboard();
        return;
      }
    }

    if (isAdmin || isCoach) {
      setLocation("/profile-gateway");
    } else if (isParent) {
      setLocation("/profile-gateway");
    } else if (isPlayer) {
      goToPlayerDashboard(userId, false);
    } else {
      goToParentDashboard();
    }
  }, [user, isLoading, players, playersLoading, setLocation]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  );
}
