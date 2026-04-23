import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, ChevronRight, Settings, LogOut, Crown, Bug, ArrowDown, CirclePlus, CheckCircle2, XCircle, Clock, X } from "lucide-react";
import { BanterLoader } from "@/components/BanterLoader";
import OpenBoxStatPrompt from "@/components/OpenBoxStatPrompt";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authPersistence } from "@/services/authPersistence";
import { AccessUntilLine } from "@/components/AccessUntilLine";

// Helper: fire-and-forget prefetch that won't block navigation
function prefetchQuery(queryKey: string) {
  if (queryClient.getQueryData([queryKey])) return;
  queryClient.prefetchQuery({
    queryKey: [queryKey],
    staleTime: 5 * 60 * 1000,
  });
}

// Local persistence for tracking pending add-player requests so we can
// surface in-app "approved" / "declined" indicators the next time the
// parent's gateway loads, even if the decision happened while the app
// was closed. Scoped per account holder.
const PENDING_SNAPSHOT_KEY = (uid: string) => `pendingPlayerSnapshot:${uid}`;
const RECENT_DECISIONS_KEY = (uid: string) => `pendingPlayerDecisions:${uid}`;
const RECENT_DECISION_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

type PendingSnapshotEntry = {
  firstName?: string | null;
  lastName?: string | null;
  requestedTeamName?: string | null;
  requestedTeamId?: number | null;
  submittedAt?: string | null;
};
type PendingSnapshotMap = Record<string, PendingSnapshotEntry>;

type RecentDecision = {
  playerId: string;
  decision: 'approved' | 'rejected';
  firstName?: string | null;
  lastName?: string | null;
  requestedTeamName?: string | null;
  submittedAt?: string | null;
  decidedAt: string;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
function writeJson(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return ''; }
}

