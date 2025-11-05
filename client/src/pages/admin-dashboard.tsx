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
import { Switch } from "@/components/ui/switch";
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
  Star,
  Bell,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Circle,
  Shield,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useLocation } from "wouter";
import PlayerDashboard from "./player-dashboard";
import { insertDivisionSchema, insertSkillSchema, insertNotificationSchema, insertTeamSchema } from "@shared/schema";
import { LocationSearch } from "@/components/LocationSearch";
import AttendanceList from "@/components/AttendanceList";
import { format } from "date-fns";
import EventWindowsConfigurator from "@/components/EventWindowsConfigurator";
import type { EventWindow } from "@shared/schema";
import EventDetailModal from "@/components/EventDetailModal";
import { SKILL_CATEGORIES } from "@/components/CoachAwardDialogs";
import type { SkillCategoryName, EvalScores, Quarter } from "@/components/CoachAwardDialogs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronDown } from "lucide-react";

// Hook for drag-to-scroll functionality
function useDragScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      setStartX(e.pageX - element.offsetLeft);
      setScrollLeft(element.scrollLeft);
    };

    const handleMouseLeave = () => {
      setIsDragging(false);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      const walk = (x - startX) * 2;
      element.scrollLeft = scrollLeft - walk;
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mousemove', handleMouseMove);

    return () => {
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, startX, scrollLeft]);

  return ref;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [, setLocation] = useLocation();
  const tabsRef = useDragScroll();

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

  // Fetch award definitions
  const { data: awardDefinitions = [], isLoading: awardDefinitionsLoading } = useQuery<any[]>({
    queryKey: ["/api/award-definitions"],
  });

  // Fetch payments
  const { data: payments = [], isLoading: paymentsLoading} = useQuery<any[]>({
    queryKey: ["/api/payments"],
  });

  // Fetch divisions
  const { data: divisions = [], isLoading: divisionsLoading } = useQuery<any[]>({
    queryKey: ["/api/divisions"],
  });

  // Fetch skills
  const { data: skills = [], isLoading: skillsLoading } = useQuery<any[]>({
    queryKey: ["/api/skills"],
  });

  // Fetch evaluations
  const { data: evaluations = [], isLoading: evaluationsLoading } = useQuery<any[]>({
    queryKey: ["/api/evaluations"],
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/notifications"],
  });

  const isLoading = orgLoading || usersLoading || teamsLoading || eventsLoading || programsLoading || awardDefinitionsLoading || paymentsLoading || divisionsLoading || skillsLoading || evaluationsLoading || notificationsLoading;

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
          <div ref={tabsRef} className="overflow-x-auto hide-scrollbar drag-scroll mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="inline-flex w-auto min-w-full sm:w-auto bg-transparent border-b border-gray-200 rounded-none p-0 h-auto gap-0">
              <TabsTrigger value="overview" data-testid="tab-overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <TrendingUp className="w-4 h-4 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="users" data-testid="tab-users" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Users className="w-4 h-4 mr-2" />
                Users
              </TabsTrigger>
              <TabsTrigger value="teams" data-testid="tab-teams" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Users className="w-4 h-4 mr-2" />
                Teams
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="awards" data-testid="tab-awards" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Trophy className="w-4 h-4 mr-2" />
                Awards
              </TabsTrigger>
              <TabsTrigger value="products" data-testid="tab-products" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <DollarSign className="w-4 h-4 mr-2" />
                Products
              </TabsTrigger>
              <TabsTrigger value="divisions" data-testid="tab-divisions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Layers className="w-4 h-4 mr-2" />
                Divisions
              </TabsTrigger>
              <TabsTrigger value="skills" data-testid="tab-skills" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Star className="w-4 h-4 mr-2" />
                Skills
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="settings" data-testid="tab-settings" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
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
            <UsersTab users={users} teams={teams} programs={programs} divisions={divisions} organization={organization} />
          </TabsContent>

          <TabsContent value="teams">
            <TeamsTab teams={teams} users={users} divisions={divisions} organization={organization} />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab events={events} teams={teams} programs={programs} organization={organization} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="awards">
            <AwardsTab awardDefinitions={awardDefinitions} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="products">
            <ProductsTab organization={organization} />
          </TabsContent>

          <TabsContent value="divisions">
            <DivisionsTab divisions={divisions} teams={teams} organization={organization} />
          </TabsContent>

          <TabsContent value="skills">
            <SkillsTab evaluations={evaluations} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab notifications={notifications} users={users} organization={organization} />
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
function UsersTab({ users, teams, programs, divisions, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingUser, setViewingUser] = useState<any>(null);
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [detailTab, setDetailTab] = useState("team");
  const tableRef = useDragScroll();

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
      isActive: true,
    },
  });

  const createUser = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/users", { 
        ...data, 
        organizationId: organization.id,
        isActive: data.isActive ?? true
      });
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

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/users/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "User deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete user", variant: "destructive" });
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      setUpdatingUserId(id);
      return await apiRequest("PATCH", `/api/users/${id}`, data);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      // Invalidate user-specific queries for real-time updates in player dashboard
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.id, "team"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile", variables.id] });
      // Invalidate events queries if team/division changed
      if (variables.teamId || variables.divisionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      }
      setUpdatingUserId(null);
      // Only show toast and close dialog if updating from edit dialog (more than just isActive)
      if (Object.keys(variables).length > 2 || !('isActive' in variables)) {
        toast({ title: "User updated successfully" });
        setEditingUser(null);
        setSelectedProgram("");
      }
    },
    onError: (_error, _variables) => {
      setUpdatingUserId(null);
      toast({ title: "Failed to update user", variant: "destructive" });
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

  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sort users based on current sort field and direction
  const sortedUsers = sortField ? [...users].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    // Handle special cases
    if (sortField === 'team') {
      const aTeam = teams.find((t: any) => t.id === a.teamId);
      const bTeam = teams.find((t: any) => t.id === b.teamId);
      aValue = aTeam?.name || '';
      bValue = bTeam?.name || '';
    }

    if (sortField === 'division') {
      const aDivision = divisions.find((d: any) => d.id === a.divisionId);
      const bDivision = divisions.find((d: any) => d.id === b.divisionId);
      aValue = aDivision?.name || '';
      bValue = bDivision?.name || '';
    }

    if (sortField === 'dob' || sortField === 'dateOfBirth') {
      aValue = a.dob || a.dateOfBirth;
      bValue = b.dob || b.dateOfBirth;
    }

    if (sortField === 'awards') {
      aValue = a.awards?.length || 0;
      bValue = b.awards?.length || 0;
    }

    if (sortField === 'isActive') {
      aValue = a.isActive !== false ? 1 : 0;
      bValue = b.isActive !== false ? 1 : 0;
    }

    // Handle null/undefined values
    if (aValue == null) aValue = '';
    if (bValue == null) bValue = '';

    // Convert to strings for comparison if needed
    const aStr = typeof aValue === 'string' ? aValue.toLowerCase() : aValue;
    const bStr = typeof bValue === 'string' ? bValue.toLowerCase() : bValue;

    if (aStr < bStr) return sortDirection === 'asc' ? -1 : 1;
    if (aStr > bStr) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  }) : users;


  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between mb-4">
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

          <Dialog open={!!editingUser} onOpenChange={(open) => {
            if (!open) {
              setEditingUser(null);
              setSelectedProgram("");
              setSelectedDivision("");
            }
          }}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit User</DialogTitle>
              </DialogHeader>
              {editingUser && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-firstname" data-testid="label-edit-firstname">First Name</Label>
                      <Input 
                        id="edit-firstname"
                        value={editingUser.firstName || ""}
                        onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                        data-testid="input-edit-firstname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-lastname" data-testid="label-edit-lastname">Last Name</Label>
                      <Input 
                        id="edit-lastname"
                        value={editingUser.lastName || ""}
                        onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                        data-testid="input-edit-lastname"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" data-testid="label-edit-email">Email</Label>
                    <Input 
                      id="edit-email"
                      type="email"
                      value={editingUser.email || ""}
                      onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                      data-testid="input-edit-email"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-phone" data-testid="label-edit-phone">Phone</Label>
                    <Input 
                      id="edit-phone"
                      value={editingUser.phoneNumber || editingUser.phone || ""}
                      onChange={(e) => setEditingUser({...editingUser, phoneNumber: e.target.value})}
                      data-testid="input-edit-phone"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-role" data-testid="label-edit-role">Role</Label>
                    <Select 
                      value={editingUser.role || "player"}
                      onValueChange={(value) => setEditingUser({...editingUser, role: value})}
                    >
                      <SelectTrigger id="edit-role" data-testid="select-edit-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Player</SelectItem>
                        <SelectItem value="coach">Coach</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-club" data-testid="label-edit-club">Club</Label>
                    <Input 
                      id="edit-club"
                      value={organization?.name || ""}
                      disabled
                      data-testid="input-edit-club"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-program" data-testid="label-edit-program">Program</Label>
                    <Select 
                      value={selectedProgram || editingUser.programId || "none"}
                      onValueChange={(value) => {
                        const actualValue = value === "none" ? "" : value;
                        const selectedProgramObj = programs?.find((p: any) => p.id === actualValue);
                        const programName = selectedProgramObj?.name || "";
                        setSelectedProgram(actualValue);
                        setEditingUser({ 
                          ...editingUser, 
                          program: programName,
                          programId: actualValue,
                          team: "",
                          teamId: "",
                          division: "",
                          divisionId: ""
                        });
                        setSelectedDivision("");
                      }}
                    >
                      <SelectTrigger id="edit-program" data-testid="select-edit-program">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {programs?.map((program: any) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-team" data-testid="label-edit-team">Team</Label>
                    <Select 
                      value={editingUser.teamId ? String(editingUser.teamId) : "none"}
                      onValueChange={(value) => {
                        const actualValue = value === "none" ? null : parseInt(value);
                        setEditingUser({...editingUser, teamId: actualValue});
                      }}
                    >
                      <SelectTrigger id="edit-team" data-testid="select-edit-team">
                        <SelectValue placeholder="Select a team" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {teams
                          ?.filter((team: any) => !selectedProgram || team.program === programs?.find((p: any) => p.id === selectedProgram)?.name)
                          .map((team: any) => (
                            <SelectItem key={team.id} value={String(team.id)}>
                              {team.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-division" data-testid="label-edit-division">Division</Label>
                    <Select 
                      value={selectedDivision || editingUser.divisionId || "none"}
                      onValueChange={(value) => {
                        const actualValue = value === "none" ? "" : value;
                        const selectedDivisionObj = divisions?.find((d: any) => d.id === actualValue);
                        const divisionName = selectedDivisionObj?.name || "";
                        setSelectedDivision(actualValue);
                        setEditingUser({
                          ...editingUser, 
                          division: divisionName,
                          divisionId: actualValue
                        });
                      }}
                    >
                      <SelectTrigger id="edit-division" data-testid="select-edit-division">
                        <SelectValue placeholder="Select a division" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {divisions?.map((division: any) => (
                          <SelectItem key={division.id} value={division.id}>
                            {division.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {editingUser.role === 'coach' && (
                    <div className="space-y-2">
                      <Label data-testid="label-coached-teams">Teams Coached</Label>
                      <div className="border rounded-md p-3 bg-gray-50">
                        {(() => {
                          const headCoachTeams = teams.filter((t: any) => t.coachId === editingUser.id);
                          const assistantCoachTeams = teams.filter((t: any) => 
                            Array.isArray(t.assistantCoachIds) && t.assistantCoachIds.includes(editingUser.id)
                          );
                          
                          if (headCoachTeams.length === 0 && assistantCoachTeams.length === 0) {
                            return <p className="text-sm text-gray-500">Not assigned to any teams</p>;
                          }
                          
                          return (
                            <div className="space-y-2">
                              {headCoachTeams.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Head Coach:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {headCoachTeams.map((team: any) => (
                                      <Badge key={team.id} variant="default" className="text-xs">
                                        {team.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {assistantCoachTeams.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-700 mb-1">Assistant Coach:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {assistantCoachTeams.map((team: any) => (
                                      <Badge key={team.id} variant="secondary" className="text-xs">
                                        {team.name}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-xs text-gray-500">
                        To modify team coaching assignments, use the Teams tab
                      </p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-dob" data-testid="label-edit-dob">Date of Birth</Label>
                    <Input 
                      id="edit-dob"
                      type="date"
                      value={editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).toISOString().split('T')[0] : ""}
                      onChange={(e) => setEditingUser({...editingUser, dateOfBirth: e.target.value})}
                      data-testid="input-edit-dob"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-position" data-testid="label-edit-position">Position</Label>
                    <Select 
                      value={editingUser.position || "none"}
                      onValueChange={(value) => setEditingUser({...editingUser, position: value === "none" ? "" : value})}
                    >
                      <SelectTrigger id="edit-position" data-testid="select-edit-position">
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="PG">PG - Point Guard</SelectItem>
                        <SelectItem value="SG">SG - Shooting Guard</SelectItem>
                        <SelectItem value="SF">SF - Small Forward</SelectItem>
                        <SelectItem value="PF">PF - Power Forward</SelectItem>
                        <SelectItem value="C">C - Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-height-in" data-testid="label-edit-height-in">Height (inches)</Label>
                    <Input 
                      id="edit-height-in"
                      type="number"
                      value={editingUser.heightIn || ""}
                      onChange={(e) => setEditingUser({...editingUser, heightIn: parseInt(e.target.value) || null})}
                      data-testid="input-edit-height-in"
                      placeholder="e.g., 72 for 6'0&quot;"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-skill" data-testid="label-edit-skill">Skill Level</Label>
                    <Input 
                      id="edit-skill"
                      value={editingUser.skill || ""}
                      onChange={(e) => setEditingUser({...editingUser, skill: e.target.value})}
                      data-testid="input-edit-skill"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-bio" data-testid="label-edit-bio">Bio</Label>
                    <Textarea 
                      id="edit-bio"
                      value={editingUser.bio || ""}
                      onChange={(e) => setEditingUser({...editingUser, bio: e.target.value})}
                      data-testid="input-edit-bio"
                      placeholder="Short player bio..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="edit-notes" data-testid="label-edit-notes">Admin Notes</Label>
                    <Textarea 
                      id="edit-notes"
                      value={editingUser.notes || ""}
                      onChange={(e) => setEditingUser({...editingUser, notes: e.target.value})}
                      data-testid="input-edit-notes"
                      placeholder="Internal notes (not visible to user)..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="edit-active"
                      checked={editingUser.isActive !== false}
                      onCheckedChange={(checked) => setEditingUser({...editingUser, isActive: checked})}
                      data-testid="switch-edit-active"
                    />
                    <Label htmlFor="edit-active" data-testid="label-edit-active">Active</Label>
                  </div>
                  
                  <Button 
                    type="button" 
                    className="w-full" 
                    onClick={() => updateUser.mutate(editingUser)}
                    disabled={updateUser.isPending}
                    data-testid="button-submit-edit-user"
                  >
                    {updateUser.isPending ? "Updating..." : "Update User"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          </div>
        </div>
        
      </CardHeader>
      <CardContent>
        {/* Top scrollbar for horizontal navigation */}
        <div 
          className="overflow-x-auto mb-2"
          onScroll={(e) => {
            if (tableRef.current) {
              tableRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <div style={{ width: tableRef.current?.scrollWidth || '100%', height: '1px' }}></div>
        </div>
        
        {/* Table with bottom scrollbar and mobile swipe support */}
        <div 
          ref={tableRef} 
          className="overflow-x-scroll drag-scroll touch-pan-x"
          onScroll={(e) => {
            const topScrollbar = e.currentTarget.previousElementSibling as HTMLElement;
            if (topScrollbar) {
              topScrollbar.scrollLeft = e.currentTarget.scrollLeft;
            }
          }}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('firstName')}
                  data-testid="sort-firstName"
                >
                  👤 First Name
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('lastName')}
                  data-testid="sort-lastName"
                >
                  Last Name
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('email')}
                  data-testid="sort-email"
                >
                  Email
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('phoneNumber')}
                  data-testid="sort-phoneNumber"
                >
                  Phone
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('dob')}
                  data-testid="sort-dob"
                >
                  DOB
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('role')}
                  data-testid="sort-role"
                >
                  Role
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('isActive')}
                  data-testid="sort-isActive"
                >
                  Active
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((user: any) => {
                return (
                  <TableRow key={user.id} className="cursor-default" data-testid={`row-user-${user.id}`}>
                    <TableCell data-testid={`text-firstname-${user.id}`}>{user.firstName || "-"}</TableCell>
                    <TableCell data-testid={`text-lastname-${user.id}`}>{user.lastName || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phoneNumber || user.phone || "-"}</TableCell>
                    <TableCell>{user.dob ? new Date(user.dob).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive !== false}
                        disabled={updatingUserId === user.id}
                        onCheckedChange={(checked) => {
                          updateUser.mutate({ id: user.id, isActive: checked });
                        }}
                        className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-gray-400"
                        data-testid={`toggle-active-${user.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setViewingUser(user);
                            setDetailTab("team");
                          }}
                          data-testid={`button-view-user-${user.id}`}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingUser(user);
                            const programId = user.programId || programs.find((p: any) => p.name === user.program)?.id || "";
                            setSelectedProgram(programId);
                          }}
                          data-testid={`button-edit-user-${user.id}`}
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteUser.mutate(user.id)}
                          data-testid={`button-delete-user-${user.id}`}
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
        </div>
      </CardContent>

      {/* User Detail View Dialog */}
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle>
              User Details: {viewingUser?.firstName} {viewingUser?.lastName}
            </DialogTitle>
          </DialogHeader>
          
          {viewingUser && (
            <div className="flex flex-col md:flex-row h-full">
              {/* Sidebar Navigation */}
              <div className="w-full md:w-48 border-b md:border-b-0 md:border-r bg-gray-50">
                <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible" role="tablist">
                  <button
                    role="tab"
                    aria-selected={detailTab === "team"}
                    aria-controls="team-panel"
                    onClick={() => setDetailTab("team")}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      detailTab === "team"
                        ? "bg-white text-red-600 border-l-4 border-red-600 md:border-l-4 md:border-t-0"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid="tab-team-info"
                  >
                    🏀 <span className="hidden md:inline">Team Info</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={detailTab === "billing"}
                    aria-controls="billing-panel"
                    onClick={() => setDetailTab("billing")}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      detailTab === "billing"
                        ? "bg-white text-red-600 border-l-4 border-red-600 md:border-l-4 md:border-t-0"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid="tab-billing"
                  >
                    💳 <span className="hidden md:inline">Billing</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={detailTab === "performance"}
                    aria-controls="performance-panel"
                    onClick={() => setDetailTab("performance")}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      detailTab === "performance"
                        ? "bg-white text-red-600 border-l-4 border-red-600 md:border-l-4 md:border-t-0"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid="tab-performance"
                  >
                    📈 <span className="hidden md:inline">Performance</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={detailTab === "skills"}
                    aria-controls="skills-panel"
                    onClick={() => setDetailTab("skills")}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      detailTab === "skills"
                        ? "bg-white text-red-600 border-l-4 border-red-600 md:border-l-4 md:border-t-0"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid="tab-skills"
                  >
                    🧠 <span className="hidden md:inline">Skills & Awards</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={detailTab === "notes"}
                    aria-controls="notes-panel"
                    onClick={() => setDetailTab("notes")}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      detailTab === "notes"
                        ? "bg-white text-red-600 border-l-4 border-red-600 md:border-l-4 md:border-t-0"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid="tab-notes"
                  >
                    🩺 <span className="hidden md:inline">Admin Notes</span>
                  </button>
                  <button
                    role="tab"
                    aria-selected={detailTab === "system"}
                    aria-controls="system-panel"
                    onClick={() => setDetailTab("system")}
                    className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                      detailTab === "system"
                        ? "bg-white text-red-600 border-l-4 border-red-600 md:border-l-4 md:border-t-0"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    data-testid="tab-system"
                  >
                    ⚙️ <span className="hidden md:inline">System Meta</span>
                  </button>
                </nav>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">

              {/* Team Info Tab */}
              {detailTab === "team" && (
                <div role="tabpanel" id="team-panel" aria-labelledby="team-tab" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Role</Label>
                    <div>
                      <Badge variant={viewingUser.role === "admin" ? "default" : "secondary"}>
                        {viewingUser.role}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Organization</Label>
                    <p className="text-sm" data-testid="text-user-organization">
                      {organization?.name || "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Program</Label>
                    <p className="text-sm" data-testid="text-user-program">{viewingUser.program || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Team</Label>
                    <p className="text-sm" data-testid="text-user-team">
                      {teams.find((t: any) => t.id === Number(viewingUser.teamId))?.name || "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Division</Label>
                    <p className="text-sm" data-testid="text-user-division">
                      {divisions.find((d: any) => d.id === Number(viewingUser.divisionId))?.name || "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Position</Label>
                    <p className="text-sm" data-testid="text-user-position">{viewingUser.position || "-"}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Height</Label>
                    <p className="text-sm" data-testid="text-user-height">
                      {viewingUser.heightIn ? `${Math.floor(viewingUser.heightIn / 12)}'${viewingUser.heightIn % 12}" (${viewingUser.heightIn}in)` : "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Guardian</Label>
                    <p className="text-sm" data-testid="text-user-guardian">
                      {viewingUser.guardianId ? users.find((u: any) => u.id === viewingUser.guardianId)?.firstName + " " + users.find((u: any) => u.id === viewingUser.guardianId)?.lastName : "-"}
                    </p>
                  </div>
                </div>
                {viewingUser.bio && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Bio</Label>
                    <p className="text-sm p-3 bg-gray-50 rounded" data-testid="text-user-bio">{viewingUser.bio}</p>
                  </div>
                )}
                </div>
              )}

              {/* Billing Tab */}
              {detailTab === "billing" && (
                <div role="tabpanel" id="billing-panel" aria-labelledby="billing-tab" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Stripe Customer ID</Label>
                    <p className="text-sm font-mono text-xs" data-testid="text-user-stripe-id">
                      {viewingUser.stripeCustomerId || "-"}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Packages</Label>
                    <p className="text-sm" data-testid="text-user-packages">
                      {viewingUser.packages?.join(", ") || "-"}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-600">Active Products</Label>
                  {viewingUser.products && Array.isArray(viewingUser.products) && viewingUser.products.length > 0 ? (
                    <div className="space-y-2">
                      {viewingUser.products.map((product: any, index: number) => (
                        <div key={index} className="p-3 bg-gray-50 rounded border" data-testid={`product-${index}`}>
                          <p className="text-sm font-medium">{typeof product === 'string' ? product : product.name || 'Unknown Product'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No active products</p>
                  )}
                </div>
                </div>
              )}

              {/* Performance Tab */}
              {detailTab === "performance" && (
                <div role="tabpanel" id="performance-panel" aria-labelledby="performance-tab" className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total Practices</p>
                        <p className="text-3xl font-bold mt-2" data-testid="stat-total-practices">
                          {viewingUser.totalPractices || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Total Games</p>
                        <p className="text-3xl font-bold mt-2" data-testid="stat-total-games">
                          {viewingUser.totalGames || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Consecutive Check-ins</p>
                        <p className="text-3xl font-bold mt-2" data-testid="stat-consecutive-checkins">
                          {viewingUser.consecutiveCheckins || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Videos Completed</p>
                        <p className="text-3xl font-bold mt-2" data-testid="stat-videos-completed">
                          {viewingUser.videosCompleted || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Years Active</p>
                        <p className="text-3xl font-bold mt-2" data-testid="stat-years-active">
                          {viewingUser.yearsActive || 0}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Skill Level</p>
                        <p className="text-3xl font-bold mt-2" data-testid="stat-skill-level">
                          {viewingUser.skill || "-"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                </div>
              )}

              {/* Skills & Awards Tab */}
              {detailTab === "skills" && (
                <div role="tabpanel" id="skills-panel" aria-labelledby="skills-tab" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Awards & Trophies</Label>
                    {viewingUser.awards && viewingUser.awards.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {viewingUser.awards.map((award: any, index: number) => (
                          <Card key={index} className="p-4 text-center" data-testid={`award-${index}`}>
                            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                            <p className="text-sm font-medium">{award.name || award}</p>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No awards yet</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Skills Assessments</Label>
                    {viewingUser.skillsAssessments && Object.keys(viewingUser.skillsAssessments).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(viewingUser.skillsAssessments).map(([year, assessment]: [string, any]) => (
                          <Card key={year} className="p-4" data-testid={`assessment-${year}`}>
                            <p className="font-semibold mb-2">Year: {year}</p>
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                              {JSON.stringify(assessment, null, 2)}
                            </pre>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No assessments recorded</p>
                    )}
                  </div>
                </div>
                </div>
              )}

              {/* Admin Notes Tab */}
              {detailTab === "notes" && (
                <div role="tabpanel" id="notes-panel" aria-labelledby="notes-tab" className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Emergency Contact</Label>
                    {viewingUser.emergencyContactJson ? (
                      <Card className="p-4" data-testid="emergency-contact-info">
                        <pre className="text-sm whitespace-pre-wrap">
                          {JSON.stringify(viewingUser.emergencyContactJson, null, 2)}
                        </pre>
                      </Card>
                    ) : (
                      <p className="text-sm text-gray-500">No emergency contact information</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-600">Admin Notes (Internal)</Label>
                    {viewingUser.notes ? (
                      <Card className="p-4 bg-yellow-50 border-yellow-200" data-testid="admin-notes">
                        <p className="text-sm whitespace-pre-wrap">{viewingUser.notes}</p>
                      </Card>
                    ) : (
                      <p className="text-sm text-gray-500">No admin notes</p>
                    )}
                  </div>
                </div>
                </div>
              )}

              {/* System Meta Tab */}
              {detailTab === "system" && (
                <div role="tabpanel" id="system-panel" aria-labelledby="system-tab" className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="system-info">
                    <AccordionTrigger>System Information</AccordionTrigger>
                    <AccordionContent>
                      <div className="grid grid-cols-2 gap-4 p-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-600">User ID</Label>
                          <p className="text-sm font-mono text-xs" data-testid="text-user-id">{viewingUser.id}</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-600">Active Status</Label>
                          <div>
                            <Badge variant={viewingUser.isActive !== false ? "default" : "secondary"}>
                              {viewingUser.isActive !== false ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-600">Last Login</Label>
                          <p className="text-sm" data-testid="text-last-login">
                            {viewingUser.lastLogin 
                              ? new Date(viewingUser.lastLogin).toLocaleString()
                              : "Never"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-600">Created At</Label>
                          <p className="text-sm" data-testid="text-created-at">
                            {viewingUser.createdAt 
                              ? new Date(viewingUser.createdAt).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-600">Updated At</Label>
                          <p className="text-sm" data-testid="text-updated-at">
                            {viewingUser.updatedAt 
                              ? new Date(viewingUser.updatedAt).toLocaleString()
                              : "-"}
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-600">Verified</Label>
                          <div>
                            <Badge variant={viewingUser.verified ? "default" : "secondary"}>
                              {viewingUser.verified ? "Verified" : "Not Verified"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
                </div>
              )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Teams Tab - Full Implementation
function TeamsTab({ teams, users, divisions, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const tableRef = useDragScroll();

  const coaches = users.filter((u: any) => u.role === "coach");
  const players = users.filter((u: any) => u.role === "player");

  const form = useForm<any>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      programType: "",
      divisionId: undefined as number | undefined,
      coachId: "",
      assistantCoachIds: [] as string[],
      season: "",
      organization: "",
      location: "",
      scheduleLink: "",
      rosterSize: 0,
      active: true,
      notes: "",
    },
  });

  const createTeam = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/teams", { 
        ...data, 
        organizationId: organization.id
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

  const deleteTeam = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/teams/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete team", variant: "destructive" });
    },
  });

  const updateTeam = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/teams/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Team updated successfully" });
      setEditingTeam(null);
    },
    onError: () => {
      toast({ title: "Failed to update team", variant: "destructive" });
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
              <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                          <FormLabel>Team Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Thunder U12" data-testid="input-team-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="programType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-team-program-type">
                                <SelectValue placeholder="Select program type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Team">Team</SelectItem>
                              <SelectItem value="Skills">Skills</SelectItem>
                              <SelectItem value="FNH">FNH</SelectItem>
                              <SelectItem value="Camp">Camp</SelectItem>
                              <SelectItem value="Training">Training</SelectItem>
                              <SelectItem value="Special">Special</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="divisionId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Division</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} 
                            value={field.value ? field.value.toString() : "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-team-division">
                                <SelectValue placeholder="Select a division" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {divisions.map((division: any) => (
                                <SelectItem key={division.id} value={division.id.toString()}>
                                  {division.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="coachId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Head Coach</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(value === "none" ? undefined : value)} 
                            value={field.value || "none"}
                          >
                            <FormControl>
                              <SelectTrigger data-testid="select-team-coach">
                                <SelectValue placeholder="Select a coach" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {coaches.map((coach: any) => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.firstName} {coach.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="assistantCoachIds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assistant Coaches</FormLabel>
                          <FormDescription>Select assistant coaches for this team</FormDescription>
                          <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" data-testid="checkbox-group-assistant-coaches">
                            {coaches.length === 0 ? (
                              <p className="text-sm text-gray-500">No coaches available</p>
                            ) : (
                              coaches.map((coach: any) => {
                                const currentValue = field.value || [];
                                const isChecked = Array.isArray(currentValue) && currentValue.includes(coach.id);
                                return (
                                  <div key={coach.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      checked={isChecked}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([...currentValue, coach.id]);
                                        } else {
                                          field.onChange(currentValue.filter((id: string) => id !== coach.id));
                                        }
                                      }}
                                      data-testid={`checkbox-assistant-coach-${coach.id}`}
                                    />
                                    <Label className="text-sm font-normal cursor-pointer">
                                      {coach.firstName} {coach.lastName}
                                    </Label>
                                  </div>
                                );
                              })
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="season"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Season</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Winter 2025" data-testid="input-team-season" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="organization"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Club/Brand</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Basketball Academy" data-testid="input-team-organization" />
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
                          <FormLabel>Facility Location</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Main Gym" data-testid="input-team-location" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="scheduleLink"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Schedule Link</FormLabel>
                          <FormControl>
                            <Input {...field} type="url" placeholder="https://..." data-testid="input-team-schedule-link" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="rosterSize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Roster Size</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              type="number" 
                              placeholder="0" 
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              data-testid="input-team-roster-size" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Active</FormLabel>
                            <FormDescription>
                              Is this team currently active?
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="switch-team-active"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea {...field} placeholder="Internal team notes..." rows={3} data-testid="input-team-notes" />
                          </FormControl>
                          <FormMessage />
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

            {/* Edit Team Dialog */}
            <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                </DialogHeader>
                {editingTeam && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-name">Team Name *</Label>
                      <Input
                        id="edit-team-name"
                        value={editingTeam.name || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})}
                        data-testid="input-edit-team-name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-program-type">Program Type</Label>
                      <Select
                        value={editingTeam.programType || "none"}
                        onValueChange={(value) => setEditingTeam({...editingTeam, programType: value === "none" ? null : value})}
                      >
                        <SelectTrigger id="edit-team-program-type" data-testid="select-edit-team-program-type">
                          <SelectValue placeholder="Select program type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="Team">Team</SelectItem>
                          <SelectItem value="Skills">Skills</SelectItem>
                          <SelectItem value="FNH">FNH</SelectItem>
                          <SelectItem value="Camp">Camp</SelectItem>
                          <SelectItem value="Training">Training</SelectItem>
                          <SelectItem value="Special">Special</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-division">Division</Label>
                      <Select
                        value={editingTeam.divisionId?.toString() || "none"}
                        onValueChange={(value) => setEditingTeam({...editingTeam, divisionId: value === "none" ? null : parseInt(value)})}
                      >
                        <SelectTrigger id="edit-team-division" data-testid="select-edit-team-division">
                          <SelectValue placeholder="Select a division" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {divisions.map((division: any) => (
                            <SelectItem key={division.id} value={division.id.toString()}>
                              {division.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-coachId">Head Coach</Label>
                      <Select
                        value={editingTeam.coachId || "none"}
                        onValueChange={(value) => setEditingTeam({...editingTeam, coachId: value === "none" ? null : value})}
                      >
                        <SelectTrigger id="edit-team-coachId" data-testid="select-edit-team-coachId">
                          <SelectValue placeholder="Select a coach" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {coaches.map((coach: any) => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.firstName} {coach.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-assistant-coaches">Assistant Coaches</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2" data-testid="checkbox-group-edit-assistant-coaches">
                        {coaches.length === 0 ? (
                          <p className="text-sm text-gray-500">No coaches available</p>
                        ) : (
                          coaches.map((coach: any) => (
                            <div key={coach.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={(editingTeam.assistantCoachIds || []).includes(coach.id)}
                                onCheckedChange={(checked) => {
                                  const currentValue = editingTeam.assistantCoachIds || [];
                                  if (checked) {
                                    setEditingTeam({...editingTeam, assistantCoachIds: [...currentValue, coach.id]});
                                  } else {
                                    setEditingTeam({...editingTeam, assistantCoachIds: currentValue.filter((id: string) => id !== coach.id)});
                                  }
                                }}
                                data-testid={`checkbox-edit-assistant-coach-${coach.id}`}
                              />
                              <Label className="text-sm font-normal cursor-pointer">
                                {coach.firstName} {coach.lastName}
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-team-season">Season</Label>
                        <Input
                          id="edit-team-season"
                          value={editingTeam.season || ""}
                          onChange={(e) => setEditingTeam({...editingTeam, season: e.target.value})}
                          placeholder="Winter 2025"
                          data-testid="input-edit-team-season"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-team-organization">Club/Brand</Label>
                        <Input
                          id="edit-team-organization"
                          value={editingTeam.organization || ""}
                          onChange={(e) => setEditingTeam({...editingTeam, organization: e.target.value})}
                          placeholder="Basketball Academy"
                          data-testid="input-edit-team-organization"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-location">Facility Location</Label>
                      <Input
                        id="edit-team-location"
                        value={editingTeam.location || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, location: e.target.value})}
                        placeholder="Main Gym"
                        data-testid="input-edit-team-location"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-schedule-link">Schedule Link</Label>
                      <Input
                        id="edit-team-schedule-link"
                        value={editingTeam.scheduleLink || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, scheduleLink: e.target.value})}
                        type="url"
                        placeholder="https://..."
                        data-testid="input-edit-team-schedule-link"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-roster-size">Roster Size</Label>
                      <Input
                        id="edit-team-roster-size"
                        value={editingTeam.rosterSize || 0}
                        onChange={(e) => setEditingTeam({...editingTeam, rosterSize: parseInt(e.target.value) || 0})}
                        type="number"
                        placeholder="0"
                        data-testid="input-edit-team-roster-size"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <Label className="text-base">Active</Label>
                        <p className="text-sm text-gray-500">Is this team currently active?</p>
                      </div>
                      <Switch
                        checked={editingTeam.active !== false}
                        onCheckedChange={(checked) => setEditingTeam({...editingTeam, active: checked})}
                        data-testid="switch-edit-team-active"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-team-notes">Notes</Label>
                      <Textarea
                        id="edit-team-notes"
                        value={editingTeam.notes || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, notes: e.target.value})}
                        placeholder="Internal team notes..."
                        rows={3}
                        data-testid="input-edit-team-notes"
                      />
                    </div>

                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => updateTeam.mutate(editingTeam)}
                      disabled={updateTeam.isPending}
                      data-testid="button-submit-edit-team"
                    >
                      {updateTeam.isPending ? "Updating..." : "Update Team"}
                    </Button>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={tableRef} className="overflow-x-auto hide-scrollbar drag-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Program Type</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Season</TableHead>
                  <TableHead>Roster</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team: any) => {
                  const coach = users.find((u: any) => u.id === team.coachId);
                  const division = divisions.find((d: any) => d.id === team.divisionId);
                  return (
                    <TableRow key={team.id} data-testid={`row-team-${team.id}`}>
                      <TableCell className="font-medium" data-testid={`text-team-name-${team.id}`}>
                        {team.name}
                      </TableCell>
                      <TableCell data-testid={`text-program-type-${team.id}`}>
                        {team.programType ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {team.programType}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-division-${team.id}`}>
                        {division?.name || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-coach-${team.id}`}>
                        {coach ? `${coach.firstName} ${coach.lastName}` : "Unassigned"}
                      </TableCell>
                      <TableCell data-testid={`text-season-${team.id}`}>
                        {team.season || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-roster-${team.id}`}>
                        {team.rosterCount || 0}
                      </TableCell>
                      <TableCell data-testid={`status-active-${team.id}`}>
                        <Badge 
                          variant={team.active ? "default" : "secondary"}
                          className={team.active ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}
                        >
                          {team.active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setSelectedTeam(team)}
                            data-testid={`button-view-roster-${team.id}`}
                            title="View/Manage Roster"
                          >
                            <Users className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditingTeam(team)}
                            data-testid={`button-edit-team-${team.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteTeam.mutate(team.id)}
                            data-testid={`button-delete-team-${team.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Roster Management Dialog */}
      {selectedTeam && (
        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Manage Roster - {selectedTeam.name}</DialogTitle>
              <CardDescription>
                Select or deselect players to add or remove them from this team
              </CardDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
                {players.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">No players available</p>
                ) : (
                  players.map((player: any) => {
                    const isOnTeam = player.teamId === selectedTeam.id;
                    return (
                      <div 
                        key={player.id} 
                        className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded border-b last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox 
                            checked={isOnTeam}
                            onCheckedChange={async (checked) => {
                              try {
                                await apiRequest("PATCH", `/api/users/${player.id}`, {
                                  teamId: checked ? selectedTeam.id : null
                                });
                                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                                toast({ 
                                  title: checked 
                                    ? `Added ${player.firstName} ${player.lastName} to ${selectedTeam.name}`
                                    : `Removed ${player.firstName} ${player.lastName} from ${selectedTeam.name}`
                                });
                              } catch (error) {
                                toast({ 
                                  title: "Failed to update player assignment",
                                  variant: "destructive"
                                });
                              }
                            }}
                            data-testid={`checkbox-player-${player.id}`}
                          />
                          <div>
                            <p className="font-medium">{player.firstName} {player.lastName}</p>
                            {player.teamId && player.teamId !== selectedTeam.id && (
                              <p className="text-xs text-gray-500">
                                Currently on: {teams.find((t: any) => t.id === player.teamId)?.name || "Unknown Team"}
                              </p>
                            )}
                          </div>
                        </div>
                        {isOnTeam && (
                          <Badge variant="default" className="bg-green-100 text-green-700 border-green-200">
                            On Team
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="text-sm text-gray-600">
                <strong>Roster Count:</strong> {players.filter((p: any) => p.teamId === selectedTeam.id).length} players
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Events Tab - Full Implementation with Calendar and List View
function EventsTab({ events, teams, programs, organization, currentUser }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<any>(null);
  const [eventWindows, setEventWindows] = useState<Partial<EventWindow>[]>([]);
  const [editEventWindows, setEditEventWindows] = useState<Partial<EventWindow>[]>([]);
  
  // Multi-select state for event targeting
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);

  // Fetch users and divisions for the multi-select
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });
  
  const { data: divisions = [] } = useQuery<any[]>({
    queryKey: ["/api/divisions"],
  });

  // Fetch participants for the selected event
  const { data: eventParticipants = [] } = useQuery<any[]>({
    queryKey: ['/api/events', selectedEventForDetails?.id, 'participants'],
    enabled: !!selectedEventForDetails,
  });

  const createEventSchema = z.object({
    title: z.string().min(1, "Event title is required"),
    type: z.enum(["practice", "game", "tournament", "meeting"]),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    description: z.string().optional(),
    targetType: z.enum(["all", "user", "team", "division"]),
  });

  const form = useForm({
    resolver: zodResolver(createEventSchema),
    defaultValues: {
      title: "",
      type: "practice" as const,
      startTime: "",
      endTime: "",
      location: "",
      latitude: undefined,
      longitude: undefined,
      description: "",
      targetType: "all" as const,
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      // Rename 'type' to 'eventType' for backend compatibility
      const { type, targetType, ...rest } = data;
      
      // Build assignTo object based on targetType and selections
      let assignTo: any = {};
      let visibility: any = {};
      
      if (targetType === 'all') {
        assignTo = { roles: ['player', 'coach', 'parent', 'admin'] };
        visibility = { roles: ['player', 'coach', 'parent', 'admin'] };
      } else if (targetType === 'user') {
        assignTo = { users: selectedUsers };
        visibility = { users: selectedUsers };
      } else if (targetType === 'team') {
        assignTo = { teams: selectedTeams.map(String) };
        visibility = { teams: selectedTeams.map(String) };
      } else if (targetType === 'division') {
        assignTo = { divisions: selectedDivisions.map(String) };
        visibility = { divisions: selectedDivisions.map(String) };
      }
      
      console.log('Event form data before submission:', { type, targetType, assignTo, ...rest });
      const payload = {
        ...rest,
        eventType: type,
        organizationId: organization.id,
        assignTo,
        visibility,
      };
      console.log('Event API payload:', payload);
      const newEvent = await apiRequest("POST", "/api/events", payload);
      
      // Create event windows if configured
      if (eventWindows.length > 0) {
        for (const window of eventWindows) {
          await apiRequest("POST", "/api/event-windows", {
            ...window,
            eventId: parseInt(newEvent.id),
          });
        }
      }
      
      return newEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event created successfully" });
      setIsDialogOpen(false);
      form.reset();
      setEventWindows([]);
      setSelectedUsers([]);
      setSelectedTeams([]);
      setSelectedDivisions([]);
    },
    onError: () => {
      toast({ title: "Failed to create event", variant: "destructive" });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/events/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete event", variant: "destructive" });
    },
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, targetType, targetId, ...data }: any) => {
      // Convert legacy targetType/targetId to assignTo/visibility
      const payload: any = { ...data };
      
      if (targetType === 'team' && targetId) {
        payload.assignTo = { teams: [String(targetId)] };
        payload.visibility = { teams: [String(targetId)] };
      } else if (targetType === 'division' && targetId) {
        payload.assignTo = { divisions: [String(targetId)] };
        payload.visibility = { divisions: [String(targetId)] };
      } else if (targetType === 'user' && targetId) {
        payload.assignTo = { users: [String(targetId)] };
        payload.visibility = { users: [String(targetId)] };
      } else if (targetType === 'role' && targetId) {
        payload.assignTo = { roles: [String(targetId)] };
        payload.visibility = { roles: [String(targetId)] };
      } else if (targetType === 'all') {
        payload.assignTo = { roles: ['player', 'coach', 'parent', 'admin'] };
        payload.visibility = { roles: ['player', 'coach', 'parent', 'admin'] };
      }
      
      const updatedEvent = await apiRequest("PATCH", `/api/events/${id}`, payload);
      
      // Update event windows - delete existing and create new ones
      await apiRequest("DELETE", `/api/event-windows/event/${id}`);
      
      if (editEventWindows.length > 0) {
        for (const window of editEventWindows) {
          await apiRequest("POST", "/api/event-windows", {
            ...window,
            eventId: parseInt(id),
          });
        }
      }
      
      return updatedEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: "Event updated successfully" });
      setEditingEvent(null);
      setEditEventWindows([]);
    },
    onError: () => {
      toast({ title: "Failed to update event", variant: "destructive" });
    },
  });
  
  // Load event windows when editing an event
  useEffect(() => {
    if (editingEvent) {
      (async () => {
        try {
          const windows = await apiRequest("GET", `/api/event-windows/event/${editingEvent.id}`);
          setEditEventWindows(windows);
        } catch (error) {
          console.error('Failed to load event windows:', error);
          setEditEventWindows([]);
        }
      })();
    }
  }, [editingEvent]);

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
                <form onSubmit={form.handleSubmit((data) => {
                  console.log('📍 Creating event with data:', data);
                  // Convert datetime-local strings to ISO strings with timezone
                  const eventData = {
                    ...data,
                    startTime: data.startTime && !data.startTime.endsWith('Z') ? new Date(data.startTime).toISOString() : data.startTime,
                    endTime: data.endTime && !data.endTime.endsWith('Z') ? new Date(data.endTime).toISOString() : data.endTime,
                  };
                  createEvent.mutate(eventData);
                })} className="space-y-4">
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
                            <SelectItem value="game">Game</SelectItem>
                            <SelectItem value="tournament">Tournament</SelectItem>
                            <SelectItem value="camp">Camp</SelectItem>
                            <SelectItem value="exhibition">Exhibition</SelectItem>
                            <SelectItem value="practice">Practice</SelectItem>
                            <SelectItem value="skills">Skills</SelectItem>
                            <SelectItem value="workshop">Workshop</SelectItem>
                            <SelectItem value="talk">Talk</SelectItem>
                            <SelectItem value="combine">Combine</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="course">Course</SelectItem>
                            <SelectItem value="tryout">Tryout</SelectItem>
                            <SelectItem value="skills-assessment">Skills Assessment</SelectItem>
                            <SelectItem value="team-building">Team Building</SelectItem>
                            <SelectItem value="parent-meeting">Parent Meeting</SelectItem>
                            <SelectItem value="equipment-pickup">Equipment Pickup</SelectItem>
                            <SelectItem value="photo-day">Photo Day</SelectItem>
                            <SelectItem value="award-ceremony">Award Ceremony</SelectItem>
                            <SelectItem value="fnh">FNH</SelectItem>
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
                          <LocationSearch
                            value={field.value || ""}
                            onLocationSelect={(location) => {
                              field.onChange(location.name);
                              form.setValue("latitude", location.lat ?? undefined as any);
                              form.setValue("longitude", location.lng ?? undefined as any);
                            }}
                            placeholder="Search for a location..."
                            className="w-full"
                          />
                        </FormControl>
                        <FormDescription>
                          Search and select a location for accurate check-in geo-fencing
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="targetType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event For</FormLabel>
                        <Select onValueChange={(value) => {
                          field.onChange(value);
                          setSelectedUsers([]);
                          setSelectedTeams([]);
                          setSelectedDivisions([]);
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-target">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Everyone</SelectItem>
                            <SelectItem value="user">Specific User(s)</SelectItem>
                            <SelectItem value="team">Team(s)</SelectItem>
                            <SelectItem value="division">Division(s)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Who should see this event?</FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  {String(form.watch("targetType")) === "user" && (
                    <div className="space-y-2">
                      <Label>Select Users</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {allUsers.filter((u: any) => u.isActive).map((user: any) => (
                          <div key={user.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedUsers([...selectedUsers, user.id]);
                                } else {
                                  setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                                }
                              }}
                              data-testid={`checkbox-user-${user.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {user.firstName} {user.lastName} ({user.email})
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedUsers.length} user(s) selected</p>
                    </div>
                  )}
                  
                  {String(form.watch("targetType")) === "team" && (
                    <div className="space-y-2">
                      <Label>Select Teams</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {teams.filter((t: any) => t.active).map((team: any) => (
                          <div key={team.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedTeams.includes(String(team.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedTeams([...selectedTeams, String(team.id)]);
                                } else {
                                  setSelectedTeams(selectedTeams.filter(id => id !== String(team.id)));
                                }
                              }}
                              data-testid={`checkbox-team-${team.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {team.name}{team.programType ? ` (${team.programType})` : ''}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedTeams.length} team(s) selected</p>
                    </div>
                  )}
                  
                  {String(form.watch("targetType")) === "division" && (
                    <div className="space-y-2">
                      <Label>Select Divisions</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {divisions.filter((d: any) => d.isActive).map((division: any) => (
                          <div key={division.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedDivisions.includes(String(division.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedDivisions([...selectedDivisions, String(division.id)]);
                                } else {
                                  setSelectedDivisions(selectedDivisions.filter(id => id !== String(division.id)));
                                }
                              }}
                              data-testid={`checkbox-division-${division.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {division.name} {division.ageRange ? `(${division.ageRange})` : ''}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedDivisions.length} division(s) selected</p>
                    </div>
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
                  
                  <div className="border-t pt-4">
                    <EventWindowsConfigurator
                      eventStartTime={form.watch("startTime") ? new Date(form.watch("startTime")) : undefined}
                      windows={eventWindows}
                      onChange={setEventWindows}
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={createEvent.isPending} data-testid="button-submit-event">
                    {createEvent.isPending ? "Creating..." : "Create Event"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Event Dialog */}
          {editingEvent && (
            <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Event</DialogTitle>
                </DialogHeader>
                {editingEvent && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-title">Event Title</Label>
                    <Input
                      id="edit-event-title"
                      defaultValue={editingEvent.title || ""}
                      onChange={(e) => setEditingEvent({...editingEvent, title: e.target.value})}
                      data-testid="input-edit-event-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-type">Event Type</Label>
                    <Select
                      value={editingEvent.type || "practice"}
                      onValueChange={(value) => setEditingEvent({...editingEvent, type: value})}
                    >
                      <SelectTrigger id="edit-event-type" data-testid="select-edit-event-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="game">Game</SelectItem>
                        <SelectItem value="tournament">Tournament</SelectItem>
                        <SelectItem value="camp">Camp</SelectItem>
                        <SelectItem value="exhibition">Exhibition</SelectItem>
                        <SelectItem value="practice">Practice</SelectItem>
                        <SelectItem value="skills">Skills</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="talk">Talk</SelectItem>
                        <SelectItem value="combine">Combine</SelectItem>
                        <SelectItem value="training">Training</SelectItem>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="course">Course</SelectItem>
                        <SelectItem value="tryout">Tryout</SelectItem>
                        <SelectItem value="skills-assessment">Skills Assessment</SelectItem>
                        <SelectItem value="team-building">Team Building</SelectItem>
                        <SelectItem value="parent-meeting">Parent Meeting</SelectItem>
                        <SelectItem value="equipment-pickup">Equipment Pickup</SelectItem>
                        <SelectItem value="photo-day">Photo Day</SelectItem>
                        <SelectItem value="award-ceremony">Award Ceremony</SelectItem>
                        <SelectItem value="fnh">FNH</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-startTime">Start Time</Label>
                      <Input
                        id="edit-event-startTime"
                        type="datetime-local"
                        defaultValue={editingEvent.startTime ? format(new Date(editingEvent.startTime), "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => setEditingEvent({...editingEvent, startTime: e.target.value})}
                        data-testid="input-edit-event-startTime"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-endTime">End Time</Label>
                      <Input
                        id="edit-event-endTime"
                        type="datetime-local"
                        defaultValue={editingEvent.endTime ? format(new Date(editingEvent.endTime), "yyyy-MM-dd'T'HH:mm") : ""}
                        onChange={(e) => setEditingEvent({...editingEvent, endTime: e.target.value})}
                        data-testid="input-edit-event-endTime"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-location">Location</Label>
                    <LocationSearch
                      value={editingEvent.location || ""}
                      onLocationSelect={(location) => {
                        setEditingEvent({
                          ...editingEvent,
                          location: location.name,
                          latitude: location.lat ?? undefined,
                          longitude: location.lng ?? undefined
                        });
                      }}
                      placeholder="Search for a location..."
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">Search and select a location for accurate check-in geo-fencing</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-targetType">Event For</Label>
                    <Select
                      value={editingEvent.targetType || "all"}
                      onValueChange={(value) => setEditingEvent({...editingEvent, targetType: value})}
                    >
                      <SelectTrigger id="edit-event-targetType" data-testid="select-edit-event-targetType">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Everyone</SelectItem>
                        <SelectItem value="team">Specific Team</SelectItem>
                        <SelectItem value="program">Specific Program</SelectItem>
                        <SelectItem value="role">Specific Role</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(editingEvent.targetType === "team" || editingEvent.targetType === "program" || editingEvent.targetType === "role") && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-targetId">Select Team</Label>
                      <Select
                        value={editingEvent.targetId ? String(editingEvent.targetId) : ""}
                        onValueChange={(value) => setEditingEvent({...editingEvent, targetId: value})}
                      >
                        <SelectTrigger id="edit-event-targetId" data-testid="select-edit-event-targetId">
                          <SelectValue placeholder="Choose a team" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team: any) => (
                            <SelectItem key={team.id} value={String(team.id)}>
                              {team.name}{team.programType ? ` (${team.programType})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {editingEvent.targetType === "team" ? "Choose which team this event is for" : ""}
                      </p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="edit-event-description">Description</Label>
                    <Textarea
                      id="edit-event-description"
                      defaultValue={editingEvent.description || ""}
                      onChange={(e) => setEditingEvent({...editingEvent, description: e.target.value})}
                      data-testid="input-edit-event-description"
                    />
                  </div>
                  
                  <div className="border-t pt-4">
                    <EventWindowsConfigurator
                      eventStartTime={editingEvent.startTime ? new Date(editingEvent.startTime) : undefined}
                      windows={editEventWindows}
                      onChange={setEditEventWindows}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      // Convert datetime-local strings to ISO strings with timezone
                      const updatedData = {
                        ...editingEvent,
                        startTime: editingEvent.startTime && !editingEvent.startTime.endsWith('Z') ? new Date(editingEvent.startTime).toISOString() : editingEvent.startTime,
                        endTime: editingEvent.endTime && !editingEvent.endTime.endsWith('Z') ? new Date(editingEvent.endTime).toISOString() : editingEvent.endTime,
                      };
                      updateEvent.mutate(updatedData);
                    }}
                    disabled={updateEvent.isPending}
                    data-testid="button-submit-edit-event"
                  >
                    {updateEvent.isPending ? "Updating..." : "Update Event"}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
          )}

          {/* Event Details Modal */}
          <EventDetailModal
            event={selectedEventForDetails}
            userId={currentUser?.id || ''}
            userRole={currentUser?.role as 'admin' | 'coach' | 'player' | 'parent'}
            open={!!selectedEventForDetails}
            onOpenChange={(open) => !open && setSelectedEventForDetails(null)}
          />
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
              {events.map((event: any) => {
                // Look up team if event is team-specific
                const eventTeam = event.teamId ? teams.find((t: any) => t.id === parseInt(event.teamId)) : null;
                const teamDisplay = eventTeam 
                  ? `${eventTeam.name}${eventTeam.programType ? ` (${eventTeam.programType})` : ''}`
                  : null;
                
                return (
                <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                  <TableCell className="font-medium">{event.title}</TableCell>
                  <TableCell>
                    <Badge>{event.type}</Badge>
                  </TableCell>
                  <TableCell>{new Date(event.startTime).toLocaleString()}</TableCell>
                  <TableCell>{event.location || "-"}</TableCell>
                  <TableCell>
                    {event.targetType === "all" ? "Everyone" : 
                     event.targetType === "team" && teamDisplay ? teamDisplay :
                     event.targetType}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedEventForDetails(event)}
                        data-testid={`button-view-details-${event.id}`}
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          // Convert assignTo/visibility to legacy format for edit form
                          const eventToEdit = { ...event };
                          
                          // Determine targetType from assignTo/visibility
                          if (event.assignTo?.teams && event.assignTo.teams.length > 0) {
                            eventToEdit.targetType = 'team';
                            eventToEdit.targetId = String(event.assignTo.teams[0]);
                          } else if (event.assignTo?.divisions && event.assignTo.divisions.length > 0) {
                            eventToEdit.targetType = 'division';
                            eventToEdit.targetId = String(event.assignTo.divisions[0]);
                          } else if (event.assignTo?.users && event.assignTo.users.length > 0) {
                            eventToEdit.targetType = 'user';
                            eventToEdit.targetId = String(event.assignTo.users[0]);
                          } else if (event.assignTo?.roles && event.assignTo.roles.length > 0) {
                            eventToEdit.targetType = 'role';
                            eventToEdit.targetId = String(event.assignTo.roles[0]);
                          } else if (event.targetType) {
                            // Already has targetType, keep it
                            if (event.targetId) eventToEdit.targetId = String(event.targetId);
                          } else {
                            eventToEdit.targetType = 'all';
                          }
                          
                          setEditingEvent(eventToEdit);
                        }}
                        data-testid={`button-edit-event-${event.id}`}
                        title="Edit Event"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteEvent.mutate(event.id)}
                        data-testid={`button-delete-event-${event.id}`}
                        title="Delete Event"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <div className="space-y-4">
            {/* Calendar Navigation and Legend */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h3 className="font-semibold text-lg min-w-[200px] text-center">
                  {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </h3>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                  data-testid="button-today"
                >
                  Today
                </Button>
              </div>
              
              {/* Event Type Legend */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />
                  <span className="text-gray-600">Practice</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                  <span className="text-gray-600">Game</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300" />
                  <span className="text-gray-600">Tournament</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                  <span className="text-gray-600">Meeting</span>
                </div>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              {/* Calendar Header - Days of Week */}
              <div className="grid grid-cols-7 bg-gray-50 border-b">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="font-semibold text-sm p-3 text-center border-r last:border-r-0">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Calendar Grid - Days */}
              <div className="grid grid-cols-7">
                {(() => {
                  const year = currentDate.getFullYear();
                  const month = currentDate.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const today = new Date();
                  const isToday = (day: number) => 
                    today.getDate() === day && 
                    today.getMonth() === month && 
                    today.getFullYear() === year;
                  
                  const cells = [];
                  
                  // Empty cells for days before month starts
                  for (let i = 0; i < firstDay; i++) {
                    cells.push(
                      <div key={`empty-${i}`} className="min-h-32 p-2 bg-gray-50 border-r border-b" />
                    );
                  }
                  
                  // Days of the month
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
                    const dayEvents = events.filter((event: any) => {
                      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
                      return eventDate === dateStr;
                    });
                    
                    const eventTypeColors: Record<string, string> = {
                      practice: 'bg-blue-100 text-blue-700 border-blue-300',
                      game: 'bg-red-100 text-red-700 border-red-300',
                      tournament: 'bg-purple-100 text-purple-700 border-purple-300',
                      meeting: 'bg-green-100 text-green-700 border-green-300',
                    };
                    
                    cells.push(
                      <div 
                        key={day} 
                        className={`min-h-32 p-2 border-r border-b hover:bg-gray-50 transition-colors ${
                          isToday(day) ? 'bg-red-50' : ''
                        }`}
                        data-testid={`calendar-day-${dateStr}`}
                      >
                        <div className={`text-sm font-semibold mb-1 ${
                          isToday(day) ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map((event: any) => (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEventForDetails(event)}
                              className={`w-full text-left text-xs p-1 rounded border cursor-pointer hover:opacity-80 transition-opacity ${
                                eventTypeColors[event.type] || 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}
                              data-testid={`calendar-event-${event.id}`}
                            >
                              <div className="font-medium truncate">{event.title}</div>
                              <div className="text-xs opacity-75">
                                {new Date(event.startTime).toLocaleTimeString('en-US', { 
                                  hour: 'numeric', 
                                  minute: '2-digit' 
                                })}
                              </div>
                            </button>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-gray-500 pl-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  return cells;
                })()}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Awards Tab - Full Implementation with all requested features
function AwardsTab({ awardDefinitions, users, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<any>(null);
  const [recipientsAward, setRecipientsAward] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState<string>("all");
  const [filterPrestige, setFilterPrestige] = useState<string>("all");
  const [filterClass, setFilterClass] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useDragScroll();

  // Fetch user awards for recipients view
  const { data: userAwards = [], refetch: refetchUserAwards } = useQuery<any[]>({
    queryKey: ["/api/user-awards", recipientsAward?.id],
    enabled: !!recipientsAward,
  });

  const awardFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    tier: z.enum(["Trophy", "Badge"]),
    class: z.enum(["Legacy", "Team", "Coach", "HallOfFame", "Superstar", "AllStar", "Starter", "Prospect", "Attendance", "Commitment", "Variety", "Time", "Training"]).optional(),
    prestige: z.enum(["Prospect", "Starter", "AllStar", "Superstar", "HallOfFame"]),
    triggerField: z.enum(["totalPractices", "totalGames", "consecutiveCheckins", "videosCompleted", "yearsActive"]).optional(),
    triggerOperator: z.enum([">=", "=", "<"]).default(">="),
    triggerValue: z.number().optional(),
    triggerType: z.enum(["count", "streak", "boolean", "manual"]).default("count"),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    active: z.boolean().default(true),
  });

  const form = useForm({
    resolver: zodResolver(awardFormSchema),
    defaultValues: {
      name: "",
      tier: "Badge" as const,
      class: undefined,
      prestige: "Prospect" as const,
      triggerField: undefined,
      triggerOperator: ">=" as const,
      triggerValue: undefined,
      triggerType: "count" as const,
      description: "",
      imageUrl: "",
      active: true,
    },
  });

  const createAward = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("POST", "/api/award-definitions", {
        ...data,
        organizationId: organization?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      toast({ title: "Award definition created successfully" });
      setIsDialogOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create award definition", variant: "destructive" });
    },
  });

  const updateAward = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PUT", `/api/award-definitions/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      toast({ title: "Award definition updated successfully" });
      setEditingAward(null);
    },
    onError: () => {
      toast({ title: "Failed to update award definition", variant: "destructive" });
    },
  });

  const deleteAward = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/award-definitions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
      toast({ title: "Award definition deleted successfully" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete award definition", variant: "destructive" });
    },
  });

  const deleteUserAward = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/user-awards/${id}`, {});
    },
    onSuccess: () => {
      refetchUserAwards();
      toast({ title: "User award removed successfully" });
    },
    onError: () => {
      toast({ title: "Failed to remove user award", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      return await apiRequest("PUT", `/api/award-definitions/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
    },
    onError: () => {
      toast({ title: "Failed to update award status", variant: "destructive" });
    },
  });

  const handleSyncAll = async () => {
    if (!users || users.length === 0) {
      toast({ title: "No users to sync", variant: "destructive" });
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: users.length });

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      try {
        await apiRequest("POST", `/api/awards/sync/${user.id}`, {});
        successCount++;
      } catch (error) {
        console.error(`Failed to sync awards for user ${user.id}:`, error);
        errorCount++;
      }
      setSyncProgress({ current: i + 1, total: users.length });
    }

    setIsSyncing(false);
    queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
    
    toast({
      title: "Award Sync Complete",
      description: `Synced ${successCount} users. ${errorCount > 0 ? `${errorCount} failed.` : ''}`,
      variant: errorCount > 0 ? "destructive" : "default",
    });
  };

  // Get prestige badge color
  const getPrestigeBadgeColor = (prestige: string) => {
    const colors: Record<string, string> = {
      "Prospect": "bg-gray-100 text-gray-700 border-gray-300",
      "Starter": "bg-green-100 text-green-700 border-green-300",
      "AllStar": "bg-blue-100 text-blue-700 border-blue-300",
      "Superstar": "bg-purple-100 text-purple-700 border-purple-300",
      "HallOfFame": "bg-yellow-100 text-yellow-700 border-yellow-300",
    };
    return colors[prestige] || colors["Prospect"];
  };

  // Filter awards
  const filteredAwards = awardDefinitions.filter((award: any) => {
    const matchesSearch = award.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === "all" || award.tier === filterTier;
    const matchesPrestige = filterPrestige === "all" || award.prestige === filterPrestige;
    const matchesClass = filterClass === "all" || award.class === filterClass;
    const matchesActive = filterActive === "all" || 
      (filterActive === "active" && award.active) || 
      (filterActive === "inactive" && !award.active);
    
    return matchesSearch && matchesTier && matchesPrestige && matchesClass && matchesActive;
  });

  // Get recipient count for an award
  const getRecipientCount = (awardId: number) => {
    return userAwards.filter((ua: any) => ua.awardId === awardId).length;
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch('/api/upload/award-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      
      // Update the imageUrl field with the uploaded path
      form.setValue('imageUrl', data.imageUrl);
      setImagePreview(data.imageUrl);
      
      toast({
        title: "Image uploaded successfully",
        description: "The award image has been uploaded and will be saved when you submit the form.",
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      toast({
        title: "Failed to upload image",
        description: error.message || "An error occurred while uploading the image",
        variant: "destructive",
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const openEditDialog = (award: any) => {
    setEditingAward(award);
    setImagePreview(award.imageUrl || "");
    
    form.reset({
      name: award.name || "",
      tier: award.tier || "Badge",
      class: award.class || undefined,
      prestige: award.prestige || "Prospect",
      triggerField: award.triggerField || undefined,
      triggerOperator: award.triggerOperator || ">=",
      triggerValue: award.triggerValue != null && award.triggerValue !== "" ? Number(award.triggerValue) : undefined,
      triggerType: award.triggerType || "count",
      description: award.description || "",
      imageUrl: award.imageUrl || "",
      active: award.active ?? true,
    } as any);
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Award Definitions</CardTitle>
          <CardDescription>Manage trophies and badges for your organization</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncAll}
            disabled={isSyncing}
            data-testid="button-sync-awards"
          >
            {isSyncing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
                Syncing {syncProgress.current}/{syncProgress.total}...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Sync All Awards
              </>
            )}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAward(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-award">
                <Plus className="w-4 h-4 mr-2" />
                Create Award
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAward ? "Edit Award Definition" : "Create Award Definition"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit((data) => {
                    if (editingAward) {
                      updateAward.mutate({ id: editingAward.id, ...data });
                    } else {
                      createAward.mutate(data);
                    }
                  })}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Heart & Hustle Award" data-testid="input-award-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tier *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-award-tier">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Trophy">Trophy</SelectItem>
                              <SelectItem value="Badge">Badge</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="prestige"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prestige *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-award-prestige">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Prospect">Prospect</SelectItem>
                              <SelectItem value="Starter">Starter</SelectItem>
                              <SelectItem value="AllStar">All Star</SelectItem>
                              <SelectItem value="Superstar">Superstar</SelectItem>
                              <SelectItem value="HallOfFame">Hall of Fame</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="class"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Class</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-award-class">
                              <SelectValue placeholder="Select a class..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Legacy">Legacy</SelectItem>
                            <SelectItem value="Team">Team</SelectItem>
                            <SelectItem value="Coach">Coach</SelectItem>
                            <SelectItem value="HallOfFame">Hall of Fame</SelectItem>
                            <SelectItem value="Superstar">Superstar</SelectItem>
                            <SelectItem value="AllStar">All Star</SelectItem>
                            <SelectItem value="Starter">Starter</SelectItem>
                            <SelectItem value="Prospect">Prospect</SelectItem>
                            <SelectItem value="Attendance">Attendance</SelectItem>
                            <SelectItem value="Commitment">Commitment</SelectItem>
                            <SelectItem value="Variety">Variety</SelectItem>
                            <SelectItem value="Time">Time</SelectItem>
                            <SelectItem value="Training">Training</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="triggerField"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Field</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-award-trigger-field">
                                <SelectValue placeholder="Select field..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="totalPractices">Total Practices</SelectItem>
                              <SelectItem value="totalGames">Total Games</SelectItem>
                              <SelectItem value="consecutiveCheckins">Consecutive Check-ins</SelectItem>
                              <SelectItem value="videosCompleted">Videos Completed</SelectItem>
                              <SelectItem value="yearsActive">Years Active</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="triggerType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-award-trigger-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="count">Count</SelectItem>
                              <SelectItem value="streak">Streak</SelectItem>
                              <SelectItem value="boolean">Boolean</SelectItem>
                              <SelectItem value="manual">Manual</SelectItem>
                              <SelectItem value="location_away">Location Away</SelectItem>
                              <SelectItem value="online_training">Online Training</SelectItem>
                              <SelectItem value="completeAll">Complete All</SelectItem>
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
                      name="triggerOperator"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Operator</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-award-trigger-operator">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value=">=">&gt;=</SelectItem>
                              <SelectItem value="=">=</SelectItem>
                              <SelectItem value="<">&lt;</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="triggerValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trigger Value</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              placeholder="10"
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              value={field.value || ""}
                              data-testid="input-award-trigger-value"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea {...field} placeholder="Description of the award..." data-testid="input-award-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://example.com/trophy.png" data-testid="input-award-image-url" />
                        </FormControl>
                        <FormDescription>
                          Enter a URL or upload an image below
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Image Upload */}
                  <div className="space-y-3">
                    <Label>Upload Image</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                        className="cursor-pointer"
                        data-testid="input-award-image-file"
                      />
                      {uploadingImage && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                          Uploading...
                        </div>
                      )}
                    </div>
                    
                    {/* Image Preview */}
                    {(imagePreview || form.watch('imageUrl')) && (
                      <div className="mt-3">
                        <Label className="mb-2 block">Preview</Label>
                        <div className="flex items-center gap-4">
                          <img 
                            src={imagePreview || form.watch('imageUrl')} 
                            alt="Award preview" 
                            className="w-24 h-24 object-contain border rounded p-2"
                            data-testid="img-award-preview"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              form.setValue('imageUrl', '');
                              setImagePreview('');
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            data-testid="button-clear-image"
                          >
                            Clear Image
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Active</FormLabel>
                          <FormDescription>
                            Award is active and can be earned by users
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-award-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createAward.isPending || updateAward.isPending}
                    data-testid="button-submit-award"
                  >
                    {createAward.isPending || updateAward.isPending
                      ? "Saving..."
                      : editingAward
                      ? "Update Award"
                      : "Create Award"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <Input
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-xs"
            data-testid="input-search-awards"
          />
          <Select value={filterTier} onValueChange={setFilterTier}>
            <SelectTrigger className="w-40" data-testid="filter-tier">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="Trophy">Trophy</SelectItem>
              <SelectItem value="Badge">Badge</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPrestige} onValueChange={setFilterPrestige}>
            <SelectTrigger className="w-40" data-testid="filter-prestige">
              <SelectValue placeholder="Prestige" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prestige</SelectItem>
              <SelectItem value="Prospect">Prospect</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="AllStar">All Star</SelectItem>
              <SelectItem value="Superstar">Superstar</SelectItem>
              <SelectItem value="HallOfFame">Hall of Fame</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40" data-testid="filter-class">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              <SelectItem value="Legacy">Legacy</SelectItem>
              <SelectItem value="Team">Team</SelectItem>
              <SelectItem value="Coach">Coach</SelectItem>
              <SelectItem value="HallOfFame">Hall of Fame</SelectItem>
              <SelectItem value="Superstar">Superstar</SelectItem>
              <SelectItem value="AllStar">All Star</SelectItem>
              <SelectItem value="Starter">Starter</SelectItem>
              <SelectItem value="Prospect">Prospect</SelectItem>
              <SelectItem value="Attendance">Attendance</SelectItem>
              <SelectItem value="Commitment">Commitment</SelectItem>
              <SelectItem value="Variety">Variety</SelectItem>
              <SelectItem value="Time">Time</SelectItem>
              <SelectItem value="Training">Training</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-40" data-testid="filter-active">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Awards Table */}
        <div ref={tableRef} className="overflow-x-auto hide-scrollbar drag-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Prestige</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAwards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No awards found
                  </TableCell>
                </TableRow>
              ) : (
                filteredAwards.map((award: any) => (
                  <TableRow
                    key={award.id}
                    className="cursor-pointer hover:bg-gray-50"
                    data-testid={`row-award-${award.id}`}
                  >
                    <TableCell className="font-medium">{award.name}</TableCell>
                    <TableCell>
                      {award.imageUrl ? (
                        <img 
                          src={award.imageUrl} 
                          alt={award.name} 
                          className="w-12 h-12 object-contain"
                          data-testid={`img-award-${award.id}`}
                        />
                      ) : (
                        award.tier === 'Trophy' ? (
                          <Trophy className="w-12 h-12 text-gray-300" data-testid={`icon-trophy-${award.id}`} />
                        ) : (
                          <Award className="w-12 h-12 text-gray-300" data-testid={`icon-badge-${award.id}`} />
                        )
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{award.tier}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getPrestigeBadgeColor(award.prestige)}>
                        {award.prestige}
                      </Badge>
                    </TableCell>
                    <TableCell>{award.class || "-"}</TableCell>
                    <TableCell>
                      {award.triggerField ? (
                        <div className="text-sm">
                          {award.triggerField} {award.triggerOperator} {award.triggerValue}
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>{award.triggerType || "-"}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRecipientsAward(award)}
                        data-testid={`button-view-recipients-${award.id}`}
                      >
                        <Badge variant="secondary">
                          {getRecipientCount(award.id)} <Eye className="w-3 h-3 ml-1" />
                        </Badge>
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={award.active ?? true}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: award.id, active: checked })}
                        data-testid={`switch-active-${award.id}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(award)}
                          data-testid={`button-edit-award-${award.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirm(award)}
                          data-testid={`button-delete-award-${award.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Recipients Dialog */}
      <Dialog open={!!recipientsAward} onOpenChange={(open) => !open && setRecipientsAward(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Recipients: {recipientsAward?.name}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Player Name</TableHead>
                  <TableHead>Awarded At</TableHead>
                  <TableHead>Awarded By</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userAwards
                  .filter((ua: any) => ua.awardId === recipientsAward?.id)
                  .map((ua: any) => {
                    const user = users.find((u: any) => u.id === ua.userId);
                    const awardedByUser = ua.awardedBy ? users.find((u: any) => u.id === ua.awardedBy) : null;
                    return (
                      <TableRow key={ua.id} data-testid={`recipient-row-${ua.id}`}>
                        <TableCell>{user ? `${user.firstName} ${user.lastName}` : "Unknown"}</TableCell>
                        <TableCell>{ua.awardedAt ? format(new Date(ua.awardedAt), "MMM d, yyyy") : "-"}</TableCell>
                        <TableCell>
                          {awardedByUser ? `${awardedByUser.firstName} ${awardedByUser.lastName}` : "Auto"}
                        </TableCell>
                        <TableCell>{ua.year || "-"}</TableCell>
                        <TableCell>{ua.notes || "-"}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUserAward.mutate(ua.id)}
                            data-testid={`button-remove-recipient-${ua.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                {userAwards.filter((ua: any) => ua.awardId === recipientsAward?.id).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      No recipients yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete the award "{deleteConfirm?.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteAward.mutate(deleteConfirm.id)}
              disabled={deleteAward.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteAward.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Products Tab - Package/Subscription Management
function ProductsTab({ organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data: packages, isLoading } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  const { data: awards } = useQuery<any[]>({
    queryKey: ["/api/award-definitions"],
  });

  const form = useForm({
    resolver: zodResolver(z.object({
      organizationId: z.string(),
      name: z.string().min(1, "Package name is required"),
      slug: z.string().optional(),
      description: z.string().optional(),
      type: z.string().optional(),
      billingCycle: z.string().optional(),
      price: z.number().min(0).optional(),
      billingModel: z.string().optional(),
      durationDays: z.number().min(1).optional(),
      stripePriceId: z.string().optional(),
      stripeProductId: z.string().optional(),
      tags: z.array(z.string()).default([]),
      eventTypes: z.array(z.string()).default([]),
      coverageScope: z.array(z.string()).default([]),
      autoAssignPlayers: z.boolean().default(false),
      linkedAwards: z.array(z.string()).default([]),
      adminNotes: z.string().optional(),
      isActive: z.boolean().default(true),
    })),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      slug: "",
      description: "",
      type: "One-Time",
      billingCycle: "",
      price: 0,
      billingModel: "Per Player",
      durationDays: 90,
      stripePriceId: "",
      stripeProductId: "",
      tags: [],
      eventTypes: [],
      coverageScope: [],
      autoAssignPlayers: false,
      linkedAwards: [],
      adminNotes: "",
      isActive: true,
    },
  });

  const selectedType = form.watch("type");

  const createPackage = useMutation({
    mutationFn: async (data: any) => {
      console.log('📦 Package mutation called with data:', data);
      if (editingPackage) {
        console.log('✏️ Updating package:', editingPackage.id);
        return await apiRequest("PATCH", `/api/programs/${editingPackage.id}`, data);
      }
      console.log('➕ Creating new package');
      return await apiRequest("POST", "/api/programs", data);
    },
    onSuccess: (result) => {
      console.log('✅ Package mutation successful:', result);
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: editingPackage ? "Package updated successfully" : "Package created successfully" });
      setIsDialogOpen(false);
      setEditingPackage(null);
      form.reset();
    },
    onError: (error) => {
      console.error('❌ Package mutation failed:', error);
      toast({ title: "Failed to save package", variant: "destructive" });
    },
  });

  const deletePackage = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/programs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Package deleted successfully" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete package", variant: "destructive" });
    },
  });

  const handleEdit = (pkg: any) => {
    setEditingPackage(pkg);
    form.reset({
      organizationId: pkg.organizationId,
      name: pkg.name,
      slug: pkg.slug || "",
      description: pkg.description || "",
      type: pkg.type || "One-Time",
      billingCycle: pkg.billingCycle || "",
      price: pkg.price || 0,
      billingModel: pkg.billingModel || "Per Player",
      durationDays: pkg.durationDays || 90,
      stripePriceId: pkg.stripePriceId || "",
      stripeProductId: pkg.stripeProductId || "",
      tags: pkg.tags || [],
      eventTypes: pkg.eventTypes || [],
      coverageScope: pkg.coverageScope || [],
      autoAssignPlayers: pkg.autoAssignPlayers || false,
      linkedAwards: pkg.linkedAwards || [],
      adminNotes: pkg.adminNotes || "",
      isActive: pkg.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPackage(null);
    form.reset({
      organizationId: organization?.id || "",
      name: "",
      slug: "",
      description: "",
      type: "One-Time",
      billingCycle: "",
      price: 0,
      billingModel: "Per Player",
      durationDays: 90,
      stripePriceId: "",
      stripeProductId: "",
      tags: [],
      eventTypes: [],
      coverageScope: [],
      autoAssignPlayers: false,
      linkedAwards: [],
      adminNotes: "",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Package Management</CardTitle>
          <CardDescription>Create and manage subscription packages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-packages" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Package Management</CardTitle>
            <CardDescription>Create and manage subscription packages for your organization</CardDescription>
          </div>
          <Button onClick={handleCreate} data-testid="button-create-package">
            <Plus className="w-4 h-4 mr-2" />
            Create Package
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!packages || packages.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-packages">
            <p className="text-gray-600 font-medium">No packages found</p>
            <p className="text-gray-500 text-sm mt-2">Create your first package to get started</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Billing</TableHead>
                <TableHead>Coverage</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.map((pkg: any) => (
                <TableRow key={pkg.id} data-testid={`row-package-${pkg.id}`}>
                  <TableCell>
                    <div>
                      <div className="font-medium" data-testid={`text-package-name-${pkg.id}`}>
                        {pkg.name}
                      </div>
                      {pkg.slug && (
                        <div className="text-xs text-gray-500">{pkg.slug}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" data-testid={`badge-type-${pkg.id}`}>
                      {pkg.type || "Program"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div data-testid={`text-price-${pkg.id}`}>
                      ${((pkg.price || 0) / 100).toFixed(2)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm" data-testid={`text-billing-${pkg.id}`}>
                      {pkg.billingModel || "-"}
                      {pkg.billingCycle && (
                        <div className="text-xs text-gray-500">{pkg.billingCycle}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(pkg.coverageScope || []).slice(0, 2).map((scope: string, idx: number) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                      {(pkg.coverageScope || []).length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{(pkg.coverageScope || []).length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={pkg.isActive ? "default" : "secondary"}
                      data-testid={`badge-status-${pkg.id}`}
                    >
                      {pkg.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(pkg)}
                        data-testid={`button-edit-${pkg.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(pkg)}
                        data-testid={`button-delete-${pkg.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Create/Edit Package Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-package">
              {editingPackage ? "Edit Package" : "Create New Package"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(
              (data) => {
                console.log('📝 Form validation passed, submitting data:', data);
                console.log('📝 Form errors:', form.formState.errors);
                createPackage.mutate(data);
              },
              (errors) => {
                console.error('❌ Form validation failed:', errors);
                toast({ title: "Please check form errors", description: Object.values(errors).map((e: any) => e.message).join(', '), variant: "destructive" });
              }
            )} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Basic Information</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Youth Club + FNH Package" {...field} data-testid="input-package-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="slug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slug / ID</FormLabel>
                      <FormControl>
                        <Input placeholder="youth_club_fnh_package" {...field} data-testid="input-slug" />
                      </FormControl>
                      <FormDescription>Unique key for internal mapping/API</FormDescription>
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
                        <Textarea 
                          placeholder="Includes access to Youth Club practices and Friday Night Hoops games for one season."
                          {...field}
                          data-testid="input-description"
                        />
                      </FormControl>
                      <FormDescription>Public description for checkout and dashboard</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing & Billing */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Pricing & Billing</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-type">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Subscription">Subscription</SelectItem>
                            <SelectItem value="One-Time">One-Time</SelectItem>
                            <SelectItem value="Program">Program</SelectItem>
                            <SelectItem value="Add-On">Add-On</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedType === "Subscription" && (
                    <FormField
                      control={form.control}
                      name="billingCycle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Cycle</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} data-testid="select-billing-cycle">
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select cycle" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Monthly">Monthly</SelectItem>
                              <SelectItem value="Quarterly">Quarterly</SelectItem>
                              <SelectItem value="6-Month">6-Month</SelectItem>
                              <SelectItem value="Yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (USD) *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="325.00"
                            {...field}
                            onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                            value={field.value ? (field.value / 100).toFixed(2) : ""}
                            data-testid="input-price"
                          />
                        </FormControl>
                        <FormDescription>Enter as dollars (converted to cents)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="billingModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Model *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-billing-model">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Per Player">Per Player</SelectItem>
                            <SelectItem value="Per Family">Per Family</SelectItem>
                            <SelectItem value="Organization-Wide">Organization-Wide</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {selectedType === "One-Time" && (
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="90"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value || "0"))}
                            value={field.value || ""}
                            data-testid="input-duration"
                          />
                        </FormControl>
                        <FormDescription>Expiration period for one-time passes</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="stripePriceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stripe Price ID</FormLabel>
                        <FormControl>
                          <Input placeholder="price_1Hx23..." {...field} data-testid="input-stripe-price-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="stripeProductId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stripe Product ID</FormLabel>
                        <FormControl>
                          <Input placeholder="prod_..." {...field} data-testid="input-stripe-product-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Coverage & Access */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Coverage & Access</h3>
                
                <FormField
                  control={form.control}
                  name="eventTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Covers Event Types</FormLabel>
                      <FormDescription>Which event types does this package grant access to?</FormDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["Practice", "Game", "Skills", "FNH", "Camp"].map((type) => (
                          <div key={type} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(field.value as string[] || []).includes(type)}
                              onCheckedChange={(checked) => {
                                const current = (field.value as string[]) || [];
                                if (checked) {
                                  field.onChange([...current, type]);
                                } else {
                                  field.onChange(current.filter((t: string) => t !== type));
                                }
                              }}
                              data-testid={`checkbox-event-type-${type.toLowerCase()}`}
                            />
                            <Label className="text-sm font-normal">{type}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coverageScope"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coverage Scope</FormLabel>
                      <FormDescription>Which age divisions does this package apply to?</FormDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["All", "U10", "U12", "U14", "U16", "U18"].map((scope) => (
                          <div key={scope} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(field.value as string[] || []).includes(scope)}
                              onCheckedChange={(checked) => {
                                const current = (field.value as string[]) || [];
                                if (checked) {
                                  field.onChange([...current, scope]);
                                } else {
                                  field.onChange(current.filter((s: string) => s !== scope));
                                }
                              }}
                              data-testid={`checkbox-coverage-${scope.toLowerCase()}`}
                            />
                            <Label className="text-sm font-normal">{scope}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tags</FormLabel>
                      <FormDescription>Categorize this package</FormDescription>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {["Youth Club", "Skills", "FNH", "Camp", "Uniform", "Add-On"].map((tag) => (
                          <div key={tag} className="flex items-center space-x-2">
                            <Checkbox
                              checked={(field.value as string[] || []).includes(tag)}
                              onCheckedChange={(checked) => {
                                const current = (field.value as string[]) || [];
                                if (checked) {
                                  field.onChange([...current, tag]);
                                } else {
                                  field.onChange(current.filter((t: string) => t !== tag));
                                }
                              }}
                              data-testid={`checkbox-tag-${tag.toLowerCase().replace(/\s+/g, '-')}`}
                            />
                            <Label className="text-sm font-normal">{tag}</Label>
                          </div>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Automation & Awards */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Automation & Awards</h3>
                
                <FormField
                  control={form.control}
                  name="autoAssignPlayers"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Auto Assign Players</FormLabel>
                        <FormDescription>
                          Automatically mark players active under this plan when purchased
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-auto-assign"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="linkedAwards"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Awards (Optional)</FormLabel>
                      <FormDescription>Awards earned automatically for completing this package</FormDescription>
                      {awards && awards.length > 0 ? (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {awards.slice(0, 10).map((award: any) => (
                            <div key={award.id} className="flex items-center space-x-2">
                              <Checkbox
                                checked={(field.value as string[] || []).includes(award.id)}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, award.id]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== award.id));
                                  }
                                }}
                                data-testid={`checkbox-award-${award.id}`}
                              />
                              <Label className="text-sm font-normal">{award.name}</Label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-2">No awards available. Create awards first.</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Admin Notes */}
              <FormField
                control={form.control}
                name="adminNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Notes</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Used for Season 2025 Youth Packages"
                        {...field}
                        data-testid="input-admin-notes"
                      />
                    </FormControl>
                    <FormDescription>Internal notes not shown to users</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Status */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Enable or disable this package for sale
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex gap-2 justify-end">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createPackage.isPending}
                  data-testid="button-save-package"
                >
                  {createPackage.isPending ? "Saving..." : (editingPackage ? "Update Package" : "Create Package")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete the package "{deleteConfirm?.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletePackage.mutate(deleteConfirm.id)}
              disabled={deletePackage.isPending}
              data-testid="button-confirm-delete"
            >
              {deletePackage.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Divisions Tab Component
function DivisionsTab({ divisions, teams, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<any>(null);

  const form = useForm({
    resolver: zodResolver(insertDivisionSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      description: "",
      ageRange: "",
      teamIds: [],
      isActive: true,
    },
  });

  const createDivision = useMutation({
    mutationFn: async (data: any) => {
      if (editingDivision) {
        return await apiRequest("PATCH", `/api/divisions/${editingDivision.id}`, data);
      }
      return await apiRequest("POST", "/api/divisions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      toast({ title: editingDivision ? "Division updated successfully" : "Division created successfully" });
      setIsDialogOpen(false);
      setEditingDivision(null);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to save division", variant: "destructive" });
    },
  });

  const deleteDivision = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/divisions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/divisions"] });
      toast({ title: "Division deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete division", variant: "destructive" });
    },
  });

  const handleEdit = (division: any) => {
    setEditingDivision(division);
    form.reset({
      organizationId: division.organizationId,
      name: division.name,
      description: division.description || "",
      ageRange: division.ageRange || "",
      teamIds: division.teamIds || [],
      isActive: division.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingDivision(null);
      form.reset();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Divisions</CardTitle>
          <CardDescription>Create and manage age divisions for your organization</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-division">
              <Plus className="w-4 h-4 mr-2" />
              Create Division
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingDivision ? "Edit Division" : "Create New Division"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createDivision.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Division Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="U12 Division" data-testid="input-division-name" />
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
                        <Textarea {...field} placeholder="Division for players under 12" data-testid="input-division-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="ageRange"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Age Range</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., 10-12, U14, 6th-8th" data-testid="input-division-agerange" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Teams</FormLabel>
                      <FormControl>
                        <Select
                          value={field.value?.[0] || ""}
                          onValueChange={(value) => {
                            const currentIds: string[] = field.value || [];
                            if (!currentIds.includes(value)) {
                              field.onChange([...currentIds, value]);
                            }
                          }}
                        >
                          <SelectTrigger data-testid="select-division-teams">
                            <SelectValue placeholder="Select teams..." />
                          </SelectTrigger>
                          <SelectContent>
                            {teams.map((team: any) => (
                              <SelectItem key={team.id} value={team.id.toString()}>
                                {team.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>Selected: {field.value?.length || 0} team(s)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-division-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active Division</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createDivision.isPending} data-testid="button-submit-division">
                  {createDivision.isPending ? "Saving..." : editingDivision ? "Update Division" : "Create Division"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Age Range</TableHead>
              <TableHead>Teams</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {divisions.map((division: any) => (
              <TableRow key={division.id} data-testid={`row-division-${division.id}`}>
                <TableCell className="font-medium" data-testid={`text-division-name-${division.id}`}>
                  {division.name}
                </TableCell>
                <TableCell>{division.description || "-"}</TableCell>
                <TableCell>{division.ageRange || "-"}</TableCell>
                <TableCell>{division.teamIds?.length || 0}</TableCell>
                <TableCell>
                  <Badge variant={division.isActive ? "default" : "secondary"} data-testid={`badge-division-status-${division.id}`}>
                    {division.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(division)}
                      data-testid={`button-edit-division-${division.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteDivision.mutate(division.id)}
                      data-testid={`button-delete-division-${division.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
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

// Skills Tab Component - Displays Quarterly Evaluations
function SkillsTab({ evaluations, users, organization }: any) {
  const { toast } = useToast();
  const [filterPlayerId, setFilterPlayerId] = useState<string>("all");
  const [filterQuarter, setFilterQuarter] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const players = users.filter((u: any) => u.role === "player");

  const deleteEvaluation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/evaluations/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
      toast({ title: "Evaluation deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete evaluation", variant: "destructive" });
    },
  });

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  // Calculate category average
  const calculateCategoryAverage = (scores: EvalScores, categoryName: SkillCategoryName) => {
    const categoryScores = scores[categoryName];
    if (!categoryScores) return 0;
    const values = Object.values(categoryScores);
    if (values.length === 0) return 0;
    return +(values.reduce((sum, val) => sum + val, 0) / values.length).toFixed(1);
  };

  // Calculate overall average
  const calculateOverallAverage = (scores: EvalScores) => {
    const allAverages: number[] = [];
    SKILL_CATEGORIES.forEach((cat) => {
      const avg = calculateCategoryAverage(scores, cat.name);
      if (avg > 0) allAverages.push(avg);
    });
    if (allAverages.length === 0) return 0;
    return +(allAverages.reduce((sum, val) => sum + val, 0) / allAverages.length).toFixed(1);
  };

  // Filter evaluations
  const filteredEvaluations = evaluations.filter((evaluation: any) => {
    if (filterPlayerId !== "all" && evaluation.playerId !== filterPlayerId) return false;
    if (filterQuarter !== "all" && evaluation.quarter !== filterQuarter) return false;
    if (filterYear !== "all" && evaluation.year.toString() !== filterYear) return false;
    return true;
  });

  // Get unique years for filter
  const uniqueYears: string[] = (Array.from(new Set(evaluations.map((e: any) => e.year.toString()))) as string[]).sort().reverse();

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Quarterly Skill Evaluations</CardTitle>
          <CardDescription>View detailed skill assessments from coach dashboard</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Filter by Player</Label>
            <Select value={filterPlayerId} onValueChange={setFilterPlayerId}>
              <SelectTrigger data-testid="select-filter-player">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Players</SelectItem>
                {players.map((player: any) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Filter by Quarter</Label>
            <Select value={filterQuarter} onValueChange={setFilterQuarter}>
              <SelectTrigger data-testid="select-filter-quarter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Quarters</SelectItem>
                <SelectItem value="Q1">Q1</SelectItem>
                <SelectItem value="Q2">Q2</SelectItem>
                <SelectItem value="Q3">Q3</SelectItem>
                <SelectItem value="Q4">Q4</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Filter by Year</Label>
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger data-testid="select-filter-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {uniqueYears.map((year: string) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Evaluations Table */}
        {filteredEvaluations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No evaluations found. Coaches can create evaluations from the Coach Dashboard.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvaluations.map((evaluation: any) => {
              const player = users.find((u: any) => u.id === evaluation.playerId);
              const coach = users.find((u: any) => u.id === evaluation.coachId);
              const isExpanded = expandedRows.has(evaluation.id);
              const overallAvg = calculateOverallAverage(evaluation.scores);

              return (
                <Card key={evaluation.id} className="overflow-hidden" data-testid={`card-evaluation-${evaluation.id}`}>
                  <Collapsible open={isExpanded} onOpenChange={() => toggleRow(evaluation.id)}>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                          {/* Player Name */}
                          <div>
                            <div className="text-xs text-gray-500">Player</div>
                            <div className="font-medium" data-testid={`text-player-${evaluation.id}`}>
                              {player ? `${player.firstName} ${player.lastName}` : "Unknown"}
                            </div>
                          </div>

                          {/* Quarter & Year */}
                          <div>
                            <div className="text-xs text-gray-500">Period</div>
                            <div className="flex gap-2">
                              <Badge variant="outline" data-testid={`badge-quarter-${evaluation.id}`}>
                                {evaluation.quarter}
                              </Badge>
                              <Badge variant="outline" data-testid={`badge-year-${evaluation.id}`}>
                                {evaluation.year}
                              </Badge>
                            </div>
                          </div>

                          {/* Overall Average */}
                          <div>
                            <div className="text-xs text-gray-500">Overall Avg</div>
                            <div className="flex items-center gap-2">
                              <div className="text-lg font-bold text-red-600" data-testid={`text-overall-avg-${evaluation.id}`}>
                                {overallAvg}/5
                              </div>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <Star
                                    key={star}
                                    className={`w-3 h-3 ${star <= Math.round(overallAvg) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Coach */}
                          <div>
                            <div className="text-xs text-gray-500">Evaluated By</div>
                            <div className="text-sm" data-testid={`text-coach-${evaluation.id}`}>
                              {coach ? `${coach.firstName} ${coach.lastName}` : "Unknown"}
                            </div>
                          </div>

                          {/* Date */}
                          <div>
                            <div className="text-xs text-gray-500">Date</div>
                            <div className="text-sm">
                              {evaluation.createdAt ? format(new Date(evaluation.createdAt), "MMM d, yyyy") : "-"}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 justify-end">
                            <CollapsibleTrigger asChild>
                              <Button variant="outline" size="sm" data-testid={`button-expand-${evaluation.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                {isExpanded ? "Hide" : "View"} Details
                                <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                              </Button>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this evaluation?")) {
                                  deleteEvaluation.mutate(evaluation.id);
                                }
                              }}
                              data-testid={`button-delete-evaluation-${evaluation.id}`}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    <CollapsibleContent>
                      <div className="border-t bg-gray-50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {SKILL_CATEGORIES.map((category) => {
                            const categoryAvg = calculateCategoryAverage(evaluation.scores, category.name);
                            const categoryScores = evaluation.scores[category.name] || {};

                            return (
                              <Card key={category.name} className="bg-white">
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold">{category.name}</CardTitle>
                                    <Badge variant="secondary" className="text-xs">
                                      Avg: {categoryAvg}/5
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  {category.skills.map((skill) => (
                                    <div key={skill} className="flex items-center justify-between text-sm">
                                      <span className="text-gray-600">{skill}</span>
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium">{categoryScores[skill] || "-"}/5</span>
                                        <div className="flex gap-0.5">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <Star
                                              key={star}
                                              className={`w-3 h-3 ${star <= (categoryScores[skill] || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                                            />
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>

                        {/* Notes */}
                        {evaluation.notes && (
                          <div className="mt-4 p-3 bg-white rounded-md border">
                            <div className="text-xs text-gray-500 mb-1">Notes</div>
                            <div className="text-sm">{evaluation.notes}</div>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Notifications Tab Component
function NotificationsTab({ notifications, users, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNotification, setEditingNotification] = useState<any>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm({
    resolver: zodResolver(insertNotificationSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      type: "in-app",
      title: "",
      message: "",
      recipientIds: [],
      sentBy: currentUser?.id || "",
      readBy: [],
      status: "pending",
    },
  });

  const createNotification = useMutation({
    mutationFn: async (data: any) => {
      if (editingNotification) {
        return await apiRequest("PATCH", `/api/notifications/${editingNotification.id}`, data);
      }
      return await apiRequest("POST", "/api/notifications", { ...data, recipientIds: selectedRecipients });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: editingNotification ? "Notification updated successfully" : "Notification created successfully" });
      setIsDialogOpen(false);
      setEditingNotification(null);
      setSelectedRecipients([]);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to save notification", variant: "destructive" });
    },
  });

  const deleteNotification = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/notifications/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({ title: "Notification deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete notification", variant: "destructive" });
    },
  });

  const handleEdit = (notification: any) => {
    setEditingNotification(notification);
    setSelectedRecipients(notification.recipientIds || []);
    form.reset({
      organizationId: notification.organizationId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      recipientIds: notification.recipientIds || [],
      sentBy: notification.sentBy,
      readBy: notification.readBy || [],
      status: notification.status,
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingNotification(null);
      setSelectedRecipients([]);
      form.reset();
    }
  };

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Notifications</CardTitle>
          <CardDescription>Send and manage notifications to users</CardDescription>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-notification">
              <Plus className="w-4 h-4 mr-2" />
              Create Notification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingNotification ? "Edit Notification" : "Create New Notification"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createNotification.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Notification title" data-testid="input-notification-title" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Notification message..." rows={4} data-testid="input-notification-message" />
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
                      <FormLabel>Notification Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-notification-type">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="in-app">In-App</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="push">Push Notification</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div>
                  <Label>Recipients</Label>
                  <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                    {users.map((user: any) => (
                      <div key={user.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedRecipients.includes(user.id)}
                          onCheckedChange={() => toggleRecipient(user.id)}
                          data-testid={`checkbox-recipient-${user.id}`}
                        />
                        <span className="text-sm">
                          {user.firstName} {user.lastName} ({user.role})
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Selected: {selectedRecipients.length} user(s)</p>
                </div>
                <Button type="submit" className="w-full" disabled={createNotification.isPending} data-testid="button-submit-notification">
                  {createNotification.isPending ? "Sending..." : editingNotification ? "Update Notification" : "Send Notification"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead>Read Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notifications.map((notification: any) => (
              <TableRow key={notification.id} data-testid={`row-notification-${notification.id}`}>
                <TableCell className="font-medium" data-testid={`text-notification-title-${notification.id}`}>
                  {notification.title}
                </TableCell>
                <TableCell className="max-w-xs truncate">{notification.message}</TableCell>
                <TableCell>
                  <Badge variant="outline">{notification.type}</Badge>
                </TableCell>
                <TableCell data-testid={`text-notification-recipients-${notification.id}`}>
                  {notification.recipientIds?.length || 0} user(s)
                </TableCell>
                <TableCell>
                  {notification.sentAt ? new Date(notification.sentAt).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={notification.readBy?.length > 0 ? "default" : "secondary"}>
                    {notification.readBy?.length || 0} / {notification.recipientIds?.length || 0} read
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(notification)}
                      data-testid={`button-edit-notification-${notification.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteNotification.mutate(notification.id)}
                      data-testid={`button-delete-notification-${notification.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
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
