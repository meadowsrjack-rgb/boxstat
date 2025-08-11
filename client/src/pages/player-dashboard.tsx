                                import { useAuth } from "@/hooks/useAuth";
                                import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
                                import { useLocation } from "wouter";
                                import { Card, CardContent } from "@/components/ui/card";
                                import { Button } from "@/components/ui/button";
                                import { Badge } from "@/components/ui/badge";
                                import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
                                import QRCode from "@/components/ui/qr-code";
                                import {
                                  QrCode,
                                  Bell,
                                  MoreHorizontal,
                                  TrendingUp,
                                  Play,
                                  Shirt,
                                  User,
                                  ChevronRight,
                                  Calendar as CalendarIcon,
                                  MessageCircle,
                                  Send,
                                  MapPin,
                                  UserCheck,
                                  Edit3,
                                  Save,
                                  Trophy,
                                  Award,
                                  CirclePlus,
                                } from "lucide-react";
                                import { useEffect, useMemo, useState } from "react";
                                import { format, isSameDay, isAfter, startOfDay } from "date-fns";
                                import { Input } from "@/components/ui/input";
                                import { useToast } from "@/hooks/use-toast";
                                import {
                                  Select,
                                  SelectContent,
                                  SelectItem,
                                  SelectTrigger,
                                  SelectValue,
                                } from "@/components/ui/select";

                                /* ===== “Wheel” option lists ===== */
                                const TEAM_OPTIONS = [
                                  "9U Black",
                                  "11U Black",
                                  "11U Red",
                                  "12U White",
                                  "12U Black",
                                  "Youth Girls",
                                  "13U Black",
                                  "14U Red",
                                  "Black Elite",
                                  "14U Black",
                                  "14U Gray",
                                  "HS Black",
                                  "HS Red",
                                  "HS Elite",
                                ];
                                const POSITION_OPTIONS = ["PG", "SG", "SF", "PF", "C"];
                                const AGE_OPTIONS = Array.from({ length: 20 }, (_, i) => `${i + 6}`); // 6–25 (adjust as needed)
                                const HEIGHT_OPTIONS = Array.from({ length: 37 }, (_, i) => {
                                  const inches = 48 + i; // 4'0" to ~7'0"
                                  const ft = Math.floor(inches / 12);
                                  const inch = inches % 12;
                                  return `${ft}'${inch}"`;
                                });
                                const WEIGHT_OPTIONS = Array.from({ length: 121 }, (_, i) => `${80 + i}`); // 80–200+
                                const JERSEY_OPTIONS = Array.from({ length: 100 }, (_, i) => `${i}`); // 0–99

                                /* ===== Types ===== */
                                type UypEvent = {
                                  id: string | number;
                                  title: string;
                                  startTime?: string;
                                  start_time?: string;
                                  eventType?: string;
                                };

                                type Task = {
                                  id: string | number;
                                  type: "ATTENDANCE" | "PROFILE_BIO" | "HOMEWORK" | "MODULE";
                                  title: string;
                                  status: "PENDING" | "COMPLETED";
                                  eventId?: string | number; // for ATTENDANCE
                                  moduleId?: string | number; // for MODULE
                                };

                                export default function PlayerDashboard({
                                  childId,
                                }: {
                                  childId?: number | null;
                                }) {
                                  const { user } = useAuth();
                                  const [showQR, setShowQR] = useState(false);
                                  const [activeTab, setActiveTab] = useState<
                                    "activity" | "video" | "team" | "profile"
                                  >("activity");
                                  const [newMessage, setNewMessage] = useState("");
                                  const [ws, setWs] = useState<WebSocket | null>(null);
                                  const { toast } = useToast();
                                  const queryClient = useQueryClient();
                                  const [location, setLocation] = useLocation();

                                  // Profile editing (Profile tab)
                                  const [isEditingProfile, setIsEditingProfile] = useState(false);
                                  const [editableProfile, setEditableProfile] = useState({
                                    teamName: "",
                                    age: "",
                                    height: "",
                                    weight: "",
                                    location: "",
                                    position: "",
                                    jerseyNumber: "",
                                    instagram: "",
                                    twitter: "",
                                    tiktok: "",
                                  });

                                  // ---- Early guard
                                  const currentUser = user; // demo mode removed
                                  if (!currentUser) {
                                    return (
                                      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
                                      </div>
                                    );
                                  }

                                  // ---- Data
                                  const { data: childProfiles } = useQuery({
                                    queryKey: ["/api/child-profiles", currentUser.id],
                                    enabled: !!currentUser.id,
                                  });

                                  const urlParams = new URLSearchParams(window.location.search);
                                  const selectedChildId =
                                    childId?.toString() || urlParams.get("childId") || undefined;

                                  const currentChild = Array.isArray(childProfiles)
                                    ? childProfiles.find((c: any) => c.id.toString() === selectedChildId) ||
                                      childProfiles[0]
                                    : null;

                                  const { data: userTeam } = useQuery<any>({
                                    queryKey: ["/api/users", currentUser.id, "team"],
                                    enabled: !!currentUser.id,
                                    staleTime: 5 * 60 * 1000,
                                    gcTime: 30 * 60 * 1000,
                                    refetchOnWindowFocus: false,
                                    refetchOnMount: false,
                                    refetchInterval: false,
                                  });

                                  const { data: userEvents = [] as UypEvent[] } = useQuery({
                                    queryKey: ["/api/users", currentUser.id, "events"],
                                    enabled: !!currentUser.id,
                                  });

                                  const { data: childEvents = [] as UypEvent[] } = useQuery({
                                    queryKey: ["/api/child-profiles", selectedChildId, "events"],
                                    enabled: !!selectedChildId,
                                  });

                                  const displayEvents: UypEvent[] =
                                    (childEvents?.length ? childEvents : userEvents) || [];

                                  // Player Tasks (non-clickable items; completion is trigger-based)
                                  const { data: tasks = [] as Task[] } = useQuery({
                                    queryKey: ["/api/users", currentUser.id, "tasks"],
                                    enabled: !!currentUser.id,
                                  });

                                  const completeTaskMutation = useMutation({
                                    mutationFn: async (taskId: string | number) => {
                                      const res = await fetch(`/api/tasks/${taskId}/complete`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        credentials: "include",
                                      });
                                      if (!res.ok) {
                                        const err = await res.json().catch(() => ({}));
                                        throw new Error(err.message || `Failed to complete task`);
                                      }
                                      return res.json();
                                    },
                                    onSuccess: () => {
                                      queryClient.invalidateQueries({
                                        queryKey: ["/api/users", currentUser.id, "tasks"],
                                      });
                                      toast({ title: "Task completed", description: "Nice work!" });
                                    },
                                    onError: (e) =>
                                      toast({
                                        title: "Could not complete task",
                                        description: e instanceof Error ? e.message : "Please try again.",
                                        variant: "destructive",
                                      }),
                                  });

                                  // Awards summary (counts + recent items)
                                  const { data: awardsSummary, isLoading: awardsLoading } = useQuery<any>({
                                    queryKey: ["/api/users", currentUser.id, "awards"],
                                    enabled: !!currentUser.id,
                                  });

                                  // Save profile mutation
                                  const updateProfile = useMutation({
                                    mutationFn: async (payload: any) => {
                                      const res = await fetch(`/api/users/${currentUser.id}/profile`, {
                                        method: "PATCH",
                                        headers: { "Content-Type": "application/json" },
                                        credentials: "include",
                                        body: JSON.stringify(payload),
                                      });
                                      if (!res.ok) throw new Error("Failed to save profile");
                                      return res.json();
                                    },
                                    onSuccess: () => {
                                      toast({ title: "Profile updated", description: "Changes saved." });
                                      queryClient.invalidateQueries({
                                        queryKey: ["/api/users", currentUser.id],
                                      });
                                      setIsEditingProfile(false);
                                    },
                                    onError: (e) =>
                                      toast({
                                        title: "Save failed",
                                        description: String(e),
                                        variant: "destructive",
                                      }),
                                  });

                                  // Team chat/messages
                                  const { data: teamMessages = [] } = useQuery<any[]>({
                                    queryKey: ["/api/teams", userTeam?.id, "messages"],
                                    enabled: !!userTeam?.id,
                                    refetchInterval: 30000,
                                  });

                                  const sendMessageMutation = useMutation({
                                    mutationFn: async (message: string) => {
                                      const response = await fetch(`/api/teams/${userTeam?.id}/messages`, {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        credentials: "include",
                                        body: JSON.stringify({ message, messageType: "text" }),
                                      });
                                      if (!response.ok) {
                                        const errorData = await response.json().catch(() => ({}));
                                        throw new Error(
                                          errorData.message || `HTTP ${response.status}: ${response.statusText}`
                                        );
                                      }
                                      return response.json();
                                    },
                                    onSuccess: () => {
                                      setNewMessage("");
                                      queryClient.invalidateQueries({
                                        queryKey: ["/api/teams", userTeam?.id, "messages"],
                                      });
                                      toast({
                                        title: "Message sent",
                                        description: "Your message has been sent to the team.",
                                      });
                                    },
                                    onError: (error) =>
                                      toast({
                                        title: "Failed to send message",
                                        description:
                                          error instanceof Error ? error.message : "Please try again.",
                                        variant: "destructive",
                                      }),
                                  });

                                  // Real-time triggers
                                  useEffect(() => {
                                    if (!currentUser?.id) return;

                                    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                                    const wsUrl = `${protocol}//${window.location.host}/ws`;
                                    const socket = new WebSocket(wsUrl);

                                    socket.onopen = () => {
                                      socket.send(
                                        JSON.stringify({
                                          type: "join",
                                          userId: currentUser.id,
                                          teamId: userTeam?.id,
                                        })
                                      );
                                      setWs(socket);
                                    };

                                    socket.onmessage = (event) => {
                                      try {
                                        const data = JSON.parse(event.data);
                                        if (data.type === "attendance_marked" && data.userId === currentUser.id)
                                          queryClient.invalidateQueries({
                                            queryKey: ["/api/users", currentUser.id, "tasks"],
                                          });
                                        if (data.type === "profile_updated" && data.userId === currentUser.id)
                                          queryClient.invalidateQueries({
                                            queryKey: ["/api/users", currentUser.id, "tasks"],
                                          });
                                        if (data.type === "module_completed" && data.userId === currentUser.id)
                                          queryClient.invalidateQueries({
                                            queryKey: ["/api/users", currentUser.id, "tasks"],
                                          });
                                        if (data.type === "new_team_message" && data.teamId === userTeam?.id)
                                          queryClient.invalidateQueries({
                                            queryKey: ["/api/teams", userTeam.id, "messages"],
                                          });
                                      } catch (e) {
                                        console.error("WS parse error", e);
                                      }
                                    };

                                    socket.onclose = () => setWs(null);
                                    return () => socket.close();
                                  }, [currentUser?.id, userTeam?.id, queryClient]);

                                  // Helpers
                                  const initials = `${(currentChild?.firstName || currentUser.firstName || "")
                                    .charAt(0)}${(currentChild?.lastName || currentUser.lastName || "")
                                    .charAt(0)}`.toUpperCase();

                                  const qrData =
                                    currentChild?.qrCodeData ||
                                    `UYP-PLAYER-${currentUser.id}-${userTeam?.id ?? "NA"}-${Date.now()}`;

                                  const todayEvents = useMemo(() => {
                                    const today = new Date();
                                    return displayEvents.filter((ev) => {
                                      const dt = new Date(ev.startTime || (ev as any).start_time);
                                      return isSameDay(dt, today);
                                    });
                                  }, [displayEvents]);

                                  const upcomingEvents = useMemo(() => {
                                    const start = startOfDay(new Date());
                                    return displayEvents
                                      .filter((ev) => isAfter(new Date(ev.startTime || (ev as any).start_time), start))
                                      .filter(
                                        (ev) =>
                                          !isSameDay(new Date(ev.startTime || (ev as any).start_time), new Date())
                                      )
                                      .slice(0, 3);
                                  }, [displayEvents]);

                                  // Seed editable values when entering edit mode
                                  const primeEditable = () => {
                                    setEditableProfile((prev) => ({
                                      ...prev,
                                      teamName: currentChild?.teamName || prev.teamName || "",
                                      age: prev.age || "",
                                      height: prev.height || "",
                                      weight: prev.weight || "",
                                      location: prev.location || "",
                                      position: currentChild?.position || prev.position || "",
                                      jerseyNumber:
                                        (currentChild?.jerseyNumber as any)?.toString() ||
                                        prev.jerseyNumber ||
                                        "",
                                      instagram: prev.instagram || "",
                                      twitter: prev.twitter || "",
                                      tiktok: prev.tiktok || "",
                                    }));
                                  };

                                  /* =================== UI =================== */
                                  return (
                                    <div className="min-h-screen bg-gray-50">
                                      {/* Top Bar */}
                                      <header className="bg-white shadow-sm">
                                        <div className="max-w-md mx-auto px-4 py-3">
                                          <div className="flex items-center justify-between">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => setShowQR((s) => !s)}
                                              className="h-12 w-12"
                                            >
                                              <QrCode className="h-12 w-12" />
                                            </Button>
                                            <div className="flex items-center space-x-3">
                                              <Button variant="ghost" size="icon" className="h-12 w-12">
                                                <Bell className="h-12 w-12" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-12 w-12"
                                                onClick={() => setLocation("/settings")}
                                              >
                                                <MoreHorizontal className="h-12 w-12" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </header>

                                      {/* QR Modal */}
                                      {showQR && (
                                        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
                                            <div className="text-center">
                                              <h3 className="text-lg font-bold text-gray-900 mb-4">
                                                Check-In QR Code
                                              </h3>
                                              <QRCode value={qrData} size={200} className="mx-auto mb-4" />
                                              <p className="text-gray-600 text-sm mb-2 font-medium">
                                                {currentChild?.firstName || currentUser.firstName}{" "}
                                                {currentChild?.lastName || currentUser.lastName}
                                              </p>
                                              <p className="text-gray-500 text-xs mb-4">
                                                {currentChild?.teamName
                                                  ? `${currentChild.teamAgeGroup} ${currentChild.teamName}`
                                                  : userTeam?.name || "Team Member"}
                                              </p>
                                              <Button onClick={() => setShowQR(false)} className="w-full">
                                                Close
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Main */}
                                      <main className="max-w-md mx-auto">
                                        {/* Avatar header */}
                                        <div className="px-6 py-6 text-center">
                                          <div className="flex justify-center mb-2">
                                            {/* Main Avatar - center */}
                                            <div className="relative">
                                              <Avatar className="h-20 w-20">
                                                <AvatarImage
                                                  src={currentUser.profileImageUrl || currentChild?.profileImageUrl}
                                                  alt="Player Avatar"
                                                />
                                                <AvatarFallback className="text-lg font-bold bg-gray-200">
                                                  {initials}
                                                </AvatarFallback>
                                              </Avatar>
                                              {/* + button for photo upload */}
                                              <Button
                                                size="icon"
                                                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white hover:bg-gray-50 text-red-600"
                                                onClick={() => setLocation("/photo-upload")}
                                              >
                                                <CirclePlus className="w-4 h-4" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Tabs */}
                                        <div className="px-6 mb-6">
                                          <div className="flex justify-between items-center">
                                            <TabButton label="activity" activeTab={activeTab} onClick={setActiveTab} Icon={TrendingUp} />
                                            <TabButton label="video" activeTab={activeTab} onClick={setActiveTab} Icon={Play} />
                                            <TabButton label="team" activeTab={activeTab} onClick={setActiveTab} Icon={Shirt} />
                                            <TabButton label="profile" activeTab={activeTab} onClick={setActiveTab} Icon={User} />
                                          </div>
                                        </div>

                                        {/* Tab content */}
                                        <div className="px-6">
                                          {/* Activity */}
                                          {activeTab === "activity" && (
                                            <div className="space-y-8">
                                              {/* Today */}
                                              <section className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                  <h3 className="text-lg font-bold text-gray-900">Today</h3>
                                                </div>

                                                <div className="space-y-3">
                                                  {todayEvents.length > 0 ? (
                                                    todayEvents.map((event) => (
                                                      <div
                                                        key={event.id}
                                                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                                                      >
                                                        <div className="flex-1">
                                                          <div className="flex items-center gap-2 mb-1">
                                                            <Badge className="bg-blue-100 text-blue-800 text-xs px-2 py-1">
                                                              {event.eventType || "Event"}
                                                            </Badge>
                                                          </div>
                                                          <h4 className="font-semibold text-gray-900 text-sm">
                                                            {event.title}
                                                          </h4>
                                                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                                                            <span className="flex items-center gap-1">
                                                              <CalendarIcon className="w-3 h-3" />
                                                              {format(
                                                                new Date(event.startTime || (event as any).start_time),
                                                                "h:mm a"
                                                              )}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div className="text-sm text-gray-500">No events today.</div>
                                                  )}
                                                </div>

                                                {/* Tasks */}
                                                <div className="space-y-2">
                                                  {tasks.length ? (
                                                    tasks
                                                      .filter((t) => t.status === "PENDING")
                                                      .map((t) => (
                                                        <div
                                                          key={t.id}
                                                          className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                                                        >
                                                          <div className="flex items-center gap-2">
                                                            <Badge variant="secondary" className="text-[10px]">
                                                              {t.type === "ATTENDANCE"
                                                                ? "Attendance"
                                                                : t.type === "PROFILE_BIO"
                                                                ? "Complete Bio"
                                                                : t.type === "HOMEWORK"
                                                                ? "Homework"
                                                                : "Module"}
                                                            </Badge>
                                                            <span className="text-sm text-gray-800">
                                                              {t.title}
                                                            </span>
                                                          </div>

                                                          {t.type === "HOMEWORK" ? (
                                                            <Button
                                                              size="sm"
                                                              onClick={() => completeTaskMutation.mutate(t.id)}
                                                              disabled={completeTaskMutation.isPending}
                                                              className="h-8"
                                                            >
                                                              Mark Done
                                                            </Button>
                                                          ) : (
                                                            <span className="text-[11px] text-gray-500">auto</span>
                                                          )}
                                                        </div>
                                                      ))
                                                  ) : (
                                                    <div className="text-sm text-gray-500">No tasks pending.</div>
                                                  )}
                                                </div>
                                              </section>

                                              {/* Upcoming */}
                                              <section className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                  <h3 className="text-lg font-bold text-gray-900">Upcoming</h3>
                                                  <Button
                                                    variant="ghost"
                                                    className="text-sm text-gray-600 hover:text-gray-800"
                                                    onClick={() => setLocation("/schedule")}
                                                  >
                                                    Full calendar
                                                    <ChevronRight className="h-4 w-4 ml-1" />
                                                  </Button>
                                                </div>

                                                <div className="space-y-3">
                                                  {upcomingEvents.length ? (
                                                    upcomingEvents.map((event) => (
                                                      <div
                                                        key={event.id}
                                                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm"
                                                      >
                                                        <div className="flex-1">
                                                          <div className="flex items-center gap-2 mb-1">
                                                            <Badge className="bg-gray-100 text-gray-800 text-xs px-2 py-1">
                                                              {event.eventType || "Event"}
                                                            </Badge>
                                                          </div>
                                                          <h4 className="font-semibold text-gray-900 text-sm">
                                                            {event.title}
                                                          </h4>
                                                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                                                            <span className="flex items-center gap-1">
                                                              <CalendarIcon className="w-3 h-3" />
                                                              {format(
                                                                new Date(event.startTime || (event as any).start_time),
                                                                "MMM d"
                                                              )}
                                                            </span>
                                                            <span className="flex items-center gap-1">
                                                              🕐{" "}
                                                              {format(
                                                                new Date(event.startTime || (event as any).start_time),
                                                                "h:mm a"
                                                              )}
                                                            </span>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))
                                                  ) : (
                                                    <div className="text-sm text-gray-500">No upcoming events.</div>
                                                  )}
                                                </div>
                                              </section>
                                            </div>
                                          )}

                                          {/* Video */}
                                          {activeTab === "video" && (
                                            <div className="flex flex-col items-center justify-center py-16 space-y-4">
                                              <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center">
                                                <Play className="h-8 w-8 text-gray-400" />
                                              </div>
                                              <h3 className="text-lg font-medium text-gray-900">No videos yet</h3>
                                              <p className="text-gray-500 text-center">
                                                Your completed activities will appear here.
                                              </p>
                                            </div>
                                          )}

                                          {/* Team */}
                                          {activeTab === "team" && (
                                            <div className="space-y-6">
                                              <div>
                                                <h2 className="text-xl font-bold text-gray-900 mb-4">My Team</h2>
                                                {userTeam ? (
                                                  <Card className="border-0 shadow-sm">
                                                    <CardContent className="p-4">
                                                      <div className="flex items-start space-x-4">
                                                        <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center">
                                                          <Shirt className="h-8 w-8 text-red-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                          <h3 className="font-bold text-gray-900 text-lg">
                                                            {userTeam.name}
                                                          </h3>
                                                          {userTeam.division && (
                                                            <p className="text-sm text-gray-600 mb-2">
                                                              {userTeam.division}
                                                            </p>
                                                          )}
                                                          <div className="space-y-1 text-sm text-gray-500">
                                                            {userTeam.coach && (
                                                              <div className="flex items-center space-x-2">
                                                                <UserCheck className="h-4 w-4" />
                                                                <span>{userTeam.coach}</span>
                                                              </div>
                                                            )}
                                                            {userTeam.location && (
                                                              <div className="flex items-center space-x-2">
                                                                <MapPin className="h-4 w-4" />
                                                                <span>{userTeam.location}</span>
                                                              </div>
                                                            )}
                                                            {userTeam.schedule && (
                                                              <div className="flex items-center space-x-2">
                                                                <CalendarIcon className="h-4 w-4" />
                                                                <span>{userTeam.schedule}</span>
                                                              </div>
                                                            )}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </CardContent>
                                                  </Card>
                                                ) : (
                                                  <div className="text-sm text-gray-500">No team assigned yet.</div>
                                                )}
                                              </div>

                                              {/* Team Messages */}
                                              <div>
                                                <h3 className="text-lg font-bold text-gray-900 mb-4">
                                                  Team Messages
                                                </h3>
                                                <Card className="border-0 shadow-sm">
                                                  <CardContent className="p-4">
                                                    <div className="space-y-4 max-h-64 overflow-y-auto">
                                                      {teamMessages.length > 0 ? (
                                                        teamMessages.map((message: any) => (
                                                          <div
                                                            key={message.id}
                                                            className="flex space-x-3 py-3 border-b border-gray-100 last:border-b-0"
                                                          >
                                                            <Avatar className="h-8 w-8">
                                                              <AvatarImage
                                                                src={
                                                                  message.sender?.profileImageUrl ||
                                                                  "/placeholder-player.jpg"
                                                                }
                                                              />
                                                              <AvatarFallback
                                                                className={
                                                                  message.sender?.userType === "admin"
                                                                    ? "bg-red-100 text-red-600"
                                                                    : "bg-blue-100 text-blue-600"
                                                                }
                                                              >
                                                                {message.sender?.firstName?.[0]}
                                                                {message.sender?.lastName?.[0]}
                                                              </AvatarFallback>
                                                            </Avatar>
                                                            <div className="flex-1 min-w-0">
                                                              <div className="flex items-center space-x-2">
                                                                <p className="text-sm font-medium text-gray-900">
                                                                  {message.sender?.firstName}{" "}
                                                                  {message.sender?.lastName}
                                                                </p>
                                                                {message.sender?.userType === "admin" && (
                                                                  <Badge
                                                                    variant="secondary"
                                                                    className="text-xs bg-red-100 text-red-600"
                                                                  >
                                                                    Coach
                                                                  </Badge>
                                                                )}
                                                                <p className="text-xs text-gray-500">
                                                                  {message.createdAt
                                                                    ? format(
                                                                        new Date(message.createdAt),
                                                                        "MMM d, h:mm a"
                                                                      )
                                                                    : "Now"}
                                                                </p>
                                                              </div>
                                                              <p className="text-sm text-gray-700 mt-1">
                                                                {message.message}
                                                              </p>
                                                            </div>
                                                          </div>
                                                        ))
                                                      ) : (
                                                        <div className="text-center py-8">
                                                          <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                                          <p className="text-gray-500 text-sm">
                                                            No messages yet. Start the conversation!
                                                          </p>
                                                        </div>
                                                      )}
                                                    </div>

                                                    {/* Message Input */}
                                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                                      <div className="flex space-x-2">
                                                        <Input
                                                          placeholder="Type a message..."
                                                          value={newMessage}
                                                          onChange={(e) => setNewMessage(e.target.value)}
                                                          className="flex-1"
                                                        />
                                                        <Button
                                                          size="icon"
                                                          disabled={
                                                            !newMessage.trim() || sendMessageMutation.isPending
                                                          }
                                                          onClick={() => {
                                                            if (newMessage.trim())
                                                              sendMessageMutation.mutate(newMessage.trim());
                                                          }}
                                                        >
                                                          <Send className="h-4 w-4" />
                                                        </Button>
                                                      </div>
                                                    </div>
                                                  </CardContent>
                                                </Card>
                                              </div>
                                            </div>
                                          )}

                                          {/* Profile */}
                                          {activeTab === "profile" && (
                                            <div className="space-y-6">
                                              {/* Personal Info */}
                                              <Card>
                                                <CardContent className="p-4">
                                                  <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                      Personal Information
                                                    </h3>
                                                    <Button
                                                      variant="ghost"
                                                      size="icon"
                                                      onClick={() => {
                                                        if (!isEditingProfile) primeEditable();
                                                        setIsEditingProfile((v) => !v);
                                                      }}
                                                      title={isEditingProfile ? "Save" : "Edit"}
                                                    >
                                                      {isEditingProfile ? <Save className="h-5 w-5" /> : <Edit3 className="h-5 w-5" />}
                                                    </Button>
                                                  </div>

                                                  {/* Fields */}
                                                  <div className="space-y-4">
                                                    {/* Name */}
                                                    <div className="flex items-center justify-between py-2">
                                                      <span className="text-sm font-medium text-gray-700">Name</span>
                                                      {isEditingProfile ? (
                                                        <div className="flex gap-2">
                                                          <Input
                                                            value={editableProfile.firstName || ""}
                                                            onChange={(e) =>
                                                              setEditableProfile((p) => ({ ...p, firstName: e.target.value }))
                                                            }
                                                            placeholder="First"
                                                            className="w-20 text-center"
                                                          />
                                                          <Input
                                                            value={editableProfile.lastName || ""}
                                                            onChange={(e) =>
                                                              setEditableProfile((p) => ({ ...p, lastName: e.target.value }))
                                                            }
                                                            placeholder="Last"
                                                            className="w-24 text-center"
                                                          />
                                                        </div>
                                                      ) : (
                                                        <span className="text-sm text-gray-600">
                                                          {(editableProfile.firstName || currentChild?.firstName || "") + " " + (editableProfile.lastName || currentChild?.lastName || "") || "—"}
                                                        </span>
                                                      )}
                                                    </div>

                                                    {/* Team */}
                                                    <Row
                                                      label="Team"
                                                      editing={isEditingProfile}
                                                      viewValue={editableProfile.teamName || currentChild?.teamName || "—"}
                                                      editControl={
                                                        <Select
                                                          value={editableProfile.teamName || ""}
                                                          onValueChange={(v) =>
                                                            setEditableProfile((p) => ({ ...p, teamName: v }))
                                                          }
                                                        >
                                                          <SelectTrigger className="w-48 text-right">
                                                            <SelectValue placeholder="Select team" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {TEAM_OPTIONS.map((t) => (
                                                              <SelectItem key={t} value={t}>
                                                                {t}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      }
                                                    />

                                                    {/* Age */}
                                                    <Row
                                                      label="Age"
                                                      editing={isEditingProfile}
                                                      viewValue={editableProfile.age || "—"}
                                                      editControl={
                                                        <Select
                                                          value={editableProfile.age || ""}
                                                          onValueChange={(v) =>
                                                            setEditableProfile((p) => ({ ...p, age: v }))
                                                          }
                                                        >
                                                          <SelectTrigger className="w-48 text-right">
                                                            <SelectValue placeholder="Age" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {AGE_OPTIONS.map((a) => (
                                                              <SelectItem key={a} value={a}>
                                                                {a}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      }
                                                    />

                                                    {/* Height */}
                                                    <Row
                                                      label="Height"
                                                      editing={isEditingProfile}
                                                      viewValue={editableProfile.height || "—"}
                                                      editControl={
                                                        <Select
                                                          value={editableProfile.height || ""}
                                                          onValueChange={(v) =>
                                                            setEditableProfile((p) => ({ ...p, height: v }))
                                                          }
                                                        >
                                                          <SelectTrigger className="w-48 text-right">
                                                            <SelectValue placeholder="Height" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {HEIGHT_OPTIONS.map((h) => (
                                                              <SelectItem key={h} value={h}>
                                                                {h}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      }
                                                    />

                                                    {/* Weight */}
                                                    <Row
                                                      label="Weight"
                                                      editing={isEditingProfile}
                                                      viewValue={
                                                        editableProfile.weight
                                                          ? `${editableProfile.weight} lbs`
                                                          : "—"
                                                      }
                                                      editControl={
                                                        <Select
                                                          value={editableProfile.weight || ""}
                                                          onValueChange={(v) =>
                                                            setEditableProfile((p) => ({ ...p, weight: v }))
                                                          }
                                                        >
                                                          <SelectTrigger className="w-48 text-right">
                                                            <SelectValue placeholder="Weight" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {WEIGHT_OPTIONS.map((w) => (
                                                              <SelectItem key={w} value={w}>
                                                                {w} lbs
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      }
                                                    />

                                                    {/* City (type-ahead) */}
                                                    <Row
                                                      label="Location"
                                                      editing={isEditingProfile}
                                                      viewValue={editableProfile.location || "—"}
                                                      editControl={
                                                        <CityTypeahead
                                                          value={editableProfile.location}
                                                          onChange={(city) =>
                                                            setEditableProfile((p) => ({ ...p, location: city }))
                                                          }
                                                        />
                                                      }
                                                    />

                                                    {/* Position */}
                                                    <Row
                                                      label="Position"
                                                      editing={isEditingProfile}
                                                      viewValue={editableProfile.position || currentChild?.position || "—"}
                                                      editControl={
                                                        <Select
                                                          value={editableProfile.position || ""}
                                                          onValueChange={(v) =>
                                                            setEditableProfile((p) => ({ ...p, position: v }))
                                                          }
                                                        >
                                                          <SelectTrigger className="w-48 text-right">
                                                            <SelectValue placeholder="Position" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {POSITION_OPTIONS.map((p) => (
                                                              <SelectItem key={p} value={p}>
                                                                {p}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      }
                                                    />

                                                    {/* Jersey # */}
                                                    <Row
                                                      label="Jersey Number"
                                                      editing={isEditingProfile}
                                                      viewValue={editableProfile.jerseyNumber || (currentChild?.jerseyNumber as any)?.toString() || "—"}
                                                      editControl={
                                                        <Select
                                                          value={editableProfile.jerseyNumber || ""}
                                                          onValueChange={(v) =>
                                                            setEditableProfile((p) => ({ ...p, jerseyNumber: v }))
                                                          }
                                                        >
                                                          <SelectTrigger className="w-48 text-right">
                                                            <SelectValue placeholder="#" />
                                                          </SelectTrigger>
                                                          <SelectContent>
                                                            {JERSEY_OPTIONS.map((n) => (
                                                              <SelectItem key={n} value={n}>
                                                                {n}
                                                              </SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      }
                                                    />
                                                  </div>


                                                </CardContent>
                                              </Card>

                                              {/* Trophies & Badges (bottom of Profile tab) */}
                                              <Card className="border-0 shadow-sm">
                                                <CardContent className="p-4">
                                                  <div className="flex items-center justify-between mb-3">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                      Trophies &amp; Badges
                                                    </h3>
                                                    <Button
                                                      variant="ghost"
                                                      size="sm"
                                                      className="text-sm text-gray-600 hover:text-gray-800"
                                                      onClick={() => setLocation("/trophies-badges")}
                                                    >
                                                      View all <ChevronRight className="h-4 w-4 ml-1" />
                                                    </Button>
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-3">
                                                    <div className="rounded-xl bg-white ring-1 ring-gray-100 shadow-sm p-4 flex items-center gap-3">
                                                      <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                                                        <Trophy className="w-5 h-5 text-yellow-700" />
                                                      </div>
                                                      <div>
                                                        <div className="text-xs text-gray-500">Trophies</div>
                                                        <div className="text-xl font-bold text-gray-900">
                                                          {awardsLoading ? "—" : awardsSummary?.trophiesCount ?? 0}
                                                        </div>
                                                      </div>
                                                    </div>

                                                    <div className="rounded-xl bg-white ring-1 ring-gray-100 shadow-sm p-4 flex items-center gap-3">
                                                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <Award className="w-5 h-5 text-blue-700" />
                                                      </div>
                                                      <div>
                                                        <div className="text-xs text-gray-500">Badges</div>
                                                        <div className="text-xl font-bold text-gray-900">
                                                          {awardsLoading ? "—" : awardsSummary?.badgesCount ?? 0}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>

                                                  {/* Recent items */}
                                                  <div className="mt-4">
                                                    <div className="text-xs text-gray-500 mb-2">Recent awards</div>
                                                    <div className="flex flex-wrap gap-2">
                                                      {awardsLoading && (
                                                        <>
                                                          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                                                          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                                                          <div className="w-9 h-9 rounded-full bg-gray-100 animate-pulse" />
                                                        </>
                                                      )}

                                                      {!awardsLoading &&
                                                        (
                                                          [
                                                            ...(awardsSummary?.recentTrophies ?? [])
                                                              .slice(0, 3)
                                                              .map((a: any) => ({ ...a, _kind: "trophy" })),
                                                            ...(awardsSummary?.recentBadges ?? [])
                                                              .slice(0, 3)
                                                              .map((a: any) => ({ ...a, _kind: "badge" })),
                                                          ] as any[]
                                                        )
                                                          .slice(0, 6)
                                                          .map((item: any) => (
                                                            <div
                                                              key={`${item._kind}-${item.id ?? item.name}`}
                                                              className="w-9 h-9 rounded-full bg-gray-50 ring-1 ring-gray-100 flex items-center justify-center"
                                                              title={item.name}
                                                            >
                                                              {item.iconUrl ? (
                                                                // eslint-disable-next-line @next/next/no-img-element
                                                                <img
                                                                  src={item.iconUrl}
                                                                  alt={item.name}
                                                                  className="w-7 h-7 rounded-full object-cover"
                                                                />
                                                              ) : item._kind === "trophy" ? (
                                                                <Trophy className="w-5 h-5 text-yellow-700" />
                                                              ) : (
                                                                <Award className="w-5 h-5 text-blue-700" />
                                                              )}
                                                            </div>
                                                          ))}

                                                      {!awardsLoading &&
                                                        !(
                                                          (awardsSummary?.recentTrophies?.length ?? 0) ||
                                                          (awardsSummary?.recentBadges?.length ?? 0)
                                                        ) && (
                                                          <div className="text-sm text-gray-500">
                                                            No recent awards yet.
                                                          </div>
                                                        )}
                                                    </div>
                                                  </div>
                                                </CardContent>
                                              </Card>

                                              {/* Skills Progress */}
                                              <Card>
                                                <CardContent className="p-4">
                                                  <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-lg font-semibold text-gray-900">
                                                      Skills Progress
                                                    </h3>
                                                  </div>

                                                  <div className="space-y-4">
                                                    {/* Shooting */}
                                                    <div className="space-y-2">
                                                      <div className="flex justify-between text-sm">
                                                        <span className="font-medium text-gray-700">SHOOTING</span>
                                                        <span className="text-red-600 font-semibold">72%</span>
                                                      </div>
                                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                          className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                                                          style={{ width: '72%' }}
                                                        />
                                                      </div>
                                                    </div>

                                                    {/* Dribbling */}
                                                    <div className="space-y-2">
                                                      <div className="flex justify-between text-sm">
                                                        <span className="font-medium text-gray-700">DRIBBLING</span>
                                                        <span className="text-red-600 font-semibold">85%</span>
                                                      </div>
                                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                          className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                                                          style={{ width: '85%' }}
                                                        />
                                                      </div>
                                                    </div>

                                                    {/* Passing */}
                                                    <div className="space-y-2">
                                                      <div className="flex justify-between text-sm">
                                                        <span className="font-medium text-gray-700">PASSING</span>
                                                        <span className="text-red-600 font-semibold">68%</span>
                                                      </div>
                                                      <div className="w-full bg-gray-200 rounded-full h-2">
                                                        <div 
                                                          className="bg-red-600 h-2 rounded-full transition-all duration-300" 
                                                          style={{ width: '68%' }}
                                                        />
                                                      </div>
                                                    </div>

                                                    {/* View All Button */}
                                                    <div className="pt-2">
                                                      <Button 
                                                        variant="outline" 
                                                        className="w-full text-red-600 border-red-600 hover:bg-red-50"
                                                        onClick={() => setLocation("/skills")}
                                                      >
                                                        View All Skills
                                                        <ChevronRight className="w-4 h-4 ml-1" />
                                                      </Button>
                                                    </div>
                                                  </div>
                                                </CardContent>
                                              </Card>
                                            </div>
                                          )}
                                        </div>
                                      </main>
                                    </div>
                                  );
                                }

                                /* ===== Small components ===== */

                                function TabButton({
                                  label,
                                  activeTab,
                                  onClick,
                                  Icon,
                                }: {
                                  label: "activity" | "video" | "team" | "profile";
                                  activeTab: string;
                                  onClick: (t: any) => void;
                                  Icon: any;
                                }) {
                                  const active = activeTab === label;
                                  return (
                                    <button
                                      onClick={() => onClick(label as any)}
                                      className={`flex flex-col items-center space-y-3 py-4 px-3 ${
                                        active ? "text-red-600" : "text-gray-400"
                                      }`}
                                      style={{ color: active ? "#d82428" : undefined }}
                                    >
                                      <Icon className="h-6 w-6" />
                                      <div
                                        className={`h-1 w-12 rounded-full transition-all duration-200 ${
                                          active ? "opacity-100" : "opacity-0"
                                        }`}
                                        style={{ backgroundColor: "#d82428" }}
                                      />
                                    </button>
                                  );
                                }

                                function Row({
                                  label,
                                  editing,
                                  viewValue,
                                  editControl,
                                }: {
                                  label: string;
                                  editing: boolean;
                                  viewValue: string;
                                  editControl: React.ReactNode;
                                }) {
                                  return (
                                    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                                      <span className="text-gray-900 font-medium">{label}</span>
                                      {editing ? (
                                        <div className="w-48 text-right">{editControl}</div>
                                      ) : (
                                        <span className="text-gray-600">{viewValue || "—"}</span>
                                      )}
                                    </div>
                                  );
                                }

                                /** Minimal city type-ahead. Backend should implement GET /api/locations?query= */
                                function CityTypeahead({
                                  value,
                                  onChange,
                                }: {
                                  value: string;
                                  onChange: (v: string) => void;
                                }) {
                                  const [q, setQ] = useState(value || "");
                                  const { data: cities = [] } = useQuery<string[]>({
                                    queryKey: ["/api/locations", q],
                                    enabled: q.trim().length >= 2,
                                    queryFn: async () => {
                                      const res = await fetch(
                                        `/api/locations?query=${encodeURIComponent(q)}`
                                      );
                                      if (!res.ok) return [];
                                      return res.json();
                                    },
                                  });

                                  return (
                                    <div className="w-48 relative">
                                      <input
                                        className="w-full text-right border rounded-md px-2 py-1 text-sm"
                                        placeholder="City"
                                        value={q}
                                        onChange={(e) => setQ(e.target.value)}
                                        onBlur={() => {
                                          if (!value) onChange(q);
                                        }}
                                      />
                                      {cities.length > 0 && (
                                        <div className="absolute z-10 right-0 mt-1 w-full bg-white border rounded-md shadow">
                                          {cities.map((c) => (
                                            <div
                                              key={c}
                                              className="px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer text-right"
                                              onMouseDown={() => {
                                                onChange(c);
                                                setQ(c);
                                              }}
                                            >
                                              {c}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
