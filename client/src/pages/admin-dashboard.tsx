import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BanterLoader } from "@/components/BanterLoader";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  Target,
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
  AlertCircle,
  AlertTriangle,
  LogOut,
  FileText,
  UserPlus,
  UserCircle,
  ShoppingBag,
  Package,
  Gift,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { useLocation } from "wouter";
import PlayerDashboard from "./player-dashboard";
import { insertDivisionSchema, insertNotificationSchema, insertTeamSchema } from "@shared/schema";
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
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { DateScrollPicker } from "react-date-wheel-picker";

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
    staleTime: 0, // Always refetch to ensure latest payment data
  });

  // Fetch divisions
  const { data: divisions = [], isLoading: divisionsLoading } = useQuery<any[]>({
    queryKey: ["/api/divisions"],
  });


  // Fetch evaluations
  const { data: evaluations = [], isLoading: evaluationsLoading } = useQuery<any[]>({
    queryKey: ["/api/evaluations"],
  });

  // Fetch notifications
  const { data: notifications = [], isLoading: notificationsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/notifications"],
  });

  const isLoading = orgLoading || usersLoading || teamsLoading || eventsLoading || programsLoading || awardDefinitionsLoading || paymentsLoading || divisionsLoading || evaluationsLoading || notificationsLoading;

  // Calculate stats
  // Accounts = unique emails (distinct registered people), Users = all profiles including linked ones
  const uniqueEmails = new Set(users.map((u: any) => u.email?.toLowerCase()).filter(Boolean));
  const stats = {
    totalAccounts: uniqueEmails.size,
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
      <>
        <div className="ios-full-bleed" />
        <div className="fixed inset-0 w-full h-full bg-white z-0 pointer-events-none" />
        <div className="ios-fixed-page relative z-10 w-full bg-transparent flex items-center justify-center" data-testid="loading-admin-dashboard">
          <BanterLoader />
        </div>
      </>
    );
  }

  return (
    <>
      <div className="ios-full-bleed" />
      <div className="fixed inset-0 w-full h-full bg-gray-50 z-0 pointer-events-none" />
      <div className="scrollable-page relative z-10 bg-transparent" data-testid="admin-dashboard">
      {/* Header */}
      <div className="bg-white border-b safe-top sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/profile-gateway")}
                data-testid="button-switch-profile"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900" data-testid="text-dashboard-title">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1" data-testid="text-org-name">{organization?.name || "My Sports Organization"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <NotificationBell />
              <Button 
                onClick={() => setActiveTab("settings")} 
                variant="ghost"
                size="icon"
                data-testid="button-settings"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Announcement Banner */}
        <AnnouncementBanner />
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
              <TabsTrigger value="programs" data-testid="tab-programs" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Layers className="w-4 h-4 mr-2" />
                Programs
              </TabsTrigger>
              <TabsTrigger value="events" data-testid="tab-events" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Calendar className="w-4 h-4 mr-2" />
                Events
              </TabsTrigger>
              <TabsTrigger value="awards" data-testid="tab-awards" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Trophy className="w-4 h-4 mr-2" />
                Awards
              </TabsTrigger>
              <TabsTrigger value="store" data-testid="tab-store" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <ShoppingBag className="w-4 h-4 mr-2" />
                Store
              </TabsTrigger>
              <TabsTrigger value="waivers" data-testid="tab-waivers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <FileText className="w-4 h-4 mr-2" />
                Waivers
              </TabsTrigger>
              <TabsTrigger value="notifications" data-testid="tab-notifications" className="rounded-none border-b-2 border-transparent data-[state=active]:border-red-600 data-[state=active]:bg-transparent bg-transparent px-6 py-3">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Accounts"
                value={stats.totalAccounts}
                icon={<UserCircle className="w-6 h-6" />}
                subtitle="Primary account holders"
                testId="stat-total-accounts"
              />
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

            <RecentTransactionsCard payments={payments} users={users} programs={programs} />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab users={users} teams={teams} programs={programs} divisions={divisions} organization={organization} />
          </TabsContent>

          <TabsContent value="programs">
            <ProgramsTab programs={programs} teams={teams} organization={organization} />
          </TabsContent>

          <TabsContent value="events">
            <EventsTab events={events} teams={teams} programs={programs} organization={organization} currentUser={currentUser} />
          </TabsContent>

          <TabsContent value="awards">
            <AwardsTab awardDefinitions={awardDefinitions} users={users} organization={organization} />
          </TabsContent>

          <TabsContent value="store">
            <StoreTab organization={organization} />
          </TabsContent>

          <TabsContent value="waivers">
            <WaiversTab organization={organization} />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsTab notifications={notifications} users={users} teams={teams} divisions={divisions} organization={organization} />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab organization={organization} />
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </>
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

