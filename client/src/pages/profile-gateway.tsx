import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, ChevronRight, Settings, LogOut, Crown, Bug, ArrowDown, X } from "lucide-react";
import { BanterLoader } from "@/components/BanterLoader";
import lightThemeLogo from "@assets/light_1773300199014.png";
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

// Helper: fire-and-forget prefetch that won't block navigation
function prefetchQuery(queryKey: string) {
  if (queryClient.getQueryData([queryKey])) return;
  queryClient.prefetchQuery({
    queryKey: [queryKey],
    staleTime: 5 * 60 * 1000,
  });
}

const APP_STORE_URL = 'https://apps.apple.com/us/app/boxstat/id6754899159';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.boxstat.app&hl=en_US';
const DISMISS_KEY = 'boxstat_app_download_dismissed';

function getMobilePlatform(): 'ios' | 'android' | null {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return null;
}

function isCapacitorNative(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' && (window as any).Capacitor.isNativePlatform?.();
}

export default function ProfileGateway() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");
  const [switching, setSwitching] = useState(false);
  const [showAppBanner, setShowAppBanner] = useState(false);

  useEffect(() => {
    const platform = getMobilePlatform();
    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (platform && !isCapacitorNative() && !dismissed) {
      setShowAppBanner(true);
    }
  }, []);

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
  });

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

        <Dialog open={showAppBanner} onOpenChange={(open) => {
          if (!open) {
            localStorage.setItem(DISMISS_KEY, 'true');
            setShowAppBanner(false);
          }
        }}>
          <DialogContent hideClose className="max-w-[320px] rounded-2xl bg-white p-6 border-0 shadow-xl">
            <button
              onClick={() => {
                localStorage.setItem(DISMISS_KEY, 'true');
                setShowAppBanner(false);
              }}
              className="absolute right-3 top-3 p-1 text-gray-400 hover:text-gray-600 transition-colors z-10"
              aria-label="Dismiss app download prompt"
              data-testid="button-dismiss-app-banner"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center pt-2">
              <img src={lightThemeLogo} alt="BoxStat" className="h-14 w-auto mb-5" />
              <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
                Get the full app experience
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-500 mb-6">
                Stay in the know and enjoy more great features on the app
              </DialogDescription>
              <button
                onClick={() => {
                  const platform = getMobilePlatform();
                  if (platform === 'ios') {
                    const startedAt = Date.now();
                    let timer: ReturnType<typeof setTimeout> | null = null;
                    const cleanup = () => {
                      if (timer !== null) {
                        clearTimeout(timer);
                        timer = null;
                      }
                      window.removeEventListener('pagehide', cleanup);
                      window.removeEventListener('blur', cleanup);
                      document.removeEventListener('visibilitychange', onVisChange);
                    };
                    const onVisChange = () => {
                      if (document.hidden) cleanup();
                    };
                    window.addEventListener('pagehide', cleanup);
                    window.addEventListener('blur', cleanup);
                    document.addEventListener('visibilitychange', onVisChange);
                    timer = setTimeout(() => {
                      cleanup();
                      // If we're still here and not hidden, the app didn't take over.
                      if (!document.hidden && Date.now() - startedAt >= 2400) {
                        window.location.href = APP_STORE_URL;
                      }
                    }, 2500);
                    // Top-level navigation from inside the user gesture.
                    window.location.href = 'boxstat://';
                  } else if (platform === 'android') {
                    window.location.href = 'intent://open/#Intent;scheme=boxstat;package=com.boxstat.app;S.browser_fallback_url=' + encodeURIComponent(PLAY_STORE_URL) + ';end';
                  } else {
                    window.open(APP_STORE_URL, '_blank');
                  }
                }}
                className="w-full py-3 rounded-full bg-[#fe2c55] hover:bg-[#e5284d] text-white font-semibold text-base transition-colors"
                data-testid="button-open-boxstat-app"
              >
                Open BoxStat
              </button>
              <button
                onClick={() => {
                  localStorage.setItem(DISMISS_KEY, 'true');
                  setShowAppBanner(false);
                }}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                data-testid="button-not-now-app-banner"
              >
                Not now
              </button>
            </div>
          </DialogContent>
        </Dialog>

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

          {/* Player Profiles Section */}
          {(isCoach || isAdmin) && players.length > 0 && (
            <div className="border-t border-gray-700 my-6 pt-4">
              <h2 className="text-sm font-medium text-gray-400 mb-4 px-1">PLAYER PROFILES</h2>
            </div>
          )}

          {players.map((player: any) => {
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
                className="bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-all cursor-pointer group"
                onClick={() => handleSelectProfile("player", player.id)}
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
                      {tagConfig && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${tagConfig.className}`}
                          data-testid={`badge-status-${player.id}`}
                        >
                          {tagConfig.label}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {tagConfig ? tagConfig.description : "Player dashboard"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" />
                </CardContent>
              </Card>
            );
          })}

        </div>
        </div>
      </div>

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
