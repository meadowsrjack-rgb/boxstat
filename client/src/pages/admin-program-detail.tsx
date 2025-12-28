import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, Settings, Users, DollarSign, Image, Calendar, Edit, Trash2, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Program, Team, InsertTeam } from "@shared/schema";

export default function AdminProgramDetail() {
  const params = useParams<{ programId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const programId = params.programId;

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamRoster, setTeamRoster] = useState<string[]>([]);

  const [overviewForm, setOverviewForm] = useState({
    name: "",
    description: "",
    coverImageUrl: "",
    seasonStartDate: "",
    seasonEndDate: "",
    hasSubgroups: true,
    subgroupLabel: "Team",
    rosterVisibility: "members",
    chatMode: "two_way",
    isActive: true,
  });

  const [pricingForm, setPricingForm] = useState({
    type: "Subscription",
    price: 0,
    billingCycle: "Monthly",
    billingModel: "Per Player",
    stripePriceId: "",
    stripeProductId: "",
    accessTag: "club_member",
    sessionCount: undefined as number | undefined,
    requiredGearProductIds: [] as string[],
  });

  const [teamForm, setTeamForm] = useState({
    name: "",
    division: "",
    coachId: "",
    assistantCoachIds: [] as string[],
    playerIds: [] as string[],
    season: "",
    notes: "",
  });

  const { data: program, isLoading: programLoading } = useQuery<Program>({
    queryKey: ["/api/programs", programId],
    enabled: !!programId,
  });

  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
  });

  const { data: storeProducts = [] } = useQuery<Program[]>({
    queryKey: ["/api/programs"],
    select: (data) => data.filter(p => p.productCategory === 'goods'),
  });

  const { data: divisions = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/divisions"],
  });

  const { data: coaches = [] } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/users"],
    select: (data: any[]) => data.filter(u => u.role === 'coach'),
  });

  const { data: allPlayers = [] } = useQuery<{ id: string; firstName: string; lastName: string }[]>({
    queryKey: ["/api/users"],
    select: (data: any[]) => data.filter(u => u.role === 'player'),
  });

  // Fetch enrollments for this program
  const { data: enrollments = [] } = useQuery<any[]>({
    queryKey: ["/api/enrollments", { programId }],
    queryFn: async () => {
      const response = await fetch(`/api/enrollments?programId=${programId}`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!programId,
  });

  // Get player IDs that are enrolled in this program
  const enrolledPlayerIds = new Set(enrollments.map((e: any) => e.profileId).filter(Boolean));
  
  // Filter to only show enrolled players, with enrolled first
  const enrolledPlayers = allPlayers.filter(p => enrolledPlayerIds.has(p.id));
  const unenrolledPlayers = allPlayers.filter(p => !enrolledPlayerIds.has(p.id));
  
  // State for player search filter
  const [playerSearchFilter, setPlayerSearchFilter] = useState("");
  
  // Combine enrolled first, then unenrolled, and apply search filter
  const filteredPlayers = [...enrolledPlayers, ...unenrolledPlayers].filter(player => {
    if (!playerSearchFilter) return true;
    const fullName = `${player.firstName} ${player.lastName}`.toLowerCase();
    return fullName.includes(playerSearchFilter.toLowerCase());
  });

  const programTeams = teams.filter(team => team.programId === programId);

  // Helper to get coach name from ID
  const getCoachName = (coachId?: string) => {
    if (!coachId) return "—";
    const coach = coaches.find(c => c.id === coachId);
    return coach ? `${coach.firstName} ${coach.lastName}` : coachId;
  };

  useEffect(() => {
    if (program) {
      setOverviewForm({
        name: program.name || "",
        description: program.description || "",
        coverImageUrl: program.coverImageUrl || "",
        seasonStartDate: program.seasonStartDate || "",
        seasonEndDate: program.seasonEndDate || "",
        hasSubgroups: program.hasSubgroups ?? true,
        subgroupLabel: program.subgroupLabel || "Team",
        rosterVisibility: program.rosterVisibility || "members",
        chatMode: program.chatMode || "two_way",
        isActive: program.isActive ?? true,
      });
      setPricingForm({
        type: program.type || "Subscription",
        price: program.price || 0,
        billingCycle: program.billingCycle || "Monthly",
        billingModel: program.billingModel || "Per Player",
        stripePriceId: program.stripePriceId || "",
        stripeProductId: program.stripeProductId || "",
        accessTag: program.accessTag || "club_member",
        sessionCount: program.sessionCount,
        requiredGearProductIds: program.requiredGearProductIds || [],
      });
    }
  }, [program]);

  const updateProgram = useMutation({
    mutationFn: async (updates: Partial<Program>) => {
      return await apiRequest("PATCH", `/api/programs/${programId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs", programId] });
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program updated successfully" });
      setIsEditingOverview(false);
      setIsEditingPricing(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update program", description: error.message, variant: "destructive" });
    },
  });

  const createTeam = useMutation({
    mutationFn: async (team: InsertTeam) => {
      return await apiRequest("POST", "/api/teams", team);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team created successfully" });
      setShowCreateTeamDialog(false);
      setTeamForm({ name: "", division: "", coachId: "", assistantCoachIds: [], playerIds: [], season: "", notes: "" });
      setPlayerSearchFilter("");
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    },
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Team> }) => {
      return await apiRequest("PATCH", `/api/teams/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team updated successfully" });
      setEditingTeam(null);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update team", description: error.message, variant: "destructive" });
    },
  });

  const deleteTeam = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/teams/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete team", description: error.message, variant: "destructive" });
    },
  });

  // Fetch roster for the team being edited
  const { data: editingTeamRoster = [], isLoading: rosterLoading } = useQuery<{ playerId: string }[]>({
    queryKey: ["/api/teams", editingTeam?.id, "roster"],
    enabled: !!editingTeam?.id,
  });

  // Update roster when editingTeamRoster changes
  useEffect(() => {
    if (editingTeamRoster.length > 0) {
      setTeamRoster(editingTeamRoster.map(r => r.playerId));
    } else if (editingTeam) {
      setTeamRoster([]);
    }
  }, [editingTeamRoster, editingTeam?.id]);

  // Clear roster when dialog closes
  useEffect(() => {
    if (!editingTeam) {
      setTeamRoster([]);
    }
  }, [editingTeam]);

  const updateRoster = useMutation({
    mutationFn: async ({ teamId, playerIds }: { teamId: number; playerIds: string[] }) => {
      return await apiRequest("PUT", `/api/teams/${teamId}/roster`, { playerIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", variables.teamId, "roster"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update roster", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveOverview = () => {
    updateProgram.mutate(overviewForm);
  };

  const handleSavePricing = () => {
    updateProgram.mutate(pricingForm);
  };

  const handleCreateTeam = async () => {
    setIsCreatingTeam(true);
    try {
      // Use coordinator endpoint that handles team creation + player assignments + enrollments
      const result = await apiRequest("POST", "/api/teams/with-assignments", {
        teamData: {
          organizationId: program?.organizationId || "default-org",
          name: teamForm.name,
          programId: programId,
          division: teamForm.division || undefined,
          coachId: teamForm.coachId || undefined,
          assistantCoachIds: teamForm.assistantCoachIds,
          season: teamForm.season || undefined,
          notes: teamForm.notes || undefined,
          active: true,
        },
        playerIds: teamForm.playerIds,
      });
      
      // Show appropriate feedback based on results
      const { assignments, enrollments } = result;
      const hasFailures = assignments?.failed?.length > 0 || enrollments?.failed?.length > 0;
      
      if (hasFailures) {
        const failedCount = (assignments?.failed?.length || 0) + (enrollments?.failed?.length || 0);
        toast({ 
          title: "Team created with warnings", 
          description: `${failedCount} operation(s) could not be completed. Some players may need manual enrollment.`,
          variant: "destructive" 
        });
      } else {
        const enrolledCount = enrollments?.success?.length || 0;
        const assignedCount = assignments?.success?.length || 0;
        let description = "Team has been created.";
        if (assignedCount > 0) {
          description = `${assignedCount} player(s) assigned`;
          if (enrolledCount > 0) {
            description += ` and enrolled in the program.`;
          } else {
            description += `.`;
          }
        }
        toast({ title: "Team created successfully", description });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/product-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
      setShowCreateTeamDialog(false);
      setTeamForm({ name: "", division: "", coachId: "", assistantCoachIds: [], playerIds: [], season: "", notes: "" });
      setPlayerSearchFilter("");
    } catch (error) {
      toast({ title: "Failed to create team", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsCreatingTeam(false);
    }
  };

  if (programLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-gray-500">Program not found</p>
        <Button onClick={() => navigate("/admin-dashboard")} data-testid="button-back-to-admin">
          Back to Admin Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin-dashboard")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900" data-testid="text-program-title">
              {program.name}
            </h1>
            <p className="text-sm text-gray-500">
              {program.productCategory === 'service' ? 'Program' : 'Store Item'} Management
            </p>
          </div>
          <Badge variant={program.isActive ? "default" : "secondary"} data-testid="badge-program-status">
            {program.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview" data-testid="tab-overview" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="teams" data-testid="tab-teams" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {program.subgroupLabel || "Teams"}
            </TabsTrigger>
            <TabsTrigger value="pricing" data-testid="tab-pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Product Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Program Details</CardTitle>
                  <CardDescription>Basic information about this program</CardDescription>
                </div>
                <Button
                  variant={isEditingOverview ? "default" : "outline"}
                  onClick={() => isEditingOverview ? handleSaveOverview() : setIsEditingOverview(true)}
                  disabled={updateProgram.isPending}
                  data-testid="button-edit-overview"
                >
                  {isEditingOverview ? (updateProgram.isPending ? "Saving..." : "Save Changes") : "Edit"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="program-name">Program Name</Label>
                    <Input
                      id="program-name"
                      value={overviewForm.name}
                      onChange={(e) => setOverviewForm({ ...overviewForm, name: e.target.value })}
                      disabled={!isEditingOverview}
                      data-testid="input-program-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cover-image">Cover Image URL</Label>
                    <Input
                      id="cover-image"
                      value={overviewForm.coverImageUrl}
                      onChange={(e) => setOverviewForm({ ...overviewForm, coverImageUrl: e.target.value })}
                      disabled={!isEditingOverview}
                      placeholder="https://example.com/image.jpg"
                      data-testid="input-cover-image"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={overviewForm.description}
                    onChange={(e) => setOverviewForm({ ...overviewForm, description: e.target.value })}
                    disabled={!isEditingOverview}
                    rows={3}
                    data-testid="input-description"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="season-start">Season Start Date</Label>
                    <Input
                      id="season-start"
                      type="date"
                      value={overviewForm.seasonStartDate?.split('T')[0] || ""}
                      onChange={(e) => setOverviewForm({ ...overviewForm, seasonStartDate: e.target.value })}
                      disabled={!isEditingOverview}
                      data-testid="input-season-start"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="season-end">Season End Date</Label>
                    <Input
                      id="season-end"
                      type="date"
                      value={overviewForm.seasonEndDate?.split('T')[0] || ""}
                      onChange={(e) => setOverviewForm({ ...overviewForm, seasonEndDate: e.target.value })}
                      disabled={!isEditingOverview}
                      data-testid="input-season-end"
                    />
                  </div>
                </div>

                {overviewForm.coverImageUrl && (
                  <div className="space-y-2">
                    <Label>Cover Image Preview</Label>
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={overviewForm.coverImageUrl}
                        alt="Cover"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={overviewForm.isActive}
                    onCheckedChange={(checked) => setOverviewForm({ ...overviewForm, isActive: checked })}
                    disabled={!isEditingOverview}
                    data-testid="switch-active"
                  />
                  <Label htmlFor="active">Program is Active</Label>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Social Settings</CardTitle>
                <CardDescription>Configure how teams/groups work within this program</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has-subgroups"
                    checked={overviewForm.hasSubgroups}
                    onCheckedChange={(checked) => setOverviewForm({ ...overviewForm, hasSubgroups: checked })}
                    disabled={!isEditingOverview}
                    data-testid="switch-has-subgroups"
                  />
                  <Label htmlFor="has-subgroups">This program has subgroups (Teams/Levels/Groups)</Label>
                </div>

                {overviewForm.hasSubgroups && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Subgroup Label</Label>
                      <Select
                        value={overviewForm.subgroupLabel}
                        onValueChange={(value) => setOverviewForm({ ...overviewForm, subgroupLabel: value })}
                        disabled={!isEditingOverview}
                      >
                        <SelectTrigger data-testid="select-subgroup-label">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Team">Team</SelectItem>
                          <SelectItem value="Level">Level</SelectItem>
                          <SelectItem value="Group">Group</SelectItem>
                          <SelectItem value="Class">Class</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Roster Visibility</Label>
                      <Select
                        value={overviewForm.rosterVisibility}
                        onValueChange={(value) => setOverviewForm({ ...overviewForm, rosterVisibility: value })}
                        disabled={!isEditingOverview}
                      >
                        <SelectTrigger data-testid="select-roster-visibility">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="public">Public</SelectItem>
                          <SelectItem value="members">Members Only</SelectItem>
                          <SelectItem value="hidden">Hidden</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Chat Mode</Label>
                      <Select
                        value={overviewForm.chatMode}
                        onValueChange={(value) => setOverviewForm({ ...overviewForm, chatMode: value })}
                        disabled={!isEditingOverview}
                      >
                        <SelectTrigger data-testid="select-chat-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="disabled">Disabled</SelectItem>
                          <SelectItem value="announcements">Announcements Only</SelectItem>
                          <SelectItem value="two_way">Two-Way Chat</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {isEditingOverview && (
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditingOverview(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{program.subgroupLabel || "Teams"} & Rosters</CardTitle>
                  <CardDescription>
                    Manage {(program.subgroupLabel || "Team").toLowerCase()}s within this program
                  </CardDescription>
                </div>
                <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
                  <DialogTrigger asChild>
                    <Button data-testid="button-create-team">
                      <Plus className="h-4 w-4 mr-2" />
                      Add {program.subgroupLabel || "Team"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New {program.subgroupLabel || "Team"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="team-name">{program.subgroupLabel || "Team"} Name</Label>
                        <Input
                          id="team-name"
                          value={teamForm.name}
                          onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                          placeholder={`e.g., ${program.subgroupLabel === 'Level' ? 'Beginner' : '10u Black'}`}
                          data-testid="input-team-name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="division">Division (Optional)</Label>
                        <Input
                          id="division"
                          value={teamForm.division}
                          onChange={(e) => setTeamForm({ ...teamForm, division: e.target.value })}
                          placeholder="e.g., U10, U12, Varsity"
                          data-testid="input-team-division"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="coach">Head Coach (Optional)</Label>
                        <Select
                          value={teamForm.coachId}
                          onValueChange={(value) => setTeamForm({ ...teamForm, coachId: value })}
                        >
                          <SelectTrigger data-testid="select-team-coach">
                            <SelectValue placeholder="Select coach..." />
                          </SelectTrigger>
                          <SelectContent>
                            {coaches.map((coach) => (
                              <SelectItem key={coach.id} value={coach.id}>
                                {coach.firstName} {coach.lastName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Assistant Coaches (Optional)</Label>
                        <div className="border rounded-md p-3 max-h-32 overflow-y-auto space-y-2">
                          {(() => {
                            const availableAssistants = coaches.filter(c => c.id !== teamForm.coachId);
                            if (coaches.length === 0) {
                              return <p className="text-sm text-muted-foreground">No coaches available</p>;
                            }
                            if (availableAssistants.length === 0) {
                              return <p className="text-sm text-muted-foreground">No other coaches available (all coaches are assigned as head coach)</p>;
                            }
                            return availableAssistants.map((coach) => (
                              <label
                                key={coach.id}
                                className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={teamForm.assistantCoachIds.includes(coach.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setTeamForm({
                                        ...teamForm,
                                        assistantCoachIds: [...teamForm.assistantCoachIds, coach.id]
                                      });
                                    } else {
                                      setTeamForm({
                                        ...teamForm,
                                        assistantCoachIds: teamForm.assistantCoachIds.filter(id => id !== coach.id)
                                      });
                                    }
                                  }}
                                  className="h-4 w-4"
                                  data-testid={`checkbox-assistant-coach-${coach.id}`}
                                />
                                <span className="text-sm">{coach.firstName} {coach.lastName}</span>
                              </label>
                            ));
                          })()}
                        </div>
                        {teamForm.assistantCoachIds.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {teamForm.assistantCoachIds.length} assistant coach{teamForm.assistantCoachIds.length !== 1 ? 'es' : ''} selected
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Assign Players (Optional)</Label>
                        <Input
                          placeholder="Search players..."
                          value={playerSearchFilter}
                          onChange={(e) => setPlayerSearchFilter(e.target.value)}
                          className="mb-2"
                          data-testid="input-player-search"
                        />
                        <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-1">
                          {filteredPlayers.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                              {playerSearchFilter ? "No players match your search" : "No players available"}
                            </p>
                          ) : (
                            <>
                              {enrolledPlayers.length > 0 && !playerSearchFilter && (
                                <p className="text-xs font-semibold text-green-600 mb-1">Enrolled in this program ({enrolledPlayers.length})</p>
                              )}
                              {filteredPlayers.map((player) => {
                                const isEnrolled = enrolledPlayerIds.has(player.id);
                                return (
                                  <label
                                    key={player.id}
                                    className={`flex items-center gap-2 cursor-pointer hover:bg-muted/50 p-1.5 rounded ${isEnrolled ? 'bg-green-50' : ''}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={teamForm.playerIds.includes(player.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setTeamForm({
                                            ...teamForm,
                                            playerIds: [...teamForm.playerIds, player.id]
                                          });
                                        } else {
                                          setTeamForm({
                                            ...teamForm,
                                            playerIds: teamForm.playerIds.filter(id => id !== player.id)
                                          });
                                        }
                                      }}
                                      className="h-4 w-4"
                                      data-testid={`checkbox-player-${player.id}`}
                                    />
                                    <span className="text-sm flex-1">{player.firstName} {player.lastName}</span>
                                    {isEnrolled && (
                                      <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                                        Enrolled
                                      </Badge>
                                    )}
                                  </label>
                                );
                              })}
                            </>
                          )}
                        </div>
                        {teamForm.playerIds.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {teamForm.playerIds.length} player{teamForm.playerIds.length !== 1 ? 's' : ''} selected - will be assigned and enrolled in this program
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="season">Season (Optional)</Label>
                        <Input
                          id="season"
                          value={teamForm.season}
                          onChange={(e) => setTeamForm({ ...teamForm, season: e.target.value })}
                          placeholder="e.g., Spring 2025"
                          data-testid="input-team-season"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={teamForm.notes}
                          onChange={(e) => setTeamForm({ ...teamForm, notes: e.target.value })}
                          data-testid="input-team-notes"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setShowCreateTeamDialog(false); setPlayerSearchFilter(""); }}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTeam}
                        disabled={!teamForm.name || isCreatingTeam}
                        data-testid="button-submit-team"
                      >
                        {isCreatingTeam ? "Creating..." : `Create ${program.subgroupLabel || "Team"}`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {programTeams.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No {(program.subgroupLabel || "team").toLowerCase()}s yet</p>
                    <p className="text-sm">Click "Add {program.subgroupLabel || "Team"}" to create one</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Division</TableHead>
                        <TableHead>Coach</TableHead>
                        <TableHead>Season</TableHead>
                        <TableHead>Roster Size</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {programTeams.map((team) => (
                        <TableRow key={team.id} data-testid={`row-team-${team.id}`}>
                          <TableCell className="font-medium" data-testid={`text-team-name-${team.id}`}>
                            {team.name}
                          </TableCell>
                          <TableCell>{team.division || "—"}</TableCell>
                          <TableCell>{getCoachName(team.coachId)}</TableCell>
                          <TableCell>{team.season || "—"}</TableCell>
                          <TableCell>{(team as any).rosterCount ?? team.rosterSize ?? 0}</TableCell>
                          <TableCell>
                            <Badge variant={team.active ? "default" : "secondary"}>
                              {team.active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-team-menu-${team.id}`}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditingTeam(team)}
                                  data-testid={`button-edit-team-${team.id}`}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteTeam.mutate(team.id)}
                                  data-testid={`button-delete-team-${team.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Edit Team Dialog */}
            <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit {program.subgroupLabel || "Team"}</DialogTitle>
                </DialogHeader>
                {editingTeam && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-name">{program.subgroupLabel || "Team"} Name</Label>
                      <Input
                        id="edit-team-name"
                        value={editingTeam.name}
                        onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
                        data-testid="input-edit-team-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-division">Division (Optional)</Label>
                      <Input
                        id="edit-division"
                        value={editingTeam.division || ""}
                        onChange={(e) => setEditingTeam({ ...editingTeam, division: e.target.value })}
                        placeholder="e.g., U10, U12, Varsity"
                        data-testid="input-edit-team-division"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-coach">Head Coach (Optional)</Label>
                      <Select
                        value={editingTeam.coachId || ""}
                        onValueChange={(value) => setEditingTeam({ ...editingTeam, coachId: value })}
                      >
                        <SelectTrigger data-testid="select-edit-team-coach">
                          <SelectValue placeholder="Select coach..." />
                        </SelectTrigger>
                        <SelectContent>
                          {coaches.map((coach) => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.firstName} {coach.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-season">Season (Optional)</Label>
                      <Input
                        id="edit-season"
                        value={editingTeam.season || ""}
                        onChange={(e) => setEditingTeam({ ...editingTeam, season: e.target.value })}
                        placeholder="e.g., Spring 2025"
                        data-testid="input-edit-team-season"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-notes">Notes (Optional)</Label>
                      <Textarea
                        id="edit-notes"
                        value={editingTeam.notes || ""}
                        onChange={(e) => setEditingTeam({ ...editingTeam, notes: e.target.value })}
                        data-testid="input-edit-team-notes"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label htmlFor="edit-active">Active</Label>
                      <Switch
                        id="edit-active"
                        checked={editingTeam.active ?? true}
                        onCheckedChange={(checked) => setEditingTeam({ ...editingTeam, active: checked })}
                        data-testid="switch-edit-team-active"
                      />
                    </div>

                    {/* Roster Management Section */}
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label>Roster ({teamRoster.length} players)</Label>
                        {updateRoster.isPending && (
                          <span className="text-xs text-blue-600">Saving roster...</span>
                        )}
                      </div>
                      {rosterLoading ? (
                        <div className="border rounded-md p-4 text-center text-gray-500">
                          Loading roster...
                        </div>
                      ) : (
                        <div className="border rounded-md max-h-64 overflow-y-auto" data-testid="edit-team-roster">
                          {/* Current Roster */}
                          {teamRoster.length > 0 && (
                            <div className="p-2 border-b bg-blue-50">
                              <p className="text-xs font-semibold text-blue-700 mb-2">Currently Assigned:</p>
                              <div className="flex flex-wrap gap-1">
                                {teamRoster.map(playerId => {
                                  const player = allPlayers.find((p: any) => p.id === playerId);
                                  return player ? (
                                    <div key={playerId} className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                      <span>{player.firstName} {player.lastName}</span>
                                      <button
                                        type="button"
                                        className="ml-1 text-blue-600 hover:text-blue-800"
                                        onClick={() => setTeamRoster(teamRoster.filter(id => id !== playerId))}
                                        data-testid={`button-remove-roster-${playerId}`}
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ) : null;
                                })}
                              </div>
                            </div>
                          )}
                          
                          {/* Available Players */}
                          <div className="p-2 space-y-1">
                            <p className="text-xs font-semibold text-gray-500 mb-2">Add Players:</p>
                            {allPlayers.length === 0 ? (
                              <p className="text-sm text-gray-500">No players available</p>
                            ) : (
                              allPlayers.map((player: any) => {
                                const isOnRoster = teamRoster.includes(player.id);
                                return (
                                  <div key={player.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isOnRoster}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setTeamRoster([...teamRoster, player.id]);
                                        } else {
                                          setTeamRoster(teamRoster.filter(id => id !== player.id));
                                        }
                                      }}
                                      data-testid={`checkbox-roster-${player.id}`}
                                    />
                                    <label className={`text-sm cursor-pointer ${isOnRoster ? 'text-blue-700 font-medium' : ''}`}>
                                      {player.firstName} {player.lastName}
                                    </label>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingTeam(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (editingTeam) {
                        await updateTeam.mutateAsync({
                          id: editingTeam.id,
                          updates: {
                            name: editingTeam.name,
                            division: editingTeam.division || undefined,
                            coachId: editingTeam.coachId || undefined,
                            season: editingTeam.season || undefined,
                            notes: editingTeam.notes || undefined,
                            active: editingTeam.active,
                          }
                        });
                        await updateRoster.mutateAsync({ teamId: editingTeam.id, playerIds: teamRoster });
                      }
                    }}
                    disabled={!editingTeam?.name || updateTeam.isPending || updateRoster.isPending}
                    data-testid="button-save-team"
                  >
                    {updateTeam.isPending || updateRoster.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent value="pricing" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Product Settings</CardTitle>
                  <CardDescription>Configure pricing and subscription settings for this program</CardDescription>
                </div>
                <Button
                  variant={isEditingPricing ? "default" : "outline"}
                  onClick={() => isEditingPricing ? handleSavePricing() : setIsEditingPricing(true)}
                  disabled={updateProgram.isPending}
                  data-testid="button-edit-pricing"
                >
                  {isEditingPricing ? (updateProgram.isPending ? "Saving..." : "Save Changes") : "Edit"}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Pricing Model</Label>
                    <Select
                      value={pricingForm.type}
                      onValueChange={(value) => setPricingForm({ ...pricingForm, type: value })}
                      disabled={!isEditingPricing}
                    >
                      <SelectTrigger data-testid="select-pricing-model">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Subscription">Subscription (Recurring)</SelectItem>
                        <SelectItem value="One-Time">One-Time Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price (in cents)</Label>
                    <Input
                      id="price"
                      type="number"
                      value={pricingForm.price || ""}
                      onChange={(e) => setPricingForm({ ...pricingForm, price: parseInt(e.target.value) || 0 })}
                      disabled={!isEditingPricing}
                      placeholder="14900 = $149.00"
                      data-testid="input-price"
                    />
                    {pricingForm.price > 0 && (
                      <p className="text-sm text-gray-500">
                        ${(pricingForm.price / 100).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>

                {pricingForm.type === "Subscription" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Billing Frequency</Label>
                      <Select
                        value={pricingForm.billingCycle}
                        onValueChange={(value) => setPricingForm({ ...pricingForm, billingCycle: value })}
                        disabled={!isEditingPricing}
                      >
                        <SelectTrigger data-testid="select-billing-cycle">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Quarterly">Quarterly</SelectItem>
                          <SelectItem value="6-Month">Every 6 Months</SelectItem>
                          <SelectItem value="Yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Billing Model</Label>
                      <Select
                        value={pricingForm.billingModel}
                        onValueChange={(value) => setPricingForm({ ...pricingForm, billingModel: value })}
                        disabled={!isEditingPricing}
                      >
                        <SelectTrigger data-testid="select-billing-model">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Per Player">Per Player</SelectItem>
                          <SelectItem value="Per Family">Per Family</SelectItem>
                          <SelectItem value="Organization-Wide">Organization-Wide</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {pricingForm.type === "One-Time" && (
                  <div className="space-y-2">
                    <Label htmlFor="session-count">Session Count (Credits)</Label>
                    <Input
                      id="session-count"
                      type="number"
                      value={pricingForm.sessionCount || ""}
                      onChange={(e) => setPricingForm({ ...pricingForm, sessionCount: parseInt(e.target.value) || undefined })}
                      disabled={!isEditingPricing}
                      placeholder="e.g., 10 sessions"
                      data-testid="input-session-count"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Access Tag</Label>
                  <Select
                    value={pricingForm.accessTag}
                    onValueChange={(value) => setPricingForm({ ...pricingForm, accessTag: value })}
                    disabled={!isEditingPricing}
                  >
                    <SelectTrigger data-testid="select-access-tag">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="club_member">Club Member (Subscription)</SelectItem>
                      <SelectItem value="pack_holder">Pack Holder (Credits)</SelectItem>
                      <SelectItem value="none">No Access Tag</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Stripe Integration</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="stripe-price-id">Stripe Price ID</Label>
                      <Input
                        id="stripe-price-id"
                        value={pricingForm.stripePriceId}
                        onChange={(e) => setPricingForm({ ...pricingForm, stripePriceId: e.target.value })}
                        disabled={!isEditingPricing}
                        placeholder="price_..."
                        data-testid="input-stripe-price-id"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stripe-product-id">Stripe Product ID</Label>
                      <Input
                        id="stripe-product-id"
                        value={pricingForm.stripeProductId}
                        onChange={(e) => setPricingForm({ ...pricingForm, stripeProductId: e.target.value })}
                        disabled={!isEditingPricing}
                        placeholder="prod_..."
                        data-testid="input-stripe-product-id"
                      />
                    </div>
                  </div>
                </div>

                {isEditingPricing && (
                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditingPricing(false)}>
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Required Gear</CardTitle>
                <CardDescription>
                  Select store items that are required for this program. These will be added to checkout automatically.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {storeProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    No store products available. Add products in the Store tab first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {storeProducts.map((product) => (
                      <div key={product.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                        <Switch
                          id={`gear-${product.id}`}
                          checked={pricingForm.requiredGearProductIds.includes(product.id)}
                          onCheckedChange={(checked) => {
                            const newIds = checked
                              ? [...pricingForm.requiredGearProductIds, product.id]
                              : pricingForm.requiredGearProductIds.filter(id => id !== product.id);
                            setPricingForm({ ...pricingForm, requiredGearProductIds: newIds });
                          }}
                          disabled={!isEditingPricing}
                          data-testid={`switch-gear-${product.id}`}
                        />
                        <Label htmlFor={`gear-${product.id}`} className="flex-1">
                          {product.name}
                          {product.price && (
                            <span className="text-gray-500 ml-2">
                              (${(product.price / 100).toFixed(2)})
                            </span>
                          )}
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
