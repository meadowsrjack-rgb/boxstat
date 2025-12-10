import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, ChevronRight, Settings, UserPlus, LogOut, Crown, Bug } from "lucide-react";
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
import { apiRequest } from "@/lib/queryClient";

export default function ProfileGateway() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [bugDialogOpen, setBugDialogOpen] = useState(false);
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");

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

  const { data: players = [], isLoading: playersLoading } = useQuery<any[]>({
    queryKey: ["/api/account/players"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || playersLoading) {
    return (
      <>
        <div className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #111827, #000000)' }} />
        <div className="fixed inset-0 w-full h-full z-10 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
        </div>
      </>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const userRole = (user as any)?.role;
  const isCoach = userRole === "coach" || userRole === "admin";
  const isAdmin = userRole === "admin";

  const handleSelectProfile = (type: string, playerId?: string) => {
    localStorage.setItem("lastViewedProfileType", type);
    
    if (type === "account") {
      localStorage.removeItem("selectedPlayerId");
      localStorage.removeItem("viewingAsParent");
      setLocation("/parent-dashboard");
    } else if (type === "coach") {
      setLocation("/coach-dashboard");
    } else if (type === "admin") {
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
    localStorage.removeItem('authToken');
    localStorage.removeItem('selectedPlayerId');
    localStorage.removeItem('viewingAsParent');
    localStorage.removeItem('lastViewedProfileType');
    setLocation('/');
  };

  return (
    <>
      {/* FIX: DETACHED BACKGROUND LAYER - never moves with keyboard */}
      <div className="fixed inset-0 w-full h-full z-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, #111827, #000000)' }} />

      {/* Main Content Wrapper */}
      <div className="fixed inset-0 h-[100dvh] w-full overflow-y-auto overflow-x-hidden flex flex-col overscroll-y-none z-10 bg-transparent">
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
        <div className="max-w-md mx-auto pt-4 pb-8">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-white mb-2" data-testid="text-who-is-watching">Who's ball?</h1>
          </div>

        <div className="space-y-4">
          {/* Account Card - styled like other profiles */}
          <Card 
            className="bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-all cursor-pointer group"
            onClick={() => handleSelectProfile("account")}
            data-testid="card-account-profile"
          >
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white">
                  {(user as any)?.firstName} {(user as any)?.lastName}
                </h3>
                <p className="text-sm text-gray-400">Account management</p>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">Coach View</h3>
                  <p className="text-sm text-gray-400">Manage teams, rosters & evaluations</p>
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
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

          {/* Add Player Button - always visible */}
          <div className="flex flex-col items-center gap-4 pt-4">
            <button
              onClick={() => setLocation("/add-player")}
              className="relative w-20 h-20 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 hover:ring-2 hover:ring-gray-600 transition-all group"
              data-testid="button-add-player-icon"
            >
              <UserPlus className="w-8 h-8 text-gray-500" />
            </button>
          </div>
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
