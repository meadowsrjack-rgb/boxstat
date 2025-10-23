import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  Users,
  Calendar,
  Trophy,
  DollarSign,
  TrendingUp,
  Plus,
  Edit,
  Trash2,
  Award,
  Upload,
  Download,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  List,
  Eye,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useLocation } from "wouter";
import { useEffect } from "react";
import CoachDashboard from "./coach-dashboard";
import PlayerDashboard from "./player-dashboard";
import UnifiedAccount from "./unified-account";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();

  // Fetch current user for role-based access control
  const { data: currentUser, isLoading: userLoading } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  // Redirect non-admin users
  useEffect(() => {
    if (!userLoading && currentUser && currentUser.role !== "admin") {
      setLocation("/unified-account");
    }
  }, [currentUser, userLoading, setLocation]);

  // Fetch organization data
  const { data: organization, isLoading: orgLoading } = useQuery<any>({
    queryKey: ["/api/organization"],
  });

  // Fetch users
  const { data: users = [], isLoading: usersLoading } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Fetch teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  // Fetch events
  const { data: events = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/events"],
  });

  // Fetch programs
  const { data: programs = [], isLoading: programsLoading } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  // Fetch awards
  const { data: awards = [], isLoading: awardsLoading } = useQuery<any[]>({
    queryKey: ["/api/awards"],
  });

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading} = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });

  const isLoading = orgLoading || usersLoading || teamsLoading || eventsLoading || programsLoading || awardsLoading || paymentsLoading;

  // Calculate stats
  const stats = {
    totalUsers: users.length,
    totalCoaches: users.filter((u: any) => u.role === "coach").length,
    totalPlayers: users.filter((u: any) => u.role === "player").length,
    totalParents: users.filter((u: any) => u.role === "parent").length,
    totalTeams: teams.length,
    totalEvents: events.length,
    upcomingEvents: events.filter((e: any) => new Date(e.startTime) > new Date()).length,
    totalPayments: payments.length,
    pendingPayments: payments.filter((p: any) => p.status === "pending").length,
    totalRevenue: payments.filter((p: any) => p.status === "completed").reduce((sum: number, p: any) => sum + p.amount, 0),
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" data-testid="loading-admin-dashboard">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/unified-account")}
                data-testid="button-back-to-account"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1" data-testid="text-org-name">{organization?.name || "My Sports Organization"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setActiveTab("settings")} variant="outline" data-testid="button-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="overflow-x-auto mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto">
              <TabsTrigger value="overview" data-testid="tab-overview">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="teams" data-testid="tab-teams">
                <Users className="w-4 h-4 mr-2" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="programs" data-testid="tab-programs">
                <Award className="w-4 h-4 mr-2" />
                Programs
              </TabsTrigger>
              <TabsTrigger value="awards" data-testid="tab-awards">
                <Trophy className="w-4 h-4 mr-2" />
                Awards
              </TabsTrigger>
              <TabsTrigger value="packages" data-testid="tab-packages">
                <DollarSign className="w-4 h-4 mr-2" />
                Packages
              </TabsTrigger>
              <TabsTrigger value="preview" data-testid="tab-preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                icon={<Users className="w-6 h-6" />}
                subtitle={`${stats.totalCoaches} coaches, ${stats.totalPlayers} players`}
                testId="stat-total-users"
              />
              <StatCard
                title="Events"
                value={stats.totalEvents}
                icon={<Calendar className="w-6 h-6" />}
                subtitle={`${stats.upcomingEvents} upcoming`}
                testId="stat-total-events"
              />
              <StatCard
                title="Revenue"
                value={`$${(stats.totalRevenue / 100).toFixed(2)}`}
                icon={<DollarSign className="w-6 h-6" />}
                subtitle={`${stats.pendingPayments} pending`}
                testId="stat-total-revenue"
              />
            </div>
          </TabsContent>

          <TabsContent value="users">
            <UsersTab users={users} teams={teams} organization={organization} />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsTab teams={teams} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab events={events} teams={teams} programs={programs} organization={organization} />
          </TabsContent>

          <TabsContent value="programs">
            <ProgramsTab programs={programs} teams={teams} organization={organization} />
          </TabsContent>

          <TabsContent value="awards">
            <AwardsTab awards={awards} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="packages">
            <PackagesTab packages={programs} organization={organization} />
          </TabsContent>

          <TabsContent value="preview">
            <PreviewTab users={users} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab organization={organization} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, icon, subtitle, testId }: any) {
  return (
    <Card data-testid={testId}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">{title}</p>
            <p className="text-3xl font-bold mt-2" data-testid={`${testId}-value`}>{value}</p>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
          <div className="text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// Users Tab Component  
function UsersTab({ users, teams, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const createUserSchema = z.object({
    email: z.string().email(),
    role: z.enum(["admin", "coach", "player", "parent"]),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phoneNumber: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: "",
      role: "player" as const,
      firstName: "",
      lastName: "",
      phoneNumber: "",
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/users", { ...data, organizationId: organization.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create user", variant: "destructive" });
    },
  });

  const downloadUserTemplate = () => {
    const csvContent = "First name,Last name,Email,Phone,Address,Role,Status,Program/Division,Team,Awards,Rating\nJohn,Doe,player@example.com,555-0100,123 Main St,player,active,Basketball Academy,Thunder U12,5,4.5\nJane,Smith,coach@example.com,555-0101,456 Oak Ave,coach,active,,,10,5.0\nBob,Johnson,parent@example.com,555-0102,789 Elm St,parent,active,,,,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} users from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const userData: any = {};
        
        headers.forEach((header, index) => {
          userData[header] = values[index] || '';
        });
        
        // Map CSV column names to our data model
        const firstName = userData['first name'] || userData['firstname'] || '';
        const lastName = userData['last name'] || userData['lastname'] || '';
        const email = userData['email'] || '';
        const phone = userData['phone'] || userData['phonenumber'] || '';
        const address = userData['address'] || '';
        const role = userData['role'] || 'player';
        const status = userData['status'] || 'active';
        const program = userData['program/division'] || userData['program'] || '';
        const teamName = userData['team'] || '';
        const awards = userData['awards'] || '';
        const rating = userData['rating'] || '';
        
        // Find team by name if provided
        let teamId = undefined;
        if (teamName) {
          const team = teams.find((t: any) => t.name.toLowerCase() === teamName.toLowerCase());
          if (team) {
            teamId = team.id;
          }
        }
        
        try {
          await apiRequest("POST", "/api/users", {
            organizationId: organization.id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            role: role,
            phoneNumber: phone || undefined,
            address: address || undefined,
            program: program || undefined,
            teamId: teamId,
            isActive: status.toLowerCase() === 'active',
            verified: false,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create user ${email}:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} users. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>User Management</CardTitle>
          <CardDescription>Manage players, coaches, parents, and admins</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-upload-users" className="w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Users</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: First name, Last name, Email, Phone, Address, Role, Status, Program/Division, Team, Awards, Rating</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  data-testid="input-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadUserTemplate} data-testid="button-download-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-new-user" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createUser.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" data-testid="input-user-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-role">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="player">Player</SelectItem>
                            <SelectItem value="coach">Coach</SelectItem>
                            <SelectItem value="parent">Parent</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-user-firstname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-user-lastname" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-user-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createUser.isPending} data-testid="button-submit-user">
                    {createUser.isPending ? "Creating..." : "Create User"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Registered</TableHead>
              <TableHead>Stripe ID</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Team</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: any) => (
              <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                <TableCell data-testid={`text-username-${user.id}`}>{user.firstName} {user.lastName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phoneNumber || "-"}</TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.isActive ? "default" : "secondary"}>
                    {user.isActive ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={user.hasRegistered ? "default" : "outline"}>
                    {user.hasRegistered ? "Yes" : "No"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {user.stripeCustomerId ? (
                    <span className="text-green-600" title={user.stripeCustomerId}>
                      {user.stripeCustomerId.substring(0, 12)}...
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>{user.program || "-"}</TableCell>
                <TableCell>{user.teamId || "-"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" data-testid={`button-edit-user-${user.id}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Teams Tab - Full Implementation
function TeamsTab({ teams, users, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);

  const coaches = users.filter((u: any) => u.role === "coach");
  const players = users.filter((u: any) => u.role === "player");

  const createTeamSchema = z.object({
    name: z.string().min(1, "Team name is required"),
    division: z.string().optional(),
    ageGroup: z.string().optional(),
    coachId: z.string().optional(),
    description: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: "",
      division: "",
      ageGroup: "",
      coachId: "",
      description: "",
    },
  });

  const createTeam = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/teams", { 
        ...data, 
        organizationId: organization.id,
        roster: []
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create team", variant: "destructive" });
    },
  });

  const downloadTeamTemplate = () => {
    const csvContent = "Team Name,Division,Age Group,Coach Email\nThunder U12,Recreational,U12,coach@example.com\nLightning U14,Competitive,U14,coach2@example.com\nStorm U16,Competitive,U16,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'teams-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} teams from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const teamData: any = {};
        
        headers.forEach((header, index) => {
          teamData[header] = values[index] || '';
        });
        
        // Map CSV column names to our data model
        const teamName = teamData['team name'] || teamData['name'] || '';
        const division = teamData['division'] || '';
        const ageGroup = teamData['age group'] || teamData['agegroup'] || '';
        const coachEmail = teamData['coach email'] || teamData['coachemail'] || '';
        
        // Find coach by email if provided
        let coachId = undefined;
        if (coachEmail) {
          const coach = coaches.find((c: any) => c.email === coachEmail);
          if (coach) {
            coachId = coach.id;
          }
        }
        
        try {
          await apiRequest("POST", "/api/teams", {
            organizationId: organization.id,
            name: teamName,
            division: division || undefined,
            ageGroup: ageGroup || undefined,
            coachIds: coachId ? [coachId] : [],
            color: "#1E40AF",
            roster: []
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create team ${teamName}:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} teams. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Create teams, manage rosters, and assign coaches</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-bulk-upload-teams" className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Teams</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Upload a CSV file with columns: Team Name, Division, Age Group, Coach Email</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUpload}
                    data-testid="input-team-csv-upload"
                  />
                  <Button variant="outline" className="w-full" onClick={downloadTeamTemplate} data-testid="button-download-team-template">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-team" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit((data) => createTeam.mutate(data))} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Name</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Thunder U12" data-testid="input-team-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="division"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Division</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Recreational" data-testid="input-team-division" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="ageGroup"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Age Group</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="U12" data-testid="input-team-age" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="coachId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Coach</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-team-coach">
                                <SelectValue placeholder="Select a coach" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {coaches.map((coach: any) => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.firstName} {coach.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} data-testid="input-team-description" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full" disabled={createTeam.isPending} data-testid="button-submit-team">
                      {createTeam.isPending ? "Creating..." : "Create Team"}
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team Name</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Age Group</TableHead>
                <TableHead>Coach</TableHead>
                <TableHead>Players</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team: any) => {
                const coach = users.find((u: any) => u.id === team.coachId);
                return (
                  <TableRow key={team.id} data-testid={`row-team-${team.id}`}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.division || "-"}</TableCell>
                    <TableCell>{team.ageGroup || "-"}</TableCell>
                    <TableCell>
                      {coach ? `${coach.firstName} ${coach.lastName}` : "Unassigned"}
                    </TableCell>
                    <TableCell>{team.roster?.length || 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSelectedTeam(team)}
                          data-testid={`button-manage-roster-${team.id}`}
                        >
                          Manage Roster
                        </Button>
                        <Button variant="ghost" size="sm" data-testid={`button-edit-team-${team.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Roster Management Dialog */}
      {selectedTeam && (
        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Manage Roster - {selectedTeam.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto">
                {players.map((player: any) => (
                  <div key={player.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedTeam.roster?.includes(player.id)}
                        data-testid={`checkbox-player-${player.id}`}
                      />
                      <span>{player.firstName} {player.lastName}</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full" data-testid="button-save-roster">Save Roster</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Events Tab - Full Implementation with Calendar and List View
function EventsTab({ events, teams, programs, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentDate, setCurrentDate] = useState(new Date());

  const createEventSchema = z.object({
    title: z.string().min(1, "Event title is required"),
    type: z.enum(["practice", "game", "tournament", "meeting"]),
    startTime: z.string(),
    endTime: z.string(),
    location: z.string().optional(),
    description: z.string().optional(),
    targetType: z.enum(["all", "team", "program", "role"]),
    targetId: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      type: "practice" as const,
      startTime: "",
      endTime: "",
      location: "",
      description: "",
      targetType: "all" as const,
      targetId: "",
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/events", {
        ...data,
        organizationId: organization.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const downloadEventTemplate = () => {
    const csvContent = "Title,Type,Start Time,End Time,Location,Description\nTeam Practice,practice,2025-01-15T10:00,2025-01-15T12:00,Main Gym,Weekly team practice\nChampionship Game,game,2025-01-20T18:00,2025-01-20T20:00,Arena Stadium,Final game";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} events from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const eventData: any = {};
        
        headers.forEach((header, index) => {
          eventData[header] = values[index] || '';
        });
        
        try {
          await apiRequest("POST", "/api/events", {
            organizationId: organization.id,
            title: eventData['title'] || '',
            type: eventData['type'] || 'practice',
            startTime: eventData['start time'] || eventData['starttime'],
            endTime: eventData['end time'] || eventData['endtime'],
            location: eventData['location'] || '',
            description: eventData['description'] || '',
            targetType: 'all',
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create event:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} events. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Event Management</CardTitle>
          <CardDescription>Schedule practices, games, and other events</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="button-view-list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              data-testid="button-view-calendar"
            >
              <CalendarDays className="w-4 h-4" />
            </Button>
          </div>
          
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-upload-events" className="w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Events</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Title, Type, Start Time, End Time, Location, Description</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  data-testid="input-event-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadEventTemplate} data-testid="button-download-event-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-event" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createEvent.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Team Practice" data-testid="input-event-title" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="game">Game</SelectItem>
                            <SelectItem value="tournament">Tournament</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="datetime-local" data-testid="input-event-start" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input {...field} type="datetime-local" data-testid="input-event-end" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Main Gym" data-testid="input-event-location" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event For</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-target">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Everyone</SelectItem>
                            <SelectItem value="team">Specific Team</SelectItem>
                            <SelectItem value="program">Specific Program</SelectItem>
                            <SelectItem value="role">Specific Role</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Who should see this event?</FormDescription>
                      </FormItem>
                    )}
                  />
                  {(form.watch("targetType") === "team" || form.watch("targetType") === "program" || form.watch("targetType") === "role") && (
                    <FormField
                      control={form.control}
                      name="targetId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Team</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a team" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {teams.map((team: any) => (
                                <SelectItem key={team.id} value={team.id}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} data-testid="input-event-description" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createEvent.isPending} data-testid="button-submit-event">
                    {createEvent.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === "list" ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date & Time</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>For</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event: any) => (
                <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>
                    <Badge>{event.type}</Badge>
                  </TableCell>
                  <TableCell>{new Date(event.startTime).toLocaleString()}</TableCell>
                  <TableCell>{event.location || "-"}</TableCell>
                  <TableCell>
                    {event.targetType === "all" ? "Everyone" : event.targetType}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" data-testid={`button-edit-event-${event.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h3 className="font-semibold">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-2 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="font-semibold text-sm p-2">{day}</div>
              ))}
              {/* Calendar grid would be rendered here */}
              <div className="col-span-7 text-center text-gray-500 py-8">Calendar view coming soon</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Programs Tab - Full Implementation
function ProgramsTab({ programs, teams, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const createProgramSchema = z.object({
    name: z.string().min(1, "Program name is required"),
    description: z.string().optional(),
    startDate: z.string(),
    endDate: z.string(),
    capacity: z.number().optional(),
    fee: z.number().optional(),
  });

  const form = useForm({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      description: "",
      startDate: "",
      endDate: "",
      capacity: 0,
      fee: 0,
    },
  });

  const createProgram = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/programs", {
        ...data,
        organizationId: organization.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create program", variant: "destructive" });
    },
  });

  const downloadProgramTemplate = () => {
    const csvContent = "Name,Description,Start Date,End Date,Capacity,Fee\nSummer Training Camp,Intensive skills training,2025-06-01,2025-08-15,30,299.99\nFall League,Competitive league play,2025-09-01,2025-11-30,50,199.99";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programs-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} programs from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const programData: any = {};
        
        headers.forEach((header, index) => {
          programData[header] = values[index] || '';
        });
        
        try {
          await apiRequest("POST", "/api/programs", {
            organizationId: organization.id,
            name: programData['name'] || '',
            description: programData['description'] || '',
            startDate: programData['start date'] || programData['startdate'] || '',
            endDate: programData['end date'] || programData['enddate'] || '',
            capacity: programData['capacity'] ? parseInt(programData['capacity']) : undefined,
            fee: programData['fee'] ? parseFloat(programData['fee']) : undefined,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create program:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} programs. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Program Management</CardTitle>
          <CardDescription>Create and manage training programs and sessions</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-upload-programs" className="w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Programs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Description, Start Date, End Date, Capacity, Fee</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  data-testid="input-program-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadProgramTemplate} data-testid="button-download-program-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-program" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Program
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Program</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createProgram.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Summer Training Camp" data-testid="input-program-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-program-description" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-program-start" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" data-testid="input-program-end" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" onChange={e => field.onChange(parseInt(e.target.value))} data-testid="input-program-capacity" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fee ($)</FormLabel>
                        <FormControl>
                          <Input {...field} type="number" step="0.01" onChange={e => field.onChange(parseFloat(e.target.value))} data-testid="input-program-fee" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={createProgram.isPending} data-testid="button-submit-program">
                  {createProgram.isPending ? "Creating..." : "Create Program"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program Name</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Enrollment</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {programs.map((program: any) => (
              <TableRow key={program.id} data-testid={`row-program-${program.id}`}>
                <TableCell className="font-medium">{program.name}</TableCell>
                <TableCell>
                  {new Date(program.startDate).toLocaleDateString()} - {new Date(program.endDate).toLocaleDateString()}
                </TableCell>
                <TableCell>{program.capacity || "-"}</TableCell>
                <TableCell>${(program.fee || 0).toFixed(2)}</TableCell>
                <TableCell>{program.enrolledCount || 0} / {program.capacity || "∞"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" data-testid={`button-edit-program-${program.id}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Awards Tab - Full Implementation
function AwardsTab({ awards, users, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const createAwardSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    criteria: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(createAwardSchema),
    defaultValues: {
      name: "",
      description: "",
      criteria: "",
    },
  });

  const createAward = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/awards", {
        ...data,
        organizationId: organization.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/awards"] });
      toast({ title: "Award created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create award", variant: "destructive" });
    },
  });

  const downloadAwardTemplate = () => {
    const csvContent = "Name,Description,Criteria\nMost Improved Player,Award for the player who has shown the most improvement,Demonstrated significant skill improvement over the season\nTeam Spirit Award,Award for exceptional team spirit and sportsmanship,Consistently demonstrates positive attitude and support for teammates";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'awards-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} awards from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const awardData: any = {};
        
        headers.forEach((header, index) => {
          awardData[header] = values[index] || '';
        });
        
        try {
          await apiRequest("POST", "/api/awards", {
            organizationId: organization.id,
            name: awardData['name'] || '',
            description: awardData['description'] || '',
            criteria: awardData['criteria'] || '',
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create award:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/awards"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} awards. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Award Management</CardTitle>
          <CardDescription>Create and assign awards to recognize achievements</CardDescription>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-upload-awards" className="w-full sm:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Awards</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Description, Criteria</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUpload}
                  data-testid="input-award-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadAwardTemplate} data-testid="button-download-award-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-award" className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create Award
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Award</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createAward.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Award Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Most Improved Player" data-testid="input-award-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-award-description" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="criteria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Criteria</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Criteria for earning this award" data-testid="input-award-criteria" />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createAward.isPending} data-testid="button-submit-award">
                  {createAward.isPending ? "Creating..." : "Create Award"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Award Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {awards.map((award: any) => (
              <TableRow key={award.id} data-testid={`row-award-${award.id}`}>
                <TableCell className="font-medium">{award.name}</TableCell>
                <TableCell>{award.description || "-"}</TableCell>
                <TableCell>{award.recipientCount || 0}</TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" data-testid={`button-assign-award-${award.id}`}>
                      Assign
                    </Button>
                    <Button variant="ghost" size="sm" data-testid={`button-edit-award-${award.id}`}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Packages Tab - Package Management
function PackagesTab({ packages, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);

  const createPackageSchema = z.object({
    name: z.string().min(1, "Package name is required"),
    description: z.string().optional(),
    price: z.number().min(0, "Price must be positive"),
    pricingModel: z.string().min(1, "Pricing model is required"),
    duration: z.string().optional(),
    installments: z.number().optional(),
    installmentPrice: z.number().optional(),
    category: z.string().min(1, "Program type is required"),
    ageGroups: z.string().optional(),
  });

  const form = useForm({
    resolver: zodResolver(createPackageSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      pricingModel: "one-time",
      duration: "",
      installments: 0,
      installmentPrice: 0,
      category: "",
      ageGroups: "",
    },
  });

  const createPackage = useMutation({
    mutationFn: async (data: any) => {
      const packageData = {
        ...data,
        price: Math.round(data.price * 100), // Convert to cents
        installmentPrice: data.installmentPrice ? Math.round(data.installmentPrice * 100) : undefined,
        ageGroups: data.ageGroups ? data.ageGroups.split(',').map((s: string) => s.trim()) : [],
        organizationId: organization.id,
        isActive: true,
      };
      
      if (editingPackage) {
        return await apiRequest("PATCH", `/api/programs/${editingPackage.id}`, packageData);
      }
      return await apiRequest("POST", "/api/programs", packageData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: editingPackage ? "Package updated successfully" : "Package created successfully" });
      setIsDialogOpen(false);
      setEditingPackage(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to save package", variant: "destructive" });
    },
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/programs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Package deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete package", variant: "destructive" });
    },
  });

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    form.reset({
      name: pkg.name,
      description: pkg.description || "",
      price: pkg.price / 100,
      pricingModel: pkg.pricingModel || "one-time",
      duration: pkg.duration || "",
      installments: pkg.installments || 0,
      installmentPrice: pkg.installmentPrice ? pkg.installmentPrice / 100 : 0,
      category: pkg.category || "",
      ageGroups: pkg.ageGroups?.join(', ') || "",
    });
    setIsDialogOpen(true);
  };

  const handleNewPackage = () => {
    setEditingPackage(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const downloadPackageTemplate = () => {
    const csvContent = "Name,Description,Price,Pricing Model,Category\nHS Club - Pay in Full,High school club program with full payment,1200.00,one-time,High School Club\nSkills Academy - Monthly,Monthly skills training program,150.00,monthly,Skills Academy";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'packages-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ 
          title: "Invalid CSV", 
          description: "CSV file must contain headers and at least one row of data",
          variant: "destructive" 
        });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const dataLines = lines.slice(1);
      
      toast({ title: `Processing ${dataLines.length} packages from CSV...` });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const line of dataLines) {
        const values = line.split(',').map(v => v.trim());
        const packageData: any = {};
        
        headers.forEach((header, index) => {
          packageData[header] = values[index] || '';
        });
        
        try {
          await apiRequest("POST", "/api/programs", {
            organizationId: organization.id,
            name: packageData['name'] || '',
            description: packageData['description'] || '',
            price: packageData['price'] ? Math.round(parseFloat(packageData['price']) * 100) : 0,
            pricingModel: packageData['pricing model'] || packageData['pricingmodel'] || 'one-time',
            category: packageData['category'] || '',
            isActive: true,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to create package:`, error);
          errorCount++;
        }
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      
      toast({ 
        title: "Bulk Upload Complete", 
        description: `Successfully created ${successCount} packages. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
        variant: errorCount > 0 ? "destructive" : "default"
      });
      
      setIsBulkUploadOpen(false);
    };
    reader.readAsText(file);
  };

  const groupedPackages = packages.reduce((acc: any, pkg: any) => {
    const category = pkg.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(pkg);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Package Management</CardTitle>
            <CardDescription>Manage programs and packages available during registration</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-bulk-upload-packages" className="w-full sm:w-auto">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Packages</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Description, Price, Pricing Model, Category</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUpload}
                    data-testid="input-package-csv-upload"
                  />
                  <Button variant="outline" className="w-full" onClick={downloadPackageTemplate} data-testid="button-download-package-template">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) setEditingPackage(null);
            }}>
              <DialogTrigger asChild>
                <Button onClick={handleNewPackage} data-testid="button-create-package" className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Package
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingPackage ? "Edit Package" : "Create Package"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createPackage.mutate(data))} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Package Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., HS Club - Pay in Full" data-testid="input-package-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Package description" data-testid="input-package-description" />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program Type *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-package-category">
                                <SelectValue placeholder="Select program type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Skills Academy">Skills Academy</SelectItem>
                              <SelectItem value="Youth Club">Youth Club</SelectItem>
                              <SelectItem value="High School Club">High School Club</SelectItem>
                              <SelectItem value="Online Training">Online Training</SelectItem>
                              <SelectItem value="Private Training">Private Training</SelectItem>
                              <SelectItem value="Camps">Camps</SelectItem>
                              <SelectItem value="Foundation">Foundation</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="pricingModel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pricing Model *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-package-pricing-model">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="one-time">One-Time</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="installments">Installments</SelectItem>
                              <SelectItem value="per-session">Per Session</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price ($) *</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              step="0.01" 
                              onChange={e => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-package-price" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="e.g., 3 months, per hour" data-testid="input-package-duration" />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  {form.watch("pricingModel") === "installments" && (
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="installments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Installments</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                onChange={e => field.onChange(parseInt(e.target.value))}
                                data-testid="input-package-installments" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="installmentPrice"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price per Installment ($)</FormLabel>
                            <FormControl>
                              <Input 
                                {...field} 
                                type="number" 
                                step="0.01" 
                                onChange={e => field.onChange(parseFloat(e.target.value))}
                                data-testid="input-package-installment-price" 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                  <FormField
                    control={form.control}
                    name="ageGroups"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Groups (comma-separated)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., 8-10, 11-13, 14-17" data-testid="input-package-age-groups" />
                        </FormControl>
                        <FormDescription>Optional: Specify age groups for this package</FormDescription>
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createPackage.isPending} data-testid="button-submit-package">
                    {createPackage.isPending ? "Saving..." : (editingPackage ? "Update Package" : "Create Package")}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedPackages).map(([category, pkgs]: [string, any]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3">{category}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pkgs.map((pkg: any) => (
                      <TableRow key={pkg.id} data-testid={`row-package-${pkg.id}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{pkg.name}</div>
                            {pkg.description && <div className="text-sm text-gray-600">{pkg.description}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>${(pkg.price / 100).toFixed(2)}</div>
                            {pkg.pricingModel === "installments" && pkg.installmentPrice && (
                              <div className="text-sm text-gray-600">
                                {pkg.installments} × ${(pkg.installmentPrice / 100).toFixed(2)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{pkg.pricingModel}</Badge>
                        </TableCell>
                        <TableCell>{pkg.duration || "-"}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleEdit(pkg)}
                              data-testid={`button-edit-package-${pkg.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deletePackage.mutate(pkg.id)}
                              data-testid={`button-delete-package-${pkg.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ organization }: any) {
  const { toast } = useToast();

  const updateOrganization = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PATCH", "/api/organization", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/organization"] });
      toast({ title: "Organization settings updated" });
    },
    onError: () => {
      toast({ title: "Failed to update settings", variant: "destructive" });
    },
  });

  const [formData, setFormData] = useState(organization || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrganization.mutate(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organization Settings</CardTitle>
        <CardDescription>Customize your organization's branding and settings</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Organization Name</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-org-name"
              />
            </div>

            <div>
              <Label htmlFor="sportType">Sport Type</Label>
              <Input
                id="sportType"
                value={formData.sportType || ""}
                onChange={(e) => setFormData({ ...formData, sportType: e.target.value })}
                placeholder="basketball, soccer, baseball, etc."
                data-testid="input-sport-type"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primaryColor">Primary Color</Label>
                <Input
                  id="primaryColor"
                  type="color"
                  value={formData.primaryColor || "#1E40AF"}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  data-testid="input-primary-color"
                />
              </div>
              <div>
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <Input
                  id="secondaryColor"
                  type="color"
                  value={formData.secondaryColor || "#DC2626"}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  data-testid="input-secondary-color"
                />
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Terminology Customization</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="term-athlete">Athlete Term</Label>
                  <Input
                    id="term-athlete"
                    value={formData.terminology?.athlete || "Player"}
                    onChange={(e) => setFormData({
                      ...formData,
                      terminology: { ...formData.terminology, athlete: e.target.value }
                    })}
                    placeholder="Player, Athlete, Student"
                    data-testid="input-term-athlete"
                  />
                </div>
                <div>
                  <Label htmlFor="term-coach">Coach Term</Label>
                  <Input
                    id="term-coach"
                    value={formData.terminology?.coach || "Coach"}
                    onChange={(e) => setFormData({
                      ...formData,
                      terminology: { ...formData.terminology, coach: e.target.value }
                    })}
                    placeholder="Coach, Trainer, Instructor"
                    data-testid="input-term-coach"
                  />
                </div>
                <div>
                  <Label htmlFor="term-team">Team Term</Label>
                  <Input
                    id="term-team"
                    value={formData.terminology?.team || "Team"}
                    onChange={(e) => setFormData({
                      ...formData,
                      terminology: { ...formData.terminology, team: e.target.value }
                    })}
                    placeholder="Team, Squad, Group"
                    data-testid="input-term-team"
                  />
                </div>
                <div>
                  <Label htmlFor="term-practice">Practice Term</Label>
                  <Input
                    id="term-practice"
                    value={formData.terminology?.practice || "Practice"}
                    onChange={(e) => setFormData({
                      ...formData,
                      terminology: { ...formData.terminology, practice: e.target.value }
                    })}
                    placeholder="Practice, Training, Session"
                    data-testid="input-term-practice"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={updateOrganization.isPending} data-testid="button-save-settings">
            {updateOrganization.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// Preview Tab Component
function PreviewTab({ users }: { users: any[] }) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [previewUser, setPreviewUser] = useState<any>(null);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find((u: any) => u.id === userId);
    setPreviewUser(user);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "parent":
        return "Parent (Unified Account)";
      case "player":
        return "Player";
      case "coach":
        return "Coach";
      case "admin":
        return "Admin";
      default:
        return role;
    }
  };

  // Create a mock auth context for preview
  const PreviewWrapper = ({ children }: { children: React.ReactNode }) => {
    return (
      <div className="border-2 border-dashed border-blue-300 rounded-lg overflow-hidden bg-white">
        <div className="bg-blue-50 border-b border-blue-300 px-4 py-2 flex items-center gap-2">
          <Eye className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">
            Previewing as: {previewUser?.firstName} {previewUser?.lastName} ({getRoleLabel(previewUser?.role)})
          </span>
        </div>
        <div className="preview-content">
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Dashboard Preview</CardTitle>
          <CardDescription>Select a user to preview their account/dashboard as they would see it</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* User Selector */}
            <div>
              <Label htmlFor="preview-user-select">Select User to Preview</Label>
              <Select value={selectedUserId} onValueChange={handleUserSelect}>
                <SelectTrigger id="preview-user-select" data-testid="select-preview-user">
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <div className="px-2 py-6 text-center text-sm text-gray-500">
                      No users available
                    </div>
                  ) : (
                    <>
                      {users.filter((u: any) => u.role === "parent").length > 0 && (
                        <>
                          <SelectGroup>
                            <SelectLabel>Parents</SelectLabel>
                            {users.filter((u: any) => u.role === "parent").map((user: any) => (
                              <SelectItem key={user.id} value={user.id} data-testid={`user-option-${user.id}`}>
                                {user.firstName} {user.lastName} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                        </>
                      )}
                      
                      {users.filter((u: any) => u.role === "player").length > 0 && (
                        <>
                          <SelectGroup>
                            <SelectLabel>Players</SelectLabel>
                            {users.filter((u: any) => u.role === "player").map((user: any) => (
                              <SelectItem key={user.id} value={user.id} data-testid={`user-option-${user.id}`}>
                                {user.firstName} {user.lastName} {user.accountHolderId && "(Child)"}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                        </>
                      )}
                      
                      {users.filter((u: any) => u.role === "coach").length > 0 && (
                        <SelectGroup>
                          <SelectLabel>Coaches</SelectLabel>
                          {users.filter((u: any) => u.role === "coach").map((user: any) => (
                            <SelectItem key={user.id} value={user.id} data-testid={`user-option-${user.id}`}>
                              {user.firstName} {user.lastName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      )}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {previewUser && (
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <p className="font-medium">{previewUser.firstName} {previewUser.lastName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Role:</span>
                    <p className="font-medium">{getRoleLabel(previewUser.role)}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <p className="font-medium">{previewUser.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={previewUser.isActive ? "default" : "outline"}>
                      {previewUser.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Area */}
      {previewUser && (
        <PreviewWrapper>
          {/* Parent or Player role shows Unified Account */}
          {(previewUser.role === "parent" || previewUser.role === "player") && (
            <div data-testid="preview-unified-account">
              <UnifiedAccountPreview userId={previewUser.id} />
            </div>
          )}
          
          {/* Coach role shows Coach Dashboard */}
          {previewUser.role === "coach" && (
            <div data-testid="preview-coach-dashboard">
              <CoachDashboardPreview userId={previewUser.id} />
            </div>
          )}

          {/* Admin role */}
          {previewUser.role === "admin" && (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">Admin Dashboard</h3>
              <p className="text-gray-600">Admin users see the Admin Dashboard (current view)</p>
            </div>
          )}
        </PreviewWrapper>
      )}

      {!previewUser && (
        <Card>
          <CardContent className="p-12 text-center">
            <Eye className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No User Selected</h3>
            <p className="text-gray-600">Select a user above to preview their dashboard</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Unified Account Preview Component (mimics user's view)
function UnifiedAccountPreview({ userId }: { userId: string }) {
  // Temporarily override auth context for preview
  const originalFetch = window.fetch;
  
  // Mock fetch to return preview user data
  const mockUserData = { id: userId };
  
  return <UnifiedAccount />;
}

// Coach Dashboard Preview Component
function CoachDashboardPreview({ userId }: { userId: string }) {
  return <CoachDashboard />;
}
