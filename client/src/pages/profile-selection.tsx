import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, User as UserIcon, Lock, Basketball, Crown, Users, Trophy } from "lucide-react";
import { useMemo, useState } from "react";

type Profile = {
  id: string;
  profileType: "parent" | "player" | "coach";
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
};

const UYP_RED = "#d82428";
const UYP_BLUE = "#1e40af";

export default function ProfileSelection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [passcodeDialogOpen, setPasscodeDialogOpen] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [passcode, setPasscode] = useState("");

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: [`/api/profiles/${user?.id}`],
    enabled: !!user?.id,
  });

  const verifyPasscodeMutation = useMutation({
    mutationFn: async ({ profileId, passcode }: { profileId: string; passcode: string }) => {
      return await apiRequest(`/api/users/${user?.id}/verify-passcode`, {
        method: "POST",
        body: JSON.stringify({ passcode }),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: (data: any, variables) => {
      if (data.verified) {
        selectProfileMutation.mutate(variables.profileId);
        setPasscodeDialogOpen(false);
        setPasscode("");
        setSelectedProfileId(null);
      } else {
        toast({
          title: "Incorrect Passcode",
          description: "Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      console.error("Passcode verification failed:", error);
      toast({
        title: "Verification Failed",
        description: "Could not verify passcode. Please try again.",
        variant: "destructive",
      });
    },
  });

  const selectProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      console.log("Selecting profile:", profileId);
      const result = await apiRequest(`/api/profiles/${profileId}/select`, { method: "POST" });
      console.log("Profile selection result:", result);
      return result;
    },
    onSuccess: (data: any) => {
      console.log("Profile selected successfully:", data);
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      const profileType = (data?.profileType as Profile["profileType"]) || "parent";
      console.log("Navigating to dashboard for profile type:", profileType);

      // Navigate to appropriate dashboard
      switch (profileType) {
        case "player":
          setLocation("/player-dashboard");
          break;
        case "coach":
          setLocation("/coach-dashboard");
          break;
        case "admin":
          setLocation("/admin-dashboard");
          break;
        default:
          setLocation("/parent-dashboard");
      }
    },
    onError: (error: any) => {
      console.error("Profile selection failed:", error);
      toast({
        title: "Profile Selection Failed",
        description: "Could not switch to selected profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateProfile = () => setLocation("/create-profile");

  const handleSelectProfile = async (id: string) => {
    setSelectedProfileId(id);

    try {
      const verificationResult = await apiRequest(`/api/users/${user?.id}/verify-passcode`, {
        method: "POST",
        body: JSON.stringify({ passcode: "" }),
        headers: { "Content-Type": "application/json" },
      });

      if (verificationResult.verified) {
        // No passcode required, proceed directly
        selectProfileMutation.mutate(id);
      } else {
        // Passcode required, show dialog
        setPasscodeDialogOpen(true);
      }
    } catch (error) {
      console.error("Error checking passcode requirement:", error);
      // Fallback: proceed without passcode check
      selectProfileMutation.mutate(id);
    }
  };

  const handlePasscodeSubmit = () => {
    if (selectedProfileId && passcode.length === 4) {
      verifyPasscodeMutation.mutate({ profileId: selectedProfileId, passcode });
    }
  };

  const handleInputChange = (value: string) => {
    // Only allow digits and limit to 4 characters
    const digits = value.replace(/\D/g, '').slice(0, 4);
    setPasscode(digits);
  };

  const lastIsOdd = useMemo(() => profiles.length % 2 === 1, [profiles.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 grid place-items-center text-white/70">
        <div className="text-center">
          <Basketball className="h-16 w-16 mx-auto mb-4 animate-bounce text-blue-400" />
          <p className="text-lg">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Basketball className="h-12 w-12 text-blue-400 mr-3" />
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-red-400 bg-clip-text text-transparent">
              UYP Basketball
            </h1>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-white/90 mb-2">
            Choose Your Profile
          </h2>
          <p className="text-white/60">Select which profile you'd like to use today</p>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-16">
            <div className="mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-6 border-2 border-blue-400/30 bg-blue-400/10">
              <UserIcon className="h-16 w-16 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold mb-3 text-white">No profiles yet</h3>
            <p className="text-white/60 mb-8">Create your first profile to get started with UYP Basketball.</p>
            <Button
              onClick={handleCreateProfile}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Profile
            </Button>
          </div>
        ) : (
          <>
            {/* Grid of profile cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {profiles.map((profile, i) => {
                const centerLast = lastIsOdd && i === profiles.length - 1;
                return (
                  <div key={profile.id} className={`flex justify-center ${centerLast ? "md:col-span-2 lg:col-span-3" : ""}`}>
                    <div
                      onClick={() => handleSelectProfile(profile.id)}
                      className="group relative w-full max-w-[280px] cursor-pointer select-none focus:outline-none"
                      data-testid={`card-profile-${profile.id}`}
                    >
                      <div className="relative w-full h-[320px] rounded-2xl overflow-hidden bg-gradient-to-br from-white/10 to-white/5 ring-1 ring-white/20 shadow-2xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-blue-500/25">
                        {/* Profile type badge */}
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm"
                             style={badgeStyle(profile.profileType)}>
                          {getProfileIcon(profile.profileType)}
                          <span className="ml-2">{labelFor(profile.profileType)}</span>
                        </div>

                        {/* Profile image */}
                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage
                            src={profile.profileImageUrl}
                            alt={`${profile.firstName} ${profile.lastName}`}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500/20 to-red-500/20 text-white w-full h-full rounded-none grid place-items-center">
                            <div className="text-6xl">
                              {getEmojiAvatar(profile.profileType)}
                            </div>
                          </AvatarFallback>
                        </Avatar>

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                        {/* Profile info */}
                        <div className="absolute bottom-0 left-0 right-0 p-6">
                          <h3 className="text-xl font-bold text-white mb-2">
                            {profile.firstName} {profile.lastName}
                          </h3>
                          <p className="text-white/80 text-sm">
                            {getProfileDescription(profile.profileType)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Create New Profile */}
            <div className="flex justify-center">
              <Button
                onClick={handleCreateProfile}
                size="lg"
                variant="outline"
                className="border-2 border-blue-400/50 text-blue-400 hover:bg-blue-400/10 hover:border-blue-400 px-8 py-3 rounded-full transition-all duration-300"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create New Profile
              </Button>
            </div>
          </>
        )}
      </main>

      {/* Passcode Dialog */}
      <Dialog open={passcodeDialogOpen} onOpenChange={setPasscodeDialogOpen}>
        <DialogContent className="bg-gray-900/95 border border-blue-400/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Lock className="h-5 w-5 text-blue-400" />
              Enter Passcode
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              This profile is protected with a 4-digit passcode.
            </p>
            <div className="space-y-2">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 4-digit passcode"
                value={passcode}
                onChange={(e) => handleInputChange(e.target.value)}
                maxLength={4}
                className="bg-white/10 border-blue-400/30 text-white placeholder:text-white/50 text-center text-2xl tracking-widest focus:border-blue-400"
                style={{ letterSpacing: '0.5em' }}
                data-testid="input-profile-passcode"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setPasscodeDialogOpen(false);
                setPasscode("");
                setSelectedProfileId(null);
              }}
              className="border-blue-400/40 text-blue-400 hover:bg-blue-400/20 bg-transparent"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasscodeSubmit}
              disabled={passcode.length !== 4 || verifyPasscodeMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="button-verify-passcode"
            >
              {verifyPasscodeMutation.isPending ? "Verifying..." : "Continue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function badgeStyle(type: Profile["profileType"]): React.CSSProperties {
  switch (type) {
    case "player":
      return { 
        backgroundColor: UYP_RED, 
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.2)"
      };
    case "coach":
      return { 
        backgroundColor: UYP_BLUE, 
        color: "#fff",
        border: "1px solid rgba(255,255,255,0.2)"
      };
    case "parent":
      return { 
        backgroundColor: "rgba(255,255,255,0.15)", 
        color: "#fff", 
        border: "1px solid rgba(255,255,255,0.3)" 
      };
    default:
      return { 
        backgroundColor: "rgba(255,255,255,0.1)", 
        color: "#fff" 
      };
  }
}

function getProfileIcon(type: Profile["profileType"]) {
  switch (type) {
    case "player":
      return "🏀";
    case "coach":
      return "👨‍🏫";
    case "parent":
      return "👤";
    default:
      return "👤";
  }
}

function labelFor(type: Profile["profileType"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getProfileDescription(type: Profile["profileType"]) {
  switch (type) {
    case "player":
      return "Player Profile";
    case "coach":
      return "Coach Profile";
    case "parent":
      return "Parent Profile";
    default:
      return "Profile";
  }
}

function getEmojiAvatar(type: Profile["profileType"]) {
  switch (type) {
    case "player":
      return "🏀";
    case "coach":
      return "👨‍🏫";
    case "parent":
      return "👤";
    default:
      return "👤";
  }
}
