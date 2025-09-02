"use client";

import { useAuth } from "@/hooks/useAuth";
import PlayerCalendar from "@/components/PlayerCalendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Event } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Users,
  Trophy,
  DollarSign,
  FileText,
  Send,
  UserCheck,
  ChevronRight,
  MapPin,
  Copy,
  Gauge,
  Sparkles,
  User,
  Award,
  Target,
  BarChart3,
  MessageCircle,
  Settings,
  Plus,
  Clock,
  Star,
  TrendingUp,
  Save,
  ExternalLink,
  Download
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isAfter, startOfDay, parseISO } from "date-fns";

/* =================== Types =================== */

type UypEvent = Event;

type CoachTeam = {
  id: number;
  name: string;
  ageGroup?: string;
  inviteCode?: string;
  roster: Array<{
    id: number;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
    position?: string;
    jerseyNumber?: number | null;
  }>;
};

type CoachPaySummary = {
  status: "paid" | "past_due" | "upcoming" | "processing" | "on_hold";
  nextPayDate: string | null; // ISO
  nextPayAmountCents: number | null;
  currency: string; // e.g. "usd"
  portalUrl?: string | null; // payroll portal
};

type PlayerLite = {
  id: number;
  firstName: string;
  lastName: string;
  teamName?: string | null;
  profileImageUrl?: string | null;
};

type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

/* =================== Skills Schema =================== */
// Coach-friendly rubric: 1–5 per sub-skill with helper labels
export const SKILL_CATEGORIES = [
  { name: "SHOOTING", skills: ["LAYUP", "2PT RANGE", "3PT RANGE"] },
  { name: "DRIBBLING", skills: ["LEFT", "RIGHT", "CONTROL", "SPEED"] },
  { name: "PASSING", skills: ["BOUNCE", "CHEST", "OVERHEAD", "CATCHING"] },
  { name: "DEFENSE", skills: ["TALKING", "STANCE", "CLOSEOUT"] },
  { name: "REBOUNDING", skills: ["BOX OUT", "BALL PROTECTION", "ANTICIPATION"] },
  { name: "ATHLETIC ABILITY", skills: ["STAMINA", "QUICKNESS", "COORDINATION"] },
  { name: "COACHABILITY", skills: ["ATTITUDE", "FOCUS", "WORK ETHIC", "ACCEPTS CRITICISM"] },
] as const;

type SkillCategoryName = typeof SKILL_CATEGORIES[number]["name"];

type EvalScores = {
  [C in SkillCategoryName]?: { [subSkill: string]: number }; // 1–5
};

/* =================== Awards =================== */
// Seasonal Team Trophies (Coach-awarded at season end)
const TEAM_TROPHIES = [
  { id: "season-mvp", name: "MVP (Most Valuable Player)", kind: "trophy" as const, description: "Biggest impact on team success" },
  { id: "coach-award", name: "Coach's Award", kind: "trophy" as const, description: "Embodies team values & coachability" },
  { id: "season-mip", name: "MIP (Most Improved Player)", kind: "trophy" as const, description: "Most skill & game IQ growth" },
  { id: "defensive-player", name: "Defensive Player", kind: "trophy" as const, description: "Greatest defensive impact" },
];

