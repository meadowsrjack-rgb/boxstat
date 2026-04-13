"use client";

import { useAuth } from "@/hooks/useAuth";
import PlayerCalendar from "@/components/PlayerCalendar";
import EventDetailModal from "@/components/EventDetailModal";
import { BanterLoader } from "@/components/BanterLoader";
import CoachCareerRings from "@/components/CoachCareerRings";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Event } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Users,
  Trophy,
  DollarSign,
  ShoppingBag,
  QrCode,
  Send,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Copy,
  Gauge,
  Sparkles,
  User,
  Award,
  Filter,
  ChevronDown,
  MessageCircle,
  Check,
  X,
  UserPlus,
  Flag,
  Camera,
  Loader2,
} from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerCard from "@/components/PlayerCard";
import TeamChat from "@/components/TeamChat";
import LeadEvaluationForm from "@/components/LeadEvaluationForm";
import { AwardsDialog, EvaluationDialog, SKILL_CATEGORIES, type PlayerLite, type EvalScores, type Quarter, type SkillCategoryName } from "@/components/CoachAwardDialogs";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import { QRCodeSVG } from "qrcode.react";
import { FiltersBar } from "@/components/FiltersBar";
import { getUserPreferences, UserPreferences } from "@/lib/userPrefs";
import { parseEventMeta } from "@/lib/parseEventMeta";

/* =================== Types =================== */

type UypEvent = Event;

type CalendarUypEvent = {
  id: string | number;
  title: string;
  startTime: string;
  endTime?: string;
  eventType?: string;
  description?: string;
  location?: string;
};

function convertToCalendarEvent(ev: UypEvent): CalendarUypEvent {
  const startTime = ev.startTime instanceof Date ? ev.startTime.toISOString() : String(ev.startTime || '');
  const endTime = ev.endTime instanceof Date ? ev.endTime.toISOString() : (ev.endTime ? String(ev.endTime) : undefined);
  return {
    id: ev.id,
    title: ev.title || '',
    startTime,
    endTime,
    eventType: ev.eventType ?? undefined,
    description: ev.description ?? undefined,
    location: ev.location ?? undefined,
  };
}

