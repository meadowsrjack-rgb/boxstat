import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash, ArrowLeft, Users } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Minimal player shape for onboarding
type NewPlayer = {
  firstName: string;
  lastName: string;
  dob?: string;     // yyyy-mm-dd
  grade?: string;
  teamName?: string;
};

type OnboardingPayload = {
  parent: { firstName: string; lastName: string; phone?: string };
  players: NewPlayer[];
};

export default function FamilyOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [parent, setParent] = useState({ 
    firstName: (user as any)?.firstName || "", 
    lastName: (user as any)?.lastName || "", 
    phone: (user as any)?.phoneNumber || "" 
  });
  
  const [players, setPlayers] = useState<NewPlayer[]>([
    { firstName: "", lastName: "" }
  ]);

  const createProfiles = useMutation({
    mutationFn: async (payload: OnboardingPayload) => {
      return await apiRequest("POST", "/api/onboarding/complete", payload);
    },
    onSuccess: () => {
      toast({
        title: "Family Setup Complete!",
        description: "Your family profiles have been created successfully.",
      });
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      
      // Redirect to payments/dashboard
      setLocation("/payments");
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete family setup. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addPlayer = () => {
    setPlayers(prev => [...prev, { firstName: "", lastName: "" }]);
  };
  
  const removePlayer = (idx: number) => {
    if (players.length > 1) {
      setPlayers(prev => prev.filter((_, i) => i !== idx));
    }
  };

  const updatePlayer = (idx: number, field: keyof NewPlayer, value: string) => {
    setPlayers(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const updateParent = (field: keyof typeof parent, value: string) => {
    setParent(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // Basic validation
    if (!parent.firstName || !parent.lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in parent's first and last name.",
        variant: "destructive",
      });
      return;
    }

    const validPlayers = players.filter(p => p.firstName && p.lastName);
    if (validPlayers.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please add at least one player with first and last name.",
        variant: "destructive",
      });
      return;
    }

    const payload: OnboardingPayload = { 
      parent, 
      players: validPlayers 
    };
    
    createProfiles.mutate(payload);
  };

  return (
    <div 
      className="min-h-screen text-white"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`
      }}
    >
      {/* Header */}
      <header className="sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation("/profile-selection")}
              className="p-2 rounded-md border border-white/15 hover:bg-white/5 transition"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-red-500" />
              <h1 className="text-xl font-bold">Family Setup</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        <div className="space-y-6 pt-4">
          
          {/* Welcome Message */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">Welcome to UYP Basketball!</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Let's set up your family profiles. You'll be able to manage all your players, 
              register for programs, and track their progress from one account.
            </p>
          </div>

          {/* Parent Information */}
          <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
            <CardHeader>
              <CardTitle className="text-white">Parent / Guardian Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-white/80">First name *</Label>
                  <Input
                    value={parent.firstName}
                    onChange={(e) => updateParent("firstName", e.target.value)}
                    placeholder="First name"
                    data-testid="input-parent-first-name"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Last name *</Label>
                  <Input
                    value={parent.lastName}
                    onChange={(e) => updateParent("lastName", e.target.value)}
                    placeholder="Last name"
                    data-testid="input-parent-last-name"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Phone number</Label>
                  <Input
                    value={parent.phone}
                    onChange={(e) => updateParent("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    data-testid="input-parent-phone"
                    className="bg-white/5 border-white/20 text-white placeholder-white/40"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players */}
          <Card className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white">Your Players</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={addPlayer} 
                className="gap-2 border-white/20 text-white hover:bg-white/10"
                data-testid="button-add-player"
              >
                <Plus className="h-4 w-4" /> Add Player
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {players.map((player, idx) => (
                <div 
                  key={idx} 
                  className="rounded-lg border border-white/10 bg-white/5 p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-white/80">First name *</Label>
                      <Input
                        value={player.firstName}
                        onChange={(e) => updatePlayer(idx, "firstName", e.target.value)}
                        placeholder="First name"
                        data-testid={`input-player-first-name-${idx}`}
                        className="bg-white/5 border-white/20 text-white placeholder-white/40"
                      />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label className="text-white/80">Last name *</Label>
                      <Input
                        value={player.lastName}
                        onChange={(e) => updatePlayer(idx, "lastName", e.target.value)}
                        placeholder="Last name"
                        data-testid={`input-player-last-name-${idx}`}
                        className="bg-white/5 border-white/20 text-white placeholder-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Date of Birth</Label>
                      <Input
                        type="date"
                        value={player.dob ?? ""}
                        onChange={(e) => updatePlayer(idx, "dob", e.target.value)}
                        data-testid={`input-player-dob-${idx}`}
                        className="bg-white/5 border-white/20 text-white placeholder-white/40"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/80">Grade</Label>
                      <Input
                        value={player.grade ?? ""}
                        onChange={(e) => updatePlayer(idx, "grade", e.target.value)}
                        placeholder="9th"
                        data-testid={`input-player-grade-${idx}`}
                        className="bg-white/5 border-white/20 text-white placeholder-white/40"
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-white/80">Current Team (if any)</Label>
                      <Input
                        value={player.teamName ?? ""}
                        onChange={(e) => updatePlayer(idx, "teamName", e.target.value)}
                        placeholder="Team name"
                        data-testid={`input-player-team-${idx}`}
                        className="bg-white/5 border-white/20 text-white placeholder-white/40"
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      {players.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removePlayer(idx)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          data-testid={`button-remove-player-${idx}`}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {players.length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <p>No players added yet. Click "Add Player" to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/profile-selection")}
              className="border-white/20 text-white hover:bg-white/10"
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createProfiles.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-complete-setup"
            >
              {createProfiles.isPending ? "Setting Up..." : "Complete Setup & Continue"}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-center text-sm text-white/60 pt-4">
            <p>
              After setup, you'll be able to register your players for programs and track their progress. 
              You can always add or modify player information later.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}