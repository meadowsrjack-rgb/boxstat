import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Program, Team, InsertTeam } from "@shared/schema";

export default function AdminProgramDetail() {
  const [, params] = useRoute("/admin/programs/:programId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const programId = params?.programId;

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [isEditingPricing, setIsEditingPricing] = useState(false);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

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
    divisionId: "",
    coachId: "",
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
    select: (data: any[]) => data.filter(u => u.roles?.includes('coach')),
  });

  const programTeams = teams.filter(team => team.programId === programId);

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
      const response = await apiRequest("PATCH", `/api/programs/${programId}`, updates);
      return response.json();
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
      const response = await apiRequest("POST", "/api/teams", team);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team created successfully" });
      setShowCreateTeamDialog(false);
      setTeamForm({ name: "", divisionId: "", coachId: "", season: "", notes: "" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    },
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Team> }) => {
      const response = await apiRequest("PATCH", `/api/teams/${id}`, updates);
      return response.json();
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

  const handleSaveOverview = () => {
    updateProgram.mutate(overviewForm);
  };

  const handleSavePricing = () => {
    updateProgram.mutate(pricingForm);
  };

  const handleCreateTeam = () => {
    createTeam.mutate({
      organizationId: program?.organizationId || "default-org",
      name: teamForm.name,
      programId: programId,
      divisionId: teamForm.divisionId ? parseInt(teamForm.divisionId) : undefined,
      coachId: teamForm.coachId || undefined,
      season: teamForm.season || undefined,
      notes: teamForm.notes || undefined,
      active: true,
    });
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
                        <Select
                          value={teamForm.divisionId}
                          onValueChange={(value) => setTeamForm({ ...teamForm, divisionId: value })}
                        >
                          <SelectTrigger data-testid="select-team-division">
                            <SelectValue placeholder="Select division..." />
                          </SelectTrigger>
                          <SelectContent>
                            {divisions.map((div) => (
                              <SelectItem key={div.id} value={div.id}>
                                {div.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
                      <Button variant="outline" onClick={() => setShowCreateTeamDialog(false)}>
                        Cancel
                      </Button>
                      <Button
                        onClick={handleCreateTeam}
                        disabled={!teamForm.name || createTeam.isPending}
                        data-testid="button-submit-team"
                      >
                        {createTeam.isPending ? "Creating..." : `Create ${program.subgroupLabel || "Team"}`}
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
                          <TableCell>{team.divisionId || "—"}</TableCell>
                          <TableCell>{team.coachId || "—"}</TableCell>
                          <TableCell>{team.season || "—"}</TableCell>
                          <TableCell>{team.rosterSize || 0}</TableCell>
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