function RecentTransactionsCard({ payments, users, programs }: any) {
  const [showAll, setShowAll] = useState(false);
  
  const sortedPayments = [...payments]
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const recentPayments = sortedPayments.slice(0, 5);
  const olderPayments = sortedPayments.slice(5);
  
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string }> = {
      completed: { variant: "default", label: "Completed" },
      pending: { variant: "secondary", label: "Pending" },
      failed: { variant: "destructive", label: "Failed" },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant as any} data-testid={`badge-status-${status}`}>{config.label}</Badge>;
  };
  
  const getUserName = (userId: string) => {
    const user = users.find((u: any) => u.id === userId);
    if (user) {
      return `${user.firstName} ${user.lastName}`;
    }
    return "Unknown User";
  };
  
  const getProgramName = (programId: string) => {
    const program = programs.find((p: any) => p.id === programId);
    return program ? program.name : "N/A";
  };
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "MMM d, yyyy");
    } catch {
      return "Invalid date";
    }
  };
  
  const getPaymentTypeBadge = (payment: any) => {
    // Check payment type (case-insensitive) and also check the associated program's type
    const paymentTypeLC = (payment.paymentType || '').toLowerCase();
    const isSubscription = paymentTypeLC === "subscription" || 
      payment.paymentType === "Subscription" ||
      (payment.billingModel && payment.billingModel === "Subscription");
    
    // Also check if the linked program is a subscription
    const program = payment.programId ? programs.find((p: any) => String(p.id) === String(payment.programId)) : null;
    const programIsSubscription = program?.type === "Subscription";
    
    const showAsSubscription = isSubscription || programIsSubscription;
    
    return (
      <Badge 
        variant="outline" 
        className={showAsSubscription ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}
        data-testid={`badge-type-${payment.id}`}
      >
        {showAsSubscription ? "Subscription" : "One-Time"}
      </Badge>
    );
  };
  
  const TransactionRow = ({ payment }: { payment: any }) => (
    <div className="flex items-center justify-between py-3 border-b last:border-0" data-testid={`transaction-${payment.id}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate" data-testid={`transaction-user-${payment.id}`}>
            {getUserName(payment.userId)}
          </p>
          {getStatusBadge(payment.status)}
          {getPaymentTypeBadge(payment)}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500" data-testid={`transaction-program-${payment.id}`}>
            {getProgramName(payment.programId)}
          </p>
          <span className="text-xs text-gray-400">•</span>
          <p className="text-xs text-gray-500" data-testid={`transaction-date-${payment.id}`}>
            {formatDate(payment.createdAt)}
          </p>
        </div>
      </div>
      <div className="ml-4 flex-shrink-0">
        <p className="text-sm font-semibold" data-testid={`transaction-amount-${payment.id}`}>
          ${(payment.amount / 100).toFixed(2)}
        </p>
      </div>
    </div>
  );
  
  if (payments.length === 0) {
    return (
      <Card data-testid="card-recent-transactions">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Recent Transactions
          </CardTitle>
          <CardDescription>View all payment transactions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <p>No transactions yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card data-testid="card-recent-transactions">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5" />
          Recent Transactions
        </CardTitle>
        <CardDescription>
          {sortedPayments.length} total transaction{sortedPayments.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-0">
          {recentPayments.map((payment: any) => (
            <TransactionRow key={payment.id} payment={payment} />
          ))}
          
          {olderPayments.length > 0 && (
            <Collapsible open={showAll} onOpenChange={setShowAll}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className="w-full mt-2 flex items-center justify-center gap-2"
                  data-testid="button-show-all-transactions"
                >
                  <span className="text-sm">
                    {showAll ? 'Show Less' : `Show ${olderPayments.length} More`}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0 mt-2">
                  {olderPayments.map((payment: any) => (
                    <TransactionRow key={payment.id} payment={payment} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
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
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [detailTab, setDetailTab] = useState("team");
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<any>(null);
  const tableRef = useDragScroll();

  // Fetch user evaluations - only when viewing user in performance tab
  const { data: userEvaluations = [], isLoading: evaluationsLoading, error: evaluationsError } = useQuery<any[]>({
    queryKey: ['/api/evaluations', viewingUser?.id],
    queryFn: () => apiRequest(`/api/evaluations?playerId=${viewingUser!.id}`),
    enabled: !!viewingUser && detailTab === 'performance',
  });

  // Fetch user awards - only when viewing user in performance tab
  const { data: userAwards, isLoading: awardsLoading, error: awardsError } = useQuery<any>({
    queryKey: ['/api/users', viewingUser?.id, 'awards'],
    queryFn: () => apiRequest(`/api/users/${viewingUser!.id}/awards`),
    enabled: !!viewingUser && detailTab === 'performance',
  });

  // Fetch program memberships for the user being edited
  const { data: editingUserProgramMemberships = [] } = useQuery<any[]>({
    queryKey: ["/api/users", editingUser?.id, "program-memberships"],
    enabled: !!editingUser?.id,
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.id, "teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", variables.id, "program-memberships"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile", variables.id] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${variables.id}`] });
      // Invalidate coach teams if teamIds were updated (for coach dashboard)
      if (variables.teamIds) {
        queryClient.invalidateQueries({ queryKey: [`/api/coaches/${variables.id}/teams`] });
        queryClient.invalidateQueries({ queryKey: [`/api/coaches/${variables.id}/players`] });
      }
      // Invalidate events queries if team/division changed
      if (variables.teamId || variables.divisionId || variables.teamIds) {
        queryClient.invalidateQueries({ queryKey: ["/api/events"] });
        queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      }
      setUpdatingUserId(null);
      // Only show toast and close dialog if updating from edit dialog (more than just isActive)
      if (Object.keys(variables).length > 2 || !('isActive' in variables)) {
        toast({ title: "User updated successfully" });
        setEditingUser(null);
      }
    },
    onError: (_error, _variables) => {
      setUpdatingUserId(null);
      toast({ title: "Failed to update user", variant: "destructive" });
    },
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role, firstName, lastName }: { userId: string; role: string; firstName?: string; lastName?: string }) => {
      return await apiRequest("POST", `/api/users/${userId}/add-role`, { role, firstName, lastName });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: data.message || "Role added successfully" });
      setShowAddRoleDialog(false);
      setSelectedRoleToAdd("");
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to add role", variant: "destructive" });
    },
  });

  const downloadUserTemplate = () => {
    const csvContent = "First name,Last name,Email,Phone,Role,Status,Team\nJohn,Doe,player@example.com,555-0100,player,active,Thunder U12\nJane,Smith,coach@example.com,555-0101,coach,active,\nBob,Johnson,parent@example.com,555-0102,parent,active,";
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
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const userData: any = {};
        
        headers.forEach((header, index) => {
          userData[header] = values[index] || '';
        });
        
        // Map CSV column names to our data model (matching template: First name,Last name,Email,Phone,Role,Status,Team)
        const firstName = userData['first name'] || userData['firstname'] || '';
        const lastName = userData['last name'] || userData['lastname'] || '';
        const email = userData['email'] || '';
        const phone = userData['phone'] || userData['phonenumber'] || '';
        const role = userData['role'] || 'player';
        const status = userData['status'] || 'active';
        const teamName = userData['team'] || '';
        
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


  const downloadUsersData = () => {
    const csvHeaders = "First name,Last name,Email,Phone,Role,Status,Team";
    const csvRows = users.map((user: any) => {
      const team = teams.find((t: any) => t.id === user.teamId);
      return [
        user.firstName || "",
        user.lastName || "",
        user.email || "",
        user.phoneNumber || "",
        user.role || "",
        user.isActive !== false ? "active" : "inactive",
        team?.name || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-row items-center justify-between mb-4">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Manage players, coaches, parents, and admins</CardDescription>
          </div>
          <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-users">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Users</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: First name, Last name, Email, Phone, Role, Status, Team</p>
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
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadUsersData} data-testid="button-download-users">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" title="Add User" data-testid="button-add-new-user">
                <Plus className="w-4 h-4" />
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
                  
                  <div className="space-y-4">
                    <Label data-testid="label-edit-assignments">Program & Team Assignments</Label>
                    {(() => {
                      // Use teamIds from the user data (now populated from active team memberships)
                      const teamIds = Array.isArray(editingUser.teamIds) ? editingUser.teamIds : 
                                     editingUser.teamId ? [editingUser.teamId] : [];
                      
                      // Use activeTeams from API for display (includes team/program names)
                      const activeTeams = editingUser.activeTeams || [];
                      
                      // Group teams by program
                      const teamsByProgram = programs?.reduce((acc: any, program: any) => {
                        acc[program.id] = {
                          program,
                          teams: teams?.filter((t: any) => t.programId === program.id) || []
                        };
                        return acc;
                      }, {}) || {};
                      
                      // Teams without a program
                      const teamsWithoutProgram = teams?.filter((t: any) => !t.programId) || [];
                      
                      // Program enrollments (from productEnrollments table)
                      const originalEnrollments = editingUserProgramMemberships || [];
                      // Use pendingEnrollments for display if there are local changes
                      const programEnrollments = editingUser.pendingEnrollments || originalEnrollments;
                      
                      return (
                        <div className="space-y-3">
                          {/* Program Enrollments - show what programs the user is enrolled in */}
                          {programEnrollments.length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3" data-testid="program-enrollments">
                              <p className="text-xs font-semibold text-blue-700 mb-2">Program Enrollments ({programEnrollments.length}):</p>
                              <div className="space-y-1">
                                {programEnrollments.map((enrollment: any) => (
                                  <div key={enrollment.enrollmentId} className="flex items-center justify-between bg-white border border-blue-100 rounded px-2 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{enrollment.programName}</span>
                                      {enrollment.teams?.length > 0 && (
                                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                                          {enrollment.teams.length} team{enrollment.teams.length > 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-blue-600 capitalize">{enrollment.status}</span>
                                      <button
                                        type="button"
                                        className="text-red-500 hover:text-red-700 text-sm font-medium px-1"
                                        onClick={() => {
                                          // Mark enrollment for removal in local state
                                          setEditingUser({
                                            ...editingUser,
                                            enrollmentsToRemove: [...(editingUser.enrollmentsToRemove || []), enrollment.enrollmentId],
                                            pendingEnrollments: (editingUser.pendingEnrollments || programEnrollments).filter((e: any) => e.enrollmentId !== enrollment.enrollmentId)
                                          });
                                        }}
                                        data-testid={`button-remove-enrollment-${enrollment.enrollmentId}`}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Enroll in Program Section */}
                          <div className="mt-2">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Enroll in Program:</p>
                            <div className="border rounded-md max-h-32 overflow-y-auto">
                              {programs?.filter((p: any) => 
                                p.productCategory === 'program' && 
                                !(editingUser.pendingEnrollments || programEnrollments).some((e: any) => e.programId === p.id)
                              ).map((program: any) => (
                                <div key={program.id} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0 hover:bg-gray-50">
                                  <span className="text-sm">{program.name}</span>
                                  <button
                                    type="button"
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                    onClick={() => {
                                      // Add enrollment to pending
                                      const newEnrollment = {
                                        enrollmentId: `new-${program.id}`,
                                        programId: program.id,
                                        programName: program.name,
                                        status: 'active',
                                        teams: [],
                                        isNew: true
                                      };
                                      setEditingUser({
                                        ...editingUser,
                                        pendingEnrollments: [...(editingUser.pendingEnrollments || programEnrollments), newEnrollment],
                                        enrollmentsToAdd: [...(editingUser.enrollmentsToAdd || []), program.id]
                                      });
                                    }}
                                    data-testid={`button-enroll-${program.id}`}
                                  >
                                    + Enroll
                                  </button>
                                </div>
                              ))}
                              {programs?.filter((p: any) => 
                                p.productCategory === 'program' && 
                                !(editingUser.pendingEnrollments || programEnrollments).some((e: any) => e.programId === p.id)
                              ).length === 0 && (
                                <p className="text-xs text-gray-500 px-3 py-2">Already enrolled in all available programs</p>
                              )}
                            </div>
                          </div>
                          
                          {/* Current Team Assignments - Clear display of what teams user is on */}
                          {activeTeams.length > 0 ? (
                            <div className="bg-green-50 border border-green-200 rounded-md p-3" data-testid="current-assignments">
                              <p className="text-xs font-semibold text-green-700 mb-2">Team Assignments ({activeTeams.length}):</p>
                              <div className="space-y-1">
                                {activeTeams.map((assignment: any) => (
                                  <div key={assignment.teamId} className="flex items-center justify-between bg-white border border-green-100 rounded px-2 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{assignment.teamName}</span>
                                      {assignment.programName && (
                                        <span className="text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{assignment.programName}</span>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      className="text-red-500 hover:text-red-700 text-sm font-medium px-2"
                                      onClick={() => {
                                        const newTeamIds = teamIds.filter((id: number) => id !== assignment.teamId);
                                        setEditingUser({
                                          ...editingUser,
                                          teamIds: newTeamIds,
                                          teamId: newTeamIds[0] || null,
                                          activeTeams: activeTeams.filter((a: any) => a.teamId !== assignment.teamId)
                                        });
                                      }}
                                      data-testid={`button-remove-team-${assignment.teamId}`}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : programEnrollments.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3" data-testid="no-assignments">
                              <p className="text-sm text-yellow-700">Not enrolled in any programs or assigned to any teams</p>
                            </div>
                          ) : (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3" data-testid="no-team-assignments">
                              <p className="text-sm text-yellow-700">Enrolled in programs but not assigned to any teams yet</p>
                            </div>
                          )}
                          
                          {/* Add to Teams Section */}
                          <div className="mt-3">
                            <p className="text-xs font-semibold text-gray-600 mb-2">Add to Team:</p>
                            <div className="border rounded-md max-h-48 overflow-y-auto" data-testid="program-team-assignments">
                              {programs?.map((program: any) => {
                                const programTeams = teamsByProgram[program.id]?.teams || [];
                                if (programTeams.length === 0) return null;
                                
                                const hasAssignedTeam = programTeams.some((t: any) => teamIds.includes(t.id));
                                
                                return (
                                  <div key={program.id} className="border-b last:border-b-0">
                                    <div className={`px-3 py-2 font-semibold text-sm ${hasAssignedTeam ? 'bg-blue-50 text-blue-800' : 'bg-gray-50 text-gray-700'}`}>
                                      {program.name}
                                    </div>
                                    <div className="p-2 space-y-1">
                                      {programTeams.map((team: any) => {
                                        const isChecked = teamIds.includes(team.id);
                                        return (
                                          <div key={team.id} className="flex items-center space-x-2 pl-2">
                                            <Checkbox
                                              id={`team-${team.id}`}
                                              checked={isChecked}
                                              onCheckedChange={(checked) => {
                                                let newTeamIds;
                                                let newActiveTeams = [...activeTeams];
                                                if (checked) {
                                                  newTeamIds = [...teamIds, team.id];
                                                  // Add to activeTeams display
                                                  newActiveTeams.push({
                                                    teamId: team.id,
                                                    teamName: team.name,
                                                    programId: program.id,
                                                    programName: program.name
                                                  });
                                                } else {
                                                  newTeamIds = teamIds.filter((id: number) => id !== team.id);
                                                  newActiveTeams = newActiveTeams.filter((a: any) => a.teamId !== team.id);
                                                }
                                                setEditingUser({
                                                  ...editingUser,
                                                  teamIds: newTeamIds,
                                                  teamId: newTeamIds[0] || null,
                                                  activeTeams: newActiveTeams
                                                });
                                              }}
                                              data-testid={`checkbox-team-${team.id}`}
                                            />
                                            <label
                                              htmlFor={`team-${team.id}`}
                                              className={`text-sm leading-none cursor-pointer ${isChecked ? 'text-blue-700 font-medium' : ''}`}
                                            >
                                              {team.name}
                                            </label>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Teams without program */}
                              {teamsWithoutProgram.length > 0 && (
                                <div className="border-b last:border-b-0">
                                  <div className="px-3 py-2 font-semibold text-sm bg-gray-50 text-gray-700">
                                    Other Teams
                                  </div>
                                  <div className="p-2 space-y-1">
                                    {teamsWithoutProgram.map((team: any) => {
                                      const isChecked = teamIds.includes(team.id);
                                      return (
                                        <div key={team.id} className="flex items-center space-x-2 pl-2">
                                          <Checkbox
                                            id={`team-${team.id}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                              let newTeamIds;
                                              let newActiveTeams = [...activeTeams];
                                              if (checked) {
                                                newTeamIds = [...teamIds, team.id];
                                                newActiveTeams.push({
                                                  teamId: team.id,
                                                  teamName: team.name,
                                                  programId: null,
                                                  programName: null
                                                });
                                              } else {
                                                newTeamIds = teamIds.filter((id: number) => id !== team.id);
                                                newActiveTeams = newActiveTeams.filter((a: any) => a.teamId !== team.id);
                                              }
                                              setEditingUser({
                                                ...editingUser,
                                                teamIds: newTeamIds,
                                                teamId: newTeamIds[0] || null,
                                                activeTeams: newActiveTeams
                                              });
                                            }}
                                            data-testid={`checkbox-team-${team.id}`}
                                          />
                                          <label
                                            htmlFor={`team-${team.id}`}
                                            className={`text-sm leading-none cursor-pointer ${isChecked ? 'text-blue-700 font-medium' : ''}`}
                                          >
                                            {team.name}
                                          </label>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              
                              {(!programs || programs.length === 0) && (!teams || teams.length === 0) && (
                                <p className="p-3 text-sm text-gray-500">No programs or teams available</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                  
                  {editingUser.role !== 'coach' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-division" data-testid="label-edit-division">Division</Label>
                      <Input
                        id="edit-division"
                        value={editingUser.division || ""}
                        onChange={(e) => setEditingUser({
                          ...editingUser, 
                          division: e.target.value
                        })}
                        placeholder="e.g., U10, U12, Varsity"
                        data-testid="input-edit-division"
                      />
                    </div>
                  )}
                  
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
                    <button
                      type="button"
                      onClick={() => setShowDobPicker(true)}
                      data-testid="input-edit-dob"
                      className="w-full h-10 px-3 bg-white border border-gray-300 rounded-md flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                    >
                      <span className={editingUser.dateOfBirth ? "text-gray-900" : "text-gray-400"}>
                        {editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : "Select date"}
                      </span>
                      <Calendar className="w-4 h-4 text-gray-400" />
                    </button>
                    
                    <Dialog open={showDobPicker} onOpenChange={setShowDobPicker}>
                      <DialogContent className="bg-gray-900 border-gray-700 max-w-sm">
                        <DialogHeader>
                          <DialogTitle className="text-white text-center">Select Date of Birth</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 flex justify-center date-wheel-picker-dark">
                          <DateScrollPicker
                            defaultYear={editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).getFullYear() : 2000}
                            defaultMonth={(editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).getMonth() : 0) + 1}
                            defaultDay={editingUser.dateOfBirth ? new Date(editingUser.dateOfBirth).getDate() : 1}
                            startYear={1950}
                            endYear={new Date().getFullYear()}
                            dateTimeFormatOptions={{ month: 'short' }}
                            highlightOverlayStyle={{ backgroundColor: 'transparent', border: 'none' }}
                            onDateChange={(date: Date) => {
                              setEditingUser({...editingUser, dateOfBirth: date.toISOString().split('T')[0]});
                            }}
                          />
                        </div>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1 border-gray-600 text-gray-600 hover:bg-gray-800"
                            onClick={() => setShowDobPicker(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                            onClick={() => setShowDobPicker(false)}
                          >
                            Confirm
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  {editingUser.role !== 'coach' && (
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
                  )}
                  
                  {editingUser.role !== 'coach' && (
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
                  )}
                  
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
                >First Name</TableHead>
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
                  onClick={() => handleSort('statusTag')}
                  data-testid="sort-statusTag"
                >
                  Status
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
                      <Badge 
                        className={`capitalize ${
                          user.role === "admin" 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : user.role === "coach" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : user.role === "parent" 
                            ? "bg-purple-600 text-white hover:bg-purple-700" 
                            : user.role === "player" 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.role === "player" && user.statusTag && user.statusTag !== "none" ? (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            user.statusTag === "payment_due" 
                              ? "bg-red-500/20 border-red-500/50 text-red-600" 
                              : user.statusTag === "low_balance" 
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-600" 
                              : user.statusTag === "club_member" 
                              ? "bg-green-500/20 border-green-500/50 text-green-600" 
                              : user.statusTag === "pack_holder" 
                              ? "bg-blue-500/20 border-blue-500/50 text-blue-600" 
                              : ""
                          }`}
                          data-testid={`badge-status-${user.id}`}
                        >
                          {user.statusTag === "payment_due" ? "Payment Due" 
                            : user.statusTag === "low_balance" ? "Low Balance" 
                            : user.statusTag === "club_member" ? "Club Member" 
                            : user.statusTag === "pack_holder" ? "Pack Holder" 
                            : "-"}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
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
                          }}
                          data-testid={`button-edit-user-${user.id}`}
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setDeleteConfirmUser(user)}
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0 flex flex-col">
          {viewingUser && (
            <>
              {/* Header with user info */}
              <div className="px-6 pt-6 pb-4 border-b flex-shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xl font-semibold">
                    {viewingUser.firstName?.charAt(0)}{viewingUser.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {viewingUser.firstName} {viewingUser.lastName}
                    </h2>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-gray-500">{viewingUser.email}</span>
                      <Badge 
                        className={`capitalize ${
                          viewingUser.role === "admin" 
                            ? "bg-red-600 text-white hover:bg-red-700" 
                            : viewingUser.role === "coach" 
                            ? "bg-blue-600 text-white hover:bg-blue-700" 
                            : viewingUser.role === "parent" 
                            ? "bg-purple-600 text-white hover:bg-purple-700" 
                            : viewingUser.role === "player" 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-gray-500 text-white"
                        }`}
                      >
                        {viewingUser.role}
                      </Badge>
                      {viewingUser.isActive !== false ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50 text-gray-500">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddRoleDialog(true)}
                    className="flex items-center gap-2"
                    data-testid="button-add-role"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Role
                  </Button>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="border-b px-6 flex-shrink-0">
                <nav className="flex gap-1" role="tablist">
                  {[
                    { id: "team", label: "Profile" },
                    { id: "billing", label: "Billing" },
                    { id: "performance", label: "Performance" },
                    { id: "notes", label: "Notes" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={detailTab === tab.id}
                      onClick={() => setDetailTab(tab.id)}
                      className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                        detailTab === tab.id
                          ? "text-red-600"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                      data-testid={`tab-${tab.id}`}
                    >
                      {tab.label}
                      {detailTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-600" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-6">

              {/* Profile Tab */}
              {detailTab === "team" && (
                <div role="tabpanel" id="team-panel" className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Team</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-team">
                        {teams.find((t: any) => t.id === Number(viewingUser.teamId))?.name || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Division</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-division">
                        {divisions.find((d: any) => d.id === Number(viewingUser.divisionId))?.name || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Program</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-program">{viewingUser.program || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Position</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-position">{viewingUser.position || "—"}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Height</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-height">
                        {viewingUser.heightIn ? `${Math.floor(viewingUser.heightIn / 12)}'${viewingUser.heightIn % 12}"` : "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Guardian</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-guardian">
                        {viewingUser.guardianId ? users.find((u: any) => u.id === viewingUser.guardianId)?.firstName + " " + users.find((u: any) => u.id === viewingUser.guardianId)?.lastName : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Bio */}
                  {viewingUser.bio && (
                    <div className="pt-4 border-t">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Bio</p>
                      <p className="text-sm text-gray-700 leading-relaxed" data-testid="text-user-bio">{viewingUser.bio}</p>
                    </div>
                  )}

                  {/* System Info */}
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Account Details</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400 text-xs">User ID</p>
                        <p className="font-mono text-xs text-gray-600" data-testid="text-user-id">{viewingUser.id}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Last Login</p>
                        <p className="text-gray-600" data-testid="text-last-login">
                          {viewingUser.lastLogin ? new Date(viewingUser.lastLogin).toLocaleDateString() : "Never"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Created</p>
                        <p className="text-gray-600" data-testid="text-created-at">
                          {viewingUser.createdAt ? new Date(viewingUser.createdAt).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-xs">Verified</p>
                        <p className="text-gray-600">{viewingUser.verified ? "Yes" : "No"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Billing Tab */}
              {detailTab === "billing" && (
                <div role="tabpanel" id="billing-panel" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Stripe Customer ID</p>
                      <p className="text-sm font-mono text-gray-900" data-testid="text-user-stripe-id">
                        {viewingUser.stripeCustomerId || "—"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Packages</p>
                      <p className="text-sm text-gray-900" data-testid="text-user-packages">
                        {viewingUser.packages?.join(", ") || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Active Products</p>
                    {viewingUser.products && Array.isArray(viewingUser.products) && viewingUser.products.length > 0 ? (
                      <div className="space-y-2">
                        {viewingUser.products.map((product: any, index: number) => (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg" data-testid={`product-${index}`}>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                            <p className="text-sm font-medium text-gray-900">{typeof product === 'string' ? product : product.name || 'Unknown Product'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No active products</p>
                    )}
                  </div>
                </div>
              )}

              {/* Performance Tab */}
              {detailTab === "performance" && (
                <div role="tabpanel" id="performance-panel" className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                    {[
                      { label: "Practices", value: viewingUser.totalPractices || 0, testId: "stat-total-practices" },
                      { label: "Games", value: viewingUser.totalGames || 0, testId: "stat-total-games" },
                      { label: "Check-ins", value: viewingUser.consecutiveCheckins || 0, testId: "stat-consecutive-checkins" },
                      { label: "Videos", value: viewingUser.videosCompleted || 0, testId: "stat-videos-completed" },
                      { label: "Years", value: viewingUser.yearsActive || 0, testId: "stat-years-active" },
                      { label: "Skill", value: viewingUser.skill || "—", testId: "stat-skill-level" },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-900" data-testid={stat.testId}>{stat.value}</p>
                        <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Skills Assessment */}
                  <div className="pt-4 border-t" data-testid="section-skills-assessment">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Skill Assessments</p>
                    {evaluationsLoading ? (
                      <div className="space-y-3">
                        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                        <div className="h-16 bg-gray-100 rounded-lg animate-pulse" />
                      </div>
                    ) : evaluationsError ? (
                      <p className="text-sm text-red-500">Failed to load assessments</p>
                    ) : userEvaluations.length === 0 ? (
                      <p className="text-sm text-gray-400">No skill assessments recorded</p>
                    ) : (
                      <div className="space-y-3">
                        {userEvaluations.map((evaluation: any, index: number) => {
                          const coach = users.find((u: any) => u.id === evaluation.coachId);
                          const evaluationDate = evaluation.createdAt ? new Date(evaluation.createdAt) : null;
                          return (
                            <Accordion key={evaluation.id || index} type="single" collapsible>
                              <AccordionItem value={`eval-${index}`} className="border rounded-lg px-4" data-testid={`evaluation-${index}`}>
                                <AccordionTrigger className="hover:no-underline py-3">
                                  <div className="flex items-center gap-3 text-left">
                                    <Badge variant="outline" className="text-xs">{evaluation.quarter || 'Q1'}</Badge>
                                    <div>
                                      <p className="font-medium text-sm">{coach ? `${coach.firstName} ${coach.lastName}` : 'Coach'}</p>
                                      <p className="text-xs text-gray-400">{evaluationDate ? format(evaluationDate, 'MMM d, yyyy') : ''}</p>
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent>
                                  {evaluation.scores && Object.keys(evaluation.scores).length > 0 && (
                                    <div className="grid grid-cols-2 gap-2 py-3">
                                      {Object.entries(evaluation.scores).map(([category, score]: [string, any]) => (
                                        <div key={category} className="flex justify-between items-center text-sm">
                                          <span className="text-gray-600 capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                                          <Badge variant={score >= 4 ? "default" : "secondary"} className="text-xs">{score}/5</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {evaluation.notes && (
                                    <p className="text-sm text-gray-600 bg-gray-50 rounded p-3 mt-2">{evaluation.notes}</p>
                                  )}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Awards */}
                  <div className="pt-4 border-t" data-testid="section-user-awards">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Awards & Achievements</p>
                    {awardsLoading ? (
                      <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
                    ) : awardsError ? (
                      <p className="text-sm text-red-500">Failed to load awards</p>
                    ) : !userAwards || ((!userAwards.badges || userAwards.badges.length === 0) && (!userAwards.trophies || userAwards.trophies.length === 0)) ? (
                      <p className="text-sm text-gray-400">No awards earned yet</p>
                    ) : (
                      <div className="space-y-4">
                        {userAwards.badges && userAwards.badges.length > 0 && (
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {userAwards.badges.map((badge: any) => (
                              <div key={badge.id} className="text-center p-3 bg-gray-50 rounded-lg" data-testid={`award-${badge.id}`}>
                                {badge.imageUrl && <img src={badge.imageUrl} alt={badge.name} className="w-10 h-10 mx-auto object-contain" />}
                                <p className="text-xs font-medium mt-2 truncate">{badge.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                        {userAwards.trophies && userAwards.trophies.length > 0 && (
                          <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                            {userAwards.trophies.map((trophy: any) => (
                              <div key={trophy.id} className="text-center p-3 bg-amber-50 rounded-lg" data-testid={`award-${trophy.id}`}>
                                {trophy.imageUrl && <img src={trophy.imageUrl} alt={trophy.name} className="w-10 h-10 mx-auto object-contain" />}
                                <p className="text-xs font-medium mt-2 truncate">{trophy.name}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes Tab */}
              {detailTab === "notes" && (
                <div role="tabpanel" id="notes-panel" className="space-y-6">
                  {/* Emergency Contact */}
                  <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Emergency Contact</p>
                    {viewingUser.emergencyContactJson ? (
                      <div className="bg-gray-50 rounded-lg p-4" data-testid="emergency-contact-info">
                        {typeof viewingUser.emergencyContactJson === 'object' ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            {Object.entries(viewingUser.emergencyContactJson).map(([key, value]: [string, any]) => (
                              <div key={key}>
                                <p className="text-gray-400 text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                                <p className="text-gray-900">{value || "—"}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-700">{String(viewingUser.emergencyContactJson)}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No emergency contact on file</p>
                    )}
                  </div>

                  {/* Admin Notes */}
                  <div className="pt-4 border-t">
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">Internal Notes</p>
                    {viewingUser.notes ? (
                      <div className="bg-amber-50 border border-amber-100 rounded-lg p-4" data-testid="admin-notes">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingUser.notes}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">No admin notes</p>
                    )}
                  </div>
                </div>
              )}
              </div>

              {/* Add Role Dialog */}
              <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Add Role Profile</DialogTitle>
                    <DialogDescription>
                      Create a new role profile for {viewingUser.firstName} {viewingUser.lastName}. 
                      This will create a separate user record with the same email but a different role.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Role</Label>
                      <Select value={selectedRoleToAdd} onValueChange={setSelectedRoleToAdd}>
                        <SelectTrigger data-testid="select-role-to-add">
                          <SelectValue placeholder="Choose a role..." />
                        </SelectTrigger>
                        <SelectContent>
                          {['player', 'parent', 'coach', 'admin']
                            .filter(role => {
                              const accountHolderId = viewingUser.accountHolderId || viewingUser.id;
                              const existingRoles = users
                                .filter((u: any) => u.id === accountHolderId || u.accountHolderId === accountHolderId)
                                .map((u: any) => u.role);
                              return !existingRoles.includes(role);
                            })
                            .map(role => (
                              <SelectItem key={role} value={role} className="capitalize">
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                              </SelectItem>
                            ))
                          }
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
                      <p className="font-medium mb-1">What this does:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Creates a new user record with a unique ID</li>
                        <li>Uses the same email: {viewingUser.email}</li>
                        <li>Links to the same account holder</li>
                        <li>User can switch between roles in Profile Gateway</li>
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddRoleDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => {
                        if (selectedRoleToAdd) {
                          const accountHolderId = viewingUser.accountHolderId || viewingUser.id;
                          addRole.mutate({ 
                            userId: accountHolderId, 
                            role: selectedRoleToAdd,
                            firstName: viewingUser.firstName,
                            lastName: viewingUser.lastName
                          });
                        }
                      }}
                      disabled={!selectedRoleToAdd || addRole.isPending}
                      data-testid="button-confirm-add-role"
                    >
                      {addRole.isPending ? "Adding..." : "Add Role"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirmUser?.firstName} {deleteConfirmUser?.lastName}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteUser.mutate(deleteConfirmUser.id);
                setDeleteConfirmUser(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Teams Tab - Full Implementation
function TeamsTab({ teams, users, divisions, programs, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [editingTeam, setEditingTeam] = useState<any>(null);
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<any>(null);
  const [teamRoster, setTeamRoster] = useState<string[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const tableRef = useDragScroll();

  const coaches = users.filter((u: any) => u.role === "coach");
  const players = users.filter((u: any) => u.role === "player");
  
  // Fetch team roster when editing begins
  useEffect(() => {
    if (editingTeam?.id) {
      setRosterLoading(true);
      // Get players assigned to this team from users data
      const assignedPlayers = users.filter((u: any) => {
        if (u.role !== 'player') return false;
        const userTeamIds = Array.isArray(u.teamIds) ? u.teamIds : u.teamId ? [u.teamId] : [];
        return userTeamIds.includes(editingTeam.id);
      }).map((u: any) => u.id);
      setTeamRoster(assignedPlayers);
      setRosterLoading(false);
    } else {
      setTeamRoster([]);
    }
  }, [editingTeam?.id, users]);

  const form = useForm<any>({
    resolver: zodResolver(insertTeamSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      programId: "",
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
  
  // Update roster assignments mutation
  const updateRoster = useMutation({
    mutationFn: async ({ teamId, playerIds }: { teamId: number; playerIds: string[] }) => {
      // Get current roster
      const currentRoster = users.filter((u: any) => {
        if (u.role !== 'player') return false;
        const userTeamIds = Array.isArray(u.teamIds) ? u.teamIds : u.teamId ? [u.teamId] : [];
        return userTeamIds.includes(teamId);
      }).map((u: any) => u.id);
      
      // Find players to add and remove
      const toAdd = playerIds.filter(id => !currentRoster.includes(id));
      const toRemove = currentRoster.filter((id: string) => !playerIds.includes(id));
      
      // Add new players
      for (const playerId of toAdd) {
        const player = users.find((u: any) => u.id === playerId);
        if (player) {
          const currentTeamIds = Array.isArray(player.teamIds) ? player.teamIds : player.teamId ? [player.teamId] : [];
          await apiRequest("PATCH", `/api/users/${playerId}`, {
            teamIds: [...currentTeamIds, teamId],
            teamId: currentTeamIds[0] || teamId
          });
        }
      }
      
      // Remove players
      for (const playerId of toRemove) {
        const player = users.find((u: any) => u.id === playerId);
        if (player) {
          const currentTeamIds = Array.isArray(player.teamIds) ? player.teamIds : player.teamId ? [player.teamId] : [];
          const newTeamIds = currentTeamIds.filter((id: number) => id !== teamId);
          await apiRequest("PATCH", `/api/users/${playerId}`, {
            teamIds: newTeamIds,
            teamId: newTeamIds[0] || null
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      toast({ title: "Roster updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update roster", variant: "destructive" });
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
                  Team
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
                            <Input {...field} placeholder="High School Black" data-testid="input-team-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="programId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Program *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger data-testid="select-team-program">
                                <SelectValue placeholder="Select a program" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(programs || []).map((program: any) => (
                                <SelectItem key={program.id} value={program.id}>
                                  {program.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>Teams belong to a program</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="division"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Division</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              value={field.value || ""}
                              placeholder="e.g., U10, U12, Varsity"
                              data-testid="input-team-division"
                            />
                          </FormControl>
                          <FormDescription>Optional age division</FormDescription>
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
                      <Input
                        id="edit-team-division"
                        value={editingTeam.division || ""}
                        onChange={(e) => setEditingTeam({...editingTeam, division: e.target.value})}
                        placeholder="e.g., U10, U12, Varsity"
                        data-testid="input-edit-team-division"
                      />
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

                    {/* Roster Management Section */}
                    <div className="space-y-2 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <Label>Team Roster ({teamRoster.length} players)</Label>
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
                                  const player = players.find((p: any) => p.id === playerId);
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
                            {players.length === 0 ? (
                              <p className="text-sm text-gray-500">No players available</p>
                            ) : (
                              players.map((player: any) => {
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
                                      {player.division && <span className="text-gray-400 ml-1">({player.division})</span>}
                                    </label>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        className="flex-1"
                        onClick={async () => {
                          await updateTeam.mutateAsync(editingTeam);
                          await updateRoster.mutateAsync({ teamId: editingTeam.id, playerIds: teamRoster });
                        }}
                        disabled={updateTeam.isPending || updateRoster.isPending}
                        data-testid="button-submit-edit-team"
                      >
                        {updateTeam.isPending || updateRoster.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
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
                  <TableHead>Program</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead>Coach</TableHead>
                  <TableHead>Roster</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team: any) => {
                  const coach = users.find((u: any) => u.id === team.coachId);
                  const division = (divisions || []).find((d: any) => d.id === team.divisionId);
                  const program = (programs || []).find((p: any) => p.id === team.programId);
                  return (
                    <TableRow key={team.id} data-testid={`row-team-${team.id}`}>
                      <TableCell className="font-medium" data-testid={`text-team-name-${team.id}`}>
                        {team.name}
                      </TableCell>
                      <TableCell data-testid={`text-program-${team.id}`}>
                        {program ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {program.name}
                          </Badge>
                        ) : (
                          <span className="text-gray-400">No program</span>
                        )}
                      </TableCell>
                      <TableCell data-testid={`text-division-${team.id}`}>
                        {division?.name || "-"}
                      </TableCell>
                      <TableCell data-testid={`text-coach-${team.id}`}>
                        {coach ? `${coach.firstName} ${coach.lastName}` : "Unassigned"}
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
                            onClick={() => setDeleteConfirmTeam(team)}
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
                                if (checked) {
                                  await apiRequest("POST", `/api/teams/${selectedTeam.id}/assign-player`, {
                                    playerId: player.id
                                  });
                                } else {
                                  await apiRequest("POST", `/api/teams/${selectedTeam.id}/remove-player`, {
                                    playerId: player.id
                                  });
                                }
                                queryClient.invalidateQueries({ queryKey: ["/api/users"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/users", player.id, "team"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/users", player.id, "teams"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/users", player.id, "program-memberships"] });
                                queryClient.invalidateQueries({ queryKey: [`/api/profile/${player.id}`] });
                                queryClient.invalidateQueries({ queryKey: ["/api/profile", player.id] });
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
      
      {/* Delete Team Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmTeam} onOpenChange={(open) => !open && setDeleteConfirmTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Team</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmTeam?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteTeam.mutate(deleteConfirmTeam.id);
                setDeleteConfirmTeam(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [selectedPrograms, setSelectedPrograms] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<any>(null);

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
    targetType: z.enum(["all", "user", "team", "division", "program", "role"]),
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
      } else if (targetType === 'program') {
        assignTo = { programs: selectedPrograms.map(String) };
        visibility = { programs: selectedPrograms.map(String) };
      } else if (targetType === 'role') {
        assignTo = { roles: selectedRoles };
        visibility = { roles: selectedRoles };
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
      setSelectedPrograms([]);
      setSelectedRoles([]);
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
    const csvContent = "Title,Type,Start Time,End Time,Location,Team\nTeam Practice,practice,2025-01-15T10:00,2025-01-15T12:00,Main Gym,Thunder U12\nChampionship Game,game,2025-01-20T18:00,2025-01-20T20:00,Arena Stadium,Varsity";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadEventsData = () => {
    const csvHeaders = "Title,Type,Start Time,End Time,Location,Team";
    const csvRows = events.map((event: any) => {
      const assignedTeams = event.assignTo?.teams || [];
      const teamNames = assignedTeams.map((tid: string) => {
        const team = teams.find((t: any) => String(t.id) === tid);
        return team?.name || "";
      }).join(";");
      return [
        event.title || "",
        event.eventType || event.type || "",
        event.startTime || "",
        event.endTime || "",
        event.location || "",
        teamNames
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'events-data.csv';
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
        <div className="flex gap-2">
          <div className="flex border rounded-lg mr-2">
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
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-events">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Events</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Title, Type, Start Time, End Time, Location, Team</p>
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
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadEventsData} data-testid="button-download-events">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Event" data-testid="button-create-event">
                <Plus className="w-4 h-4" />
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
                          setSelectedPrograms([]);
                          setSelectedRoles([]);
                        }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-event-target">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all">Everyone</SelectItem>
                            <SelectItem value="program">Program(s)</SelectItem>
                            <SelectItem value="team">Team(s)</SelectItem>
                            <SelectItem value="user">Specific User(s)</SelectItem>
                            <SelectItem value="role">Role(s)</SelectItem>
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
                  
                  {String(form.watch("targetType")) === "program" && (
                    <div className="space-y-2">
                      <Label>Select Programs</Label>
                      <div className="border rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                        {programs.filter((p: any) => p.isActive && p.productCategory === 'service').map((program: any) => (
                          <div key={program.id} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedPrograms.includes(String(program.id))}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedPrograms([...selectedPrograms, String(program.id)]);
                                } else {
                                  setSelectedPrograms(selectedPrograms.filter(id => id !== String(program.id)));
                                }
                              }}
                              data-testid={`checkbox-program-${program.id}`}
                            />
                            <label className="text-sm cursor-pointer">
                              {program.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedPrograms.length} program(s) selected</p>
                    </div>
                  )}
                  
                  {String(form.watch("targetType")) === "role" && (
                    <div className="space-y-2">
                      <Label>Select Roles</Label>
                      <div className="border rounded-md p-3 space-y-2">
                        {["player", "parent", "coach", "admin"].map((role) => (
                          <div key={role} className="flex items-center space-x-2">
                            <Checkbox
                              checked={selectedRoles.includes(role)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRoles([...selectedRoles, role]);
                                } else {
                                  setSelectedRoles(selectedRoles.filter(r => r !== role));
                                }
                              }}
                              data-testid={`checkbox-role-${role}`}
                            />
                            <label className="text-sm cursor-pointer capitalize">
                              {role}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">{selectedRoles.length} role(s) selected</p>
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
                        <SelectItem value="program">Specific Program</SelectItem>
                        <SelectItem value="team">Specific Team</SelectItem>
                        <SelectItem value="user">Specific User</SelectItem>
                        <SelectItem value="role">Specific Role</SelectItem>
                        <SelectItem value="division">Specific Division</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editingEvent.targetType === "team" && (
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
                      <p className="text-xs text-gray-500">Choose which team this event is for</p>
                    </div>
                  )}
                  {editingEvent.targetType === "program" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-programId">Select Program</Label>
                      <Select
                        value={editingEvent.targetId ? String(editingEvent.targetId) : ""}
                        onValueChange={(value) => setEditingEvent({...editingEvent, targetId: value})}
                      >
                        <SelectTrigger id="edit-event-programId" data-testid="select-edit-event-programId">
                          <SelectValue placeholder="Choose a program" />
                        </SelectTrigger>
                        <SelectContent>
                          {programs.filter((p: any) => p.isActive && p.productCategory === 'service').map((program: any) => (
                            <SelectItem key={program.id} value={String(program.id)}>
                              {program.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Choose which program this event is for</p>
                    </div>
                  )}
                  {editingEvent.targetType === "role" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-roleId">Select Role</Label>
                      <Select
                        value={editingEvent.targetId ? String(editingEvent.targetId) : ""}
                        onValueChange={(value) => setEditingEvent({...editingEvent, targetId: value})}
                      >
                        <SelectTrigger id="edit-event-roleId" data-testid="select-edit-event-roleId">
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="player">Player</SelectItem>
                          <SelectItem value="parent">Parent</SelectItem>
                          <SelectItem value="coach">Coach</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Choose which role this event is for</p>
                    </div>
                  )}
                  {editingEvent.targetType === "user" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-userId">Select User</Label>
                      <Select
                        value={editingEvent.targetId ? String(editingEvent.targetId) : ""}
                        onValueChange={(value) => setEditingEvent({...editingEvent, targetId: value})}
                      >
                        <SelectTrigger id="edit-event-userId" data-testid="select-edit-event-userId">
                          <SelectValue placeholder="Choose a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers.filter((u: any) => u.isActive).map((user: any) => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.firstName} {user.lastName} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Choose which user this event is for</p>
                    </div>
                  )}
                  {editingEvent.targetType === "division" && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-event-divisionId">Select Division</Label>
                      <Select
                        value={editingEvent.targetId ? String(editingEvent.targetId) : ""}
                        onValueChange={(value) => setEditingEvent({...editingEvent, targetId: value})}
                      >
                        <SelectTrigger id="edit-event-divisionId" data-testid="select-edit-event-divisionId">
                          <SelectValue placeholder="Choose a division" />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.filter((d: any) => d.isActive).map((division: any) => (
                            <SelectItem key={division.id} value={String(division.id)}>
                              {division.name} {division.ageRange ? `(${division.ageRange})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">Choose which division this event is for</p>
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
                        onClick={() => setDeleteConfirmEvent(event)}
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
      
      {/* Delete Event Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmEvent} onOpenChange={(open) => !open && setDeleteConfirmEvent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmEvent?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteEvent.mutate(deleteConfirmEvent.id);
                setDeleteConfirmEvent(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const [filterClass, setFilterClass] = useState<string>("all"); // Now used for trigger category
  const [filterActive, setFilterActive] = useState<string>("all");
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tableRef = useDragScroll();

  // Fetch user awards for recipients view
  const { data: userAwards = [], refetch: refetchUserAwards } = useQuery<any[]>({
    queryKey: ["/api/user-awards", recipientsAward?.id],
    enabled: !!recipientsAward,
  });

  const awardFormSchema = z.object({
    name: z.string().min(1, "Name is required"),
    tier: z.enum(["Gold", "Purple", "Blue", "Green", "Grey", "Special"]),
    description: z.string().optional(),
    imageUrl: z.string().optional(),
    active: z.boolean().default(true),
    // New simplified trigger system
    triggerCategory: z.enum(["checkin", "system", "time", "store", "manual"]).default("manual"),
    eventFilter: z.enum(["game", "practice", "skills", "fnh", "any"]).optional(),
    countMode: z.enum(["total", "streak"]).optional(),
    threshold: z.number().optional(),
    referenceId: z.string().optional(),
    timeUnit: z.enum(["years", "months", "days"]).optional(),
    // Program/Team scope
    programIds: z.array(z.string()).optional(),
    teamIds: z.array(z.number()).optional(),
  });

  // Fetch programs and teams for check-in award scope
  const { data: programs = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });
  
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ["/api/teams"],
  });

  const form = useForm({
    resolver: zodResolver(awardFormSchema),
    defaultValues: {
      name: "",
      tier: "Grey" as const,
      description: "",
      imageUrl: "",
      active: true,
      triggerCategory: "manual" as const,
      eventFilter: undefined,
      countMode: undefined,
      threshold: undefined,
      referenceId: undefined,
      timeUnit: undefined,
      programIds: [] as string[],
      teamIds: [] as number[],
    },
  });

  // Watch selected programs to filter available teams
  const watchedProgramIds = form.watch("programIds") || [];

  // Watch trigger category to show/hide fields dynamically
  const watchedTriggerCategory = form.watch("triggerCategory");

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

  // Handle column sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get tier badge color (new simplified tiers)
  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      "Gold": "bg-yellow-100 text-yellow-700 border-yellow-300",
      "Purple": "bg-purple-100 text-purple-700 border-purple-300",
      "Blue": "bg-blue-100 text-blue-700 border-blue-300",
      "Green": "bg-green-100 text-green-700 border-green-300",
      "Grey": "bg-gray-100 text-gray-700 border-gray-300",
      "Special": "bg-gradient-to-r from-purple-100 to-yellow-100 text-purple-700 border-purple-300",
    };
    return colors[tier] || colors["Grey"];
  };

  // Get trigger category label
  const getTriggerCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      "checkin": "Check-in",
      "system": "Collection",
      "time": "Time",
      "store": "Store",
      "manual": "Manual",
    };
    return labels[category] || "Manual";
  };

  // Tier hierarchy for sorting
  const tierOrder: Record<string, number> = {
    "Gold": 6,
    "Special": 5,
    "Purple": 4,
    "Blue": 3,
    "Green": 2,
    "Grey": 1,
  };

  // Filter and sort awards
  const filteredAwards = awardDefinitions
    .filter((award: any) => {
      const matchesSearch = award.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTier = filterTier === "all" || award.tier === filterTier;
      const matchesActive = filterActive === "all" || 
        (filterActive === "active" && award.active) || 
        (filterActive === "inactive" && !award.active);
      const matchesTrigger = filterClass === "all" || award.triggerCategory === filterClass;
      
      return matchesSearch && matchesTier && matchesActive && matchesTrigger;
    })
    .sort((a: any, b: any) => {
      if (!sortField) return 0;
      
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Special handling for tier sorting
      if (sortField === 'tier') {
        const aRank = tierOrder[aValue] || 0;
        const bRank = tierOrder[bValue] || 0;
        return sortDirection === 'asc' ? aRank - bRank : bRank - aRank;
      }
      
      // Convert to strings for comparison if not numbers
      if (typeof aValue === 'string') aValue = aValue.toLowerCase();
      if (typeof bValue === 'string') bValue = bValue.toLowerCase();
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
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

      // Get auth token from localStorage for file upload
      const token = localStorage.getItem('authToken');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/upload/award-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers,
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
      tier: award.tier || "Grey",
      description: award.description || "",
      imageUrl: award.imageUrl || "",
      active: award.active ?? true,
      triggerCategory: award.triggerCategory || "manual",
      eventFilter: award.eventFilter || undefined,
      countMode: award.countMode || undefined,
      threshold: award.threshold != null ? Number(award.threshold) : undefined,
      referenceId: award.referenceId || undefined,
      timeUnit: award.timeUnit || undefined,
      programIds: award.programIds || [],
      teamIds: award.teamIds || [],
    } as any);
    setIsDialogOpen(true);
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadAwardTemplate = () => {
    const csvContent = "Name,Category,Points,Description,Image URL\nHeart & Hustle Award,Gold,100,For players who show exceptional effort,\nMVP Badge,Purple,250,Most Valuable Player award,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'awards-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadAwardsData = () => {
    const csvHeaders = "Name,Category,Points,Description,Image URL";
    const csvRows = sortedAwards.map((award: any) => {
      return [
        award.name || "",
        award.tier || "",
        award.threshold || 0,
        award.description || "",
        award.imageUrl || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'awards-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 1 && values[0]) {
        try {
          await apiRequest("POST", "/api/awards", {
            organizationId: organization?.id,
            name: values[0],
            tier: values[1] || "Grey",
            threshold: parseInt(values[2]) || 0,
            description: values[3] || "",
            imageUrl: values[4] || "",
            active: true,
            triggerCategory: "manual",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create award:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/awards"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} awards` });
    setIsBulkUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Award Definitions</CardTitle>
          <CardDescription>Manage awards for your organization</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-awards">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Awards</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Category, Points, Description, Image URL</p>
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
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadAwardsData} data-testid="button-download-awards">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingAward(null);
              form.reset();
            }
          }}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Award" data-testid="button-create-award">
                <Plus className="w-4 h-4" />
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
                            <SelectItem value="Gold">Gold</SelectItem>
                            <SelectItem value="Purple">Purple</SelectItem>
                            <SelectItem value="Blue">Blue</SelectItem>
                            <SelectItem value="Green">Green</SelectItem>
                            <SelectItem value="Grey">Grey</SelectItem>
                            <SelectItem value="Special">Special</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Trigger Category - The Master Switch */}
                  <FormField
                    control={form.control}
                    name="triggerCategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>How is this earned? *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-trigger-category">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="checkin">Check-in / Attendance</SelectItem>
                            <SelectItem value="system">Collection (Meta-Badge)</SelectItem>
                            <SelectItem value="time">Time Active</SelectItem>
                            <SelectItem value="store">Store Purchase</SelectItem>
                            <SelectItem value="manual">Manual Assignment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {watchedTriggerCategory === "checkin" && "Award based on event attendance"}
                          {watchedTriggerCategory === "system" && "Award when user collects enough of another badge"}
                          {watchedTriggerCategory === "time" && "Award based on membership duration"}
                          {watchedTriggerCategory === "store" && "Award when user purchases a specific product"}
                          {watchedTriggerCategory === "manual" && "Coach or admin assigns this award manually"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Dynamic fields based on trigger category */}
                  {watchedTriggerCategory === "checkin" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      {/* Program Selection */}
                      <FormField
                        control={form.control}
                        name="programIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Programs (Optional)</FormLabel>
                            <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[40px]">
                              {programs.map((program: any) => {
                                const isSelected = (field.value || []).includes(program.id);
                                return (
                                  <Badge
                                    key={program.id}
                                    variant={isSelected ? "default" : "outline"}
                                    className={`cursor-pointer ${isSelected ? "bg-primary" : "hover:bg-muted"}`}
                                    onClick={() => {
                                      const current = field.value || [];
                                      if (isSelected) {
                                        field.onChange(current.filter((id: string) => id !== program.id));
                                        // Also clear teams from this program
                                        const programTeamIds = teams
                                          .filter((t: any) => t.programId === program.id)
                                          .map((t: any) => t.id);
                                        const currentTeams = form.getValues("teamIds") || [];
                                        form.setValue("teamIds", currentTeams.filter((id: number) => !programTeamIds.includes(id)));
                                      } else {
                                        field.onChange([...current, program.id]);
                                      }
                                    }}
                                    data-testid={`badge-program-${program.id}`}
                                  >
                                    {program.name}
                                  </Badge>
                                );
                              })}
                              {programs.length === 0 && (
                                <span className="text-muted-foreground text-sm">No programs available</span>
                              )}
                            </div>
                            <FormDescription>
                              Select programs to limit this award. Leave empty for all programs.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Team Selection - only show if programs are selected */}
                      {watchedProgramIds.length > 0 && (
                        <FormField
                          control={form.control}
                          name="teamIds"
                          render={({ field }) => {
                            const filteredTeams = teams.filter((team: any) => 
                              watchedProgramIds.includes(team.programId)
                            );
                            return (
                              <FormItem>
                                <FormLabel>Teams (Optional)</FormLabel>
                                <div className="flex flex-wrap gap-2 p-2 border rounded-lg min-h-[40px]">
                                  {filteredTeams.map((team: any) => {
                                    const isSelected = (field.value || []).includes(team.id);
                                    return (
                                      <Badge
                                        key={team.id}
                                        variant={isSelected ? "default" : "outline"}
                                        className={`cursor-pointer ${isSelected ? "bg-primary" : "hover:bg-muted"}`}
                                        onClick={() => {
                                          const current = field.value || [];
                                          if (isSelected) {
                                            field.onChange(current.filter((id: number) => id !== team.id));
                                          } else {
                                            field.onChange([...current, team.id]);
                                          }
                                        }}
                                        data-testid={`badge-team-${team.id}`}
                                      >
                                        {team.name}
                                      </Badge>
                                    );
                                  })}
                                  {filteredTeams.length === 0 && (
                                    <span className="text-muted-foreground text-sm">No teams in selected programs</span>
                                  )}
                                </div>
                                <FormDescription>
                                  Select specific teams or leave empty for all teams in selected programs.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            );
                          }}
                        />
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="eventFilter"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-event-filter">
                                    <SelectValue placeholder="Select event type..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="any">Any Event</SelectItem>
                                  <SelectItem value="game">Games Only</SelectItem>
                                  <SelectItem value="practice">Practices Only</SelectItem>
                                  <SelectItem value="skills">Skills Sessions</SelectItem>
                                  <SelectItem value="fnh">Friday Night Hoops</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="countMode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Count Mode</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-count-mode">
                                    <SelectValue placeholder="Select mode..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="total">Total (Cumulative)</SelectItem>
                                  <SelectItem value="streak">Streak (Consecutive)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number Required</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="e.g., 50"
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                value={field.value || ""}
                                data-testid="input-threshold"
                              />
                            </FormControl>
                            <FormDescription>How many check-ins are needed to earn this award?</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedTriggerCategory === "system" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <FormField
                        control={form.control}
                        name="referenceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Award</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-reference-award">
                                  <SelectValue placeholder="Select award to count..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {awardDefinitions
                                  .filter((a: any) => a.active && a.triggerCategory !== 'system')
                                  .map((a: any) => (
                                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>Which award needs to be collected multiple times?</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="threshold"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number Required</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                type="number"
                                placeholder="e.g., 10"
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                value={field.value || ""}
                                data-testid="input-system-threshold"
                              />
                            </FormControl>
                            <FormDescription>How many of that award are needed?</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedTriggerCategory === "time" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="threshold"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duration</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder="e.g., 5"
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  value={field.value || ""}
                                  data-testid="input-time-threshold"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="timeUnit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unit</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-time-unit">
                                    <SelectValue placeholder="Select unit..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="years">Years</SelectItem>
                                  <SelectItem value="months">Months</SelectItem>
                                  <SelectItem value="days">Days</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormDescription>Award after the user has been a member for this duration</FormDescription>
                    </div>
                  )}

                  {watchedTriggerCategory === "store" && (
                    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                      <FormField
                        control={form.control}
                        name="referenceId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product SKU or ID</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="e.g., program-foundation"
                                data-testid="input-store-reference"
                              />
                            </FormControl>
                            <FormDescription>The product identifier that triggers this award when purchased</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {watchedTriggerCategory === "manual" && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">
                        This award has no automatic triggers. Coaches or admins will assign it manually to players.
                      </p>
                    </div>
                  )}
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
              <SelectItem value="Gold">Gold</SelectItem>
              <SelectItem value="Purple">Purple</SelectItem>
              <SelectItem value="Blue">Blue</SelectItem>
              <SelectItem value="Green">Green</SelectItem>
              <SelectItem value="Grey">Grey</SelectItem>
              <SelectItem value="Special">Special</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-40" data-testid="filter-trigger">
              <SelectValue placeholder="Trigger" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Triggers</SelectItem>
              <SelectItem value="checkin">Check-in</SelectItem>
              <SelectItem value="system">Collection</SelectItem>
              <SelectItem value="time">Time</SelectItem>
              <SelectItem value="store">Store</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
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
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('name')}
                  data-testid="header-name"
                >
                  Name
                </TableHead>
                <TableHead>Image</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('tier')}
                  data-testid="header-tier"
                >
                  Tier
                </TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('triggerCategory')}
                  data-testid="header-trigger"
                >
                  Trigger
                </TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead 
                  className="cursor-pointer select-none hover:bg-gray-100" 
                  onClick={() => handleSort('active')}
                  data-testid="header-active"
                >
                  Active
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAwards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
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
                        <Award className="w-12 h-12 text-gray-300" data-testid={`icon-badge-${award.id}`} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getTierBadgeColor(award.tier)}>
                        {award.tier}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {getTriggerCategoryLabel(award.triggerCategory || 'manual')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {award.triggerCategory === 'checkin' && (
                        <span>{award.countMode === 'streak' ? 'Streak' : 'Total'}: {award.threshold || 0} {award.eventFilter || 'any'}</span>
                      )}
                      {award.triggerCategory === 'time' && (
                        <span>{award.threshold || 0} {award.timeUnit || 'years'}</span>
                      )}
                      {award.triggerCategory === 'store' && (
                        <span>SKU: {award.referenceId || '-'}</span>
                      )}
                      {award.triggerCategory === 'system' && (
                        <span>Collect {award.threshold || 0} of #{award.referenceId || '-'}</span>
                      )}
                      {(award.triggerCategory === 'manual' || !award.triggerCategory) && (
                        <span>-</span>
                      )}
                    </TableCell>
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

// Store Tab - Physical Goods/Inventory Management (Simplified)
function StoreTab({ organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const [selectedSuggestedPrograms, setSelectedSuggestedPrograms] = useState<string[]>([]);
  const [productImageUrl, setProductImageUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: allProducts, isLoading } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });

  // Filter to only show physical goods (productCategory = 'goods')
  const storeProducts = allProducts?.filter((p: any) => p.productCategory === 'goods') || [];
  
  // Filter to only show programs (services) for the suggested add-ons selector
  const programOptions = allProducts?.filter((p: any) => p.productCategory === 'service' && p.isActive !== false) || [];

  // Fetch waivers for waiver attachment option
  const { data: storeWaivers = [] } = useQuery<any[]>({
    queryKey: ["/api/waivers"],
  });

  const STORE_CATEGORIES = [
    { value: "gear", label: "Gear & Apparel" },
    { value: "training", label: "Training & Camps" },
    { value: "digital", label: "Digital Academy" },
  ];

  const form = useForm({
    resolver: zodResolver(z.object({
      organizationId: z.string(),
      name: z.string().min(1, "Product name is required"),
      description: z.string().optional(),
      price: z.number().min(0, "Price must be positive"),
      inventorySizes: z.array(z.string()).default([]),
      inventoryCount: z.number().optional(),
      shippingRequired: z.boolean().default(false),
      isActive: z.boolean().default(true),
      storeCategory: z.string().optional(),
      sessionCount: z.number().optional(),
      isRecurring: z.boolean().default(false),
      billingCycle: z.string().optional(),
      requiredWaivers: z.array(z.string()).default([]),
    })),
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      description: "",
      price: 0,
      inventorySizes: [] as string[],
      inventoryCount: 0,
      shippingRequired: false,
      isActive: true,
      storeCategory: "gear",
      sessionCount: undefined as number | undefined,
      isRecurring: false,
      billingCycle: "Monthly",
      requiredWaivers: [] as string[],
    },
  });

  const selectedStoreCategory = form.watch("storeCategory");
  const isRecurring = form.watch("isRecurring");

  const createProduct = useMutation({
    mutationFn: async (data: any) => {
      const isTraining = data.storeCategory === "training";
      const isGear = data.storeCategory === "gear";
      const payload = {
        ...data,
        organizationId: organization?.id,
        productCategory: "goods",
        type: data.isRecurring ? "Subscription" : (isTraining ? "Pack" : "One-Time"),
        billingCycle: data.isRecurring ? (data.billingCycle || "Monthly") : null,
        coverImageUrl: productImageUrl || null,
        tags: data.storeCategory ? [data.storeCategory] : [],
        sessionCount: isTraining ? (data.sessionCount || 0) : null,
        inventorySizes: isGear ? (data.inventorySizes || []) : [],
        inventoryCount: isGear ? (data.inventoryCount || 0) : null,
        shippingRequired: isGear ? (data.shippingRequired || false) : false,
        requiredWaivers: data.requiredWaivers || [],
      };
      let productId = editingProduct?.id;
      
      if (editingProduct) {
        await apiRequest("PATCH", `/api/programs/${editingProduct.id}`, payload);
      } else {
        const result = await apiRequest("POST", "/api/programs", payload) as any;
        productId = result.id;
      }
      
      // Save suggested programs for this product
      if (productId) {
        await apiRequest("PUT", `/api/products/${productId}/suggested-for-programs`, {
          programIds: selectedSuggestedPrograms
        });
      }
      
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: editingProduct ? "Product updated" : "Product created" });
      setIsDialogOpen(false);
      setEditingProduct(null);
      setSelectedSuggestedPrograms([]);
      setProductImageUrl("");
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to save product", variant: "destructive" });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/programs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Product deleted" });
      setDeleteConfirm(null);
    },
    onError: () => {
      toast({ title: "Failed to delete product", variant: "destructive" });
    },
  });

  const handleEdit = async (product: any) => {
    setEditingProduct(product);
    setProductImageUrl(product.coverImageUrl || "");
    form.reset({
      organizationId: product.organizationId,
      name: product.name,
      description: product.description || "",
      price: product.price || 0,
      inventorySizes: product.inventorySizes || [],
      inventoryCount: product.inventoryCount || 0,
      shippingRequired: product.shippingRequired || false,
      isActive: product.isActive ?? true,
      storeCategory: product.tags?.[0] || "gear",
      sessionCount: product.sessionCount,
      isRecurring: product.type === "Subscription",
      billingCycle: product.billingCycle || "Monthly",
      requiredWaivers: product.requiredWaivers || [],
    });
    
    // Fetch current suggested programs for this product
    try {
      const response = await fetch(`/api/products/${product.id}/suggested-for-programs`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSuggestedPrograms(data.programIds || []);
      } else {
        setSelectedSuggestedPrograms([]);
      }
    } catch {
      setSelectedSuggestedPrograms([]);
    }
    
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setSelectedSuggestedPrograms([]);
    setProductImageUrl("");
    form.reset({
      organizationId: organization?.id || "",
      name: "",
      description: "",
      price: 0,
      inventorySizes: [],
      inventoryCount: 0,
      shippingRequired: false,
      isActive: true,
      storeCategory: "gear",
      isRecurring: false,
      billingCycle: "Monthly",
      requiredWaivers: [],
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const response = await fetch('/api/upload/product-image', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to upload image');
      }
      
      const data = await response.json();
      setProductImageUrl(data.imageUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const formatPrice = (cents: number) => {
    if (!cents) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadStoreTemplate = () => {
    const csvContent = "Name,Type,Description,Price,Credits,Access Tag,Is Active\nTeam Jersey,goods,Official team jersey,4999,0,none,true\nWater Bottle,goods,Team branded bottle,1499,0,none,true";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadStoreData = () => {
    const csvHeaders = "Name,Type,Description,Price,Credits,Access Tag,Is Active";
    const csvRows = storeProducts.map((product: any) => {
      return [
        product.name || "",
        product.productCategory || "goods",
        product.description || "",
        product.price || 0,
        product.sessionCount || 0,
        product.accessTag || "none",
        product.isActive !== false ? "true" : "false"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'store-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUploadStore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 1 && values[0]) {
        try {
          await apiRequest("POST", "/api/programs", {
            organizationId: organization?.id,
            name: values[0],
            productCategory: "goods",
            type: "One-Time",
            description: values[2] || "",
            price: parseInt(values[3]) || 0,
            sessionCount: parseInt(values[4]) || 0,
            accessTag: values[5] || "none",
            isActive: values[6]?.toLowerCase() !== "false",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create product:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} products` });
    setIsBulkUploadOpen(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Store - Merchandise & Gear</CardTitle>
          <CardDescription>Manage physical products and inventory</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12" data-testid="loading-store">
            <BanterLoader />
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
            <CardTitle>Store - Merchandise & Gear</CardTitle>
            <CardDescription>Physical products like jerseys, equipment, and merchandise</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-store">
                  <Upload className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Upload Products</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Type, Description, Price, Credits, Access Tag, Is Active</p>
                  <Input
                    type="file"
                    accept=".csv"
                    onChange={handleBulkUploadStore}
                    data-testid="input-store-csv-upload"
                  />
                  <Button variant="outline" className="w-full" onClick={downloadStoreTemplate} data-testid="button-download-store-template">
                    <Download className="w-4 h-4 mr-2" />
                    Download CSV Template
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            
            <Button variant="outline" size="icon" title="Download Data" onClick={downloadStoreData} data-testid="button-download-store">
              <Download className="w-4 h-4" />
            </Button>
            
            <Button size="icon" title="Add Product" onClick={handleCreate} data-testid="button-create-store-product">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {storeProducts.length === 0 ? (
          <div className="text-center py-12" data-testid="empty-store">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600 font-medium">No merchandise yet</p>
            <p className="text-gray-500 text-sm mt-2">Add jerseys, equipment, or other physical products</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Image</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Sizes</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {storeProducts.map((product: any) => (
                <TableRow key={product.id} data-testid={`row-store-${product.id}`}>
                  <TableCell>
                    {product.coverImageUrl ? (
                      <img 
                        src={product.coverImageUrl} 
                        alt={product.name} 
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-store-name-${product.id}`}>
                      {product.name}
                    </div>
                    {product.description && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]">{product.description}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.tags?.[0] ? (
                      <Badge variant="outline" className="capitalize">
                        {STORE_CATEGORIES.find(c => c.value === product.tags[0])?.label || product.tags[0]}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatPrice(product.price)}
                    {product.type === "Subscription" && product.billingCycle && (
                      <span className="text-xs text-gray-500 block">/{product.billingCycle.toLowerCase()}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.type === "Subscription" ? (
                      <Badge className="bg-amber-100 text-amber-700 border-0">Subscription</Badge>
                    ) : product.type === "Pack" ? (
                      <Badge className="bg-blue-100 text-blue-700 border-0">Pack</Badge>
                    ) : (
                      <Badge variant="outline">One-Time</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.inventorySizes?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.inventorySizes.slice(0, 4).map((size: string) => (
                          <Badge key={size} variant="outline" className="text-xs">{size}</Badge>
                        ))}
                        {product.inventorySizes.length > 4 && (
                          <Badge variant="outline" className="text-xs">+{product.inventorySizes.length - 4}</Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {product.inventoryCount !== undefined && product.inventoryCount !== null ? (
                      <Badge variant={product.inventoryCount > 10 ? "outline" : product.inventoryCount > 0 ? "secondary" : "destructive"}>
                        {product.inventoryCount}
                      </Badge>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(product)}
                        data-testid={`button-edit-store-${product.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(product)}
                        data-testid={`button-delete-store-${product.id}`}
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

      {/* Simple Store Product Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-store">
              {editingProduct ? "Edit Product" : "Add New Product"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createProduct.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Team Jersey" {...field} data-testid="input-store-name" />
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
                      <Textarea placeholder="Official team jersey with custom name and number" {...field} data-testid="input-store-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="storeCategory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "gear"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-store-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STORE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-4">
                  {productImageUrl ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border">
                      <img src={productImageUrl} alt="Product" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setProductImageUrl("")}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      data-testid="input-product-image"
                    />
                    {uploadingImage && <p className="text-xs text-gray-500 mt-1">Uploading...</p>}
                  </div>
                </div>
              </div>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => {
                  const [displayPrice, setDisplayPrice] = useState(field.value ? (field.value / 100).toString() : "");
                  
                  useEffect(() => {
                    if (field.value !== undefined) {
                      setDisplayPrice(field.value > 0 ? (field.value / 100).toString() : "");
                    }
                  }, [editingProduct]);
                  
                  return (
                    <FormItem>
                      <FormLabel>Price ($)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01"
                          min="0"
                          placeholder="49.99"
                          data-testid="input-store-price"
                          value={displayPrice}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDisplayPrice(val);
                            if (val === "" || val === ".") {
                              field.onChange(0);
                            } else {
                              const parsed = parseFloat(val);
                              field.onChange(isNaN(parsed) ? 0 : Math.round(parsed * 100));
                            }
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Payment Options - Recurring Toggle and Billing Cycle */}
              <div className="space-y-4 border rounded-lg p-4 bg-gray-50">
                <Label className="text-sm font-medium">Payment Options</Label>
                
                <FormField
                  control={form.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-is-recurring"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Recurring Payment (Subscription)</FormLabel>
                    </FormItem>
                  )}
                />

                {isRecurring && (
                  <FormField
                    control={form.control}
                    name="billingCycle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Billing Cycle</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || "Monthly"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-billing-cycle">
                              <SelectValue placeholder="Select billing cycle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Weekly">Weekly</SelectItem>
                            <SelectItem value="Monthly">Monthly</SelectItem>
                            <SelectItem value="Quarterly">Quarterly (every 3 months)</SelectItem>
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

              {/* Apparel-specific fields: sizes, stock, shipping */}
              {selectedStoreCategory === "gear" && (
                <>
                  <FormField
                    control={form.control}
                    name="inventorySizes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Sizes</FormLabel>
                        <FormDescription>Select which sizes are available</FormDescription>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {["XS", "S", "M", "L", "XL", "2XL", "3XL", "YS", "YM", "YL"].map((size) => (
                            <div key={size} className="flex items-center space-x-1">
                              <Checkbox
                                checked={(field.value || []).includes(size)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    field.onChange([...current, size]);
                                  } else {
                                    field.onChange(current.filter((s: string) => s !== size));
                                  }
                                }}
                                data-testid={`checkbox-size-${size.toLowerCase()}`}
                              />
                              <Label className="text-sm font-normal">{size}</Label>
                            </div>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inventoryCount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Count</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="50"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value || "0"))}
                            value={field.value || ""}
                            data-testid="input-stock-count"
                          />
                        </FormControl>
                        <FormDescription>Leave empty for unlimited</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shippingRequired"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-shipping-required"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Shipping Required</FormLabel>
                        <FormDescription className="!mt-0 ml-2 text-xs">(vs. pickup only)</FormDescription>
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Training-specific fields: session count */}
              {selectedStoreCategory === "training" && (
                <FormField
                  control={form.control}
                  name="sessionCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Sessions</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="10"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value || "0"))}
                          value={field.value || ""}
                          data-testid="input-store-session-count"
                        />
                      </FormControl>
                      <FormDescription>Sessions remaining decreases with each check-in</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-product-active"
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Active (available for purchase)</FormLabel>
                  </FormItem>
                )}
              />

              {/* Required Waivers */}
              {storeWaivers.length > 0 && (
                <FormField
                  control={form.control}
                  name="requiredWaivers"
                  render={({ field }) => (
                    <FormItem className="pt-4 border-t">
                      <FormLabel>Required Waivers</FormLabel>
                      <div className="space-y-2 border rounded-md p-3">
                        {storeWaivers.map((waiver: any) => (
                          <div key={waiver.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={field.value?.includes(waiver.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  field.onChange([...current, waiver.id]);
                                } else {
                                  field.onChange(current.filter((id: string) => id !== waiver.id));
                                }
                              }}
                              data-testid={`checkbox-waiver-${waiver.id}`}
                            />
                            <span className="text-sm">{waiver.name}</span>
                          </div>
                        ))}
                      </div>
                      <FormDescription>Customers must sign these waivers before purchasing</FormDescription>
                    </FormItem>
                  )}
                />
              )}

              {/* Suggested Add-on for Programs */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Gift className="w-4 h-4" />
                  Suggest as Add-on for Programs
                </Label>
                <p className="text-xs text-gray-500 mb-2">
                  When selected, this product will appear as a suggested add-on during registration for these programs
                </p>
                {programOptions.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No programs available</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto border rounded-md p-2 space-y-2">
                    {programOptions.map((program: any) => (
                      <div key={program.id} className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedSuggestedPrograms.includes(program.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedSuggestedPrograms([...selectedSuggestedPrograms, program.id]);
                            } else {
                              setSelectedSuggestedPrograms(selectedSuggestedPrograms.filter(id => id !== program.id));
                            }
                          }}
                          data-testid={`checkbox-suggest-for-${program.id}`}
                        />
                        <Label className="text-sm font-normal cursor-pointer">{program.name}</Label>
                      </div>
                    ))}
                  </div>
                )}
                {selectedSuggestedPrograms.length > 0 && (
                  <p className="text-xs text-green-600">
                    This product will be suggested for {selectedSuggestedPrograms.length} program(s)
                  </p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProduct.isPending} data-testid="button-save-store-product">
                  {createProduct.isPending ? "Saving..." : (editingProduct ? "Update" : "Add Product")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600">
            Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteProduct.mutate(deleteConfirm.id)}
              disabled={deleteProduct.isPending}
              data-testid="button-confirm-delete-store"
            >
              {deleteProduct.isPending ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Programs Tab Component - Manages programs with social settings AND pricing
function ProgramsTab({ programs, teams, organization }: any) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<any>(null);
  const [deleteConfirmProgram, setDeleteConfirmProgram] = useState<any>(null);
  const tableRef = useDragScroll();

  const { data: waivers = [] } = useQuery<any[]>({
    queryKey: ["/api/waivers"],
  });

  // Fetch store products (goods) for add-on selection
  const { data: allProducts = [] } = useQuery<any[]>({
    queryKey: ["/api/programs"],
  });
  const storeProducts = allProducts.filter((p: any) => p.productCategory === 'goods' && p.isActive !== false);
  
  // State for selected add-ons
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

  // Fetch existing add-ons when editing
  const { data: existingAddOns = [] } = useQuery<any[]>({
    queryKey: ["/api/programs", editingProgram?.id, "suggested-add-ons"],
    queryFn: async () => {
      if (!editingProgram?.id) return [];
      const response = await fetch(`/api/programs/${editingProgram.id}/suggested-add-ons`);
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!editingProgram?.id,
  });

  // Update selected add-ons when editing an existing program
  useEffect(() => {
    if (existingAddOns.length > 0) {
      setSelectedAddOns(existingAddOns.map((a: any) => a.productId || a.product?.id));
    } else if (!editingProgram) {
      setSelectedAddOns([]);
    }
  }, [existingAddOns, editingProgram]);

  const handleViewProgram = (programId: string) => {
    navigate(`/admin/programs/${programId}`);
  };

  const form = useForm({
    defaultValues: {
      organizationId: organization?.id || "",
      name: "",
      description: "",
      type: "Subscription",
      price: 0,
      billingCycle: "Monthly",
      billingModel: "Per Player",
      durationDays: 90,
      allowInstallments: false,
      installments: 3,
      installmentPrice: 0,
      payInFullDiscount: 0,
      accessTag: "club_member",
      sessionCount: undefined as number | undefined,
      requiredWaivers: [] as string[],
      hasSubgroups: true,
      subgroupLabel: "Team",
      rosterVisibility: "members",
      chatMode: "two_way",
      isActive: true,
      productCategory: "service",
    },
  });

  const selectedType = form.watch("type");
  const selectedAccessTag = form.watch("accessTag");
  const allowInstallments = form.watch("allowInstallments");

  const createProgram = useMutation({
    mutationFn: async (data: any) => {
      const payload = {
        ...data,
        organizationId: organization?.id,
        productCategory: "service",
      };
      if (editingProgram) {
        const result = await apiRequest("PATCH", `/api/programs/${editingProgram.id}`, payload);
        // Save suggested add-ons
        if (selectedAddOns.length > 0 || existingAddOns.length > 0) {
          await apiRequest("PUT", `/api/programs/${editingProgram.id}/suggested-add-ons`, { productIds: selectedAddOns });
        }
        return result;
      }
      const result = await apiRequest("POST", "/api/programs", payload);
      // Save suggested add-ons for new program
      if (selectedAddOns.length > 0 && result?.id) {
        await apiRequest("PUT", `/api/programs/${result.id}/suggested-add-ons`, { productIds: selectedAddOns });
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        Array.isArray(query.queryKey) && query.queryKey.includes("program-memberships")
      });
      toast({ title: editingProgram ? "Program updated successfully" : "Program created successfully" });
      setIsDialogOpen(false);
      setEditingProgram(null);
      setSelectedAddOns([]);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to save program", variant: "destructive" });
    },
  });

  const deleteProgram = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/programs/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
      toast({ title: "Program deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete program", variant: "destructive" });
    },
  });

  const handleEdit = (program: any) => {
    setEditingProgram(program);
    form.reset({
      organizationId: program.organizationId,
      name: program.name,
      description: program.description || "",
      type: program.type || "Subscription",
      price: program.price || 0,
      billingCycle: program.billingCycle || "Monthly",
      billingModel: program.billingModel || "Per Player",
      durationDays: program.durationDays || 90,
      allowInstallments: program.allowInstallments || false,
      installments: program.installments || 3,
      installmentPrice: program.installmentPrice || 0,
      payInFullDiscount: program.payInFullDiscount || 0,
      accessTag: program.accessTag || "club_member",
      sessionCount: program.sessionCount,
      requiredWaivers: program.requiredWaivers || [],
      hasSubgroups: program.hasSubgroups ?? true,
      subgroupLabel: program.subgroupLabel || "Team",
      rosterVisibility: program.rosterVisibility || "members",
      chatMode: program.chatMode || "two_way",
      isActive: program.isActive ?? true,
      productCategory: "service",
    });
    setIsDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingProgram(null);
      setSelectedAddOns([]);
      form.reset();
    }
  };

  const getTeamsForProgram = (programId: string) => {
    return teams.filter((t: any) => t.programId === programId);
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadProgramTemplate = () => {
    const csvContent = "Name,Description,Type,Price,Billing Cycle,Access Tag,Duration Days,Is Active\nHigh School Club,Competitive basketball program,Subscription,15000,Monthly,club_member,365,true\n10-Session Pack,Credit-based training,Pack,5000,,pack_holder,,true";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programs-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadProgramsData = () => {
    const csvHeaders = "Name,Description,Type,Price,Billing Cycle,Access Tag,Duration Days,Is Active";
    const servicePrograms = programs.filter((p: any) => p.productCategory === 'service' || !p.productCategory);
    const csvRows = servicePrograms.map((program: any) => {
      return [
        program.name || "",
        program.description || "",
        program.type || "Subscription",
        program.price || 0,
        program.billingCycle || "",
        program.accessTag || "club_member",
        program.durationDays || "",
        program.isActive !== false ? "true" : "false"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programs-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUploadPrograms = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 1 && values[0]) {
        try {
          await apiRequest("POST", "/api/programs", {
            organizationId: organization?.id,
            name: values[0],
            description: values[1] || "",
            type: values[2] || "Subscription",
            price: parseInt(values[3]) || 0,
            billingCycle: values[4] || "Monthly",
            accessTag: values[5] || "club_member",
            durationDays: values[6] ? parseInt(values[6]) : undefined,
            isActive: values[7]?.toLowerCase() !== "false",
            productCategory: "service",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create program:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/programs"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} programs` });
    setIsBulkUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Programs</CardTitle>
          <CardDescription>Create and manage programs with teams/groups and social settings</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-programs">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Programs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Name, Description, Type, Price, Billing Cycle, Access Tag, Duration Days, Is Active</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUploadPrograms}
                  data-testid="input-program-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadProgramTemplate} data-testid="button-download-program-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadProgramsData} data-testid="button-download-programs">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Program" data-testid="button-create-program">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingProgram ? "Edit Program" : "Create New Program"}</DialogTitle>
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
                        <Input {...field} placeholder="High School Club" data-testid="input-program-name" />
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
                        <Textarea {...field} placeholder="Competitive basketball program for high school players" data-testid="input-program-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Pricing Section */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Pricing & Billing</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Product Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-program-type">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Subscription">Subscription (Recurring)</SelectItem>
                              <SelectItem value="One-Time">One-Time Payment</SelectItem>
                              <SelectItem value="Pack">Credit Pack</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => {
                        const [displayPrice, setDisplayPrice] = useState(field.value ? (field.value / 100).toString() : "");
                        
                        useEffect(() => {
                          if (field.value !== undefined) {
                            setDisplayPrice(field.value > 0 ? (field.value / 100).toString() : "");
                          }
                        }, [editingProgram]);
                        
                        return (
                          <FormItem>
                            <FormLabel>Price ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                placeholder="0.00" 
                                data-testid="input-program-price"
                                value={displayPrice}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setDisplayPrice(val);
                                  if (val === "" || val === ".") {
                                    field.onChange(0);
                                  } else {
                                    const parsed = parseFloat(val);
                                    field.onChange(isNaN(parsed) ? 0 : Math.round(parsed * 100));
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        );
                      }}
                    />
                  </div>

                  {selectedType === "Subscription" && (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <FormField
                        control={form.control}
                        name="billingCycle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Cycle</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-billing-cycle">
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

                      <FormField
                        control={form.control}
                        name="billingModel"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Billing Model</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <FormControl>
                                <SelectTrigger data-testid="select-billing-model">
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
                  )}

                  {selectedType === "One-Time" && (
                    <FormField
                      control={form.control}
                      name="durationDays"
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormLabel>Duration (Days)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              placeholder="90" 
                              data-testid="input-duration-days" 
                            />
                          </FormControl>
                          <FormDescription>How long access lasts after purchase</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedType === "Pack" && (
                    <FormField
                      control={form.control}
                      name="sessionCount"
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormLabel>Number of Sessions/Credits</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              placeholder="10" 
                              data-testid="input-session-count" 
                            />
                          </FormControl>
                          <FormDescription>Credits that get used per check-in</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="allowInstallments"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 mt-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-allow-installments"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Allow Installment Payments</FormLabel>
                      </FormItem>
                    )}
                  />

                  {allowInstallments && (
                    <div className="grid grid-cols-2 gap-3 mt-3 pl-6">
                      <FormField
                        control={form.control}
                        name="installments"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Number of Installments</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                placeholder="3" 
                                data-testid="input-installments" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="payInFullDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Pay-in-Full Discount (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                {...field} 
                                onChange={(e) => field.onChange(parseInt(e.target.value))}
                                placeholder="0" 
                                data-testid="input-pay-in-full-discount" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <FormField
                    control={form.control}
                    name="accessTag"
                    render={({ field }) => (
                      <FormItem className="mt-3">
                        <FormLabel>Access Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-access-tag">
                              <SelectValue placeholder="Select access type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="club_member">Club Member (Full Access)</SelectItem>
                            <SelectItem value="pack_holder">Pack Holder (Credit-Based)</SelectItem>
                            <SelectItem value="none">No Special Access</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>Determines user's status after purchase</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {waivers.length > 0 && (
                    <FormField
                      control={form.control}
                      name="requiredWaivers"
                      render={({ field }) => (
                        <FormItem className="mt-3">
                          <FormLabel>Required Waivers</FormLabel>
                          <div className="space-y-2 border rounded-md p-3 max-h-32 overflow-y-auto">
                            {waivers.map((waiver: any) => (
                              <div key={waiver.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={field.value?.includes(waiver.id)}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, waiver.id]);
                                    } else {
                                      field.onChange(current.filter((id: string) => id !== waiver.id));
                                    }
                                  }}
                                  data-testid={`checkbox-waiver-${waiver.id}`}
                                />
                                <span className="text-sm">{waiver.name}</span>
                              </div>
                            ))}
                          </div>
                          <FormDescription>Users must sign these waivers before enrolling</FormDescription>
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Suggested Add-ons Section */}
                  {storeProducts.length > 0 && (
                    <div className="mt-3">
                      <label className="text-sm font-medium">Suggested Add-ons</label>
                      <div className="space-y-2 border rounded-md p-3 mt-1 max-h-32 overflow-y-auto">
                        {storeProducts.map((product: any) => (
                          <div key={product.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedAddOns.includes(product.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAddOns([...selectedAddOns, product.id]);
                                } else {
                                  setSelectedAddOns(selectedAddOns.filter(id => id !== product.id));
                                }
                              }}
                              data-testid={`checkbox-addon-${product.id}`}
                            />
                            <span className="text-sm">{product.name}</span>
                            {product.price > 0 && (
                              <span className="text-xs text-gray-500">${(product.price / 100).toFixed(2)}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">These products will be suggested as add-ons during checkout</p>
                    </div>
                  )}
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3">Social Settings</h4>
                  
                  <FormField
                    control={form.control}
                    name="hasSubgroups"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0 mb-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-has-subgroups"
                          />
                        </FormControl>
                        <FormLabel className="!mt-0">Has Teams/Groups</FormLabel>
                        <FormDescription className="!mt-0 ml-2 text-xs">
                          Enable if this program has subgroups like teams or levels
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {form.watch("hasSubgroups") && (
                    <FormField
                      control={form.control}
                      name="subgroupLabel"
                      render={({ field }) => (
                        <FormItem className="mb-3">
                          <FormLabel>Subgroup Label</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subgroup-label">
                                <SelectValue placeholder="Select label" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Team">Team (e.g., Youth Club)</SelectItem>
                              <SelectItem value="Level">Level (e.g., Skills Academy)</SelectItem>
                              <SelectItem value="Group">Group (e.g., Private Training)</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="rosterVisibility"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Roster Visibility</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-roster-visibility">
                              <SelectValue placeholder="Select visibility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="public">Public - Anyone can see roster</SelectItem>
                            <SelectItem value="members">Members Only - Only program members</SelectItem>
                            <SelectItem value="hidden">Hidden - No roster visible</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="chatMode"
                    render={({ field }) => (
                      <FormItem className="mb-3">
                        <FormLabel>Chat Mode</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-chat-mode">
                              <SelectValue placeholder="Select chat mode" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="two_way">Two-Way Chat - Everyone can send messages</SelectItem>
                            <SelectItem value="announcements">Announcements Only - Coaches only</SelectItem>
                            <SelectItem value="disabled">Disabled - No chat</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-program-active"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Active Program</FormLabel>
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={createProgram.isPending} data-testid="button-submit-program">
                  {createProgram.isPending ? "Saving..." : editingProgram ? "Update Program" : "Create Program"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div ref={tableRef} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {programs.map((program: any) => {
                const programTeams = getTeamsForProgram(program.id);
                const formatPrice = (cents: number) => {
                  if (!cents) return "Free";
                  return `$${(cents / 100).toFixed(2)}`;
                };
                return (
                  <TableRow key={program.id} data-testid={`row-program-${program.id}`} className="cursor-pointer hover:bg-gray-50" onClick={() => handleViewProgram(program.id)}>
                    <TableCell className="font-medium" data-testid={`text-program-name-${program.id}`}>
                      <div>
                        <div className="text-blue-600 hover:underline">{program.name}</div>
                        {program.description && (
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">{program.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        program.type === "Subscription" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        program.type === "Pack" ? "bg-purple-50 text-purple-700 border-purple-200" :
                        "bg-green-50 text-green-700 border-green-200"
                      }>
                        {program.type || "One-Time"}
                      </Badge>
                      {program.billingCycle && program.type === "Subscription" && (
                        <div className="text-xs text-gray-500 mt-1">{program.billingCycle}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{formatPrice(program.price)}</div>
                      {program.billingModel && program.billingModel !== "Per Player" && (
                        <div className="text-xs text-gray-500">{program.billingModel}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {programTeams.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {programTeams.slice(0, 2).map((t: any) => (
                            <Badge key={t.id} variant="secondary" className="text-xs">
                              {t.name}
                            </Badge>
                          ))}
                          {programTeams.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{programTeams.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={program.isActive ? "default" : "secondary"}>
                        {program.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewProgram(program.id)}
                          data-testid={`button-view-program-${program.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Manage
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(program)}
                          data-testid={`button-edit-program-${program.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmProgram(program)}
                          data-testid={`button-delete-program-${program.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {programs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No programs yet. Create your first program to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      
      {/* Delete Program Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmProgram} onOpenChange={(open) => !open && setDeleteConfirmProgram(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmProgram?.name}"? This action cannot be undone. Programs with active enrollments cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteProgram.mutate(deleteConfirmProgram.id);
                setDeleteConfirmProgram(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Divisions Tab Component (kept for reference, no longer shown in tabs)
function DivisionsTab({ divisions, teams, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDivision, setEditingDivision] = useState<any>(null);
  const [deleteConfirmDivision, setDeleteConfirmDivision] = useState<any>(null);

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
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger data-testid="select-division-agerange">
                            <SelectValue placeholder="Select age range" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="4-5 years">4-5 years</SelectItem>
                          <SelectItem value="5-6 years">5-6 years</SelectItem>
                          <SelectItem value="6-7 years">6-7 years</SelectItem>
                          <SelectItem value="7-8 years">7-8 years</SelectItem>
                          <SelectItem value="8-9 years">8-9 years</SelectItem>
                          <SelectItem value="9-10 years">9-10 years</SelectItem>
                          <SelectItem value="10-11 years">10-11 years</SelectItem>
                          <SelectItem value="11-12 years">11-12 years</SelectItem>
                          <SelectItem value="12-13 years">12-13 years</SelectItem>
                          <SelectItem value="13-14 years">13-14 years</SelectItem>
                          <SelectItem value="14-15 years">14-15 years</SelectItem>
                          <SelectItem value="15-16 years">15-16 years</SelectItem>
                          <SelectItem value="16-17 years">16-17 years</SelectItem>
                          <SelectItem value="17-18 years">17-18 years</SelectItem>
                          <SelectItem value="18+ years">18+ years</SelectItem>
                        </SelectContent>
                      </Select>
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
                      onClick={() => setDeleteConfirmDivision(division)}
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
      
      {/* Delete Division Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmDivision} onOpenChange={(open) => !open && setDeleteConfirmDivision(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Division</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmDivision?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteDivision.mutate(deleteConfirmDivision.id);
                setDeleteConfirmDivision(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Messages Tab Component (formerly Notifications)
function NotificationsTab({ notifications, users, teams, divisions, organization }: any) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled' | 'recurring'>('immediate');
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState<any>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('daily');
  const [recurrenceTime, setRecurrenceTime] = useState('09:00');

  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm({
    resolver: zodResolver(insertNotificationSchema),
    defaultValues: {
      organizationId: organization?.id || "",
      types: ["message"],
      title: "",
      message: "",
      recipientTarget: "everyone",
      recipientUserIds: [],
      recipientRoles: [],
      recipientTeamIds: [],
      recipientDivisionIds: [],
      deliveryChannels: ["in_app"],
      sentBy: currentUser?.id || "",
      status: "pending",
    },
  });

  const recipientTarget = form.watch("recipientTarget");
  const deliveryChannels = form.watch("deliveryChannels") || [];

  const createMessage = useMutation({
    mutationFn: async (data: any) => {
      // For scheduled or recurring messages, use the campaign API
      if (scheduleType !== 'immediate') {
        // Validate scheduled campaigns require a date/time
        if (scheduleType === 'scheduled' && !scheduledAt) {
          throw new Error('Please select a date and time for the scheduled message');
        }
        if (scheduleType === 'recurring' && !recurrenceTime) {
          throw new Error('Please select a time for the recurring message');
        }
        
        // Convert datetime-local value to ISO string
        const scheduledAtISO = scheduleType === 'scheduled' && scheduledAt 
          ? new Date(scheduledAt).toISOString() 
          : undefined;
        
        const campaignData = {
          title: data.title,
          message: data.message,
          types: data.types || ['message'],
          recipientTarget: data.recipientTarget,
          recipientUserIds: data.recipientUserIds,
          recipientRoles: data.recipientRoles,
          recipientTeamIds: data.recipientTeamIds,
          recipientDivisionIds: data.recipientDivisionIds,
          deliveryChannels: data.deliveryChannels,
          scheduleType,
          scheduledAt: scheduledAtISO,
          recurrenceFrequency: scheduleType === 'recurring' ? recurrenceFrequency : undefined,
          recurrenceTime: scheduleType === 'recurring' ? recurrenceTime : undefined,
          timezone: 'America/Los_Angeles',
        };
        console.log('[Notification Form] Creating campaign:', campaignData);
        return await apiRequest("POST", "/api/notification-campaigns", campaignData);
      }
      
      // For immediate messages, use the regular notification API
      const notificationData = {
        ...data,
        sentBy: currentUser?.id || data.sentBy,
        organizationId: organization?.id || data.organizationId,
      };
      console.log('[Notification Form] Submitting notification:', notificationData);
      return await apiRequest("POST", "/api/admin/notifications", notificationData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notification-campaigns"] });
      const successMessage = scheduleType === 'immediate' ? "Message sent successfully" : "Message scheduled successfully";
      // Reset state before closing dialog to avoid stale values
      setScheduleType('immediate');
      setScheduledAt('');
      setRecurrenceFrequency('daily');
      setRecurrenceTime('09:00');
      form.reset();
      setIsDialogOpen(false);
      toast({ title: successMessage });
    },
    onError: (error: any) => {
      console.error('[Notification Form] Failed to send notification:', error);
      toast({ title: "Failed to send message", description: error.message || "Please try again", variant: "destructive" });
    },
  });

  const deleteMessage = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest("DELETE", `/api/admin/notifications/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
      toast({ title: "Message deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete message", variant: "destructive" });
    },
  });

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      form.reset();
      setScheduleType('immediate');
      setScheduledAt('');
      setRecurrenceFrequency('daily');
      setRecurrenceTime('09:00');
    }
  };

  const getRecipientDisplay = (notification: any) => {
    if (notification.recipientTarget === "everyone") {
      return "Everyone";
    }
    if (notification.recipientTarget === "users" && notification.recipientUserIds) {
      const count = notification.recipientUserIds.length;
      return `${count} user${count !== 1 ? 's' : ''}`;
    }
    if (notification.recipientTarget === "roles" && notification.recipientRoles) {
      const count = notification.recipientRoles.length;
      return `${count} role${count !== 1 ? 's' : ''}`;
    }
    if (notification.recipientTarget === "teams" && notification.recipientTeamIds) {
      const count = notification.recipientTeamIds.length;
      return `${count} team${count !== 1 ? 's' : ''}`;
    }
    if (notification.recipientTarget === "divisions" && notification.recipientDivisionIds) {
      const count = notification.recipientDivisionIds.length;
      return `${count} division${count !== 1 ? 's' : ''}`;
    }
    return "-";
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadNotificationTemplate = () => {
    const csvContent = "Title,Message,Delivery,Target Type,Scheduled Time\nWelcome Message,Welcome to our program!,in_app,everyone,\nPractice Reminder,Don't forget practice tomorrow,push,teams,";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notifications-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadNotificationsData = () => {
    const csvHeaders = "Title,Message,Delivery,Target Type,Scheduled Time";
    const csvRows = notifications.map((notification: any) => {
      return [
        notification.title || "",
        notification.message || "",
        notification.deliveryChannels?.join(";") || "in_app",
        notification.recipientTarget || "everyone",
        notification.scheduledAt || ""
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notifications-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUploadNotifications = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 2 && values[0]) {
        try {
          await apiRequest("POST", "/api/admin/notifications", {
            organizationId: organization?.id,
            title: values[0],
            message: values[1] || "",
            deliveryChannels: values[2]?.split(";") || ["in_app"],
            recipientTarget: values[3] || "everyone",
            types: ["message"],
            sentBy: currentUser?.id,
            status: "pending",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create notification:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/notifications"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} messages` });
    setIsBulkUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Manage Messages</CardTitle>
          <CardDescription>Send and manage messages to users</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-notifications">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Messages</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Title, Message, Delivery, Target Type, Scheduled Time</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUploadNotifications}
                  data-testid="input-notification-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadNotificationTemplate} data-testid="button-download-notification-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadNotificationsData} data-testid="button-download-notifications">
            <Download className="w-4 h-4" />
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button size="icon" title="Create Message" data-testid="button-create-notification">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Message</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => createMessage.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Message title" data-testid="input-notification-title" />
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
                        <Textarea {...field} placeholder="Message content..." rows={4} data-testid="input-notification-message" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="types"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Message Types</FormLabel>
                      <FormDescription>
                        Select one or more types for this message
                      </FormDescription>
                      <div className="border rounded-md p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="type-announcement"
                            checked={field.value?.includes("announcement")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "announcement"]);
                              } else {
                                field.onChange(current.filter((t: string) => t !== "announcement"));
                              }
                            }}
                            data-testid="checkbox-type-announcement"
                          />
                          <label
                            htmlFor="type-announcement"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Announcement
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="type-notification"
                            checked={field.value?.includes("notification")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "notification"]);
                              } else {
                                field.onChange(current.filter((t: string) => t !== "notification"));
                              }
                            }}
                            data-testid="checkbox-type-notification"
                          />
                          <label
                            htmlFor="type-notification"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Notification
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="type-message"
                            checked={field.value?.includes("message")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "message"]);
                              } else {
                                field.onChange(current.filter((t: string) => t !== "message"));
                              }
                            }}
                            data-testid="checkbox-type-message"
                          />
                          <label
                            htmlFor="type-message"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Message
                          </label>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} type(s)</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="recipientTarget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Send To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-recipient-target">
                            <SelectValue placeholder="Select recipients" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="everyone">Everyone</SelectItem>
                          <SelectItem value="users">Specific Users</SelectItem>
                          <SelectItem value="roles">Roles</SelectItem>
                          <SelectItem value="teams">Teams</SelectItem>
                          <SelectItem value="divisions">Divisions</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {recipientTarget === "users" && (
                  <FormField
                    control={form.control}
                    name="recipientUserIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Users</FormLabel>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {users.map((user: any) => (
                            <div key={user.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={(field.value as string[] | undefined)?.includes(user.id) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, user.id]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== user.id));
                                  }
                                }}
                                data-testid={`checkbox-recipient-${user.id}`}
                              />
                              <span className="text-sm">
                                {user.firstName} {user.lastName} ({user.role})
                              </span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} user(s)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recipientTarget === "roles" && (
                  <FormField
                    control={form.control}
                    name="recipientRoles"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Roles</FormLabel>
                        <div className="border rounded-md p-4 space-y-2">
                          {["admin", "coach", "player", "parent"].map((role) => (
                            <div key={role} className="flex items-center gap-2">
                              <Checkbox
                                checked={(field.value as string[] | undefined)?.includes(role) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, role]);
                                  } else {
                                    field.onChange(current.filter((r: string) => r !== role));
                                  }
                                }}
                                data-testid={`checkbox-role-${role}`}
                              />
                              <span className="text-sm capitalize">{role}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} role(s)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recipientTarget === "teams" && (
                  <FormField
                    control={form.control}
                    name="recipientTeamIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Teams</FormLabel>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {teams.map((team: any) => (
                            <div key={team.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={(field.value as string[] | undefined)?.includes(String(team.id)) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, String(team.id)]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== String(team.id)));
                                  }
                                }}
                                data-testid={`checkbox-team-${team.id}`}
                              />
                              <span className="text-sm">{team.name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} team(s)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {recipientTarget === "divisions" && (
                  <FormField
                    control={form.control}
                    name="recipientDivisionIds"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Divisions</FormLabel>
                        <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
                          {divisions.map((division: any) => (
                            <div key={division.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={(field.value as string[] | undefined)?.includes(String(division.id)) ?? false}
                                onCheckedChange={(checked) => {
                                  const current = (field.value as string[]) || [];
                                  if (checked) {
                                    field.onChange([...current, String(division.id)]);
                                  } else {
                                    field.onChange(current.filter((id: string) => id !== String(division.id)));
                                  }
                                }}
                                data-testid={`checkbox-division-${division.id}`}
                              />
                              <span className="text-sm">{division.name}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Selected: {field.value?.length || 0} division(s)</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="deliveryChannels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Channels</FormLabel>
                      <div className="border rounded-md p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value?.includes("in_app")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "in_app"]);
                              } else {
                                field.onChange(current.filter((ch: string) => ch !== "in_app"));
                              }
                            }}
                            data-testid="checkbox-channel-in-app"
                          />
                          <span className="text-sm">In-App</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value?.includes("email")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "email"]);
                              } else {
                                field.onChange(current.filter((ch: string) => ch !== "email"));
                              }
                            }}
                            data-testid="checkbox-channel-email"
                          />
                          <span className="text-sm">Email</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={field.value?.includes("push")}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, "push"]);
                              } else {
                                field.onChange(current.filter((ch: string) => ch !== "push"));
                              }
                            }}
                            data-testid="checkbox-channel-push"
                          />
                          <span className="text-sm">Push</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Selected: {field.value?.length || 0} channel(s)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border-t pt-4">
                  <FormLabel className="text-base font-semibold">Scheduling</FormLabel>
                  <div className="mt-3 space-y-3">
                    <Select 
                      value={scheduleType} 
                      onValueChange={(val) => setScheduleType(val as 'immediate' | 'scheduled' | 'recurring')}
                    >
                      <SelectTrigger data-testid="select-schedule-type">
                        <SelectValue placeholder="When to send" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Send Immediately</SelectItem>
                        <SelectItem value="scheduled">Schedule for Later</SelectItem>
                        <SelectItem value="recurring">Recurring (Daily/Weekly)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {scheduleType === 'scheduled' && (
                      <div className="space-y-2">
                        <Label>Send Date & Time</Label>
                        <Input 
                          type="datetime-local" 
                          value={scheduledAt}
                          onChange={(e) => setScheduledAt(e.target.value)}
                          data-testid="input-scheduled-at"
                        />
                      </div>
                    )}
                    
                    {scheduleType === 'recurring' && (
                      <div className="space-y-3 bg-gray-50 p-3 rounded-md">
                        <div className="space-y-2">
                          <Label>Frequency</Label>
                          <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                            <SelectTrigger data-testid="select-recurrence-frequency">
                              <SelectValue placeholder="How often" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Time of Day</Label>
                          <Input 
                            type="time" 
                            value={recurrenceTime}
                            onChange={(e) => setRecurrenceTime(e.target.value)}
                            data-testid="input-recurrence-time"
                          />
                        </div>
                        <p className="text-xs text-gray-500">
                          Messages will be sent at the specified time based on Pacific Time.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={createMessage.isPending} data-testid="button-submit-notification">
                  {createMessage.isPending ? (scheduleType === 'immediate' ? "Sending..." : "Scheduling...") : (scheduleType === 'immediate' ? "Send Message" : "Schedule Message")}
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
              <TableHead>Title</TableHead>
              <TableHead>Message</TableHead>
              <TableHead>Recipients</TableHead>
              <TableHead>Delivery Channels</TableHead>
              <TableHead>Sent Date</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell data-testid={`text-notification-recipients-${notification.id}`}>
                  {getRecipientDisplay(notification)}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {notification.deliveryChannels?.map((channel: string) => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel.replace('_', '-')}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {notification.sentAt ? new Date(notification.sentAt).toLocaleDateString() : "-"}
                </TableCell>
                <TableCell>
                  <Badge variant={notification.status === "sent" ? "default" : notification.status === "failed" ? "destructive" : "secondary"}>
                    {notification.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmMessage(notification)}
                    data-testid={`button-delete-notification-${notification.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      
      {/* Delete Message Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmMessage} onOpenChange={(open) => !open && setDeleteConfirmMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Message</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmMessage?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                deleteMessage.mutate(deleteConfirmMessage.id);
                setDeleteConfirmMessage(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// Settings Tab Component
function SettingsTab({ organization }: any) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  
  const { data: currentUser } = useQuery<any>({
    queryKey: ["/api/auth/me"],
  });
  
  const userEmail = currentUser?.email || "";
  const userRole = currentUser?.role || "";

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
  
  const handleDeleteAccount = async () => {
    if (confirmEmail !== userEmail) {
      toast({ title: "Email doesn't match", description: "Please enter your email exactly as shown.", variant: "destructive" });
      return;
    }
    
    setIsDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { 
        method: "POST", 
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail })
      });
      
      if (res.ok) {
        toast({ title: "Account deleted", description: "Your account has been deactivated successfully." });
        window.location.href = "/";
      } else {
        const data = await res.json();
        toast({ title: "Delete failed", description: data.message || "Could not delete account.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Delete failed", description: "An error occurred. Please try again.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      queryClient.clear();
      setLocation("/");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <div className="space-y-6">
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
      
      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Sign out or manage your account</CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleSignOut}
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
      
      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>Irreversible actions that affect your account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-red-700">Delete account</div>
              <div className="text-xs text-red-600">
                Your account will be deactivated and data removed.
                {(userRole === "parent" || userRole === "admin") && " This includes all linked player profiles."}
              </div>
            </div>
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              data-testid="button-admin-delete-account"
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Delete Your Account
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 font-medium mb-2">This action cannot be undone!</p>
              <ul className="text-xs text-red-700 list-disc list-inside space-y-1">
                <li>Your account will be deactivated</li>
                <li>Your login credentials will be removed</li>
                {(userRole === "parent" || userRole === "admin") && (
                  <li>All linked player profiles will also be deactivated</li>
                )}
                <li>Any active subscriptions will be cancelled</li>
                <li>You will lose access to all features and history</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                To confirm, please type your email address:
              </p>
              <p className="text-sm font-mono bg-gray-100 p-2 rounded">{userEmail}</p>
              <Input
                type="email"
                placeholder="Enter your email to confirm"
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="border-red-200 focus:border-red-500"
                data-testid="input-admin-confirm-email"
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false);
                setConfirmEmail("");
              }}
              disabled={isDeleting}
              data-testid="button-admin-cancel-delete"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteAccount}
              disabled={isDeleting || confirmEmail !== userEmail}
              data-testid="button-admin-confirm-delete"
            >
              {isDeleting ? "Deleting..." : "Permanently Delete Account"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WaiversTab({ organization }: any) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWaiver, setEditingWaiver] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);
  const { toast } = useToast();

  const { data: waivers = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/waivers'],
  });

  const form = useForm({
    defaultValues: {
      name: "",
      title: "",
      content: "",
      requiresScroll: true,
      requiresCheckbox: true,
      checkboxLabel: "I have read and agree to the terms above",
      isActive: true,
    },
  });

  const createWaiver = useMutation({
    mutationFn: async (data: any) => {
      if (editingWaiver) {
        return apiRequest('PATCH', `/api/waivers/${editingWaiver.id}`, data);
      } else {
        return apiRequest('POST', '/api/waivers', data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/waivers'] });
      setIsDialogOpen(false);
      setEditingWaiver(null);
      form.reset();
      toast({
        title: editingWaiver ? "Waiver updated" : "Waiver created",
        description: editingWaiver ? "The waiver has been updated successfully." : "The new waiver has been created.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save waiver",
        variant: "destructive",
      });
    },
  });

  const deleteWaiver = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/waivers/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/waivers'] });
      setDeleteConfirm(null);
      toast({
        title: "Waiver deleted",
        description: "The waiver has been deleted successfully.",
      });
    },
  });

  const handleEdit = (waiver: any) => {
    setEditingWaiver(waiver);
    form.reset({
      name: waiver.name || "",
      title: waiver.title || "",
      content: waiver.content || "",
      requiresScroll: waiver.requiresScroll ?? true,
      requiresCheckbox: waiver.requiresCheckbox ?? true,
      checkboxLabel: waiver.checkboxLabel || "I have read and agree to the terms above",
      isActive: waiver.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingWaiver(null);
    form.reset({
      name: "",
      title: "",
      content: "",
      requiresScroll: true,
      requiresCheckbox: true,
      checkboxLabel: "I have read and agree to the terms above",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  const downloadWaiverTemplate = () => {
    const csvContent = "Title,Content,Required,Is Active\nLiability Waiver,By signing this waiver you agree to...,true,true\nMedia Release,I consent to the use of my photo...,false,true";
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waivers-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const downloadWaiversData = () => {
    const csvHeaders = "Title,Content,Required,Is Active";
    const csvRows = waivers.map((waiver: any) => {
      return [
        waiver.title || waiver.name || "",
        waiver.content || "",
        waiver.requiresCheckbox ? "true" : "false",
        waiver.isActive !== false ? "true" : "false"
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(",");
    });
    const csvContent = [csvHeaders, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waivers-data.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBulkUploadWaivers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast({ title: "Invalid CSV", description: "File must have a header row and at least one data row", variant: "destructive" });
      return;
    }
    const dataLines = lines.slice(1);
    let successCount = 0;
    for (const line of dataLines) {
      const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      if (values.length >= 1 && values[0]) {
        try {
          await apiRequest("POST", "/api/waivers", {
            name: values[0],
            title: values[0],
            content: values[1] || "",
            requiresCheckbox: values[2]?.toLowerCase() !== "false",
            isActive: values[3]?.toLowerCase() !== "false",
            requiresScroll: true,
            checkboxLabel: "I have read and agree to the terms above",
          });
          successCount++;
        } catch (error) {
          console.error("Failed to create waiver:", error);
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/waivers"] });
    toast({ title: `Bulk upload complete`, description: `Created ${successCount} waivers` });
    setIsBulkUploadOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle data-testid="title-waivers">Waivers & Agreements</CardTitle>
          <CardDescription>Create and manage waivers that can be required for products</CardDescription>
        </div>
        <div className="flex gap-2">
          <Dialog open={isBulkUploadOpen} onOpenChange={setIsBulkUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" title="Bulk Upload" data-testid="button-bulk-upload-waivers">
                <Upload className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Bulk Upload Waivers</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Upload a CSV file with columns: Title, Content, Required, Is Active</p>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleBulkUploadWaivers}
                  data-testid="input-waiver-csv-upload"
                />
                <Button variant="outline" className="w-full" onClick={downloadWaiverTemplate} data-testid="button-download-waiver-template">
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV Template
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" size="icon" title="Download Data" onClick={downloadWaiversData} data-testid="button-download-waivers">
            <Download className="w-4 h-4" />
          </Button>
          
          <Button size="icon" title="Create Waiver" onClick={handleCreate} data-testid="button-create-waiver">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading waivers...</div>
        ) : waivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No waivers created yet. Click "Create Waiver" to add your first waiver.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Requirements</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {waivers.map((waiver: any) => (
                <TableRow key={waiver.id} data-testid={`row-waiver-${waiver.id}`}>
                  <TableCell>
                    <div className="font-medium" data-testid={`text-waiver-name-${waiver.id}`}>
                      {waiver.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-600" data-testid={`text-waiver-title-${waiver.id}`}>
                      {waiver.title}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {waiver.requiresScroll && (
                        <Badge variant="secondary" className="text-xs">Must Scroll</Badge>
                      )}
                      {waiver.requiresCheckbox && (
                        <Badge variant="secondary" className="text-xs">Checkbox</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={waiver.isActive ? "default" : "secondary"}
                      data-testid={`badge-waiver-status-${waiver.id}`}
                    >
                      {waiver.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(waiver)}
                        data-testid={`button-edit-waiver-${waiver.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteConfirm(waiver)}
                        disabled={waiver.isBuiltIn}
                        data-testid={`button-delete-waiver-${waiver.id}`}
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-waiver">
              {editingWaiver ? "Edit Waiver" : "Create New Waiver"}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => createWaiver.mutate(data))} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Internal Name *</FormLabel>
                    <FormDescription>A short name for internal reference (e.g., "AAU Membership")</FormDescription>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., Concussion Waiver"
                        data-testid="input-waiver-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Display Title *</FormLabel>
                    <FormDescription>The title shown to users during registration</FormDescription>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="e.g., CDC HEADSUP Concussion Information"
                        data-testid="input-waiver-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waiver Content *</FormLabel>
                    <FormDescription>The full text of the waiver or agreement</FormDescription>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        rows={12}
                        placeholder="Enter the full waiver text here..."
                        data-testid="input-waiver-content"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresScroll"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Require Scrolling</FormLabel>
                      <FormDescription>
                        User must scroll to the bottom before they can acknowledge
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-waiver-scroll"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requiresCheckbox"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Require Checkbox</FormLabel>
                      <FormDescription>
                        User must check a box to acknowledge
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-waiver-checkbox"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="checkboxLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Checkbox Label</FormLabel>
                    <FormDescription>The text shown next to the acknowledgment checkbox</FormDescription>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="I have read and agree to the terms above"
                        data-testid="input-waiver-checkbox-label"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active</FormLabel>
                      <FormDescription>
                        Only active waivers can be assigned to products
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-waiver-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel-waiver"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createWaiver.isPending}
                  data-testid="button-save-waiver"
                >
                  {createWaiver.isPending ? "Saving..." : (editingWaiver ? "Update Waiver" : "Create Waiver")}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Waiver</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
              Products using this waiver will no longer require it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-waiver">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteWaiver.mutate(deleteConfirm?.id)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-waiver"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
