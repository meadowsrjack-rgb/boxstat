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
};

const UYP_RED = "#d82428";

export default function ProfileSelection() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: profiles = [], isLoading } = useQuery<Profile[]>({
    queryKey: [`/api/profiles/${user?.id}`],
    enabled: !!user?.id,
  });

  const selectProfileMutation = useMutation({
    mutationFn: async (profileId: string) =>
      apiRequest(`/api/profiles/${profileId}/select`, { method: "POST" }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      const t = (data?.profileType as Profile["profileType"]) || "parent";
      if (t === "player") setLocation("/player-dashboard");
      else if (t === "coach") setLocation("/coach-dashboard");
      else setLocation("/parent-dashboard");
    },
  });

  const handleCreateProfile = () => setLocation("/create-profile");
  const handleSelectProfile = (id: string) => selectProfileMutation.mutate(id);
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
            className="text-4xl font-extrabold tracking-tight"
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
            <div className="grid grid-cols-2 gap-6">
              {profiles.map((p, i) => {
                const centerLast = lastIsOdd && i === profiles.length - 1;
                return (
                  <div key={p.id} className={`flex justify-center ${centerLast ? "col-span-2" : ""}`}>
                    <button
                      type="button"
                      onClick={() => handleSelectProfile(p.id)}
                      className="group relative w-[156px] select-none focus:outline-none"
                      data-testid={`card-profile-${p.id}`}
                    >
                      <div
                        className="relative w-[156px] h-[196px] rounded-xl overflow-hidden
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
                            src={p.profileImageUrl || getDefaultImage(p.profileType)}
                            alt={`${p.firstName} ${p.lastName}`}
                            className="object-cover w-full h-full"
                          />
                          <AvatarFallback className="bg-white/10 text-white text-lg w-full h-full rounded-none grid place-items-center">
                            {p.firstName?.[0]}
                            {p.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </div>
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
function getDefaultImage(type: Profile["profileType"]) {
  const url = (w = 600, h = 750) =>
    `https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=${w}&h=${h}&fit=crop&crop=face`;
  if (type === "coach")
    return "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&h=750&fit=crop&crop=face";
  return url();
}
