import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, User as UserIcon, Lock } from "lucide-react";
import { useMemo, useState } from "react";

type Profile = {
  id: string;
  profileType: "parent" | "player" | "coach";
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
};

const UYP_RED = "#d82428";

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
        // Passcode verified, proceed with profile selection
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
      const t = (data?.profileType as Profile["profileType"]) || "parent";
      console.log("Navigating to dashboard for profile type:", t);
      if (t === "player") setLocation("/player-dashboard");
      else if (t === "coach") setLocation("/coach-dashboard");
      else setLocation("/parent-dashboard");
    },
    onError: (error: any) => {
      console.error("Profile selection failed:", error);
    },
  });

  const handleCreateProfile = () => setLocation("/create-profile");
  
  const handleSelectProfile = async (id: string) => {
    // First, try to verify passcode using the current user's ID (this will succeed if no passcode is set)
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
      <div className="min-h-screen bg-black grid place-items-center text-white/70">
        Loading profiles…
      </div>
    );
  }

  return (
    <div
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000",
      }}
    >
      <main className="max-w-md mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ textShadow: "0 2px 30px rgba(216,36,40,0.45)" }}
            data-testid="text-page-title"
          >
            Who’s ball?
          </h1>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-32 h-32 rounded-full flex items-center justify-center mb-6 border border-white/15 bg-white/5">
              <UserIcon className="h-16 w-16 text-white/40" />
            </div>
            <h3 className="text-xl font-semibold mb-3">No profiles yet</h3>
            <p className="text-white/60 mb-8">Create your first profile to get started.</p>
            <button
              onClick={handleCreateProfile}
              className="w-16 h-16 rounded-full border-2 border-white/80 hover:border-white
                         flex items-center justify-center transition transform hover:scale-105 active:scale-95"
              style={{ boxShadow: "0 0 0 6px rgba(255,255,255,0.06)" }}
              data-testid="button-create-first-profile"
            >
              <Plus className="h-6 w-6 text-white" />
            </button>
          </div>
        ) : (
          <>
            {/* Grid of cards */}
            <div className="grid grid-cols-2 gap-8">
              {profiles.map((p, i) => {
                const centerLast = lastIsOdd && i === profiles.length - 1;
                return (
                  <div key={p.id} className={`flex justify-center ${centerLast ? "col-span-2" : ""}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectProfile(p.id)}
                      className="group relative w-[120px] select-none focus:outline-none"
                      data-testid={`card-profile-${p.id}`}
                    >
                      <div
                        className="relative w-[120px] h-[150px] rounded-xl overflow-hidden
                                   bg-white/5 ring-1 ring-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]
                                   transition transform group-hover:translate-y-[-2px]"
                      >
                        {/* compact profile-type pill (top-right) */}
                        <div
                          className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-semibold shadow-sm"
                          style={badgeStyle(p.profileType)}
                          data-testid={`badge-profile-type-${p.id}`}
                        >
                          {labelFor(p.profileType)}
                        </div>

                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage
                            src={p.profileImageUrl}
                            alt={`${p.firstName} ${p.lastName}`}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-white/10 text-white w-full h-full rounded-none grid place-items-center">
                            <div className="text-6xl">
                              {getEmojiAvatar(p.profileType)}
                            </div>
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>
                      <div className="mt-3 text-center">
                        <div className="text-[16px] font-semibold leading-none tracking-wide">
                          {p.firstName}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Create New */}
            <div className="flex justify-center pt-16">
              <button
                onClick={handleCreateProfile}
                className="w-20 h-20 rounded-full border-2 border-white/90 hover:border-white
                           flex items-center justify-center transition transform hover:scale-105 active:scale-95"
                style={{ boxShadow: "0 0 0 8px rgba(255,255,255,0.06)" }}
                data-testid="button-create-profile"
                aria-label="Create new profile"
              >
                <Plus className="h-7 w-7 text-white" />
              </button>
            </div>
          </>
        )}
      </main>

      {/* Passcode Dialog */}
      <Dialog open={passcodeDialogOpen} onOpenChange={setPasscodeDialogOpen}>
        <DialogContent className="bg-black/95 border border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Lock className="h-5 w-5" />
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
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 text-center text-2xl tracking-widest"
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
              className="border-white/40 text-white hover:bg-white/20 bg-transparent"
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasscodeSubmit}
              disabled={passcode.length !== 4 || verifyPasscodeMutation.isPending}
              style={{ backgroundColor: UYP_RED }}
              className="hover:opacity-90"
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
  return type === "player"
    ? { backgroundColor: UYP_RED, color: "#fff" }
    : { backgroundColor: "rgba(255,255,255,0.14)", color: "#fff", border: "1px solid rgba(255,255,255,0.22)" };
}

function labelFor(type: Profile["profileType"]) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function getEmojiAvatar(type: Profile["profileType"]) {
  switch (type) {
    case "player":
      return "⚽";
    case "coach":
      return "👨‍🏫";
    case "parent":
      return "👤";
    default:
      return "👤";
  }
}
