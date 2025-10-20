import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar as CalendarIcon,
  Users,
  Award,
  Plus,
  Settings,
  Megaphone,
  Pencil,
  Trash2,
  ShieldCheck,
  UserPlus,
  MessageCircle,
  Eye,
  Ban,
  Check,
  X,
  Crown,
  Trophy,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  Edit,
  MoreVertical,
  TrendingUp,
  Activity,
  UserCheck,
  Star,
  Send,
  Lock,
  Unlock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { AWARDS } from "@/lib/awards.registry";

// Types
type AdminStats = {
  totalUsers: number;
  totalPlayers: number;
  totalParents: number;
  totalCoaches: number;
  totalTeams: number;
  totalEvents: number;
  totalAwards: number;
  recentActivity: number;
};

type UserAccount = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: "parent" | "player" | "coach" | "admin";
  profileImageUrl?: string;
  phoneNumber?: string;
  teamId?: number;
  teamName?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
};

type TeamData = {
  id: number;
  name: string;
  ageGroup: string;
  program?: string;
  coach?: UserAccount;
  players: UserAccount[];
  description?: string;
  isActive: boolean;
};

type EventData = {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  location?: string;
  eventType: "practice" | "game" | "skills" | "tournament" | "other";
  teamId?: number;
  teamName?: string;
  description?: string;
  attendanceCount?: number;
};

type ChatChannel = {
  id: string;
  name: string;
  type: "team" | "general" | "parent" | "coach";
  teamId?: number;
  participantCount: number;
  lastMessage?: {
    content: string;
    timestamp: string;
    sender: string;
  };
};

type UserAward = {
  id: string;
  userId: string;
  awardId: string;
  awardType: "badge" | "trophy";
  awardName: string;
  earnedAt: string;
  reason?: string;
};

