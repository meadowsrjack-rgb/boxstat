import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, User } from "lucide-react";

export default function ProfileSelection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Get user's profiles
  const { data: profiles = [], isLoading } = useQuery<Array<{
    id: string;
    profileType: "parent" | "player" | "coach";
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    teamId?: number;
    jerseyNumber?: number;
    position?: string;
  }>>({
    queryKey: [`/api/profiles/${user?.id}`],
    enabled: !!user?.id,
  });

  // Profile selection mutation
  const selectProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      console.log("Selecting profile:", profileId);
      const response = await apiRequest(`/api/profiles/${profileId}/select`, {
        method: "POST",
      });
      console.log("Profile selection response:", response);
      return response;
    },
    onSuccess: (data) => {
      console.log("Profile selected successfully:", data);
      // Invalidate auth user query to get updated profile status
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to appropriate dashboard based on profile type
      const profileType = data.profileType || "parent";
      if (profileType === "player") {
        setLocation("/player-dashboard");
      } else if (profileType === "coach") {
        setLocation("/coach-dashboard");
      } else {
        setLocation("/parent-dashboard");
      }
    },
    onError: (error) => {
      console.error("Error selecting profile:", error);
    },
  });

  const handleSelectProfile = (profileId: string) => {
    selectProfileMutation.mutate(profileId);
  };

  const handleCreateProfile = () => {
    setLocation("/create-profile");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-2 text-gray-400">Loading profiles...</p>
        </div>
      </div>
    );
  }

  const getProfileTypeBadgeColor = (profileType: string) => {
    switch (profileType) {
      case "player":
        return "bg-red-500 text-white";
      case "coach":
        return "bg-gray-600 text-white";
      default:
        return "bg-green-600 text-white";
    }
  };

  const getDefaultImage = (profileType: string) => {
    switch (profileType) {
      case "player":
        return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=250&fit=crop&crop=face";
      case "coach":
        return "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=250&fit=crop&crop=face";
      default:
        return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=250&fit=crop&crop=face";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="max-w-md mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2" data-testid="text-page-title">
            Who's ball?
          </h1>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center mb-6">
              <User className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-white mb-4">No profiles yet</h3>
            <p className="text-gray-400 mb-8">Create your first profile to get started</p>
            
            {/* Create Profile Button */}
            <div className="flex justify-center">
              <button
                onClick={handleCreateProfile}
                className="w-16 h-16 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600 hover:border-gray-500 transition-colors"
                data-testid="button-create-first-profile"
              >
                <Plus className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Grid */}
            <div className="grid grid-cols-2 gap-6 justify-items-center">
              {profiles.slice(0, 4).map((profile) => (
                <div 
                  key={profile.id} 
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => handleSelectProfile(profile.id)}
                  data-testid={`card-profile-${profile.id}`}
                >
                  <div className="relative">
                    {/* Profile Image */}
                    <div className="w-32 h-40 rounded-lg overflow-hidden mb-3 relative">
                      <Avatar className="w-full h-full rounded-lg">
                        <AvatarImage 
                          src={profile.profileImageUrl || getDefaultImage(profile.profileType)}
                          alt={`${profile.firstName} ${profile.lastName}`}
                          className="object-cover w-full h-full"
                        />
                        <AvatarFallback className="bg-gray-700 text-white text-lg w-full h-full rounded-lg flex items-center justify-center">
                          {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Profile Type Badge */}
                      <Badge 
                        className={`absolute top-2 left-2 ${getProfileTypeBadgeColor(profile.profileType)} text-xs px-2 py-1 rounded-sm`}
                        data-testid={`badge-profile-type-${profile.id}`}
                      >
                        {profile.profileType.charAt(0).toUpperCase() + profile.profileType.slice(1)}
                      </Badge>
                    </div>
                    
                    {/* Profile Name */}
                    <h3 className="text-lg font-semibold text-center text-white" data-testid={`text-profile-name-${profile.id}`}>
                      {profile.firstName}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Center single profile if odd number */}
            {profiles.length > 4 && profiles.slice(4).map((profile) => (
              <div key={profile.id} className="flex justify-center">
                <div 
                  className="cursor-pointer transition-transform hover:scale-105"
                  onClick={() => handleSelectProfile(profile.id)}
                  data-testid={`card-profile-${profile.id}`}
                >
                  <div className="relative">
                    {/* Profile Image */}
                    <div className="w-32 h-40 rounded-lg overflow-hidden mb-3 relative">
                      <Avatar className="w-full h-full rounded-lg">
                        <AvatarImage 
                          src={profile.profileImageUrl || getDefaultImage(profile.profileType)}
                          alt={`${profile.firstName} ${profile.lastName}`}
                          className="object-cover w-full h-full"
                        />
                        <AvatarFallback className="bg-gray-700 text-white text-lg w-full h-full rounded-lg flex items-center justify-center">
                          {profile.firstName.charAt(0)}{profile.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Profile Type Badge */}
                      <Badge 
                        className={`absolute top-2 left-2 ${getProfileTypeBadgeColor(profile.profileType)} text-xs px-2 py-1 rounded-sm`}
                        data-testid={`badge-profile-type-${profile.id}`}
                      >
                        {profile.profileType.charAt(0).toUpperCase() + profile.profileType.slice(1)}
                      </Badge>
                    </div>
                    
                    {/* Profile Name */}
                    <h3 className="text-lg font-semibold text-center text-white" data-testid={`text-profile-name-${profile.id}`}>
                      {profile.firstName}
                    </h3>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Create New Profile Button - Circular at bottom */}
            <div className="flex justify-center pt-12">
              <button
                onClick={handleCreateProfile}
                className="w-16 h-16 bg-transparent hover:bg-gray-800 rounded-full flex items-center justify-center border-2 border-white hover:border-gray-400 transition-colors"
                data-testid="button-create-profile"
              >
                <Plus className="h-6 w-6 text-white" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}