type CoachTeam = {
  id: number;
  name: string;
  ageGroup?: string;
  program?: string;
  programName?: string; // From enriched API response
  programId?: number;
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

// PlayerLite and Quarter types imported from shared CoachAwardDialogs component

// Skills schema moved to shared CoachAwardDialogs component

// Awards constants moved to shared CoachAwardDialogs component

/* =================== Component =================== */
export default function CoachDashboard() {
  const { user } = useAuth();
  const currentUser = user as UserType | null;
  
  // Fetch all account profiles to check for coach access
  const { data: accountProfiles = [], isLoading: profilesLoading } = useQuery<any[]>({
    queryKey: ["/api/account/profiles"],
    enabled: !!currentUser,
  });

  // Check if user has any coach or admin profile in their account
  const hasCoachProfile = accountProfiles.some((p: any) => p.role === "coach");
  const hasAdminProfile = accountProfiles.some((p: any) => p.role === "admin");
  
  // For multi-role accounts (e.g., admin viewing coach dashboard), find the coach profile
  const { data: linkedProfiles = [] } = useQuery<Array<{id: string; role: string; firstName: string; lastName: string}>>({
    queryKey: [`/api/users/${currentUser?.id}/linked-profiles`],
    enabled: !!currentUser?.id && currentUser?.role !== 'coach',
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/users/${currentUser?.id}/linked-profiles`, { 
        credentials: "include", 
        headers 
      });
      if (!res.ok) return [];
      return res.json();
    },
  });
  
  // Use the coach profile if user is admin/parent with a coach profile, otherwise use current user
  const coachProfile = linkedProfiles.find(p => p.role === 'coach') || accountProfiles.find((p: any) => p.role === 'coach');
  const coachProfileId = currentUser?.role === 'coach' 
    ? currentUser?.id 
    : (coachProfile?.id || (user as any)?.activeProfileId || currentUser?.id);
  const [coachUserPrefs, setCoachUserPrefs] = useState<UserPreferences>(() => getUserPreferences());
  const [activeTab, setActiveTab] = useState<"calendar" | "team" | "profile" | "payments">(() => {
    if (typeof window === "undefined") return "calendar";
    const stored = localStorage.getItem("coachDashboardTab");
    if (stored === "roster") return "team";
    if (stored === "hr" || stored === "docs") return "payments";
    if (!["calendar", "team", "profile", "payments"].includes(stored || "")) {
      return "calendar";
    }
    return stored as "calendar" | "team" | "profile" | "payments";
  });
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const coachPhotoInputRef = useRef<HTMLInputElement>(null);
  const [coachPhotoUploading, setCoachPhotoUploading] = useState(false);

  // Redirect users who don't have coach or admin access
  useEffect(() => {
    if (!profilesLoading && currentUser && currentUser.role !== "coach" && currentUser.role !== "admin" && !hasCoachProfile && !hasAdminProfile) {
      setLocation("/unified-account");
    }
  }, [currentUser, profilesLoading, hasCoachProfile, hasAdminProfile, setLocation]);
  
  // Enhanced calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);

  // Handle eventId deep link from push notifications
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const eventIdParam = urlParams.get('eventId');
    if (!eventIdParam) return;

    const fetchAndOpenEvent = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(`/api/events/${eventIdParam}`, { credentials: 'include', headers });
        if (res.ok) {
          const event = await res.json();
          setSelectedEvent(event);
          setEventDetailOpen(true);
        }
      } catch (err) {
        console.error('[Coach Dashboard] Failed to fetch event for deep link', err);
      } finally {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('eventId');
        window.history.replaceState({}, '', newUrl.toString());
      }
    };

    fetchAndOpenEvent();
  }, []);

  // Roster row modals
  const [evalOpen, setEvalOpen] = useState(false);
  const [awardsOpen, setAwardsOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLite | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  // Team filtering
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<'my-team' | number>('my-team');

  // Quarter/Year for evals
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [quarter, setQuarter] = useState<Quarter>(() => {
    const m = new Date().getMonth();
    return (m <= 2 ? "Q1" : m <= 5 ? "Q2" : m <= 8 ? "Q3" : "Q4") as Quarter;
  });

  // Scores state for the selected player
  const [scores, setScores] = useState<EvalScores>({});
  
  // HR Tab - Lead Evaluation Form state
  const [showLeadEvaluation, setShowLeadEvaluation] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("coachDashboardTab", activeTab);
  }, [activeTab]);

  if (!currentUser) {
    return (
      <div className="min-h-screen-safe bg-gray-50 safe-bottom" data-testid="loading-coach-dashboard">
        {/* Skeleton header */}
        <div className="bg-white border-b px-4 py-4 flex items-center justify-between safe-top">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-28 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        {/* Skeleton tab bar */}
        <div className="bg-white border-b px-4 py-2 flex gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-md" />
          ))}
        </div>
        {/* Skeleton team cards */}
        <div className="px-4 py-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4 flex gap-3 items-center">
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  /* ===== Data ===== */
  const { data: coachTeam } = useQuery<CoachTeam | null>({
    queryKey: ["/api/coach/team"],
    queryFn: async () => {
      const res = await fetch("/api/coach/team", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Query for coach's assigned teams
  const { data: assignedTeams = [] } = useQuery<Array<{id: number; name: string; ageGroup: string; programName?: string; programId?: number}>>({
    queryKey: [`/api/coaches/${coachProfileId}/teams`],
    enabled: !!coachProfileId,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/coaches/${coachProfileId}/teams`, { 
        credentials: "include",
        headers 
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Query for all teams (for filter dropdown - Notion teams)
  const { data: allTeams = [] } = useQuery<Array<{id: string; name: string; ageGroup?: string}>>({
    queryKey: ["/api/search/teams"],
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/search/teams", { credentials: "include", headers });
      if (!res.ok) return [];
      const data = await res.json();
      return data.teams || [];
    },
  });


  // Query for selected team data (when filtering)
  const { data: filteredTeam } = useQuery<CoachTeam | null>({
    queryKey: ["/api/teams", selectedTeamFilter, "details"],
    enabled: selectedTeamFilter !== 'my-team' && typeof selectedTeamFilter === 'number',
    queryFn: async () => {
      const res = await fetch(`/api/teams/${selectedTeamFilter}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Query for all players from coach's assigned teams
  const { data: assignedPlayers = [] } = useQuery({
    queryKey: [`/api/coaches/${coachProfileId}/players`],
    enabled: !!coachProfileId,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`/api/coaches/${coachProfileId}/players`, { 
        credentials: "include",
        headers 
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Compute combined roster based on filter
  const combinedRoster = useMemo(() => {
    if (selectedTeamFilter !== 'my-team') {
      // Show filtered team roster
      return filteredTeam?.roster || [];
    }
    
    // Show roster from all assigned teams
    return assignedPlayers;
  }, [assignedPlayers, filteredTeam, selectedTeamFilter]);

  const { data: coachEvents = [] as UypEvent[] } = useQuery<UypEvent[]>({
    queryKey: ["/api/coach/events", coachProfileId],
    enabled: !!coachProfileId,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const url = coachProfileId 
        ? `/api/coach/events?profileId=${encodeURIComponent(coachProfileId)}`
        : "/api/coach/events";
      const res = await fetch(url, { credentials: "include", headers });
      if (!res.ok) return [] as UypEvent[];
      return res.json();
    },
  });

  const { data: paySummary } = useQuery<CoachPaySummary | null>({
    queryKey: ["/api/coach/pay/summary"],
    queryFn: async () => {
      const res = await fetch("/api/coach/pay/summary", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: hrDocs = [] as Array<{ id: string | number; title: string; url: string }> } = useQuery({
    queryKey: ["/api/coach/hr/docs"],
    queryFn: async () => {
      const res = await fetch("/api/coach/hr/docs", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: hrAnnouncements = [] as Array<{ id: string | number; title: string; body: string; createdAt: string }> } = useQuery({
    queryKey: ["/api/coach/hr/announcements"],
    queryFn: async () => {
      const res = await fetch("/api/coach/hr/announcements", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  /* ===== Mutations ===== */
  const querySaveKey = ["/api/coach/evaluations", "player", selectedPlayer?.id, quarter, year];

  const saveEvaluation = useMutation({
    mutationFn: async () => {
      if (!selectedPlayer) throw new Error("No player selected");
      const fullScores: EvalScores = {};
      for (const cat of SKILL_CATEGORIES) {
        fullScores[cat.name] = {};
        for (const skill of cat.skills) {
          fullScores[cat.name]![skill] = scores[cat.name]?.[skill] ?? 3;
        }
      }
      const payload = { playerId: selectedPlayer.id, quarter, year, scores: fullScores };
      console.log("Evaluation payload:", payload);
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/coach/evaluations`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        console.error("Evaluation error:", errorData);
        throw new Error(errorData.message || "Failed to save evaluation");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Evaluation saved" });
      // Invalidate ALL caches for the evaluated player
      if (selectedPlayer) {
        queryClient.invalidateQueries({ queryKey: querySaveKey });
        // Player dashboard and PlayerCard uses these formats
        queryClient.invalidateQueries({ queryKey: [`/api/players/${selectedPlayer.id}/latest-evaluation`] });
        queryClient.invalidateQueries({ queryKey: ["/api/players", selectedPlayer.id, "latest-evaluation"] });
        // Admin dashboard
        queryClient.invalidateQueries({ queryKey: ["/api/coach/evaluations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/evaluations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/evaluations", selectedPlayer.id] });
        queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
        // Coach players list
        queryClient.invalidateQueries({ queryKey: [`/api/coaches/${coachProfileId}/players`] });
        // Player profile for updated skill display
        queryClient.invalidateQueries({ queryKey: [`/api/profile/${selectedPlayer.id}`] });
        // Admin users list to refresh skill data globally
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        // Auth user cache so skills page picks up updated skillsAssessments
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }
      setEvalOpen(false);
      setScores({});
      setSelectedPlayer(null);
    },
    onError: (e: any) => toast({ title: "Save failed", description: String(e?.message || e), variant: "destructive" }),
  });

  const awardMutation = useMutation({
    mutationFn: async ({ awardId, kind }: { awardId: string | number; kind: "badge" | "trophy" }) => {
      if (!selectedPlayer) throw new Error("No player selected");
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/coach/award`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ playerId: selectedPlayer.id, awardId, category: kind }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.error || errorData.message || "Failed to give award");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Award given" });
      // Invalidate ALL caches for the awarded player's awards
      if (selectedPlayer) {
        // Player dashboard and unified account page formats
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/awards`] });
        queryClient.invalidateQueries({ queryKey: ["/api/users", selectedPlayer.id, "awards"] });
        // Legacy endpoints
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/badges`] });
        queryClient.invalidateQueries({ queryKey: [`/api/users/${selectedPlayer.id}/trophies`] });
        // Trophies-badges page - invalidate all variations
        queryClient.invalidateQueries({ queryKey: ["/api/user-awards"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user-awards", selectedPlayer.id] });
        // Account players query (for unified account page player cards)
        queryClient.invalidateQueries({ queryKey: ["/api/account/players"] });
        // Player profile for updated award display
        queryClient.invalidateQueries({ queryKey: [`/api/profile/${selectedPlayer.id}`] });
        // Admin dashboard user list for global update
        queryClient.invalidateQueries({ queryKey: ["/api/users"] });
        // Award definitions list
        queryClient.invalidateQueries({ queryKey: ["/api/award-definitions"] });
        // Organization awards (admin dashboard earned counts)
        queryClient.invalidateQueries({ queryKey: ["/api/user-awards/organization"] });
      }
      setAwardsOpen(false);
      setSelectedPlayer(null);
    },
    onError: (e: any) => toast({ title: "Failed to give award", description: e?.message || String(e), variant: "destructive" }),
  });

  /* =================== UI =================== */
  const initials = `${(currentUser.firstName || "").charAt(0)}${(currentUser.lastName || "").charAt(0)}`.toUpperCase();

  const parsedCoachEvents = useMemo(() => {
    return coachEvents.map(ev => parseEventMeta(ev));
  }, [coachEvents]);

  const visibleCoachEvents = useMemo(() => {
    const hidden = coachUserPrefs.hiddenEventTypes || [];
    if (hidden.length === 0) return coachEvents;
    return coachEvents.filter(ev => {
      const parsed = parseEventMeta(ev);
      return !hidden.includes(parsed.type);
    });
  }, [coachEvents, coachUserPrefs.hiddenEventTypes]);

  const todayEvents = useMemo(() => {
    const today = new Date();
    return visibleCoachEvents.filter((ev) => isSameDay(new Date((ev as any).startTime || (ev as any).start_time), today));
  }, [visibleCoachEvents]);

  const upcomingEvents = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) {
      const start = startOfDay(new Date());
      return visibleCoachEvents
        .filter((ev) => isAfter(new Date((ev as any).startTime || (ev as any).start_time), start))
        .filter((ev) => !isSameDay(new Date((ev as any).startTime || (ev as any).start_time), new Date()))
        .slice(0, 3);
    } else {
      return visibleCoachEvents
        .filter((ev) => isSameDay(new Date((ev as any).startTime || (ev as any).start_time), selectedDate))
        .slice(0, 10);
    }
  }, [visibleCoachEvents, selectedDate]);

  // Fetch notifications for the coach
  const { data: notifications = [] } = useQuery<any[]>({
    queryKey: [`/api/users/${currentUser?.id}/notifications`],
    enabled: !!currentUser?.id,
  });

  // Filter for unread notifications
  const unreadNotifications = notifications.filter((n: any) => !n.isRead);

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser?.id}/notifications`] });
    },
  });

  return (
    <>
      <div className="ios-full-bleed" style={{ backgroundColor: '#f9fafb' }} />
      <div className="scrollable-page relative z-10" style={{ backgroundColor: '#f9fafb' }}>
      {/* Top Bar */}
      <header className="bg-white shadow-sm safe-top sticky top-0 z-50">
        <div className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setLocation("/profile-gateway")}
              aria-label="Switch Profile"
              data-testid="button-switch-profile"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="flex items-center gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              onClick={() => setLocation("/coach-settings")}
              aria-label="Settings"
              data-testid="button-settings"
            >
              <MoreHorizontal className="h-6 w-6" />
            </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md md:max-w-2xl lg:max-w-4xl mx-auto">
        {/* Announcement Banner */}
        <div className="px-6 pt-4">
          <AnnouncementBanner />
        </div>
        {/* Push Notification Setup */}
        <div className="px-6 pt-4">
          <PushNotificationSetup compact />
        </div>
        {/* Hidden file input for coach photo upload */}
        <input
          ref={coachPhotoInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
              return;
            }
            setCoachPhotoUploading(true);
            try {
              const formData = new FormData();
              formData.append('photo', file);
              const token = localStorage.getItem('authToken');
              const headers: Record<string, string> = {};
              if (token) headers["Authorization"] = `Bearer ${token}`;
              const profileId = coachProfileId || currentUser.id;
              const res = await fetch(`/api/upload-profile-photo?profileId=${profileId}`, { method: 'POST', headers, body: formData, credentials: 'include' });
              if (!res.ok) throw new Error('Upload failed');
              const result = await res.json();
              if (result?.imageUrl) {
                if (String(profileId) === String(currentUser.id)) {
                  queryClient.setQueryData(["/api/auth/user"], (old: any) => old ? { ...old, profileImageUrl: result.imageUrl } : old);
                }
                queryClient.setQueryData(["/api/account/profiles"], (old: any) => 
                  Array.isArray(old) ? old.map((p: any) => String(p.id) === String(profileId) ? { ...p, profileImageUrl: result.imageUrl } : p) : old
                );
                queryClient.setQueryData([`/api/users/${currentUser.id}/linked-profiles`], (old: any) => 
                  Array.isArray(old) ? old.map((p: any) => String(p.id) === String(profileId) ? { ...p, profileImageUrl: result.imageUrl } : p) : old
                );
                queryClient.setQueryData(["/api/profile", String(profileId)], (old: any) => old ? { ...old, profileImageUrl: result.imageUrl } : old);
              }
              queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              queryClient.invalidateQueries({ queryKey: ["/api/account/profiles"] });
              queryClient.invalidateQueries({ queryKey: [`/api/users/${currentUser.id}/linked-profiles`] });
              queryClient.invalidateQueries({ queryKey: ["/api/profiles/me"] });
              toast({ title: "Success", description: "Profile photo updated!" });
            } catch {
              toast({ title: "Error", description: "Failed to upload photo", variant: "destructive" });
            } finally {
              setCoachPhotoUploading(false);
              e.target.value = '';
            }
          }}
        />
        {/* Avatar header */}
        <div className="px-6 py-6 text-center">
          <div className="flex justify-center mb-2 relative cursor-pointer" onClick={() => coachPhotoInputRef.current?.click()}>
            <ProfileAvatarRing src={((coachProfile as any)?.profileImageUrl || currentUser.profileImageUrl) || undefined} initials={initials} size={88} />
            {coachPhotoUploading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-red-600 animate-spin" />
              </div>
            )}
          </div>
          <div className="text-sm text-gray-600">
            Coach <span className="font-semibold text-gray-900">{currentUser.firstName}</span>
          </div>
        </div>

        {/* Tabs (removed old Evaluate tab) */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center border-b border-gray-200">
            <TabButton label="calendar" activeTab={activeTab} onClick={setActiveTab} Icon={CalendarIcon} />
            <TabButton label="team" activeTab={activeTab} onClick={setActiveTab} Icon={Users} />
            <TabButton label="profile" activeTab={activeTab} onClick={setActiveTab} Icon={User} />
            <TabButton label="payments" activeTab={activeTab} onClick={setActiveTab} Icon={ShoppingBag} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6">
          {activeTab === "calendar" && (
            <div className="-mx-6">
              {/* Event Summaries - moved above calendar */}
              <div className="px-6 py-6">
                <div className="md:grid md:grid-cols-2 md:gap-6 space-y-4 md:space-y-0">
                <section className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">Today</h3>
                  {todayEvents.length ? (
                    todayEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          const normalizedEvent: Event = {
                            ...event as any,
                            startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
                            endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
                          };
                          setSelectedEvent(normalizedEvent);
                          setEventDetailOpen(true);
                        }}
                        data-testid={`event-item-${event.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{(event as any).title || (event as any).summary || "Event"}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>
                              {format(new Date((event as any).startTime || (event as any).start_time), "h:mm a")}
                            </span>
                            {(event as any).location && (
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{(event as any).location}</span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">No events today.</div>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    {isSameDay(selectedDate, new Date()) ? "Upcoming" : `Events for ${format(selectedDate, 'MMM d')}`}
                  </h3>
                  {upcomingEvents.length ? (
                    upcomingEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          const normalizedEvent: Event = {
                            ...event as any,
                            startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime,
                            endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime
                          };
                          setSelectedEvent(normalizedEvent);
                          setEventDetailOpen(true);
                        }}
                        data-testid={`upcoming-event-item-${event.id}`}
                      >
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm">{(event as any).title || (event as any).summary || "Event"}</h4>
                          <div className="flex items-center gap-4 text-xs text-gray-600 mt-1">
                            <span>
                              {format(new Date((event as any).startTime || (event as any).start_time), "EEE, MMM d • h:mm a")}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-500">
                      {isSameDay(selectedDate, new Date()) ? "No upcoming events." : `No events for ${format(selectedDate, 'MMM d')}.`}
                    </div>
                  )}
                </section>
                </div>
              </div>

              {/* Calendar + Filter Panel */}
              <div>
                <div className="mb-3">
                  <details className="bg-white rounded-xl shadow-sm border">
                    <summary className="px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer select-none">Event Filters</summary>
                    <div className="px-4 pb-3">
                      <FiltersBar
                        events={parsedCoachEvents}
                        filters={coachUserPrefs}
                        onFiltersChange={setCoachUserPrefs}
                        horizontal
                      />
                    </div>
                  </details>
                </div>
                <PlayerCalendar 
                  events={visibleCoachEvents.map(convertToCalendarEvent)} 
                  currentUser={{ 
                    id: currentUser.id,
                    email: currentUser.email || "",
                    firstName: currentUser.firstName || undefined,
                    lastName: currentUser.lastName || undefined
                  }}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  eventTypeColors={coachUserPrefs.eventTypeColors || {}}
                />
              </div>
            </div>
          )}

          {activeTab === "team" && (
            <RosterTab
              team={(selectedTeamFilter === 'my-team' ? coachTeam : filteredTeam) || undefined}
              roster={combinedRoster}
              assignedTeams={assignedTeams}
              allTeams={allTeams}
              selectedTeamFilter={selectedTeamFilter}
              onTeamFilterChange={setSelectedTeamFilter}

              onEvaluate={(p) => {
                // Transform roster player to PlayerLite format
                // Use appAccountId (the BoxStat user ID) not id (roster row ID)
                const playerId = p.appAccountId || p.id;
                const playerLite: PlayerLite = {
                  id: String(playerId),
                  firstName: p.firstName,
                  lastName: p.lastName,
                  teamName: p.teamName,
                  profileImageUrl: p.profileImageUrl
                };
                setSelectedPlayer(playerLite);
                // Load existing eval for player/quarter/year
                fetch(`/api/coach/evaluations?playerId=${playerLite.id}&quarter=${quarter}&year=${year}`, { credentials: "include" })
                  .then((r) => (r.ok ? r.json() : null))
                  .then((data) => setScores((data as EvalScores) || {}));
                setEvalOpen(true);
              }}

              onReward={(p) => {
                // Transform roster player to PlayerLite format
                // Use appAccountId (the BoxStat user ID) not id (roster row ID)
                const playerId = p.appAccountId || p.id;
                const playerLite: PlayerLite = {
                  id: String(playerId),
                  firstName: p.firstName,
                  lastName: p.lastName,
                  teamName: p.teamName,
                  profileImageUrl: p.profileImageUrl
                };
                setSelectedPlayer(playerLite);
                setAwardsOpen(true);
              }}

              selectedPlayerId={selectedPlayerId}
              setSelectedPlayerId={setSelectedPlayerId}
              showLeadEvaluation={showLeadEvaluation}
              setShowLeadEvaluation={setShowLeadEvaluation}
            />
          )}

          {activeTab === "profile" && (
            <ProfileTab currentUser={currentUser} coachProfileId={coachProfileId} />
          )}

          {activeTab === "payments" && (
            <CoachPaymentsTab organizationId={currentUser?.organizationId || 'default-org'} />
          )}

          {/* Event Detail Modal */}
          <EventDetailModal
            event={selectedEvent}
            userId={coachProfileId}
            userRole="coach"
            open={eventDetailOpen}
            onOpenChange={setEventDetailOpen}
          />
        </div>
      </main>

      {/* -------- Overlays (Team Tab integrated) -------- */}
      <EvaluationDialog
        open={evalOpen}
        onOpenChange={setEvalOpen}
        player={selectedPlayer}
        scores={scores}
        setScores={setScores}
        quarter={quarter}
        setQuarter={setQuarter}
        year={year}
        setYear={setYear}
        onSave={() => saveEvaluation.mutate()}
        saving={saveEvaluation.isPending}
      />

      <AwardsDialog
        open={awardsOpen}
        onOpenChange={(v) => {
          setAwardsOpen(v);
          if (!v) setSelectedPlayer(null);
        }}
        player={selectedPlayer}
        onGive={(awardId, kind) => awardMutation.mutate({ awardId, kind })}
        giving={awardMutation.isPending}
      />

      {/* PlayerCard Modal */}
      {selectedPlayerId && (
        <PlayerCard
          playerId={selectedPlayerId}
          isOpen={!!selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
          isCoach={true}
        />
      )}
      </div>
    </>
  );
}

/* =================== Subcomponents =================== */

function TabButton({ label, activeTab, onClick, Icon, badgeCount }: { label: any; activeTab: string; onClick: (t: any) => void; Icon: any; badgeCount?: number }) {
  const active = activeTab === label;
  return (
    <button
      onClick={() => onClick(label)}
      className={`flex flex-col items-center space-y-3 py-4 flex-1 relative ${active ? "text-red-600" : "text-gray-400"}`}
      style={{ color: active ? "#d82428" : undefined }}
      data-testid={`tab-${label}`}
    >
      <div className="relative">
        <Icon className="h-6 w-6" />
        {badgeCount && badgeCount > 0 && !active && (
          <span className="absolute -top-2 -right-2 min-w-[16px] h-[16px] bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
      <div className={`h-0.5 w-full absolute bottom-0 left-0 transition-all duration-200 ${active ? "opacity-100" : "opacity-0"}`} style={{ backgroundColor: "#d82428" }} />
    </button>
  );
}

function TeamChatSection({ teamId, currentUserId }: { teamId: number; currentUserId?: string }) {
  const [chatChannel, setChatChannel] = useState<'players' | 'parents'>('players');
  return (
    <div>
      <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-400 mb-3">Team Chat</h4>
      {/* Custom underline-style sub-tabs */}
      <div className="flex border-b border-gray-200 mb-3">
        <button
          onClick={() => setChatChannel('players')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium relative transition-colors ${
            chatChannel === 'players' ? 'text-red-600' : 'text-gray-400'
          }`}
          data-testid="tab-player-chat"
        >
          <MessageCircle className="h-4 w-4" />
          Player Chat
          {chatChannel === 'players' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: '#d82428' }} />
          )}
        </button>
        <button
          onClick={() => setChatChannel('parents')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium relative transition-colors ${
            chatChannel === 'parents' ? 'text-red-600' : 'text-gray-400'
          }`}
          data-testid="tab-parent-chat"
        >
          <Users className="h-4 w-4" />
          Parent Chat
          {chatChannel === 'parents' && (
            <span className="absolute bottom-0 left-0 w-full h-0.5" style={{ backgroundColor: '#d82428' }} />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-2">
        {chatChannel === 'players' ? 'Chat with players on this team' : 'Chat with parents of players on this team'}
      </p>
      <TeamChat teamId={teamId} currentProfileId={currentUserId} channel={chatChannel} />
    </div>
  );
}

function CoachPaymentsTab({ organizationId }: { organizationId: string }) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const { data: storeItems = [], isLoading } = useQuery<any[]>({
    queryKey: ['/api/store-products'],
  });

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const handleShowQR = (item: any) => {
    setSelectedItem(item);
    setQrDialogOpen(true);
  };

  const handleDirectCheckout = async (item: any) => {
    setCheckoutLoading(item.id);
    try {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/store-checkout/${item.id}`, {
        method: 'POST',
        credentials: 'include',
        headers,
      });
      const data = await res.json();
      if (data.sessionUrl) {
        window.open(data.sessionUrl, '_blank');
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (storeItems.length === 0) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">No store items available</p>
        <p className="text-gray-400 text-sm mt-1">Store items will appear here once added by admin</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900">Store Items</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {storeItems.map((item: any) => (
          <Card key={item.id} className="overflow-hidden flex flex-col">
            <div className="aspect-[16/9] bg-gray-100 overflow-hidden">
              {item.coverImageUrl ? (
                <img src={item.coverImageUrl} alt={item.name} className="w-full h-full object-contain bg-gray-50" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-10 h-10 text-gray-300" />
                </div>
              )}
            </div>
            <CardContent className="p-3 flex flex-col flex-1">
              <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
              {item.description && (
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
              )}
              <p className="text-sm font-bold text-gray-900 mb-2 mt-auto">
                ${item.price ? (item.price / 100).toFixed(2) : '0.00'}
              </p>
              <Button
                size="sm"
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => handleShowQR(item)}
              >
                <QrCode className="h-4 w-4 mr-1" />
                QR Code
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">{selectedItem?.name}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="flex flex-col items-center space-y-4 py-4">
              <p className="text-2xl font-bold text-gray-900">
                ${selectedItem.price ? (selectedItem.price / 100).toFixed(2) : '0.00'}
              </p>
              <div className="bg-white p-4 rounded-lg border">
                <QRCodeSVG
                  value={`${baseUrl}/store-buy/${selectedItem.id}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Scan this QR code to purchase this item via Stripe checkout
              </p>
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 w-full"
                onClick={() => handleDirectCheckout(selectedItem)}
                disabled={!!checkoutLoading}
              >
                {checkoutLoading === selectedItem.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <DollarSign className="h-4 w-4 mr-1" />
                )}
                Checkout Now
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProfileAvatarRing({ src, initials, size = 80 }: { src?: string; initials: string; size?: number }) {
  return (
    <motion.div
      className="inline-block rounded-full p-[3px] bg-[conic-gradient(at_50%_50%,#fecaca,#fde8e8,#fecaca)] shadow-sm"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      whileHover={{ scale: 1.03 }}
      style={{ width: size + 6, height: size + 6 }}
    >
      <div className="rounded-full overflow-hidden bg-white ring-4 ring-white shadow-md" style={{ width: size, height: size }}>
        <Avatar className="w-full h-full">
          <AvatarImage src={src} alt="Coach Avatar" />
          <AvatarFallback className="text-lg font-bold bg-gray-200">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </motion.div>
  );
}

/* ---------- Roster Tab (Team-focused with roster + chat) ---------- */
function RosterTab({
  team,
  roster,
  assignedTeams,
  allTeams,
  selectedTeamFilter,
  onTeamFilterChange,
  onEvaluate,
  onReward,
  selectedPlayerId,
  setSelectedPlayerId,
  showLeadEvaluation,
  setShowLeadEvaluation,
}: {
  team?: CoachTeam | null;
  roster: any[];
  assignedTeams: Array<{id: number; name: string; ageGroup: string; programName?: string}>;
  allTeams: Array<{id: string; name: string; ageGroup?: string}>;
  selectedTeamFilter: 'my-team' | number;
  onTeamFilterChange: (filter: 'my-team' | number) => void;
  onEvaluate: (p: PlayerLite) => void;
  onReward: (p: PlayerLite) => void;
  selectedPlayerId: string | null;
  setSelectedPlayerId: (id: string | null) => void;
  showLeadEvaluation: boolean;
  setShowLeadEvaluation: (show: boolean) => void;
}) {
  const { user } = useAuth();
  const currentUser = user as UserType;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [playerToFlag, setPlayerToFlag] = useState<{id: string; name: string} | null>(null);
  const [flagReason, setFlagReason] = useState("");

  // Fetch roster for selected team (includes all Notion players)
  const { data: teamRoster = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", selectedTeamId, "roster-with-notion"],
    enabled: !!selectedTeamId,
    queryFn: async () => {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/teams/${selectedTeamId}/roster-with-notion`, { 
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Search players (searches all players in users table)
  const searchPlayers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`/api/search/players?q=${encodeURIComponent(query)}`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        // Transform the response format to match what the UI expects
        const players = data.players?.map((p: any) => ({
          id: p.id,
          firstName: p.first_name,
          lastName: p.last_name,
          profileImageUrl: p.profile_image_url,
          teamName: p.team_name,
          appUserId: p.id,
          hasAppProfile: true, // Players from search are app users
        })) || [];
        setSearchResults(players);
      }
    } catch (error) {
      console.error("Error searching players:", error);
    }
  };

  // Assign player to team mutation
  const assignPlayerMutation = useMutation({
    mutationFn: async (playerId: string) => {
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch(`/api/teams/${selectedTeamId}/assign-player`, {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to assign player");
      }
      return res.json();
    },
    onSuccess: (data, playerId) => {
      // Invalidate roster queries so the team list updates
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeamId, "roster-with-notion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      // Invalidate the specific player's profile so their card and dashboard updates
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${playerId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${playerId}/team`] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", playerId, "team"] });
      // Invalidate admin dashboard user list
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setSearchQuery("");
      setSearchResults([]);
      toast({ title: "Success", description: "Player assigned to team" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Flag player for roster change mutation
  const flagPlayerMutation = useMutation({
    mutationFn: async ({ playerId, flagged, reason }: { playerId: string; flagged: boolean; reason?: string }) => {
      return await apiRequest("PATCH", `/api/users/${playerId}`, { 
        flaggedForRosterChange: flagged,
        flagReason: flagged ? reason : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", selectedTeamId, "roster-with-notion"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ 
        title: "Player Flagged", 
        description: "Admin has been notified about this roster change request" 
      });
      setFlagDialogOpen(false);
      setPlayerToFlag(null);
      setFlagReason("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (showLeadEvaluation) {
    return <LeadEvaluationForm onClose={() => setShowLeadEvaluation(false)} />;
  }

  // Show team list if no team is selected
  if (!selectedTeamId) {
    return (
      <div className="space-y-6 bg-gray-50 min-h-screen">
        <Button 
          variant="outline"
          onClick={() => setShowLeadEvaluation(true)}
          className="border-red-200 text-red-600 hover:bg-red-50 w-full"
          data-testid="button-lead-evaluation"
        >
          <Users className="h-4 w-4 mr-2" />
          New Lead Eval
        </Button>

        <div>
          <h3 className="text-lg font-bold text-gray-900">Your Teams</h3>
          <p className="text-sm text-gray-500">Select a team to view roster and chat</p>
        </div>
        
        {assignedTeams.length > 0 ? (
          <div className="grid gap-3">
            {assignedTeams.map((team) => (
              <Card 
                key={team.id} 
                className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedTeamId(team.id)}
                data-testid={`team-card-${team.id}`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-500">
                      {team.programName && <span className="text-red-600 font-medium">{team.programName}</span>}
                      {team.programName && team.ageGroup && <span className="mx-1">•</span>}
                      {team.ageGroup}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
            No teams assigned yet. An admin will assign you to teams.
          </div>
        )}
      </div>
    );
  }

  // Show selected team details
  const selectedTeam = assignedTeams.find(t => t.id === selectedTeamId);

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen">
      {/* Team Header */}
      <div>
        <button
          onClick={() => setSelectedTeamId(null)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-3"
          data-testid="button-back-to-teams"
        >
          &lt; Teams
        </button>
        <h3 className="text-2xl font-bold text-gray-900">{selectedTeam?.name}</h3>
        {selectedTeam?.programName && (
          <p className="text-sm font-medium text-red-600 mt-0.5">{selectedTeam.programName}</p>
        )}
      </div>

      {/* Roster */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold tracking-widest uppercase text-gray-400">Team Roster</h4>
        </div>
        {teamRoster.length > 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                {teamRoster.map((p) => {
                  const hasAccount = p.hasAppAccount;
                  const playerId = p.appAccountId || p.notionId;
                  
                  return (
                    <div 
                      key={playerId} 
                      className={`p-4 flex items-center justify-between transition-colors ${
                        hasAccount 
                          ? "hover:bg-gray-50 cursor-pointer" 
                          : "bg-gray-50 opacity-60 cursor-default"
                      }`}
                      data-testid={`player-${playerId}`}
                      onClick={() => hasAccount && setSelectedPlayerId(p.appAccountId)}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <Avatar className={`h-10 w-10 flex-shrink-0 ${!hasAccount ? "grayscale" : ""}`}>
                          <AvatarImage src={p.profileImageUrl} />
                          <AvatarFallback className="text-xs bg-gray-100 text-gray-600">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="truncate">
                          <div className={`font-medium truncate flex items-center gap-2 ${
                            hasAccount ? "text-gray-900" : "text-gray-500"
                          }`} data-testid={`text-player-name-${playerId}`}>
                            {p.name}
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">
                              {!hasAccount ? "No Account" : "Player"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasAccount) onEvaluate(p as any);
                          }}
                          disabled={!hasAccount}
                          className={hasAccount 
                            ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                            : "text-gray-400 cursor-not-allowed"
                          }
                          data-testid={`button-evaluate-${playerId}`}
                        >
                          <Gauge className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasAccount) onReward(p as any);
                          }}
                          disabled={!hasAccount}
                          className={hasAccount 
                            ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" 
                            : "text-gray-400 cursor-not-allowed"
                          }
                          data-testid={`button-reward-${playerId}`}
                        >
                          <Trophy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasAccount) {
                              setPlayerToFlag({ id: p.appAccountId, name: p.name });
                              setFlagDialogOpen(true);
                            }
                          }}
                          disabled={!hasAccount}
                          className={hasAccount 
                            ? (p.flaggedForRosterChange 
                              ? "text-red-600 hover:text-red-700 hover:bg-red-50" 
                              : "text-gray-400 hover:text-red-600 hover:bg-red-50")
                            : "text-gray-300 cursor-not-allowed"
                          }
                          data-testid={`button-flag-${playerId}`}
                        >
                          <Flag className={`h-4 w-4 ${p.flaggedForRosterChange ? "fill-current" : ""}`} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-sm text-gray-500">No players in this team yet.</div>
        )}
      </div>

      {/* Team Chat - with tabs for Players and Parents */}
      <TeamChatSection teamId={selectedTeamId} currentUserId={currentUser?.id} />

      {/* Flag Player Confirmation Dialog */}
      <AlertDialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-red-600" />
              Flag Player for Roster Review
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are flagging <strong>{playerToFlag?.name}</strong> for roster review.</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <p className="font-medium mb-2">Common reasons to flag a player:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Player is no longer attending practices or games</li>
                    <li>Player needs to move to a different team or division</li>
                    <li>Player has behavioral or attitude concerns</li>
                    <li>Player's skill level doesn't match current team placement</li>
                    <li>Parent or player requested a team change</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <label htmlFor="flag-reason" className="text-sm font-medium text-gray-700">
                    Reason for flagging (required)
                  </label>
                  <textarea
                    id="flag-reason"
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Describe why this player needs roster review..."
                    className="w-full min-h-[80px] p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    data-testid="input-flag-reason"
                  />
                </div>
                <p className="text-sm text-gray-600">
                  This will notify the admin to review this player's roster placement. 
                  The player will remain on the roster until the admin takes action.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFlagReason("")} data-testid="button-cancel-flag">No, Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (playerToFlag && flagReason.trim()) {
                  flagPlayerMutation.mutate({ playerId: playerToFlag.id, flagged: true, reason: flagReason.trim() });
                }
              }}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={flagPlayerMutation.isPending || !flagReason.trim()}
              data-testid="button-confirm-flag"
            >
              {flagPlayerMutation.isPending ? "Flagging..." : "Yes, Flag Player"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

/* Removed local dialog components - now using shared dialogs from CoachAwardDialogs */

/* ---------- Badges (BoxStat‑wide, unchanged) ---------- */
function BadgesTab() {
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerLite | null>(null);
  const [note, setNote] = useState("");
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const { data: badges = [] as Array<{ id: number; name: string; description?: string }> } = useQuery({
    queryKey: ["/api/badges/list"],
    queryFn: async () => {
      const res = await fetch("/api/badges/list", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: search = [] as PlayerLite[] } = useQuery({
    queryKey: ["/api/coach/players/search", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/coach/players/search?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const assignMutation = useMutation({
    mutationFn: async (badgeId: number) => {
      if (!selectedPlayer) throw new Error("Select a player first");
      const res = await fetch(`/api/coach/badges/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playerId: selectedPlayer.id, badgeId, note }),
      });
      if (!res.ok) throw new Error("Failed to assign badge");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Badge assigned", description: selectedPlayer ? `${selectedPlayer.firstName} ${selectedPlayer.lastName}` : undefined });
      setNote("");
    },
    onError: (e: any) => toast({ title: "Couldn't assign", description: String(e?.message || e), variant: "destructive" }),
  });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Badges (BoxStat‑wide)</h2>

      {/* Player search */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 space-y-3">
          <div className="text-sm text-gray-600">Search any player by name or email</div>
          <Input placeholder="Start typing…" value={q} onChange={(e) => setQ(e.target.value)} data-testid="input-search-player" />

          {q.trim().length >= 2 && (
            <div className="max-h-48 overflow-y-auto border rounded-md">
              {search.length ? (
                search.map((p: any, index: number) => (
                  <div key={`${p.id}-${index}`} className="p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 hover:bg-red-50" onClick={() => { setSelectedPlayer(p); setProfileModalOpen(true); }} data-testid={`player-result-${p.id}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={p.profileImageUrl || undefined} />
                        <AvatarFallback className="text-[10px]">{p.firstName?.[0]}{p.lastName?.[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</div>
                        <div className="text-[11px] text-gray-500">{p.teamName || "—"}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </div>
                ))
              ) : (
                <div className="p-3 text-sm text-gray-500">No players found</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Player Profile Modal */}
      <PlayerProfileModal 
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        player={selectedPlayer}
        badges={badges}
        note={note}
        setNote={setNote}
        onAssignBadge={assignMutation.mutate}
        assigning={assignMutation.isPending}
      />
    </div>
  );
}

/* ---------- Player Profile Modal ---------- */
function PlayerProfileModal({
  open,
  onOpenChange,
  player,
  badges,
  note,
  setNote,
  onAssignBadge,
  assigning,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  player: PlayerLite | null;
  badges: Array<{ id: number; name: string; description?: string }>;
  note: string;
  setNote: (note: string) => void;
  onAssignBadge: (badgeId: number) => void;
  assigning: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"profile">("profile");

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={player.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">{player.firstName?.[0]}{player.lastName?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="text-xl font-semibold">{player.firstName} {player.lastName}</div>
              <div className="text-sm text-gray-600">{player.teamName || "No team assigned"}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b">
          <Button 
            variant="default"
            className="rounded-b-none bg-red-600 hover:bg-red-700"
            data-testid="tab-profile"
          >
            <User className="h-4 w-4 mr-2" />
            View Profile
          </Button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === "profile" && (
            <div className="space-y-4 py-4">
              {!(player as any).hasAppProfile ? (
                <div className="text-center py-8">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <div className="flex items-center justify-center mb-4">
                      <User className="h-12 w-12 text-yellow-600" />
                    </div>
                    <h3 className="text-lg font-medium text-yellow-800 mb-2">
                      Player has not set up a profile yet
                    </h3>
                    <p className="text-sm text-yellow-700 mb-4">
                      {player.firstName} {player.lastName} is in the Notion database but hasn't created an app account.
                    </p>
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="text-sm font-medium text-gray-600">Name (from Notion)</label>
                        <div className="text-gray-900">{player.firstName} {player.lastName}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600">Club Team (from Notion)</label>
                        <div className="text-gray-900">{(player as any).youthClubTeam || "No team assigned"}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">First Name</label>
                      <div className="text-gray-900">{player.firstName}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Last Name</label>
                      <div className="text-gray-900">{player.lastName}</div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-600">Team</label>
                    <div className="text-gray-900">{player.teamName || "No team assigned"}</div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-600">Club Team (from Notion)</label>
                    <div className="text-gray-900">{(player as any).youthClubTeam || "No club team"}</div>
                  </div>

                  {(player as any).email && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <div className="text-gray-900">{(player as any).email}</div>
                    </div>
                  )}

                  {(player as any).grade && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Grade</label>
                      <div className="text-gray-900">{(player as any).grade}</div>
                    </div>
                  )}

                  {(player as any).position && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Position</label>
                      <div className="text-gray-900">{(player as any).position}</div>
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="text-center text-sm text-gray-500">
                      Additional player details and performance history would appear here
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-close-modal">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Profile Tab ---------- */
function ProfileTab({ currentUser, coachProfileId }: { currentUser: UserType; coachProfileId?: string }) {
  const profileId = coachProfileId || currentUser.id;
  const { data: coachProfile } = useQuery<any>({
    queryKey: [`/api/profile/${profileId}`],
    enabled: !!profileId,
  });
  const profile = coachProfile || currentUser;
  
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Profile</h2>
      </div>

      <CoachCareerRings profileId={coachProfileId} />

      {/* Coaching Credentials Card */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="h-5 w-5 text-red-600" />
            <h3 className="text-md font-bold text-gray-900">Coaching Credentials</h3>
          </div>
          <div className="space-y-3">
            {profile?.yearsExperience && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Experience Level</div>
                <div className="text-sm text-gray-900">{profile.yearsExperience}</div>
              </div>
            )}
            {profile?.bio && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Coaching Bio</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{profile.bio}</div>
              </div>
            )}
            {profile?.previousTeams && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Previous Teams</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{profile.previousTeams}</div>
              </div>
            )}
            {profile?.playingExperience && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Playing Experience</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{profile.playingExperience}</div>
              </div>
            )}
            {profile?.philosophy && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Coaching Philosophy</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">{profile.philosophy}</div>
              </div>
            )}
            {profile?.coachingLicense && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Coaching License</div>
                <div className="text-sm text-gray-900">{profile.coachingLicense}</div>
              </div>
            )}
            {profile?.coachingStyle && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Coaching Style</div>
                <div className="text-sm text-gray-900">{profile.coachingStyle}</div>
              </div>
            )}
            {profile?.specialties?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Specialties</div>
                <div className="flex flex-wrap gap-1">
                  {profile.specialties.map((s: string) => (
                    <span key={s} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {profile?.ageGroups?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Age Groups</div>
                <div className="flex flex-wrap gap-1">
                  {profile.ageGroups.map((a: string) => (
                    <span key={a} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{a}</span>
                  ))}
                </div>
              </div>
            )}
            {profile?.availability && (
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-1">Availability</div>
                <div className="text-sm text-gray-900">{profile.availability}</div>
              </div>
            )}
            {!profile?.yearsExperience && !profile?.bio && !profile?.previousTeams && !profile?.coachingLicense && !profile?.specialties?.length && (
              <div className="text-center py-4 text-gray-500 text-sm">
                No coaching credentials added yet. Go to Settings to add your information.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ---------- Docs Tab ---------- */
function HRTab({ 
  docs, 
  announcements, 
  currentUser 
}: { 
  docs: Array<{ id: string | number; title: string; url: string }>; 
  announcements: Array<{ id: string | number; title: string; body: string; createdAt: string }>;
  currentUser: UserType;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Documents</h2>
      </div>

      {/* Training Documents - Greyed Out */}
      <Card className="border-0 shadow-sm opacity-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-md font-bold text-gray-900">Training Documents</h3>
            <Badge variant="outline" className="text-xs">Coming Soon</Badge>
          </div>
          <div className="text-sm text-gray-500">Training documents will be available here soon.</div>
        </CardContent>
      </Card>

    </div>
  );
}