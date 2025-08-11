import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, User, Users, Briefcase, UserPlus } from "lucide-react";
import { Profile } from "@shared/schema";

export default function ProfileSelection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Get all profiles for the current account
  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["/api/profiles", user?.id],
    enabled: !!user?.id,
  });

  // Select a profile and navigate to appropriate dashboard
  const selectProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await fetch(`/api/profiles/${profileId}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      return response.json();
    },
    onSuccess: (data: any) => {
      // Update the user context with selected profile
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Navigate based on profile type
      const profileType = data.profileType;
      switch (profileType) {
        case "player":
          setLocation("/player-dashboard");
          break;
        case "parent":
          setLocation("/parent-dashboard");
          break;
        case "coach":
          setLocation("/admin-dashboard");
          break;
        default:
          setLocation("/");
      }
    },
  });

  const handleCreateProfile = () => {
    setLocation("/create-profile");
  };

  const handleProfileSelect = (profile: any) => {
    selectProfileMutation.mutate(profile.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Select Profile</h1>
              <p className="text-sm text-gray-600">Choose which profile to use</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/settings")}
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Current Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Account: {(user as any)?.email}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              You have {Array.isArray(profiles) ? profiles.length : 0} profile{Array.isArray(profiles) && profiles.length !== 1 ? 's' : ''} in this account
            </p>
          </CardContent>
        </Card>

        {/* Profiles Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Your Profiles</h2>
            <Button
              onClick={handleCreateProfile}
              size="sm"
              data-testid="button-create-profile"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Profile
            </Button>
          </div>

          {!Array.isArray(profiles) || profiles.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <UserPlus className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No profiles yet</h3>
                <p className="text-gray-600 text-center mb-4">
                  Create your first profile to get started with UYP Basketball
                </p>
                <Button onClick={handleCreateProfile} data-testid="button-create-first-profile">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Profile
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {profiles.map((profile: any) => (
                <Card 
                  key={profile.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleProfileSelect(profile)}
                  data-testid={`profile-card-${profile.id}`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {profile.firstName} {profile.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {profile.profileType}
                        </p>
                      </div>
                      
                      <Badge 
                        variant={profile.profileType === 'player' ? 'default' : 
                                profile.profileType === 'parent' ? 'secondary' : 'outline'}
                        className="capitalize"
                      >
                        {profile.profileType}
                      </Badge>
                    </div>

                    {/* Profile-specific info */}
                    {profile.profileType === 'player' && profile.teamId && (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Team:</span> {/* Team name would be loaded separately */}
                        </p>
                        {profile.jerseyNumber && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Jersey:</span> #{profile.jerseyNumber}
                          </p>
                        )}
                        {profile.position && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Position:</span> {profile.position}
                          </p>
                        )}
                      </div>
                    )}

                    {profile.profileType === 'parent' && (
                      <p className="text-sm text-gray-600">
                        Manage family profiles and payments
                      </p>
                    )}

                    {profile.profileType === 'coach' && (
                      <p className="text-sm text-gray-600">
                        Team management and coaching tools
                      </p>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <Button 
                        className="w-full" 
                        disabled={selectProfileMutation.isPending}
                        data-testid={`button-select-${profile.id}`}
                      >
                        {selectProfileMutation.isPending ? "Selecting..." : "Select Profile"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Example Account Note */}
        {profiles.length > 0 && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <h4 className="font-medium text-blue-900 mb-2">Multi-Profile Account</h4>
              <p className="text-sm text-blue-800">
                This account demonstrates the unified profile system where parents can manage 
                multiple children, coaches can access team tools, and players have their own spaces - 
                all within one account.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}