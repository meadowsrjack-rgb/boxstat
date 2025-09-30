import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, User } from "lucide-react";
import logo from "@assets/UYP Logo nback_1752703900579.png";

const UYP_RED = "#d82428";

export default function SelectProfileType() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<"parent" | "player" | null>(null);

  const createProfileMutation = useMutation({
    mutationFn: async (profileType: "parent" | "player") => {
      const response = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          profileType,
          firstName: (user as any)?.firstName || "",
          lastName: (user as any)?.lastName || "",
          profileImageUrl: (user as any)?.profileImageUrl,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create profile");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", (user as any)?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect based on profile type
      if (data.profileType === "player") {
        setLocation("/player-dashboard");
      } else {
        setLocation("/parent-dashboard");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create profile",
        variant: "destructive",
      });
    },
  });

  const handleSelectType = (type: "parent" | "player") => {
    setSelectedType(type);
    createProfileMutation.mutate(type);
  };

  return (
    <div
      className="min-h-screen text-white flex items-center justify-center p-4"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`,
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-12">
          <img src={logo} alt="UYP Basketball" className="h-20 mx-auto mb-6" />
          <h1 className="text-3xl font-bold mb-3">Welcome to UYP Basketball</h1>
          <p className="text-white/70">Are you joining as a parent or player?</p>
        </div>

        {/* Selection Cards */}
        <div className="space-y-4">
          <Card
            onClick={() => !createProfileMutation.isPending && handleSelectType("parent")}
            className={`cursor-pointer bg-white/5 border-white/10 hover:bg-white/[0.07] transition
              ${selectedType === "parent" ? "ring-2 ring-white/50" : ""}
              ${createProfileMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            data-testid="card-parent-type"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-lg grid place-items-center text-white"
                  style={{ backgroundColor: UYP_RED }}
                >
                  <Users className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg mb-1">Parent/Guardian</h3>
                  <p className="text-sm text-white/70">
                    Manage your family's basketball experience, payments, and schedules
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            onClick={() => !createProfileMutation.isPending && handleSelectType("player")}
            className={`cursor-pointer bg-white/5 border-white/10 hover:bg-white/[0.07] transition
              ${selectedType === "player" ? "ring-2 ring-white/50" : ""}
              ${createProfileMutation.isPending ? "opacity-50 cursor-not-allowed" : ""}`}
            data-testid="card-player-type"
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-lg bg-white/10 grid place-items-center text-white"
                >
                  <User className="h-7 w-7" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white text-lg mb-1">Player</h3>
                  <p className="text-sm text-white/70">
                    Access your team information, training programs, and track your progress
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {createProfileMutation.isPending && (
          <div className="text-center mt-6">
            <div className="inline-flex items-center gap-2 text-white/70">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Creating your profile...</span>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-white/50">
          <p>Your profile will be automatically synced with our system if you're using a registered email.</p>
        </div>
      </div>
    </div>
  );
}
