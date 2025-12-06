import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Shield, ChevronRight, Settings, UserPlus, LogOut, Crown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ProfileGateway() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const { data: players = [], isLoading: playersLoading } = useQuery<any[]>({
    queryKey: ["/api/account/players"],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || playersLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full" />
      </div>
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-6 safe-top safe-bottom flex flex-col">
      {/* Settings gear icon in top right */}
      <div className="absolute top-6 right-6 safe-top">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button 
              className="p-2 text-gray-500 hover:text-gray-300 transition-colors"
              data-testid="button-settings-menu"
            >
              <Settings className="w-5 h-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
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

      <div className="max-w-md mx-auto pt-12 flex-1">
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
                <h3 className="text-lg font-semibold text-white">Account</h3>
                <p className="text-sm text-gray-400">Settings & billing</p>
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
            const isPending = player.paymentStatus === "pending";
            
            return (
              <Card 
                key={player.id}
                className={`bg-gray-800/50 border-gray-700 hover:bg-gray-800 transition-all cursor-pointer group ${isPending ? 'border-amber-500/50' : ''}`}
                onClick={() => handleSelectProfile("player", player.id)}
                data-testid={`card-player-${player.id}`}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="relative">
                    <Avatar className="w-16 h-16">
                      <AvatarImage src={player.profileImageUrl} alt={`${player.firstName} ${player.lastName}`} />
                      <AvatarFallback className="bg-gradient-to-br from-purple-500 to-purple-600 text-white text-xl font-bold">
                        {player.firstName?.[0]}{player.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    {isPending && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">
                        {player.firstName} {player.lastName}
                      </h3>
                      {isPending && (
                        <Badge 
                          variant="outline" 
                          className="bg-amber-500/20 text-amber-400 border-amber-500/50 text-xs"
                          data-testid={`badge-not-active-${player.id}`}
                        >
                          Not Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {isPending ? "Registration incomplete" : "Player Dashboard"}
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
  );
}
