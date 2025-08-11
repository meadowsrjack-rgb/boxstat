import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, User as UserIcon } from "lucide-react";
import { useMemo } from "react";

type Profile = {
  id: string;
  profileType: "parent" | "player" | "coach";
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  teamId?: number;
  jerseyNumber?: number;
  position?: string;
};

const UYP_RED = "#d82428";

// Helper functions
const badgeStyle = (profileType: Profile["profileType"]) => {
  switch (profileType) {
    case "player":
      return { backgroundColor: "#10b981", color: "white" };
    case "coach":
      return { backgroundColor: "#3b82f6", color: "white" };
    case "parent":
    default:
      return { backgroundColor: "#6b7280", color: "white" };
  }
};

const labelFor = (profileType: Profile["profileType"]) => {
  switch (profileType) {
    case "player":
      return "Player";
    case "coach":
      return "Coach";
    case "parent":
    default:
      return "Parent";
  }
};

const getDefaultImage = (profileType: Profile["profileType"]) => {
  // Return a default image URL based on profile type
  switch (profileType) {
    case "player":
      return "/images/default-player.jpg";
    case "coach":
      return "/images/default-coach.jpg";
    case "parent":
    default:
      return "/images/default-parent.jpg";
  }
};

export default function ProfileSelection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Fetch profiles
  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: [`/api/profiles/${(user as any)?.id}`],
    enabled: !!(user as any)?.id,
  });

  // Select profile
  const selectProfileMutation = useMutation({
    mutationFn: async (profileId: string) => {
      const response = await apiRequest("POST", `/api/profiles/${profileId}/select`);
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      const profileType = (data?.profileType as Profile["profileType"]) || "parent";
      if (profileType === "player") setLocation("/player-dashboard");
      else if (profileType === "coach") setLocation("/coach-dashboard");
      else setLocation("/parent-dashboard");
    },
    onError: (err) => console.error("Error selecting profile:", err),
  });

  const handleSelectProfile = (profileId: string) => {
    selectProfileMutation.mutate(profileId);
  };

  const handleCreateProfile = () => setLocation("/create-profile");

  const lastIsOdd = useMemo(() => profiles.length % 2 === 1, [profiles.length]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
          <p className="mt-2 text-gray-400">Loading profiles...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen text-white"
      style={{
        // subtle radial glow with UYP red
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`,
      }}
    >
      <main className="max-w-md mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl font-extrabold tracking-tight"
            style={{ textShadow: "0 2px 30px rgba(216,36,40,0.45)" }}
            data-testid="text-page-title"
          >
            Who's ball?
          </h1>
        </div>

        {/* Empty state */}
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
            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-6">
              {profiles.map((p, idx) => {
                const isOddLonely = lastIsOdd && idx === profiles.length - 1;
                return (
                  <div
                    key={p.id}
                    className={`flex justify-center ${isOddLonely ? "col-span-2" : ""}`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectProfile(p.id)}
                      className="group relative w-[156px] select-none focus:outline-none"
                      data-testid={`card-profile-${p.id}`}
                    >
                      {/* Photo card */}
                      <div
                        className="relative w-[156px] h-[196px] rounded-xl overflow-hidden
                                   bg-white/5 ring-1 ring-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]
                                   transition transform group-hover:translate-y-[-2px] group-active:translate-y-[0px]"
                      >
                        {/* badge (top-right) */}
                        <div
                          className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[11px] font-semibold
                                     shadow-sm"
                          style={badgeStyle(p.profileType)}
                          data-testid={`badge-profile-type-${p.id}`}
                        >
                          {labelFor(p.profileType)}
                        </div>

                        {/* image */}
                        <Avatar className="w-full h-full rounded-none">
                          <AvatarImage
                            src={p.profileImageUrl || getDefaultImage(p.profileType)}
                            alt={`${p.firstName} ${p.lastName}`}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-white/10 text-white text-lg w-full h-full rounded-none grid place-items-center">
                            {p.firstName?.[0]}
                            {p.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>

                        {/* subtle gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                        {/* focus ring */}
                        <div className="absolute inset-0 rounded-xl ring-0 ring-[var(--ring)] group-focus-visible:ring-2" />
                      </div>

                      {/* Name */}
                      <div className="mt-3 text-center">
                        <div className="text-[18px] font-semibold leading-none tracking-wide">
                          {p.firstName}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Create New Profile */}
            <div className="flex justify-center pt-16">
              <button
                onClick={handleCreateProfile}
                className="w-20 h-20 rounded-full border-2 border-white/90 hover:border-white
                           flex items-center justify-center transition transform hover:scale-105 active:scale-95"
                style={{ boxShadow: "0 0 0 6px rgba(255,255,255,0.06)" }}
                data-testid="button-create-profile"
              >
                <Plus className="h-6 w-6 text-white" />
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}