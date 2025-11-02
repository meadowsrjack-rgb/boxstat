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
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useLocation } from "wouter";
import PlayerDashboard from "./player-dashboard";
import { insertDivisionSchema, insertSkillSchema, insertNotificationSchema } from "@shared/schema";
import { LocationSearch } from "@/components/LocationSearch";
import AttendanceList from "@/components/AttendanceList";
import { format } from "date-fns";
import EventWindowsConfigurator from "@/components/EventWindowsConfigurator";
import type { EventWindow } from "@shared/schema";
import { SKILL_CATEGORIES } from "@/components/CoachAwardDialogs";
import type { SkillCategoryName, EvalScores, Quarter } from "@/components/CoachAwardDialogs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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

  // Fetch awards
  const { data: awards = [], isLoading: awardsLoading } = useQuery<any[]>({
    queryKey: ["/api/awards"],
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

  const isLoading = orgLoading || usersLoading || teamsLoading || eventsLoading || programsLoading || awardsLoading || paymentsLoading || divisionsLoading || skillsLoading || evaluationsLoading || notificationsLoading;

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
            <TeamsTab teams={teams} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab events={events} teams={teams} programs={programs} organization={organization} />
          </TabsContent>

          <TabsContent value="awards">
            <AwardsTab awards={awards} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="products">
            <ProductsTab organization={organization} />
          </TabsContent>

          <TabsContent value="divisions">
            <DivisionsTab divisions={divisions} programs={programs} organization={organization} />
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
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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
      const aTeam = teams.find((t: any) => t.roster?.includes(a.id));
      const bTeam = teams.find((t: any) => t.roster?.includes(b.id));
      aValue = aTeam?.name || '';
      bValue = bTeam?.name || '';
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
                      value={editingUser.teamId || "none"}
                      onValueChange={(value) => {
                        const actualValue = value === "none" ? "" : value;
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
                            <SelectItem key={team.id} value={team.id}>
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
                        {divisions
                          ?.filter((division: any) => !selectedProgram || division.programIds?.includes(selectedProgram))
                          .map((division: any) => (
                            <SelectItem key={division.id} value={division.id}>
                              {division.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
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
                    <Label htmlFor="edit-skill" data-testid="label-edit-skill">Skill Level</Label>
                    <Input 
                      id="edit-skill"
                      value={editingUser.skill || ""}
                      onChange={(e) => setEditingUser({...editingUser, skill: e.target.value})}
                      data-testid="input-edit-skill"
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
      </CardHeader>
      <CardContent>
        <div ref={tableRef} className="overflow-x-auto hide-scrollbar drag-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('firstName')}
                  data-testid="sort-firstName"
                >
                  First Name
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
                  onClick={() => handleSort('role')}
                  data-testid="sort-role"
                >
                  Role
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('club')}
                  data-testid="sort-club"
                >
                  Club
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('program')}
                  data-testid="sort-program"
                >
                  Program
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('team')}
                  data-testid="sort-team"
                >
                  Team
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('division')}
                  data-testid="sort-division"
                >
                  Division
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
                  onClick={() => handleSort('packages')}
                  data-testid="sort-packages"
                >
                  Packages
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('skill')}
                  data-testid="sort-skill"
                >
                  Skill Level
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100"
                  onClick={() => handleSort('awards')}
                  data-testid="sort-awards"
                >
                  Awards
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
                const userTeam = teams.find((t: any) => t.roster?.includes(user.id));
                return (
                  <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                    <TableCell data-testid={`text-firstname-${user.id}`}>{user.firstName || "-"}</TableCell>
                    <TableCell data-testid={`text-lastname-${user.id}`}>{user.lastName || "-"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phoneNumber || user.phone || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    </TableCell>
                    <TableCell>{user.club || "-"}</TableCell>
                    <TableCell>{user.program || "-"}</TableCell>
                    <TableCell>{userTeam?.name || "-"}</TableCell>
                    <TableCell>{user.division || "-"}</TableCell>
                    <TableCell>{user.dob ? new Date(user.dob).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>{user.packages?.join(", ") || "-"}</TableCell>
                    <TableCell>{user.skill || "-"}</TableCell>
                    <TableCell>{user.awards?.length || 0}</TableCell>
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
                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            setEditingUser(user);
                            const programId = user.programId || programs.find((p: any) => p.name === user.program)?.id || "";
                            setSelectedProgram(programId);
                          }}
                          data-testid={`button-edit-user-${user.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteUser.mutate(user.id)}
                          data-testid={`button-delete-user-${user.id}`}
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
  );
}

// Teams Tab - Full Implementation
function TeamsTab({ teams, users, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const tableRef = useDragScroll();

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

            {/* Edit Team Dialog */}
            <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Team</DialogTitle>
                </DialogHeader>
                {editingTeam && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-name">Team Name</Label>
                      <Input
                        id="edit-team-name"
                        defaultValue={editingTeam.name || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, name: e.target.value})}
                        data-testid="input-edit-team-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-division">Division</Label>
                      <Input
                        id="edit-team-division"
                        defaultValue={editingTeam.division || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, division: e.target.value})}
                        data-testid="input-edit-team-division"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-ageGroup">Age Group</Label>
                      <Input
                        id="edit-team-ageGroup"
                        defaultValue={editingTeam.ageGroup || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, ageGroup: e.target.value})}
                        data-testid="input-edit-team-ageGroup"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-coachId">Assign Coach</Label>
                      <Select
                        value={editingTeam.coachId || ""}
                        onValueChange={(value) => setEditingTeam({...editingTeam, coachId: value})}
                      >
                        <SelectTrigger id="edit-team-coachId" data-testid="select-edit-team-coachId">
                          <SelectValue placeholder="Select a coach" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {coaches.map((coach: any) => (
                            <SelectItem key={coach.id} value={coach.id}>
                              {coach.firstName} {coach.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-team-description">Description</Label>
                      <Textarea
                        id="edit-team-description"
                        defaultValue={editingTeam.description || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, description: e.target.value})}
                        data-testid="input-edit-team-description"
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
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<any>(null);
  const [eventWindows, setEventWindows] = useState<Partial<EventWindow>[]>([]);
  const [editEventWindows, setEditEventWindows] = useState<Partial<EventWindow>[]>([]);

  const createEventSchema = z.object({
    title: z.string().min(1, "Event title is required"),
    type: z.enum(["practice", "game", "tournament", "meeting"]),
    startTime: z.string().min(1, "Start time is required"),
    endTime: z.string().min(1, "End time is required"),
    location: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
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
      latitude: undefined,
      longitude: undefined,
      description: "",
      targetType: "all" as const,
      targetId: "",
    },
  });

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      // Rename 'type' to 'eventType' for backend compatibility
      const { type, ...rest } = data;
      console.log('Event form data before submission:', { type, ...rest });
      const payload = {
        ...rest,
        eventType: type,
        organizationId: organization.id,
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
    mutationFn: async ({ id, ...data }: any) => {
      const updatedEvent = await apiRequest("PATCH", `/api/events/${id}`, data);
      
      // Update event windows - delete existing and create new ones
      await apiRequest("DELETE", `/api/event-windows/event/${id}`, {});
      
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
          const windows = await apiRequest("GET", `/api/event-windows/event/${editingEvent.id}`, {});
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
                  createEvent.mutate(data);
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
                              form.setValue("latitude", location.lat as any);
                              form.setValue("longitude", location.lng as any);
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
                  {(String(form.watch("targetType")) === "team" || String(form.watch("targetType")) === "program" || String(form.watch("targetType")) === "role") && (
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
                        defaultValue={editingEvent.startTime ? new Date(editingEvent.startTime).toISOString().slice(0, 16) : ""}
                        onChange={(e) => setEditingEvent({...editingEvent, startTime: e.target.value})}
                        data-testid="input-edit-event-startTime"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-endTime">End Time</Label>
                      <Input
                        id="edit-event-endTime"
                        type="datetime-local"
                        defaultValue={editingEvent.endTime ? new Date(editingEvent.endTime).toISOString().slice(0, 16) : ""}
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
                          latitude: location.lat,
                          longitude: location.lng
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
                      <Label htmlFor="edit-event-targetId">Select Target</Label>
                      <Select
                        value={editingEvent.targetId || ""}
                        onValueChange={(value) => setEditingEvent({...editingEvent, targetId: value})}
                      >
                        <SelectTrigger id="edit-event-targetId" data-testid="select-edit-event-targetId">
                          <SelectValue placeholder="Choose a target" />
                        </SelectTrigger>
                        <SelectContent>
                          {teams.map((team: any) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                    onClick={() => updateEvent.mutate(editingEvent)}
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

          {/* Event Details Dialog */}
          <Dialog open={!!selectedEventForDetails} onOpenChange={(open) => !open && setSelectedEventForDetails(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-event-details">
              <DialogHeader>
                <DialogTitle>Event Details</DialogTitle>
              </DialogHeader>
              {selectedEventForDetails && (
                <div className="space-y-6">
                  {/* Event Information */}
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900" data-testid="text-event-title">
                        {selectedEventForDetails.title}
                      </h3>
                      <Badge className="mt-2" data-testid="badge-event-type">
                        {selectedEventForDetails.type}
                      </Badge>
                    </div>

                    {selectedEventForDetails.description && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Description</Label>
                        <p className="text-gray-600 mt-1" data-testid="text-event-description">
                          {selectedEventForDetails.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Start Time</Label>
                        <p className="text-gray-900 mt-1" data-testid="text-event-start-time">
                          {format(new Date(selectedEventForDetails.startTime), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">End Time</Label>
                        <p className="text-gray-900 mt-1" data-testid="text-event-end-time">
                          {format(new Date(selectedEventForDetails.endTime), "MMMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>

                    {selectedEventForDetails.location && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Location</Label>
                        <p className="text-gray-900 mt-1" data-testid="text-event-location">
                          {selectedEventForDetails.location}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Attendance List */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Attendance</h4>
                    <AttendanceList eventId={selectedEventForDetails.id} />
                  </div>
                </div>
              )}
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
                        onClick={() => setEditingEvent(event)}
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
              ))}
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

// Awards Tab - Full Implementation
function AwardsTab({ awards, users, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [editingAward, setEditingAward] = useState<any>(null);
  const tableRef = useDragScroll();

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

  const deleteAward = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/awards/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/awards"] });
      toast({ title: "Award deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete award", variant: "destructive" });
    },
  });

  const updateAward = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/awards/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/awards"] });
      toast({ title: "Award updated successfully" });
      setEditingAward(null);
    },
    onError: () => {
      toast({ title: "Failed to update award", variant: "destructive" });
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

        {/* Edit Award Dialog */}
        <Dialog open={!!editingAward} onOpenChange={(open) => !open && setEditingAward(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Award</DialogTitle>
            </DialogHeader>
            {editingAward && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-award-name">Award Name</Label>
                  <Input
                    id="edit-award-name"
                    defaultValue={editingAward.name || ""}
                    onChange={(e) => setEditingAward({...editingAward, name: e.target.value})}
                    data-testid="input-edit-award-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-award-description">Description</Label>
                  <Textarea
                    id="edit-award-description"
                    defaultValue={editingAward.description || ""}
                    onChange={(e) => setEditingAward({...editingAward, description: e.target.value})}
                    data-testid="input-edit-award-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-award-criteria">Criteria</Label>
                  <Textarea
                    id="edit-award-criteria"
                    defaultValue={editingAward.criteria || ""}
                    onChange={(e) => setEditingAward({...editingAward, criteria: e.target.value})}
                    data-testid="input-edit-award-criteria"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-award-iconUrl">Icon URL</Label>
                  <Input
                    id="edit-award-iconUrl"
                    defaultValue={editingAward.iconUrl || ""}
                    onChange={(e) => setEditingAward({...editingAward, iconUrl: e.target.value})}
                    placeholder="https://example.com/icon.png"
                    data-testid="input-edit-award-iconUrl"
                  />
                </div>
                <Button
                  type="button"
                  className="w-full"
                  onClick={() => updateAward.mutate(editingAward)}
                  disabled={updateAward.isPending}
                  data-testid="button-submit-edit-award"
                >
                  {updateAward.isPending ? "Updating..." : "Update Award"}
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
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditingAward(award)}
                      data-testid={`button-edit-award-${award.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => deleteAward.mutate(award.id)}
                      data-testid={`button-delete-award-${award.id}`}
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
      </CardContent>
    </Card>
  );
}

// Products Tab - Stripe Product Management
function ProductsTab({ organization }: any) {
  const { data: products, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/stripe/products"],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Products</CardTitle>
          <CardDescription>Products managed in Stripe Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" data-testid="loading-products" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Products</CardTitle>
          <CardDescription>Products managed in Stripe Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" data-testid="error-products">
            <p className="text-red-600 font-medium">Failed to load products</p>
            <p className="text-gray-600 text-sm mt-2">Please check your Stripe connection</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!products || products.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Stripe Products</CardTitle>
          <CardDescription>Products managed in Stripe Dashboard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12" data-testid="empty-products">
            <p className="text-gray-600 font-medium">No products found</p>
            <p className="text-gray-500 text-sm mt-2">Create products in your Stripe Dashboard</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Stripe Products</CardTitle>
          <CardDescription>Products managed in Stripe Dashboard</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Prices</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product: any) => (
              <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                <TableCell>
                  <div className="font-medium" data-testid={`text-product-name-${product.id}`}>
                    {product.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600" data-testid={`text-product-description-${product.id}`}>
                    {product.description || "-"}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {product.prices && product.prices.length > 0 ? (
                      product.prices.map((price: any) => (
                        <div key={price.id} className="text-sm" data-testid={`text-price-${price.id}`}>
                          {formatStripePrice(price)}
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-400 text-sm">No prices</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={product.active ? "default" : "secondary"}
                    data-testid={`badge-status-${product.id}`}
                  >
                    {product.active ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// Helper function to format Stripe prices
function formatStripePrice(price: any): string {
  const amount = (price.unit_amount / 100).toFixed(2);
  const currency = price.currency.toUpperCase();
  
  if (price.recurring) {
    const interval = price.recurring.interval;
    const intervalCount = price.recurring.interval_count || 1;
    const intervalText = intervalCount > 1 
      ? `${intervalCount} ${interval}s` 
      : interval;
    return `${currency} $${amount} / ${intervalText}`;
  }
  
  return `${currency} $${amount} (one-time)`;
}

// Divisions Tab Component
function DivisionsTab({ divisions, programs, organization }: any) {
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
      programIds: [],
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
      programIds: division.programIds || [],
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
                  name="programIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linked Programs</FormLabel>
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
                          <SelectTrigger data-testid="select-division-programs">
                            <SelectValue placeholder="Select programs..." />
                          </SelectTrigger>
                          <SelectContent>
                            {programs.map((program: any) => (
                              <SelectItem key={program.id} value={program.id.toString()}>
                                {program.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormDescription>Selected: {field.value?.length || 0} program(s)</FormDescription>
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
              <TableHead>Programs</TableHead>
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
                <TableCell>{division.programIds?.length || 0}</TableCell>
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