/* =================== Coach Dashboard =================== */
export default function CoachDashboard() {
  const { user } = useAuth();
  const currentUser = user as UserType | null;
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "skills" | "payroll">("overview");
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  /* ===== Data ===== */
  // Coach's team
  const { data: coachTeam, isLoading: teamLoading } = useQuery<CoachTeam>({
    queryKey: ["/api/coach/team"],
    queryFn: async () => {
      const res = await fetch("/api/coach/team", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
  });

  // Coach's events
  const { data: coachEvents = [] } = useQuery<UypEvent[]>({
    queryKey: ["/api/coach/events"],
    queryFn: async () => {
      const res = await fetch("/api/coach/events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  // Coach's payroll summary
  const { data: paySummary } = useQuery<CoachPaySummary>({
    queryKey: ["/api/coach/pay/summary"],
    queryFn: async () => {
      const res = await fetch("/api/coach/pay/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch pay summary");
      return res.json();
    },
  });

  // HR announcements
  const { data: hrAnnouncements = [] } = useQuery<any[]>({
    queryKey: ["/api/coach/hr/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/coach/hr/announcements", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch HR announcements");
      return res.json();
    },
  });

  // HR documents
  const { data: hrDocs = [] } = useQuery<any[]>({
    queryKey: ["/api/coach/hr/docs"],
    queryFn: async () => {
      const res = await fetch("/api/coach/hr/docs", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch HR docs");
      return res.json();
    },
  });

  /* ===== Computed Values ===== */
  const todayEvents = useMemo(() => {
    const today = startOfDay(new Date());
    return coachEvents.filter(event => isSameDay(new Date(event.startTime), today));
  }, [coachEvents]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return coachEvents
      .filter(event => isAfter(new Date(event.startTime), now))
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5);
  }, [coachEvents]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-100 text-green-800";
      case "past_due": return "bg-red-100 text-red-800";
      case "upcoming": return "bg-blue-100 text-blue-800";
      case "processing": return "bg-yellow-100 text-yellow-800";
      case "on_hold": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "paid": return "Paid";
      case "past_due": return "Past Due";
      case "upcoming": return "Upcoming";
      case "processing": return "Processing";
      case "on_hold": return "On Hold";
      default: return "Unknown";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Coach Dashboard</h1>
              <p className="text-orange-100 mt-2">
                Welcome back, Coach {currentUser.firstName}! Ready to lead your team to victory?
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Target className="h-12 w-12 text-orange-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="payroll">Payroll</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Quick Stats */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{coachTeam?.roster?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Active players
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Events</CardTitle>
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{todayEvents.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Practices/games scheduled
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pay Status</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {paySummary ? getStatusText(paySummary.status) : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Current payment status
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Team Performance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">85%</div>
                  <p className="text-xs text-muted-foreground">
                    Average skill improvement
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Today's Schedule & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Today's Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {todayEvents.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No events scheduled for today
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {todayEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{event.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
                            </p>
                          </div>
                          <Badge variant="outline">{event.eventType}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Button className="w-full justify-start" variant="outline">
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Send Team Message
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Evaluate Player Skills
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Award className="h-4 w-4 mr-2" />
                      Award Badge
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <CalendarIcon className="h-4 w-4 mr-2" />
                      Schedule Practice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent HR Updates */}
            {hrAnnouncements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Recent Updates
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {hrAnnouncements.slice(0, 3).map((announcement) => (
                      <div key={announcement.id} className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                        <h4 className="font-medium text-blue-900">{announcement.title}</h4>
                        <p className="text-sm text-blue-700 mt-1">{announcement.body}</p>
                        <p className="text-xs text-blue-600 mt-2">
                          {format(parseISO(announcement.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            {teamLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p>Loading team information...</p>
              </div>
            ) : coachTeam ? (
              <div className="space-y-6">
                {/* Team Info */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Team Information</span>
                      <Badge variant="outline">{coachTeam.ageGroup}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Team Details</h4>
                        <p><strong>Name:</strong> {coachTeam.name}</p>
                        <p><strong>Age Group:</strong> {coachTeam.ageGroup}</p>
                        {coachTeam.inviteCode && (
                          <p><strong>Invite Code:</strong> {coachTeam.inviteCode}</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Quick Stats</h4>
                        <p><strong>Total Players:</strong> {coachTeam.roster.length}</p>
                        <p><strong>Active:</strong> {coachTeam.roster.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Roster */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Team Roster</span>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Player
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {coachTeam.roster.map((player) => (
                        <div key={player.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={player.profileImageUrl} />
                              <AvatarFallback>
                                {player.firstName[0]}{player.lastName[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium">
                                {player.firstName} {player.lastName}
                              </h4>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                {player.position && <span>{player.position}</span>}
                                {player.jerseyNumber && (
                                  <>
                                    <span>•</span>
                                    <span>#{player.jerseyNumber}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Team Assigned</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't been assigned to a team yet. Contact your administrator.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Player Skills Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-6">
                  Evaluate your players' skills across different categories. Use the 1-5 scale for each sub-skill.
                </p>

                <div className="space-y-6">
                  {SKILL_CATEGORIES.map((category) => (
                    <div key={category.name} className="border rounded-lg p-4">
                      <h4 className="font-medium mb-3 text-lg">{category.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {category.skills.map((skill) => (
                          <div key={skill} className="space-y-2">
                            <label className="text-sm font-medium">{skill}</label>
                            <Slider
                              defaultValue={[3]}
                              max={5}
                              min={1}
                              step={1}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>1</span>
                              <span>2</span>
                              <span>3</span>
                              <span>4</span>
                              <span>5</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex justify-end">
                  <Button>
                    <Save className="h-4 w-4 mr-2" />
                    Save Evaluation
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payroll Tab */}
          <TabsContent value="payroll" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pay Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Payment Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paySummary ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Status</span>
                        <Badge className={getStatusColor(paySummary.status)}>
                          {getStatusText(paySummary.status)}
                        </Badge>
                      </div>

                      {paySummary.nextPayDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Next Payment</span>
                          <span className="text-sm">
                            {format(parseISO(paySummary.nextPayDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      )}

                      {paySummary.nextPayAmountCents && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Amount</span>
                          <span className="text-sm font-medium">
                            ${(paySummary.nextPayAmountCents / 100).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {paySummary.portalUrl && (
                        <Button className="w-full mt-4" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Access Payroll Portal
                        </Button>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No payment information available
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* HR Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    HR Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {hrDocs.length > 0 ? (
                    <div className="space-y-3">
                      {hrDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h4 className="font-medium">{doc.title}</h4>
                            <p className="text-sm text-muted-foreground">HR Document</p>
                          </div>
                          <Button size="sm" variant="outline">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No HR documents available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}