// Animation variants
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const tabVariants = {
  hidden: { opacity: 0, x: 20 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// API helper
async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tab management
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tabFromUrl = urlParams.get('tab') as "overview" | "users" | "teams" | "events" | "awards" | "chats" | null;
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "teams" | "events" | "awards" | "chats">(
    tabFromUrl || "overview"
  );

  // Search and filter states
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "parent" | "player" | "coach">("all");
  const [teamSearch, setTeamSearch] = useState("");
  const [eventSearch, setEventSearch] = useState("");

  // Dialog states
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [showAwardDialog, setShowAwardDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editingTeam, setEditingTeam] = useState<TeamData | null>(null);
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null);

  // Form states
  const [newUser, setNewUser] = useState({
    firstName: "",
    lastName: "",
    email: "",
    userType: "player" as UserAccount["userType"],
    phoneNumber: "",
    teamId: "",
  });

  const [newTeam, setNewTeam] = useState({
    name: "",
    ageGroup: "",
    coachId: "",
    description: "",
  });

  const [newEvent, setNewEvent] = useState({
    title: "",
    startTime: "",
    endTime: "",
    location: "",
    eventType: "practice" as EventData["eventType"],
    teamId: "",
    description: "",
  });

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as any);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', newTab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Queries
  const adminStatsQuery = useQuery({
    queryKey: ["/api/admin/stats"],
    queryFn: () => apiRequest<AdminStats>("/api/admin/stats"),
  });

  const usersQuery = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiRequest<UserAccount[]>("/api/admin/users"),
  });

  const teamsQuery = useQuery({
    queryKey: ["/api/admin/teams"],
    queryFn: () => apiRequest<TeamData[]>("/api/admin/teams"),
  });

  const eventsQuery = useQuery({
    queryKey: ["/api/admin/events"],
    queryFn: () => apiRequest<EventData[]>("/api/admin/events"),
  });

  const chatChannelsQuery = useQuery({
    queryKey: ["/api/admin/chats"],
    queryFn: () => apiRequest<ChatChannel[]>("/api/admin/chats"),
  });

  const userAwardsQuery = useQuery({
    queryKey: ["/api/admin/user-awards"],
    queryFn: () => apiRequest<UserAward[]>("/api/admin/user-awards"),
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (userData: typeof newUser) => 
      apiRequest("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(userData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setShowUserDialog(false);
      setNewUser({
        firstName: "",
        lastName: "",
        email: "",
        userType: "player",
        phoneNumber: "",
        teamId: "",
      });
      toast({ title: "Success", description: "User created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create user",
        variant: "destructive" 
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, ...userData }: Partial<UserAccount> & { id: string }) =>
      apiRequest(`/api/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User updated successfully" });
      setEditingUser(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update user",
        variant: "destructive" 
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "Success", description: "User deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete user",
        variant: "destructive" 
      });
    },
  });

  const createTeamMutation = useMutation({
    mutationFn: (teamData: typeof newTeam) =>
      apiRequest("/api/admin/teams", {
        method: "POST",
        body: JSON.stringify(teamData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setShowTeamDialog(false);
      setNewTeam({
        name: "",
        ageGroup: "",
        coachId: "",
        description: "",
      });
      toast({ title: "Success", description: "Team created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create team",
        variant: "destructive" 
      });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: (eventData: typeof newEvent) =>
      apiRequest("/api/admin/events", {
        method: "POST",
        body: JSON.stringify(eventData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      setShowEventDialog(false);
      setNewEvent({
        title: "",
        startTime: "",
        endTime: "",
        location: "",
        eventType: "practice",
        teamId: "",
        description: "",
      });
      toast({ title: "Success", description: "Event created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create event",
        variant: "destructive" 
      });
    },
  });

  const awardBadgeMutation = useMutation({
    mutationFn: ({ userId, awardId, reason }: { userId: string; awardId: string; reason?: string }) =>
      apiRequest("/api/admin/award-badge", {
        method: "POST",
        body: JSON.stringify({ userId, awardId, reason }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-awards"] });
      toast({ title: "Success", description: "Award granted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to grant award",
        variant: "destructive" 
      });
    },
  });

  const removeAwardMutation = useMutation({
    mutationFn: (awardId: string) =>
      apiRequest(`/api/admin/user-awards/${awardId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/user-awards"] });
      toast({ title: "Success", description: "Award removed successfully" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to remove award",
        variant: "destructive" 
      });
    },
  });

  // Filter data
  const filteredUsers = usersQuery.data?.filter(user => {
    const matchesSearch = !userSearch || 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(userSearch.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchesFilter = userFilter === "all" || user.userType === userFilter;
    return matchesSearch && matchesFilter;
  }) || [];

  const filteredTeams = teamsQuery.data?.filter(team =>
    !teamSearch || team.name.toLowerCase().includes(teamSearch.toLowerCase())
  ) || [];

  const filteredEvents = eventsQuery.data?.filter(event =>
    !eventSearch || event.title.toLowerCase().includes(eventSearch.toLowerCase())
  ) || [];

  // Get coaches for team assignment
  const coaches = usersQuery.data?.filter(user => user.userType === "coach") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-800">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-orange-500 p-1">
            <div className="rounded-2xl bg-gradient-to-r from-slate-900/95 via-slate-900/90 to-slate-900/85 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
                  <p className="mt-2 text-slate-300">Complete administrative control over the UYP Basketball League</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className="bg-red-600 text-white">
                    <Crown className="mr-1 h-3 w-3" />
                    Administrator
                  </Badge>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.profileImageUrl} />
                    <AvatarFallback className="bg-red-600 text-white">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-slate-800/50 p-1">
            <TabsTrigger 
              value="overview" 
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-overview"
            >
              <TrendingUp className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-users"
            >
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="teams" 
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-teams"
            >
              <ShieldCheck className="h-4 w-4" />
              Teams
            </TabsTrigger>
            <TabsTrigger 
              value="events" 
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-events"
            >
              <CalendarIcon className="h-4 w-4" />
              Events
            </TabsTrigger>
            <TabsTrigger 
              value="awards" 
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-awards"
            >
              <Award className="h-4 w-4" />
              Awards
            </TabsTrigger>
            <TabsTrigger 
              value="chats" 
              className="flex items-center gap-2 data-[state=active]:bg-red-600 data-[state=active]:text-white"
              data-testid="tab-chats"
            >
              <MessageCircle className="h-4 w-4" />
              Chats
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <motion.div
              variants={tabVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              {/* Stats Cards */}
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <motion.div variants={cardVariants} initial="hidden" animate="show">
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-300">Total Users</p>
                          <p className="text-2xl font-bold text-white" data-testid="stat-total-users">
                            {adminStatsQuery.data?.totalUsers || 0}
                          </p>
                        </div>
                        <Users className="h-8 w-8 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="show">
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-300">Teams</p>
                          <p className="text-2xl font-bold text-white" data-testid="stat-teams">
                            {adminStatsQuery.data?.totalTeams || 0}
                          </p>
                        </div>
                        <ShieldCheck className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="show">
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-300">Events</p>
                          <p className="text-2xl font-bold text-white" data-testid="stat-events">
                            {adminStatsQuery.data?.totalEvents || 0}
                          </p>
                        </div>
                        <CalendarIcon className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div variants={cardVariants} initial="hidden" animate="show">
                  <Card className="border-slate-700 bg-slate-800/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-300">Awards Given</p>
                          <p className="text-2xl font-bold text-white" data-testid="stat-awards">
                            {adminStatsQuery.data?.totalAwards || 0}
                          </p>
                        </div>
                        <Award className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Recent Activity */}
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-white">System Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <h4 className="font-medium text-white">User Breakdown</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-slate-300">
                          <span>Players:</span>
                          <span data-testid="breakdown-players">
                            {adminStatsQuery.data?.totalPlayers || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Parents:</span>
                          <span data-testid="breakdown-parents">
                            {adminStatsQuery.data?.totalParents || 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Coaches:</span>
                          <span data-testid="breakdown-coaches">
                            {adminStatsQuery.data?.totalCoaches || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-white">Quick Actions</h4>
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setActiveTab("users")}
                          data-testid="button-manage-users"
                        >
                          Manage Users
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setActiveTab("events")}
                          data-testid="button-create-event"
                        >
                          Create Event
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => setActiveTab("awards")}
                          data-testid="button-award-badges"
                        >
                          Award Badges
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-6">
            <motion.div
              variants={tabVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-white">User Management</CardTitle>
                  <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="border-slate-600 bg-slate-700 text-white"
                        data-testid="input-user-search"
                      />
                      <Select value={userFilter} onValueChange={(value: any) => setUserFilter(value)}>
                        <SelectTrigger className="w-32 border-slate-600 bg-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-slate-600 bg-slate-700">
                          <SelectItem value="all">All Users</SelectItem>
                          <SelectItem value="player">Players</SelectItem>
                          <SelectItem value="parent">Parents</SelectItem>
                          <SelectItem value="coach">Coaches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700" data-testid="button-create-user">
                          <Plus className="mr-2 h-4 w-4" />
                          Create User
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-slate-600 bg-slate-800 text-white">
                        <DialogHeader>
                          <DialogTitle>Create New User</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="First Name"
                            value={newUser.firstName}
                            onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                            data-testid="input-new-user-firstname"
                          />
                          <Input
                            placeholder="Last Name"
                            value={newUser.lastName}
                            onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                            data-testid="input-new-user-lastname"
                          />
                          <Input
                            placeholder="Email"
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                            data-testid="input-new-user-email"
                          />
                          <Select
                            value={newUser.userType}
                            onValueChange={(value: any) => setNewUser({ ...newUser, userType: value })}
                          >
                            <SelectTrigger className="border-slate-600 bg-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-600 bg-slate-700">
                              <SelectItem value="player">Player</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="coach">Coach</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Phone Number (optional)"
                            value={newUser.phoneNumber}
                            onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                          />
                          <Button
                            onClick={() => createUserMutation.mutate(newUser)}
                            disabled={createUserMutation.isPending}
                            className="w-full bg-red-600 hover:bg-red-700"
                            data-testid="button-submit-create-user"
                          >
                            {createUserMutation.isPending ? "Creating..." : "Create User"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600">
                        <TableHead className="text-slate-300">User</TableHead>
                        <TableHead className="text-slate-300">Type</TableHead>
                        <TableHead className="text-slate-300">Contact</TableHead>
                        <TableHead className="text-slate-300">Team</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="border-slate-600" data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.profileImageUrl} />
                                <AvatarFallback className="bg-slate-700 text-white text-xs">
                                  {user.firstName?.[0]}{user.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-white">
                                  {user.firstName} {user.lastName}
                                </p>
                                <p className="text-sm text-slate-400">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.userType === "player"
                                  ? "bg-green-600 text-white"
                                  : user.userType === "coach"
                                  ? "bg-blue-600 text-white"
                                  : "bg-purple-600 text-white"
                              }
                            >
                              {user.userType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <div className="space-y-1 text-sm">
                              {user.phoneNumber && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {user.phoneNumber}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {user.teamName || "No team"}
                          </TableCell>
                          <TableCell>
                            <Badge className={user.isActive ? "bg-green-600" : "bg-gray-600"}>
                              {user.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingUser(user)}
                                data-testid={`button-edit-user-${user.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => 
                                  updateUserMutation.mutate({ 
                                    id: user.id, 
                                    isActive: !user.isActive 
                                  })
                                }
                                data-testid={`button-toggle-user-${user.id}`}
                              >
                                {user.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteUserMutation.mutate(user.id)}
                                className="text-red-400 hover:text-red-300"
                                data-testid={`button-delete-user-${user.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Teams Tab */}
          <TabsContent value="teams" className="mt-6">
            <motion.div
              variants={tabVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-white">Team Management</CardTitle>
                  <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                    <Input
                      placeholder="Search teams..."
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      className="border-slate-600 bg-slate-700 text-white"
                      data-testid="input-team-search"
                    />
                    <Dialog open={showTeamDialog} onOpenChange={setShowTeamDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700" data-testid="button-create-team">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Team
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-slate-600 bg-slate-800 text-white">
                        <DialogHeader>
                          <DialogTitle>Create New Team</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Team Name"
                            value={newTeam.name}
                            onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                            data-testid="input-new-team-name"
                          />
                          <Input
                            placeholder="Age Group (e.g., 12U, 14U)"
                            value={newTeam.ageGroup}
                            onChange={(e) => setNewTeam({ ...newTeam, ageGroup: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                          />
                          <Select
                            value={newTeam.coachId}
                            onValueChange={(value) => setNewTeam({ ...newTeam, coachId: value })}
                          >
                            <SelectTrigger className="border-slate-600 bg-slate-700">
                              <SelectValue placeholder="Select Coach" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-600 bg-slate-700">
                              {coaches.map(coach => (
                                <SelectItem key={coach.id} value={coach.id}>
                                  {coach.firstName} {coach.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Team Description (optional)"
                            value={newTeam.description}
                            onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                          />
                          <Button
                            onClick={() => createTeamMutation.mutate(newTeam)}
                            disabled={createTeamMutation.isPending}
                            className="w-full bg-red-600 hover:bg-red-700"
                            data-testid="button-submit-create-team"
                          >
                            {createTeamMutation.isPending ? "Creating..." : "Create Team"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredTeams.map((team) => (
                      <Card key={team.id} className="border-slate-600 bg-slate-700/50" data-testid={`card-team-${team.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg text-white">{team.name}</CardTitle>
                            {team.program === 'Youth-Club' ? (
                              <span className="text-sm text-gray-400">Youth Club</span>
                            ) : (
                              <Badge className="bg-blue-600 text-white">{team.ageGroup}</Badge>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                              <ShieldCheck className="h-4 w-4" />
                              Coach: {team.coach ? `${team.coach.firstName} ${team.coach.lastName}` : "No coach assigned"}
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Users className="h-4 w-4" />
                              Players: {team.players.length}
                            </div>
                            <div className="flex items-center gap-2 text-slate-300">
                              <Activity className="h-4 w-4" />
                              Status: {team.isActive ? "Active" : "Inactive"}
                            </div>
                          </div>
                          <div className="mt-4 flex space-x-2">
                            <Button size="sm" variant="outline" data-testid={`button-edit-team-${team.id}`}>
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" data-testid={`button-view-team-${team.id}`}>
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="mt-6">
            <motion.div
              variants={tabVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-white">Event Management</CardTitle>
                  <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-4">
                    <Input
                      placeholder="Search events..."
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      className="border-slate-600 bg-slate-700 text-white"
                      data-testid="input-event-search"
                    />
                    <Dialog open={showEventDialog} onOpenChange={setShowEventDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-red-600 hover:bg-red-700" data-testid="button-create-event">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Event
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border-slate-600 bg-slate-800 text-white max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Create New Event</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <Input
                            placeholder="Event Title"
                            value={newEvent.title}
                            onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                            data-testid="input-new-event-title"
                          />
                          <Select
                            value={newEvent.eventType}
                            onValueChange={(value: any) => setNewEvent({ ...newEvent, eventType: value })}
                          >
                            <SelectTrigger className="border-slate-600 bg-slate-700">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-600 bg-slate-700">
                              <SelectItem value="practice">Practice</SelectItem>
                              <SelectItem value="game">Game</SelectItem>
                              <SelectItem value="skills">Skills Training</SelectItem>
                              <SelectItem value="tournament">Tournament</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            placeholder="Location"
                            value={newEvent.location}
                            onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                          />
                          <Input
                            type="datetime-local"
                            value={newEvent.startTime}
                            onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                          />
                          <Input
                            type="datetime-local"
                            value={newEvent.endTime}
                            onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                          />
                          <Select
                            value={newEvent.teamId}
                            onValueChange={(value) => setNewEvent({ ...newEvent, teamId: value })}
                          >
                            <SelectTrigger className="border-slate-600 bg-slate-700">
                              <SelectValue placeholder="Select Team (optional)" />
                            </SelectTrigger>
                            <SelectContent className="border-slate-600 bg-slate-700">
                              {teamsQuery.data?.map(team => (
                                <SelectItem key={team.id} value={team.id.toString()}>
                                  {team.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Event Description (optional)"
                            value={newEvent.description}
                            onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                            className="border-slate-600 bg-slate-700"
                          />
                          <Button
                            onClick={() => createEventMutation.mutate(newEvent)}
                            disabled={createEventMutation.isPending}
                            className="w-full bg-red-600 hover:bg-red-700"
                            data-testid="button-submit-create-event"
                          >
                            {createEventMutation.isPending ? "Creating..." : "Create Event"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600">
                        <TableHead className="text-slate-300">Event</TableHead>
                        <TableHead className="text-slate-300">Type</TableHead>
                        <TableHead className="text-slate-300">Date & Time</TableHead>
                        <TableHead className="text-slate-300">Location</TableHead>
                        <TableHead className="text-slate-300">Team</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => (
                        <TableRow key={event.id} className="border-slate-600" data-testid={`row-event-${event.id}`}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-white">{event.title}</p>
                              {event.description && (
                                <p className="text-sm text-slate-400">{event.description}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                event.eventType === "game"
                                  ? "bg-red-600 text-white"
                                  : event.eventType === "practice"
                                  ? "bg-blue-600 text-white"
                                  : "bg-green-600 text-white"
                              }
                            >
                              {event.eventType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <div className="text-sm">
                              {format(parseISO(event.startTime), "MMM d, yyyy")}
                              <br />
                              {format(parseISO(event.startTime), "h:mm a")}
                              {event.endTime && ` - ${format(parseISO(event.endTime), "h:mm a")}`}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {event.location && (
                              <div className="flex items-center gap-1 text-sm">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {event.teamName || "All teams"}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-edit-event-${event.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                data-testid={`button-view-event-${event.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300"
                                data-testid={`button-delete-event-${event.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Awards Tab */}
          <TabsContent value="awards" className="mt-6">
            <motion.div
              variants={tabVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Award User Section */}
                <Card className="border-slate-700 bg-slate-800/50">
                  <CardHeader>
                    <CardTitle className="text-white">Award Management</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Select User</label>
                      <Select>
                        <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                          <SelectValue placeholder="Choose a user to award" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-600 bg-slate-700">
                          {usersQuery.data?.filter(u => u.userType === "player").map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.firstName} {user.lastName} ({user.teamName || "No team"})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Select Award</label>
                      <Select>
                        <SelectTrigger className="border-slate-600 bg-slate-700 text-white">
                          <SelectValue placeholder="Choose an award" />
                        </SelectTrigger>
                        <SelectContent className="border-slate-600 bg-slate-700 max-h-60">
                          {AWARDS.map(award => (
                            <SelectItem key={award.id} value={award.id}>
                              {award.kind === "Trophy" ? "🏆" : "🏅"} {award.name} ({award.tier})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-300">Reason (optional)</label>
                      <Textarea
                        placeholder="Why is this award being given?"
                        className="border-slate-600 bg-slate-700 text-white"
                      />
                    </div>

                    <Button className="w-full bg-red-600 hover:bg-red-700" data-testid="button-award-badge">
                      <Award className="mr-2 h-4 w-4" />
                      Grant Award
                    </Button>
                  </CardContent>
                </Card>

                {/* Current Awards Section */}
                <Card className="border-slate-700 bg-slate-800/50">
                  <CardHeader>
                    <CardTitle className="text-white">Recent Awards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {userAwardsQuery.data?.slice(0, 10).map((award) => (
                        <div key={award.id} className="flex items-center justify-between rounded-lg border border-slate-600 bg-slate-700/50 p-3" data-testid={`award-item-${award.id}`}>
                          <div className="flex items-center space-x-3">
                            <div className="text-2xl">
                              {award.awardType === "trophy" ? "🏆" : "🏅"}
                            </div>
                            <div>
                              <p className="font-medium text-white">{award.awardName}</p>
                              <p className="text-sm text-slate-400">
                                Awarded on {format(parseISO(award.earnedAt), "MMM d, yyyy")}
                              </p>
                              {award.reason && (
                                <p className="text-xs text-slate-500">{award.reason}</p>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeAwardMutation.mutate(award.id)}
                            className="text-red-400 hover:text-red-300"
                            data-testid={`button-remove-award-${award.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </TabsContent>

          {/* Chats Tab */}
          <TabsContent value="chats" className="mt-6">
            <motion.div
              variants={tabVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <Card className="border-slate-700 bg-slate-800/50">
                <CardHeader>
                  <CardTitle className="text-white">Chat Management</CardTitle>
                  <p className="text-slate-400">Monitor and manage all chat channels across the platform</p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {chatChannelsQuery.data?.map((channel) => (
                      <Card key={channel.id} className="border-slate-600 bg-slate-700/50" data-testid={`card-chat-${channel.id}`}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-lg text-white">
                              <MessageCircle className="h-5 w-5" />
                              {channel.name}
                            </CardTitle>
                            <Badge
                              className={
                                channel.type === "team"
                                  ? "bg-blue-600 text-white"
                                  : channel.type === "parent"
                                  ? "bg-purple-600 text-white"
                                  : channel.type === "coach"
                                  ? "bg-green-600 text-white"
                                  : "bg-gray-600 text-white"
                              }
                            >
                              {channel.type}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Users className="h-4 w-4" />
                              {channel.participantCount} participants
                            </div>
                            {channel.lastMessage && (
                              <div className="rounded-md bg-slate-800 p-2">
                                <p className="text-xs text-slate-400">Latest message:</p>
                                <p className="text-sm text-slate-200">
                                  "{channel.lastMessage.content.substring(0, 60)}..."
                                </p>
                                <p className="text-xs text-slate-500">
                                  by {channel.lastMessage.sender} • {format(parseISO(channel.lastMessage.timestamp), "MMM d, h:mm a")}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="mt-4 flex space-x-2">
                            <Button size="sm" variant="outline" data-testid={`button-view-chat-${channel.id}`}>
                              <Eye className="mr-1 h-4 w-4" />
                              View
                            </Button>
                            <Button size="sm" variant="outline" data-testid={`button-moderate-chat-${channel.id}`}>
                              <ShieldCheck className="mr-1 h-4 w-4" />
                              Moderate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}