export default function ProfileGateway() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [switching, setSwitching] = useState(false);
  const [recentDecisions, setRecentDecisions] = useState<RecentDecision[]>([]);
  const [requestDetail, setRequestDetail] = useState<null | {
    kind: 'pending' | 'approved' | 'rejected';
    firstName?: string | null;
    lastName?: string | null;
    requestedTeamName?: string | null;
    submittedAt?: string | null;
    decidedAt?: string | null;
  }>(null);

  const submitBugMutation = useMutation({
    mutationFn: async (bugData: { title: string; description: string }) => {
      return apiRequest("/api/bug-reports", {
        method: "POST",
        data: bugData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Bug Report Submitted",
        description: "Thank you for your feedback! We'll look into it.",
      });
      setBugDialogOpen(false);
      setBugTitle("");
      setBugDescription("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit bug report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const userId = (user as any)?.id;

  const { data: players = [], isLoading: playersLoading } = useQuery<any[]>({
    queryKey: ["/api/account/players", userId],
    queryFn: () => apiRequest("/api/account/players"),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    // Poll every 20s while a pending request is outstanding so the parent
    // sees the approve/reject decision land without a hard refresh.
    refetchInterval: (query) => {
      const data = query.state.data as any[] | undefined;
      const hasPending = !!data?.some((p: any) => p?.approvalStatus === 'pending' || p?.statusTag === 'awaiting_approval');
      return hasPending ? 20_000 : false;
    },
  });

  // Load any persisted recent decisions when the user becomes known.
  useEffect(() => {
    if (!userId) return;
    const stored = readJson<RecentDecision[]>(RECENT_DECISIONS_KEY(userId), []);
    const cutoff = Date.now() - RECENT_DECISION_TTL_MS;
    const fresh = stored.filter(d => {
      const t = Date.parse(d.decidedAt);
      return !isNaN(t) && t >= cutoff;
    });
    if (fresh.length !== stored.length) writeJson(RECENT_DECISIONS_KEY(userId), fresh);
    setRecentDecisions(fresh);
  }, [userId]);

  // Reconcile the players list against the previously-snapshotted pending
  // requests so we can detect approve/reject transitions and surface them
  // in-app even when the decision happened while the parent was away.
  useEffect(() => {
    if (!userId || playersLoading) return;
    const prev = readJson<PendingSnapshotMap>(PENDING_SNAPSHOT_KEY(userId), {});
    const next: PendingSnapshotMap = {};
    const decisions: RecentDecision[] = readJson<RecentDecision[]>(RECENT_DECISIONS_KEY(userId), []);
    const knownDecisionIds = new Set(decisions.map(d => d.playerId));

    const playerById = new Map<string, any>();
    for (const p of players) playerById.set(p.id, p);

    for (const p of players) {
      const isPending = p?.approvalStatus === 'pending' || p?.statusTag === 'awaiting_approval';
      if (isPending) {
        next[p.id] = {
          firstName: p.firstName,
          lastName: p.lastName,
          requestedTeamName: p.requestedTeamName ?? prev[p.id]?.requestedTeamName ?? null,
          requestedTeamId: p.requestedTeamId ?? prev[p.id]?.requestedTeamId ?? null,
          submittedAt: p.createdAt ?? prev[p.id]?.submittedAt ?? null,
        };
      }
    }

    let changed = false;
    for (const [pid, snap] of Object.entries(prev)) {
      if (next[pid]) continue; // still pending
      if (knownDecisionIds.has(pid)) continue; // already recorded
      const current = playerById.get(pid);
      if (current && current.approvalStatus !== 'pending') {
        decisions.unshift({
          playerId: pid,
          decision: 'approved',
          firstName: current.firstName ?? snap.firstName,
          lastName: current.lastName ?? snap.lastName,
          requestedTeamName: snap.requestedTeamName ?? current.teamName ?? null,
          submittedAt: snap.submittedAt ?? null,
          decidedAt: new Date().toISOString(),
        });
        changed = true;
      } else if (!current) {
        // Player vanished — admin rejected (the row is removed on reject).
        decisions.unshift({
          playerId: pid,
          decision: 'rejected',
          firstName: snap.firstName,
          lastName: snap.lastName,
          requestedTeamName: snap.requestedTeamName ?? null,
          submittedAt: snap.submittedAt ?? null,
          decidedAt: new Date().toISOString(),
        });
        changed = true;
      }
    }

    // Always rewrite the snapshot so resolved field values (e.g. team name
    // arriving on a later refetch) are kept up to date.
    writeJson(PENDING_SNAPSHOT_KEY(userId), next);
    if (changed) {
      const cutoff = Date.now() - RECENT_DECISION_TTL_MS;
      const trimmed = decisions
        .filter(d => Date.parse(d.decidedAt) >= cutoff)
        .slice(0, 10);
      writeJson(RECENT_DECISIONS_KEY(userId), trimmed);
      setRecentDecisions(trimmed);
    }
  }, [userId, playersLoading, players]);

  const dismissRecentDecision = (playerId: string) => {
    if (!userId) return;
    const next = recentDecisions.filter(d => d.playerId !== playerId);
    setRecentDecisions(next);
    writeJson(RECENT_DECISIONS_KEY(userId), next);
  };

  // Fetch all account profiles to detect admin/coach roles across the account
  const { data: accountProfiles = [], isLoading: profilesLoading } = useQuery<any[]>({
    queryKey: ["/api/account/profiles", userId],
    queryFn: () => apiRequest("/api/account/profiles"),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  // Prefetch data for each visible dashboard once profiles are loaded
  useEffect(() => {
    if (!user || isLoading || profilesLoading || playersLoading) return;
    const role = (user as any)?.role;
    if (role === "admin" || accountProfiles.some((p: any) => p.role === "admin")) {
      prefetchQuery("/api/admin/overview-stats");
    }
    if (role === "coach" || accountProfiles.some((p: any) => p.role === "coach")) {
      prefetchQuery("/api/coach/team");
    }
    // Prefetch generic events (coaches/admins use this key)
    prefetchQuery("/api/events");
    // Prefetch player-specific events for each visible player card
    for (const player of players) {
      if (player?.id) {
        const childProfileId = player.id.toString();
        const childEventsKey = `/api/events?childProfileId=${childProfileId}`;
        if (!queryClient.getQueryData([childEventsKey])) {
          queryClient.prefetchQuery({
            queryKey: [childEventsKey],
            staleTime: 5 * 60 * 1000,
          });
        }
        // Prefetch tasks and awards for each player
        if (!queryClient.getQueryData(["/api/users", player.id, "tasks"])) {
          queryClient.prefetchQuery({
            queryKey: ["/api/users", player.id, "tasks"],
            staleTime: 5 * 60 * 1000,
          });
        }
        if (!queryClient.getQueryData(["/api/users", player.id, "awards"])) {
          queryClient.prefetchQuery({
            queryKey: ["/api/users", player.id, "awards"],
            staleTime: 5 * 60 * 1000,
          });
        }
      }
    }
  }, [user, isLoading, profilesLoading, playersLoading, accountProfiles, players]);

  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments", userId],
    queryFn: () => apiRequest("/api/enrollments"),
    enabled: !!user,
  });

  // Refresh enrollment + player data when the tab becomes visible again or
  // when the native app resumes from background. This makes "paid until ..."
  // and player payment status update right after a Stripe checkout completes
  // (the parent returns to this view from the success screen) without forcing
  // them to pull-to-refresh.
  useEffect(() => {
    if (!userId) return;
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/players", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/account/profiles", userId] });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refresh);
    let removeResume: (() => void) | undefined;
    const cap: any = (window as any).Capacitor;
    if (cap?.isNativePlatform?.()) {
      try {
        const App = cap.Plugins?.App;
        if (App?.addListener) {
          const handle = App.addListener("appStateChange", (state: any) => {
            if (state?.isActive) refresh();
          });
          removeResume = () => {
            try { handle?.remove?.(); } catch {}
            try { (handle as any)?.then?.((h: any) => h?.remove?.()); } catch {}
          };
        }
      } catch {}
    }
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refresh);
      removeResume?.();
    };
  }, [userId]);

  const hasActiveEnrollment = enrollments.some((e: any) => e.status === 'active' || e.status === 'grace_period');
  const needsOnboarding = !isLoading && !playersLoading && !profilesLoading && user && !hasActiveEnrollment && players.length === 0;

  if (isLoading || playersLoading || profilesLoading || switching) {
    return (
      <>
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none bg-white" />
        <div className="fixed inset-0 w-full h-full z-10 flex items-center justify-center">
          <BanterLoader />
        </div>
      </>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const userRole = (user as any)?.role;
  // Check if any profile in the account has coach or admin role
  const hasAdminProfile = accountProfiles.some((p: any) => p.role === "admin");
  const hasCoachProfile = accountProfiles.some((p: any) => p.role === "coach");
  const isCoach = userRole === "coach" || hasCoachProfile;
  const isAdmin = userRole === "admin" || hasAdminProfile;

  const switchToRole = async (role: string): Promise<boolean> => {
    setSwitching(true);
    try {
      const data = await apiRequest("/api/auth/switch-profile", { method: "POST", data: { role } });
      if (data.token) {
        await authPersistence.setToken(data.token);
        queryClient.setQueryData(["/api/auth/user"], (old: any) => ({
          ...old,
          ...data.user,
        }));
        queryClient.invalidateQueries({ queryKey: ["/api/account/profiles"] });
        queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
        setSwitching(false);
        return true;
      }
      setSwitching(false);
      return false;
    } catch (e) {
      console.error("Profile switch failed:", e);
      toast({ title: "Switch failed", description: "Could not switch profile. Please try again.", variant: "destructive" });
      setSwitching(false);
      return false;
    }
  };

  const handleSelectProfile = async (type: string, playerId?: string) => {
    localStorage.setItem("lastViewedProfileType", type);
    
    if (type === "account") {
      localStorage.removeItem("selectedPlayerId");
      localStorage.removeItem("viewingAsParent");
      const parentProfile = accountProfiles.find((p: any) => p.role === "parent");
      if (parentProfile && userRole !== "parent") {
        const ok = await switchToRole("parent");
        if (!ok) return;
      }
      setLocation("/parent-dashboard");
    } else if (type === "coach") {
      const coachProfile = accountProfiles.find((p: any) => p.role === "coach");
      if (coachProfile && userRole !== "coach") {
        const ok = await switchToRole("coach");
        if (!ok) return;
      }
      setLocation("/coach-dashboard");
    } else if (type === "admin") {
      const adminProfile = accountProfiles.find((p: any) => p.role === "admin");
      if (adminProfile && userRole !== "admin") {
        const ok = await switchToRole("admin");
        if (!ok) return;
      }
      setLocation("/admin-dashboard");
    } else if (type === "player" && playerId) {
      localStorage.setItem("selectedPlayerId", playerId);
      localStorage.setItem("viewingAsParent", "true");
      // Task #255: Players approved without an expiry date are flagged
      // payment_due — route the parent straight into the payments wizard
      // so they can complete payment before using the profile.
      const target = players.find((p: any) => p.id === playerId);
      const targetTag = target?.statusTag || (target?.paymentStatus === "pending" ? "payment_due" : "none");
      if (targetTag === "payment_due") {
        setLocation(`/unified-account?tab=payments&openPayment=true&profileId=${playerId}`);
        return;
      }
      setLocation("/player-dashboard");
    }
  };

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      // Continue with logout even if API fails
    }
    // Clear auth token from native and local storage
    await authPersistence.clearAll();
    localStorage.removeItem('selectedPlayerId');
    localStorage.removeItem('viewingAsParent');
    localStorage.removeItem('lastViewedProfileType');
    queryClient.clear();
    // Use full page reload to clear all React state
    window.location.href = '/';
  };

  return (
    <>
      {/* iOS FULL BLEED - extends into all safe areas to prevent white gaps */}
      <div className="ios-full-bleed" />
      {/* DETACHED BACKGROUND LAYER - never moves with keyboard */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #111827, #000000)' }} />
      {/* Main Content Wrapper */}
      <div className="ios-fixed-page relative z-10 w-full bg-transparent flex flex-col">
      {/* Settings gear icon - absolutely positioned within the fixed container */}
      <div className="absolute top-4 right-4 z-50" style={{ marginTop: 'env(safe-area-inset-top, 0px)' }}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="p-2 text-gray-500 hover:text-gray-300 transition-colors bg-gray-900/80 rounded-full backdrop-blur-sm"
              data-testid="button-settings-menu"
            >
              <Settings className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 z-50">
            <DropdownMenuItem 
              onClick={() => setBugDialogOpen(true)}
              className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
              data-testid="menu-item-report-bug"
            >
              <Bug className="w-4 h-4 mr-2" />
              Report Bug
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-gray-700" />
            <DropdownMenuItem 
              onClick={handleSignOut}
              className="text-gray-300 hover:text-white hover:bg-gray-700 cursor-pointer"
              data-testid="menu-item-sign-out"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* Content area with safe area padding */}
      <div 
        className="flex-1 px-6"
        style={{ 
          paddingTop: 'calc(3rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <div className="max-w-md md:max-w-2xl mx-auto pt-4 pb-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-who-is-watching">Whose ball?</h1>
          </div>

        <OpenBoxStatPrompt />

        {needsOnboarding && (
          <div className="mb-4 rounded-xl bg-gradient-to-r from-red-600/20 to-red-500/10 border border-red-500/30 px-4 py-3 flex items-center gap-3" data-testid="gateway-onboarding-banner">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Tap your profile below to get started</p>
              <p className="text-xs text-gray-400 mt-0.5">Select your account, then head to the Payments tab to enroll in a program.</p>
            </div>
            <ArrowDown className="w-5 h-5 text-red-400 animate-bounce flex-shrink-0" />
          </div>
        )}

        <div className="space-y-4">
          {/* Account Card - styled like other profiles */}
          <Card 
            className={`bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-all cursor-pointer group ${needsOnboarding ? 'shimmer-effect ring-2 ring-red-500/60' : ''}`}
            onClick={() => handleSelectProfile("account")}
            data-testid="card-account-profile"
          >
            <CardContent className="p-4 flex items-center gap-4">
              {(user as any)?.profileImageUrl ? (
                <Avatar className="w-16 h-16">
                  <AvatarImage src={(user as any).profileImageUrl} alt={`${(user as any)?.firstName} ${(user as any)?.lastName}`} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xl font-bold">
                    {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <Crown className="w-8 h-8 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </h3>
                <p className="text-sm text-gray-400">Manage players and account</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </CardContent>
          </Card>

          {isCoach && (
            <Card 
              className="bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-all cursor-pointer group"
              onClick={() => handleSelectProfile("coach")}
              data-testid="card-coach-profile"
            >
              <CardContent className="p-4 flex items-center gap-4">
                {(() => {
                  const coachProfile = accountProfiles.find((p: any) => p.role === 'coach');
                  const coachImg = coachProfile?.profileImageUrl || (userRole === 'coach' ? (user as any)?.profileImageUrl : null);
                  return coachImg ? (
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={coachImg} alt="Coach" />
                      <AvatarFallback className="bg-gradient-to-br from-green-500 to-green-600 text-white text-xl font-bold">
                        {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  );
                })()}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Coach View</h3>
                  <p className="text-sm text-gray-400">Team tools,  career development</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </CardContent>
            </Card>
          )}

          {isAdmin && (
            <Card 
              className="bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-all cursor-pointer group"
              onClick={() => handleSelectProfile("admin")}
              data-testid="card-admin-profile"
            >
              <CardContent className="p-4 flex items-center gap-4">
                {(() => {
                  const adminProfile = accountProfiles.find((p: any) => p.role === 'admin');
                  const adminImg = adminProfile?.profileImageUrl || (userRole === 'admin' ? (user as any)?.profileImageUrl : null);
                  return adminImg ? (
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={adminImg} alt="Admin" />
                      <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white text-xl font-bold">
                        {(user as any)?.firstName?.[0]}{(user as any)?.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                  );
                })()}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Admin View</h3>
                  <p className="text-sm text-gray-400">Full system administration</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
              </CardContent>
            </Card>
          )}

          {/* Recent admin decisions on add-player requests (approved/rejected).
              Shown in-app so the parent doesn't need to dig through email/push
              to learn the outcome. Each card is dismissable. */}
          {recentDecisions.length > 0 && (
            <div className="space-y-2" data-testid="recent-decisions">
              {recentDecisions.map((d) => {
                const approved = d.decision === 'approved';
                const name = `${d.firstName || ''} ${d.lastName || ''}`.trim() || 'Player';
                return (
                  <div
                    key={d.playerId}
                    className={`rounded-xl border px-3 py-2 flex items-center gap-3 ${
                      approved
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : 'bg-red-500/10 border-red-500/40'
                    }`}
                    data-testid={`recent-decision-${d.playerId}`}
                  >
                    {approved ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                    )}
                    <button
                      type="button"
                      onClick={() => setRequestDetail({
                        kind: approved ? 'approved' : 'rejected',
                        firstName: d.firstName,
                        lastName: d.lastName,
                        requestedTeamName: d.requestedTeamName,
                        submittedAt: d.submittedAt,
                        decidedAt: d.decidedAt,
                      })}
                      className="flex-1 min-w-0 text-left focus:outline-none"
                      data-testid={`recent-decision-open-${d.playerId}`}
                    >
                      <p className="text-sm font-semibold text-white truncate">
                        {approved ? `${name} approved` : `${name} request declined`}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {d.requestedTeamName ? `${d.requestedTeamName} · ` : ''}
                        {formatDateTime(d.decidedAt)} · Tap for details
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => dismissRecentDecision(d.playerId)}
                      className="p-1 text-gray-400 hover:text-white"
                      aria-label="Dismiss"
                      data-testid={`recent-decision-dismiss-${d.playerId}`}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Player Profiles Section */}
          {(isCoach || isAdmin) && players.length > 0 && (
            <div className="border-t border-gray-700 my-6 pt-4">
              <h2 className="text-sm font-medium text-gray-400 mb-4 px-1">PLAYER PROFILES</h2>
            </div>
          )}

          {players.map((player: any) => {
            const isPending = player.approvalStatus === 'pending' || player.statusTag === 'awaiting_approval';
            const statusTag = player.statusTag || (player.paymentStatus === "pending" ? "payment_due" : "none");
            
            const getTagConfig = (tag: string) => {
              switch (tag) {
                case "payment_due":
                  return { 
                    label: "Payment Due", 
                    className: "bg-red-500/20 border-red-500/50 text-red-400",
                    description: "Player dashboard"
                  };
                case "low_balance":
                  return { 
                    label: "Low Balance", 
                    className: "bg-amber-500/20 border-amber-500/50 text-amber-400",
                    description: `${player.remainingCredits || 0} credits remaining`
                  };
                case "club_member":
                  return { 
                    label: "Club Member", 
                    className: "bg-green-500/20 border-green-500/50 text-green-400",
                    description: "Active subscription"
                  };
                case "pack_holder":
                  return { 
                    label: "Pack Holder", 
                    className: "bg-blue-500/20 border-blue-500/50 text-blue-400",
                    description: `${player.remainingCredits || 0} credits remaining`
                  };
                case "not_enrolled":
                  return { 
                    label: "Not Enrolled", 
                    className: "bg-gray-500/20 border-gray-500/50 text-gray-400",
                    description: "No active program"
                  };
                default:
                  return null;
              }
            };
            
            const tagConfig = getTagConfig(statusTag);
            
            return (
              <Card 
                key={player.id}
                className={`bg-gray-800/50 border-gray-700 transition-all group ${isPending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-gray-800 cursor-pointer'}`}
                onClick={() => {
                  if (isPending) {
                    toast({
                      title: 'Awaiting club admin approval',
                      description: `${player.firstName || 'This profile'} can be used once the club admin approves the request.`,
                    });
                    return;
                  }
                  handleSelectProfile("player", player.id);
                }}
                data-testid={`card-player-${player.id}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={player.profileImageUrl} alt={`${player.firstName} ${player.lastName}`} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xl font-bold">
                      {player.firstName?.[0]}{player.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {player.firstName} {player.lastName}
                      </h3>
                      {isPending ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRequestDetail({
                              kind: 'pending',
                              firstName: player.firstName,
                              lastName: player.lastName,
                              requestedTeamName: player.requestedTeamName,
                              submittedAt: player.createdAt,
                            });
                          }}
                          className="focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-full"
                          data-testid={`badge-pending-${player.id}`}
                        >
                          <Badge
                            variant="outline"
                            className="text-xs bg-amber-500/20 border-amber-500/50 text-amber-300 cursor-pointer hover:bg-amber-500/30"
                          >
                            <Clock className="w-3 h-3 mr-1" />
                            Awaiting approval
                          </Badge>
                        </button>
                      ) : tagConfig && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${tagConfig.className}`}
                          data-testid={`badge-status-${player.id}`}
                        >
                          {tagConfig.label}
                        </Badge>
                      )}
                    </div>
                    {isPending ? (
                      <p className="text-sm text-gray-400">
                        Waiting on club admin{player.requestedTeamName ? ` for ${player.requestedTeamName}` : ''}
                      </p>
                    ) : player.accessStatus ? (
                      <AccessUntilLine
                        status={player.accessStatus}
                        testId={`access-until-${player.id}`}
                        className="text-sm"
                      />
                    ) : (
                      <p className="text-sm text-gray-400">
                        {tagConfig ? tagConfig.description : "Player dashboard"}
                      </p>
                    )}
                  </div>
                  {!isPending && (
                    <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                  )}
                </CardContent>
              </Card>
            );
          })}

          {/* Task #255: Add player entry — shown for parent and admin
              account holders (the audiences that can manage child profiles).
              Pure-coach sessions are excluded to avoid a dead-end UX. */}
          {(userRole === 'parent' || userRole === 'admin' || isAdmin) && (
          <Card
            className="bg-gray-800/30 border-gray-700 border-dashed hover:bg-gray-800 transition-all cursor-pointer group"
            onClick={() => setLocation('/add-player?returnTo=profile-gateway')}
            data-testid="card-add-player"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gray-700/60 flex items-center justify-center group-hover:bg-gray-700 transition-colors">
                <CirclePlus className="w-8 h-8 text-gray-300" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">Add player</h3>
                <p className="text-sm text-gray-400">Submit a request for a club admin to approve</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
            </CardContent>
          </Card>
          )}

        </div>
        </div>
      </div>

      <Dialog open={!!requestDetail} onOpenChange={(o) => { if (!o) setRequestDetail(null); }}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              {requestDetail?.kind === 'approved' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {requestDetail?.kind === 'rejected' && <XCircle className="w-5 h-5 text-red-400" />}
              {requestDetail?.kind === 'pending' && <Clock className="w-5 h-5 text-amber-300" />}
              {requestDetail?.kind === 'approved' && 'Player approved'}
              {requestDetail?.kind === 'rejected' && 'Request declined'}
              {requestDetail?.kind === 'pending' && 'Awaiting club admin'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {requestDetail?.kind === 'pending' && 'The club admin still needs to review this add-player request.'}
              {requestDetail?.kind === 'approved' && 'The club admin approved this add-player request.'}
              {requestDetail?.kind === 'rejected' && 'The club admin declined this add-player request.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 pt-2 text-sm">
            {requestDetail && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Player</span>
                  <span className="text-white text-right">
                    {`${requestDetail.firstName || ''} ${requestDetail.lastName || ''}`.trim() || '—'}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-gray-400">Team</span>
                  <span className="text-white text-right">{requestDetail.requestedTeamName || '—'}</span>
                </div>
                {requestDetail.submittedAt && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Submitted</span>
                    <span className="text-white text-right">{formatDateTime(requestDetail.submittedAt)}</span>
                  </div>
                )}
                {requestDetail.decidedAt && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-400">Decided</span>
                    <span className="text-white text-right">{formatDateTime(requestDetail.decidedAt)}</span>
                  </div>
                )}
                {requestDetail.kind === 'pending' && (
                  <p className="text-xs text-gray-400 pt-2">
                    You'll get an email and push notification once a decision is made. This banner will update automatically too.
                  </p>
                )}
                {requestDetail.kind === 'approved' && (
                  <p className="text-xs text-gray-400 pt-2">
                    The player profile is ready to use. Tap their card on the gateway to open the dashboard or complete payment if required.
                  </p>
                )}
                {requestDetail.kind === 'rejected' && (
                  <p className="text-xs text-gray-400 pt-2">
                    Reach out to the club admin if you think this was a mistake. You can submit a new request anytime.
                  </p>
                )}
              </>
            )}
            <div className="pt-3 flex justify-end">
              <Button
                onClick={() => setRequestDetail(null)}
                className="bg-gray-700 hover:bg-gray-600 text-white"
                data-testid="button-close-request-detail"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bugDialogOpen} onOpenChange={setBugDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Report a Bug</DialogTitle>
            <DialogDescription className="text-gray-400">
              Help us improve by reporting any issues you've encountered.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="bug-title" className="text-gray-300">Title</Label>
              <Input
                id="bug-title"
                placeholder="Brief description of the issue"
                value={bugTitle}
                onChange={(e) => setBugTitle(e.target.value)}
                className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500"
                data-testid="input-bug-title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bug-description" className="text-gray-300">Description</Label>
              <Textarea
                id="bug-description"
                placeholder="Please describe what happened, what you expected, and steps to reproduce..."
                value={bugDescription}
                onChange={(e) => setBugDescription(e.target.value)}
                rows={5}
                className="bg-gray-900 border-gray-600 text-white placeholder:text-gray-500 resize-none"
                data-testid="input-bug-description"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setBugDialogOpen(false)}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                data-testid="button-cancel-bug-report"
              >
                Cancel
              </Button>
              <Button
                onClick={() => submitBugMutation.mutate({ title: bugTitle, description: bugDescription })}
                disabled={!bugTitle.trim() || !bugDescription.trim() || submitBugMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="button-submit-bug-report"
              >
                {submitBugMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      </div>
    </>
  );
}
