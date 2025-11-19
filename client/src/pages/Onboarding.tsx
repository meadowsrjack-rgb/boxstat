import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

// Minimal player shape for onboarding
type NewPlayer = {
  firstName: string;
  lastName: string;
  dob?: string;     // yyyy-mm-dd
  grade?: string;
  teamName?: string;
};

type Payload = {
  parent: { firstName: string; lastName: string; phone?: string };
  players: NewPlayer[];
};

export default function Onboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [parent, setParent] = useState({ 
    firstName: (user as any)?.firstName || "", 
    lastName: (user as any)?.lastName || "", 
    phone: "" 
  });
  const [players, setPlayers] = useState<NewPlayer[]>([{ firstName: "", lastName: "" }]);

  const createProfiles = useMutation({
    mutationFn: async (payload: Payload) => {
      return await apiRequest("POST", "/api/onboarding/complete", payload);
    },
    onSuccess: () => {
      toast({
        title: "Welcome to BoxStat!",
        description: "Your family profiles have been created successfully.",
      });
      // Invalidate queries to refresh user data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      
      // Redirect to payments
      setLocation("/payments");
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to complete setup. Please try again.",
        variant: "destructive",
      });
    }
  });

  const addPlayer = () => setPlayers(p => [...p, { firstName: "", lastName: "" }]);
  
  const removePlayer = (idx: number) => {
    if (players.length > 1) {
      setPlayers(p => p.filter((_, i) => i !== idx));
    }
  };

  const updatePlayer = (idx: number, field: keyof NewPlayer, value: string) => {
    setPlayers(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const submit = () => {
    // Basic validation
    if (!parent.firstName || !parent.lastName) {
      toast({
        title: "Parent Information Required",
        description: "Please fill in your first and last name.",
        variant: "destructive",
      });
      return;
    }

    const validPlayers = players.filter(p => p.firstName && p.lastName);
    if (validPlayers.length === 0) {
      toast({
        title: "Player Information Required", 
        description: "Please add at least one player with first and last name.",
        variant: "destructive",
      });
      return;
    }

    const payload: Payload = { parent, players: validPlayers };
    createProfiles.mutate(payload);
  };

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-red-600 mb-2">Welcome to BoxStat!</h1>
        <p className="text-muted-foreground">Let's set up your family profile to get started</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parent Information</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="parent-first">First name</Label>
              <Input 
                id="parent-first"
                data-testid="input-parent-firstname"
                value={parent.firstName} 
                onChange={e => setParent({ ...parent, firstName: e.target.value })} 
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="parent-last">Last name</Label>
              <Input 
                id="parent-last"
                data-testid="input-parent-lastname"
                value={parent.lastName} 
                onChange={e => setParent({ ...parent, lastName: e.target.value })} 
                placeholder="Enter your last name"
              />
            </div>
            <div>
              <Label htmlFor="parent-phone">Phone</Label>
              <Input 
                id="parent-phone"
                data-testid="input-parent-phone"
                value={parent.phone} 
                onChange={e => setParent({ ...parent, phone: e.target.value })} 
                placeholder="Enter your phone number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Players</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={addPlayer} 
            className="gap-2"
            data-testid="button-add-player"
          >
            <Plus className="h-4 w-4"/> Add Player
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {players.map((pl, idx) => (
            <div key={idx} className="rounded-lg border p-3 grid grid-cols-1 md:grid-cols-6 gap-3">
              <div className="md:col-span-2">
                <Label htmlFor={`player-${idx}-first`}>First name</Label>
                <Input 
                  id={`player-${idx}-first`}
                  data-testid={`input-player-${idx}-firstname`}
                  value={pl.firstName} 
                  onChange={e => updatePlayer(idx, "firstName", e.target.value)} 
                  placeholder="Player's first name"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor={`player-${idx}-last`}>Last name</Label>
                <Input 
                  id={`player-${idx}-last`}
                  data-testid={`input-player-${idx}-lastname`}
                  value={pl.lastName} 
                  onChange={e => updatePlayer(idx, "lastName", e.target.value)} 
                  placeholder="Player's last name"
                />
              </div>
              <div>
                <Label htmlFor={`player-${idx}-dob`}>Date of Birth</Label>
                <Input 
                  id={`player-${idx}-dob`}
                  data-testid={`input-player-${idx}-dob`}
                  type="date" 
                  value={pl.dob ?? ""} 
                  onChange={e => updatePlayer(idx, "dob", e.target.value)} 
                />
              </div>
              <div>
                <Label htmlFor={`player-${idx}-grade`}>Grade</Label>
                <Input 
                  id={`player-${idx}-grade`}
                  data-testid={`input-player-${idx}-grade`}
                  value={pl.grade ?? ""} 
                  onChange={e => updatePlayer(idx, "grade", e.target.value)} 
                  placeholder="e.g. 8th"
                />
              </div>
              <div className="md:col-span-3">
                <Label htmlFor={`player-${idx}-team`}>Team (optional)</Label>
                <Input 
                  id={`player-${idx}-team`}
                  data-testid={`input-player-${idx}-team`}
                  value={pl.teamName ?? ""} 
                  onChange={e => updatePlayer(idx, "teamName", e.target.value)} 
                  placeholder="Current team name"
                />
              </div>
              <div className="flex items-end justify-end">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removePlayer(idx)}
                  disabled={players.length === 1}
                  data-testid={`button-remove-player-${idx}`}
                >
                  <Trash className="h-4 w-4"/>
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={submit} 
          disabled={createProfiles.isPending} 
          className="gap-2"
          data-testid="button-complete-onboarding"
        >
          {createProfiles.isPending ? "Setting up..." : "Complete Setup & Continue to Payments"}
        </Button>
      </div>
    </div>
  );
}