import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash, ArrowLeft, Users, ChevronRight, CheckCircle2, Loader2, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { DateScrollPicker } from "react-date-wheel-picker";

// Minimal player shape for onboarding
type NewPlayer = {
  id?: string; // Added after creation
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

type Program = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  pricingModel?: string;
};

type PackageSelection = {
  childUserId: string;
  programId: string;
};

export default function FamilyOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [createdPlayerIds, setCreatedPlayerIds] = useState<string[]>([]);
  
  const [parent, setParent] = useState({ 
    firstName: (user as any)?.firstName || "", 
    lastName: (user as any)?.lastName || "", 
    phone: (user as any)?.phoneNumber || "" 
  });
  
  const [players, setPlayers] = useState<NewPlayer[]>([
    { firstName: "", lastName: "" }
  ]);

  // Package selections: Map of player index to program ID
  const [packageSelections, setPackageSelections] = useState<Record<number, string>>({});

  // Track which player's DOB picker is open
  const [showDobPickerIdx, setShowDobPickerIdx] = useState<number | null>(null);

  // Fetch programs for step 2
  const { data: programs = [], isLoading: programsLoading } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    enabled: currentStep === 2,
  });

  // Group programs by category
  const programsByCategory = programs.reduce((acc, program) => {
    const category = program.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(program);
    return acc;
  }, {} as Record<string, Program[]>);

  const createProfiles = useMutation({
    mutationFn: async (payload: OnboardingPayload) => {
      return await apiRequest("POST", "/api/onboarding/complete", payload);
    },
    onSuccess: (data: any) => {
      toast({
        title: "Players Created!",
        description: "Now let's select packages for each player.",
      });
      
      // Extract created player IDs from response
      const playerIds = data.players?.map((p: any) => p.id) || [];
      setCreatedPlayerIds(playerIds);
      
      // Update players with their IDs
      setPlayers(prev => prev.map((p, i) => ({ ...p, id: playerIds[i] })));
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profiles"] });
      
      // Move to step 2
      setCurrentStep(2);
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message || "Failed to create player profiles. Please try again.",
        variant: "destructive",
      });
    }
  });

  const savePackageSelections = useMutation({
    mutationFn: async (selections: PackageSelection[]) => {
      return await apiRequest("POST", "/api/family/package-selections", { selections });
    },
    onSuccess: () => {
      toast({
        title: "Package Selections Saved!",
        description: "Redirecting to payment...",
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/family/package-selections"] });
      
      // Redirect to payments page
      setTimeout(() => setLocation("/payments"), 500);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Selections",
        description: error.message || "Please try again.",
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
      // Remove package selection for this player
      const newSelections = { ...packageSelections };
      delete newSelections[idx];
      // Reindex remaining selections
      const reindexed: Record<number, string> = {};
      Object.keys(newSelections).forEach(key => {
        const numKey = parseInt(key);
        if (numKey > idx) {
          reindexed[numKey - 1] = newSelections[numKey];
        } else {
          reindexed[numKey] = newSelections[numKey];
        }
      });
      setPackageSelections(reindexed);
    }
  };

  const updatePlayer = (idx: number, field: keyof NewPlayer, value: string) => {
    setPlayers(prev => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const updateParent = (field: keyof typeof parent, value: string) => {
    setParent(prev => ({ ...prev, [field]: value }));
  };

  const handleStepOneSubmit = () => {
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

  const handleStepTwoSubmit = () => {
    // Validate all players have a package selected
    const validPlayers = players.filter(p => p.firstName && p.lastName);
    const allSelected = validPlayers.every((_, idx) => packageSelections[idx]);
    
    if (!allSelected) {
      toast({
        title: "Missing Selections",
        description: "Please select a package for each player.",
        variant: "destructive",
      });
      return;
    }

    // Build selections array
    const selections: PackageSelection[] = validPlayers.map((player, idx) => ({
      childUserId: player.id!,
      programId: packageSelections[idx],
    }));

    savePackageSelections.mutate(selections);
  };

  return (
    <div 
      className="min-h-screen-safe text-white safe-bottom safe-top"
      style={{
        background: `radial-gradient(1200px 600px at 50% -10%, rgba(216,36,40,0.15), transparent 60%), #000`
      }}
    >
      {/* Header */}
      <header className="sticky z-10 bg-black/50 backdrop-blur-sm border-b border-white/10" style={{ top: 'var(--safe-area-top, 0px)' }}>
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => currentStep === 1 ? setLocation("/profile-selection") : setCurrentStep(1)}
              className="p-2 rounded-md border border-white/15 hover:bg-white/5 transition"
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-3 flex-1">
              <Users className="h-6 w-6 text-red-500" />
              <h1 className="text-xl font-bold">Family Setup</h1>
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2 text-sm">
              <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-red-500' : 'text-white/50'}`}>
                <CheckCircle2 className={`h-4 w-4 ${currentStep > 1 ? 'text-green-500' : ''}`} />
                <span>Player Info</span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
              <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-red-500' : 'text-white/50'}`}>
                <CheckCircle2 className={`h-4 w-4 ${currentStep > 2 ? 'text-green-500' : ''}`} />
                <span>Packages</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 pb-16">
        <div className="space-y-6 pt-6">
          
          {/* Step 1: Player Information */}
          {currentStep === 1 && (
            <>
              {/* Welcome Message */}
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Welcome to BoxStat!</h2>
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
                          <button
                            type="button"
                            onClick={() => setShowDobPickerIdx(idx)}
                            data-testid={`input-player-dob-${idx}`}
                            className="w-full h-10 px-3 bg-white/5 border border-white/20 text-white rounded-md flex items-center justify-between hover:bg-white/10 transition-colors"
                          >
                            <span className={player.dob ? "text-white" : "text-white/40"}>
                              {player.dob ? new Date(player.dob).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date of birth"}
                            </span>
                            <Calendar className="w-4 h-4 text-white/40" />
                          </button>
                          
                          <Dialog open={showDobPickerIdx === idx} onOpenChange={(open) => !open && setShowDobPickerIdx(null)}>
                            <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
                              <DialogHeader>
                                <DialogTitle className="text-white text-center">Select Date of Birth</DialogTitle>
                              </DialogHeader>
                              <div className="py-4 flex justify-center date-wheel-picker-dark">
                                <DateScrollPicker
                                  defaultYear={player.dob ? new Date(player.dob).getFullYear() : 2015}
                                  defaultMonth={(player.dob ? new Date(player.dob).getMonth() : 0) + 1}
                                  defaultDay={player.dob ? new Date(player.dob).getDate() : 1}
                                  startYear={1950}
                                  endYear={new Date().getFullYear()}
                                  dateTimeFormatOptions={{ month: 'short' }}
                                  highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                                  onDateChange={(date: Date) => {
                                    updatePlayer(idx, "dob", date.toISOString().split('T')[0]);
                                  }}
                                />
                              </div>
                              <div className="flex gap-3">
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="flex-1 border-gray-600 text-gray-600 hover:bg-gray-800"
                                  onClick={() => setShowDobPickerIdx(null)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => setShowDobPickerIdx(null)}
                                >
                                  Confirm
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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
                  onClick={handleStepOneSubmit}
                  disabled={createProfiles.isPending}
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  data-testid="button-next-to-packages"
                >
                  {createProfiles.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating Players...
                    </>
                  ) : (
                    <>
                      Continue to Package Selection
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {/* Step 2: Package Selection */}
          {currentStep === 2 && (
            <>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Select Packages for Your Players</h2>
                <p className="text-white/70 max-w-2xl mx-auto">
                  Choose the right program for each of your players. You'll complete payment on the next page.
                </p>
              </div>

              {programsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-red-500" data-testid="loader-programs" />
                </div>
              ) : (
                <>
                  {players.filter(p => p.firstName && p.lastName).map((player, idx) => {
                    const selectedProgramId = packageSelections[idx];
                    const selectedProgram = programs.find(p => p.id === selectedProgramId);
                    
                    return (
                      <Card 
                        key={idx} 
                        className="bg-white/5 border-white/10 shadow-[0_8px_30px_rgba(0,0,0,.35)]"
                      >
                        <CardHeader>
                          <CardTitle className="text-white flex items-center justify-between">
                            <span>Package for {player.firstName} {player.lastName}</span>
                            {selectedProgram && (
                              <span className="text-sm font-normal text-green-400" data-testid={`text-selected-program-${idx}`}>
                                ✓ Selected
                              </span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label className="text-white/80">Select Program *</Label>
                            <Select
                              value={packageSelections[idx] || ""}
                              onValueChange={(value) => setPackageSelections(prev => ({ ...prev, [idx]: value }))}
                            >
                              <SelectTrigger 
                                className="bg-white/5 border-white/20 text-white"
                                data-testid={`select-package-${idx}`}
                              >
                                <SelectValue placeholder="Choose a program..." />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-white/20">
                                {Object.entries(programsByCategory).map(([category, categoryPrograms]) => (
                                  <div key={category}>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-white/60 uppercase">
                                      {category}
                                    </div>
                                    {categoryPrograms.map((program) => (
                                      <SelectItem 
                                        key={program.id} 
                                        value={program.id}
                                        className="text-white hover:bg-white/10"
                                        data-testid={`option-program-${program.id}`}
                                      >
                                        <div className="flex items-center justify-between w-full gap-4">
                                          <span>{program.name}</span>
                                          {program.price && (
                                            <span className="text-white/60 text-sm">
                                              ${(program.price / 100).toFixed(2)}
                                              {program.pricingModel === "monthly" && "/mo"}
                                            </span>
                                          )}
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {selectedProgram && (
                            <div className="rounded-lg bg-white/5 p-4 space-y-2 border border-white/10">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-white">{selectedProgram.name}</p>
                                  {selectedProgram.description && (
                                    <p className="text-sm text-white/60 mt-1">{selectedProgram.description}</p>
                                  )}
                                </div>
                                {selectedProgram.price && (
                                  <div className="text-right">
                                    <p className="text-lg font-bold text-white">
                                      ${(selectedProgram.price / 100).toFixed(2)}
                                    </p>
                                    {selectedProgram.pricingModel && (
                                      <p className="text-xs text-white/60">{selectedProgram.pricingModel}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-between pt-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentStep(1)}
                  className="text-white hover:bg-white/10"
                  data-testid="button-back-to-players"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <Button
                  onClick={handleStepTwoSubmit}
                  disabled={savePackageSelections.isPending || programsLoading}
                  className="bg-red-600 hover:bg-red-700 text-white gap-2"
                  data-testid="button-complete-package-selection"
                >
                  {savePackageSelections.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving Selections...
                    </>
                  ) : (
                    <>
                      Continue to Payment
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>

              {/* Help Text */}
              <div className="text-center text-sm text-white/60 pt-4">
                <p>
                  You'll complete payment on the next page. All selections can be modified later if needed.
                </p>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
