import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import UypTrophyRings from "@/components/UypTrophyRings";
import PlayerCalendar from "@/components/PlayerCalendar";
import EventDetailModal from "@/components/EventDetailModal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Team, Event } from "@shared/schema";
import PlayerSearch from "@/components/PlayerSearch";
import PlayerCard from "@/components/PlayerCard";
import TeamChat from "@/components/TeamChat";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Bell,
  MoreHorizontal,
  TrendingUp,
  Play,
  Shirt,
  User,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Calendar as CalendarIcon,
  MessageCircle,
  Send,
  UserCheck,
  Check,
  Sparkles,
  Lock,
  Globe,
  Edit,
  MoreVertical,
  MapPin,
  Search,
  Ruler,
  Gauge,
  Cake,
  Hash,
  Users,
  Copy,
  Target,
  Dumbbell,
  Trophy,
} from "lucide-react";
import NotificationCenter from "@/components/NotificationCenter";
import { NotificationBell } from "@/components/NotificationBell";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import PushNotificationSetup from "@/components/PushNotificationSetup";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isAfter, startOfDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths, isToday as isDateToday } from "date-fns";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PINDialog } from "@/components/PINDialog";

/* ===== “Wheel” option lists ===== */
const TEAM_OPTIONS = [
  // Skills Academy (5 teams)
  "Rookies",
  "Intermediate",
  "Advanced",
  "Elite",
  "Special Needs",
  // FNHTL (13 teams)
  "Dragons",
  "Eagles",
  "Trojans",
  "Titans",
  "Bruins",
  "Silverswords",
  "Vikings",
  "Storm",
  "Dolphins",
  "Anteaters",
  "Wildcats",
  "Wolverines",
  "Wizards",
  // Youth Club (11 teams)
  "10u Black",
  "12u Black",
  "12u Red",
  "Youth Girls Black",
  "Youth Girls Red",
  "13u White",
  "13u Black",
  "14u Black",
  "14u Gray",
  "14u Red",
  "Black Elite",
  // High School (4 teams)
  "High-School-Elite",
  "High-School-Red",
  "High-School-Black",
  "High-School-White",
];
const POSITION_OPTIONS = ["PG", "SG", "SF", "PF", "C"];
const AGE_OPTIONS = Array.from({ length: 20 }, (_, i) => `${i + 6}`);
const HEIGHT_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const inches = 48 + i;
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
});
const WEIGHT_OPTIONS = Array.from({ length: 121 }, (_, i) => `${80 + i}`);
const JERSEY_OPTIONS = Array.from({ length: 100 }, (_, i) => `${i}`);

/* ===== Types ===== */
type UypEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime?: string;
  eventType?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  teamId?: number | null;
};

// Helper function to convert database Event to UypEvent
function convertEventToUypEvent(event: Event | any): UypEvent {
  // If already a UypEvent, return as is
  if (typeof event.id === 'string' && typeof event.startTime === 'string') {
    const result = event as UypEvent;
    // Ensure location is always a string for CheckInButton compatibility
    return {
      ...result,
      location: result.location || 'TBD'
    };
  }
  
  // Convert database Event to UypEvent
  return {
    id: event.id?.toString() || '',
    title: event.title || event.summary || '',
    startTime: event.startTime instanceof Date ? event.startTime.toISOString() : event.startTime || event.start_time || '',
    endTime: event.endTime instanceof Date ? event.endTime.toISOString() : event.endTime || event.end_time,
    eventType: event.eventType,
    location: event.location || 'TBD',
    latitude: event.latitude ?? undefined,
    longitude: event.longitude ?? undefined,
    description: event.description || undefined,
    teamId: event.teamId,
  };
}
type Task = {
  id: string | number;
  type: "ATTENDANCE" | "PROFILE_BIO" | "HOMEWORK" | "MODULE";
  title: string;
  status: "PENDING" | "COMPLETED";
  eventId?: string | number;
  moduleId?: string | number;
};
type CheckIn = {
  id: string | number;
  eventId: string | number;
  type: "advance" | "onsite";
  createdAt: string;
};

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string | null | undefined): number | null {
  if (!dateOfBirth) return null;
  
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export default function PlayerDashboard({ childId }: { childId?: number | null }) {
  const { user } = useAuth();
  const { currentChildProfile } = useAppMode();
  const [showFoundationProgram, setShowFoundationProgram] = useState(false);
  // Initialize activeTab from URL params or localStorage, defaulting to 'activity'
  const urlParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tabFromUrl = urlParams.get('tab') as "activity" | "video" | "team" | "profile" | null;
  const savedTab = typeof window !== "undefined" ? localStorage.getItem('playerDashboardTab') as "activity" | "video" | "team" | "profile" | null : null;
  const [activeTab, setActiveTab] = useState<"activity" | "video" | "team" | "profile">(
    tabFromUrl || savedTab || "activity"
  );
  
  const [newMessage, setNewMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  
  // Check if device is locked to this player
  const [isDeviceLocked, setIsDeviceLocked] = useState(false);
  
  // PIN dialog state
  const [pinDialogOpen, setPinDialogOpen] = useState(false);
  
  useEffect(() => {
    const checkLockStatus = () => {
      const lockedPlayerId = localStorage.getItem("deviceLockedToPlayer");
      const currentPlayerId = localStorage.getItem("selectedPlayerId");
      setIsDeviceLocked(lockedPlayerId === currentPlayerId && lockedPlayerId !== null);
    };
    
    checkLockStatus();
    
    // Listen for storage changes (including from same window)
    window.addEventListener('storage', checkLockStatus);
    
    // Also listen for custom event for same-window updates
    const handleLockChange = () => checkLockStatus();
    window.addEventListener('deviceLockChanged', handleLockChange);
    
    return () => {
      window.removeEventListener('storage', checkLockStatus);
      window.removeEventListener('deviceLockChanged', handleLockChange);
    };
  }, []);

  // Sync activeTab with URL changes (for back button navigation)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tabFromUrl = urlParams.get('tab') as "activity" | "video" | "team" | "profile" | null;
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [location, activeTab]);

  // Update URL and localStorage when activeTab changes
  const handleTabChange = (newTab: "activity" | "video" | "team" | "profile") => {
    setActiveTab(newTab);
    if (typeof window !== "undefined") {
      localStorage.setItem('playerDashboardTab', newTab);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('tab', newTab);
      window.history.replaceState({}, '', newUrl.toString());
    }
  };

  // Profile editing (Profile tab)
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showEditProfileDropdown, setShowEditProfileDropdown] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({ discoverable: true });

  // Load privacy settings from backend
  useEffect(() => {
    const loadPrivacySettings = async () => {
      try {
        const response = await fetch('/api/privacy');
        if (response.ok) {
          const data = await response.json();
          setPrivacySettings({ discoverable: data.searchable });
        }
      } catch (error) {
        console.error('Failed to load privacy settings:', error);
      }
    };
    loadPrivacySettings();
  }, []);
  const [editableProfile, setEditableProfile] = useState({
    firstName: "",
    lastName: "",
    age: "",
    height: "",
    weight: "",
    location: "",
    city: "", // Add city field to match what the UI displays
    position: "",
    jerseyNumber: "",
    instagram: "",
    twitter: "",
    tiktok: "",
  });

  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'slide-in-left' | 'slide-in-right' | null>(null);

  // ---- Early guard
  const currentUser = user as UserType | null;
  
  // Early return if no user
  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen-safe safe-bottom">Loading...</div>;
  }
  
  // Fetch active profile if parent has activeProfileId OR if selectedPlayerId is in localStorage
  const selectedPlayerId = typeof window !== "undefined" ? localStorage.getItem("selectedPlayerId") : null;
  const activeProfileId = (currentUser as any)?.activeProfileId || selectedPlayerId;
  const { data: activeProfile, isLoading: isLoadingActiveProfile } = useQuery<UserType>({
    queryKey: ["/api/profile", activeProfileId],
    enabled: !!activeProfileId,
  });

  // ---- Data (moved before early return to avoid hooks order issues)
  const { data: childProfiles } = useQuery({
    queryKey: ["/api/child-profiles", currentUser?.id],
    enabled: !!currentUser?.id,
  });

  const selectedChildId = childId?.toString() || urlParams.get("childId") || undefined;

  const currentChild = Array.isArray(childProfiles)
    ? childProfiles.find((c: any) => c.id.toString() === selectedChildId) || childProfiles[0]
    : null;

  // Determine which user's team to fetch: 
  // Priority: activeProfile (from localStorage) > currentChildProfile (from device config) > currentUser
  const userIdForTeam = activeProfile?.id || currentChildProfile?.id || currentUser.id;
  
  const { data: userTeam } = useQuery<Team>({
    queryKey: ["/api/users", userIdForTeam, "team"],
    enabled: !!userIdForTeam,
  });

  // Fetch divisions for lookup
  const { data: divisions = [] } = useQuery<any[]>({
    queryKey: ["/api/divisions"],
    staleTime: 30 * 60 * 1000,
  });

  // Fetch events (backend filters based on user's role, team membership, and child profile)
  // Priority: activeProfile (from localStorage) > currentChildProfile (from device config)
  const childProfileId = activeProfile?.id || currentChildProfile?.id;
  const { data: allEvents = [] } = useQuery<any[]>({
    queryKey: childProfileId 
      ? ["/api/events?childProfileId=" + childProfileId]
      : ["/api/events"],
    enabled: !!currentUser.id,
  });
  
  // Convert database events to UypEvent format
  const displayEvents: UypEvent[] = useMemo(() => {
    return (allEvents || []).map(convertEventToUypEvent);
  }, [allEvents]);

  // Player Tasks (server-driven)
  // Use child profile ID if viewing as child, otherwise use current user ID
  // Priority: activeProfile (from localStorage) > currentChildProfile (from device config) > currentUser
  const userIdForData = activeProfile?.id || currentChildProfile?.id || currentUser.id;
  
  const { data: tasks = [] as Task[] } = useQuery<Task[]>({
    queryKey: ["/api/users", userIdForData, "tasks"],
    enabled: !!userIdForData,
  });

  // Awards summary (counts + recent items)
  const { data: awardsSummary } = useQuery<any>({
    queryKey: ["/api/users", userIdForData, "awards"],
    enabled: !!userIdForData,
  });

  // Latest skill evaluation for overall skills assessment
  const { data: latestEvaluation } = useQuery<any>({
    queryKey: ["/api/players/" + userIdForData + "/latest-evaluation"],
    enabled: !!currentUser.id,
  });

  // Calculate overall skill average from evaluation scores
  const calculateOverallSkillAverage = (evaluation: any): number => {
    if (!evaluation?.scores) return 0;
    
    const scores = evaluation.scores;
    let totalScore = 0;
    let totalSkills = 0;
    
    // Iterate through all categories
    Object.values(scores).forEach((category: any) => {
      if (category && typeof category === 'object') {
        // Iterate through all skills in the category
        Object.values(category).forEach((skillValue: any) => {
          if (typeof skillValue === 'number') {
            totalScore += skillValue;
            totalSkills++;
          }
        });
      }
    });
    
    if (totalSkills === 0) return 0;
    
    // Average is out of 5, convert to percentage
    const average = totalScore / totalSkills;
    return Math.round((average / 5) * 100);
  };

  const overallSkillScore = calculateOverallSkillAverage(latestEvaluation);

  // Check-ins (client derives tasks from events; server stores submissions)
  const { data: checkins = [] as CheckIn[] } = useQuery<CheckIn[]>({
    queryKey: ["/api/attendances?userId=" + currentUser.id],
    enabled: !!currentUser.id,
    staleTime: 30_000,
  });

  // Mutations
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
      queryClient.invalidateQueries({ queryKey: ["/api/users", userIdForData, "tasks"] });
      toast({ title: "Task completed", description: "Nice work!" });
    },
    onError: (e) =>
      toast({
        title: "Could not complete task",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  const createCheckInMutation = useMutation({
    mutationFn: async (payload: { eventId: string | number; type: "advance" | "onsite"; lat?: number; lng?: number }) => {
      const res = await fetch(`/api/attendances`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...payload, userId: userIdForData }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to check in`);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendances", userIdForData] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userIdForData, "awards"] }); // refresh badges
      toast({ title: "Checked in", description: "We recorded your check-in." });
    },
    onError: (e) =>
      toast({
        title: "Check-in failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      }),
  });

  // Use active profile if available (for parents), otherwise use currentUser (for players)
  const displayProfile = activeProfile || currentUser;
  
  // Update editable profile when display profile data changes
  useEffect(() => {
    if (displayProfile) {
      const cityValue = displayProfile.city || displayProfile.address || "";
      const calculatedAge = calculateAge(displayProfile.dateOfBirth);
      setEditableProfile(prev => ({
        ...prev,
        firstName: displayProfile.firstName || "",
        lastName: displayProfile.lastName || "",
        age: calculatedAge !== null ? calculatedAge.toString() : "",
        height: displayProfile.height || "",
        location: cityValue,
        city: cityValue,
        position: displayProfile.position || "",
        jerseyNumber: displayProfile.jerseyNumber?.toString() || "",
      }));
    }
  }, [displayProfile]);

  // Save tab to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem('playerDashboardTab', activeTab);
    }
  }, [activeTab]);

  // Real-time triggers (unchanged)
  useEffect(() => {
    if (!currentUser?.id) return;
    const protocol = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${typeof window !== "undefined" ? window.location.host : ""}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "join", userId: currentUser.id, teamId: userTeam?.id }));
      setWs(socket);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type?.includes("module") || data.type?.includes("attendance") || data.type?.includes("profile")) {
          queryClient.invalidateQueries({ queryKey: ["/api/users", currentUser.id, "tasks"] });
        }
        if (data.type === "new_team_message" && data.teamId === userTeam?.id) {
          queryClient.invalidateQueries({ queryKey: ["/api/teams", userTeam?.id, "messages"] });
        }
      } catch (e) {
        console.error("WS parse error", e);
      }
    };

    socket.onclose = () => setWs(null);
    return () => socket.close();
  }, [currentUser?.id, userTeam?.id, queryClient]);

  // Helpers
  const initials = `${(displayProfile?.firstName || "").charAt(0)}${(displayProfile?.lastName || "").charAt(0)}`.toUpperCase();

  const todayEvents = useMemo(() => {
    const today = new Date();
    return (allEvents || []).filter((ev: Event) => {
      const dt = new Date(ev.startTime);
      return isSameDay(dt, today);
    });
  }, [allEvents]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    const isSelectedToday = isSameDay(selectedDate, today);
    
    if (isSelectedToday) {
      // Show actual upcoming events when today is selected
      const start = startOfDay(new Date());
      return (allEvents || [])
        .filter((ev: Event) => isAfter(new Date(ev.startTime), start))
        .filter((ev: Event) => !isSameDay(new Date(ev.startTime), new Date()))
        .slice(0, 3);
    } else {
      // Show selected day's events when a different day is selected
      return (allEvents || []).filter((ev: Event) => {
        const dt = new Date(ev.startTime);
        return isSameDay(dt, selectedDate);
      });
    }
  }, [allEvents, selectedDate]);

  // Filter events relevant to the current user/player
  const relevantEvents = useMemo(() => {
    if (!displayEvents.length) return [];
    
    const userName = `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim().toLowerCase();
    const teamName = (userTeam?.name || "").toLowerCase();
    
    return displayEvents.filter(event => {
      const title = ((event as any).title || (event as any).summary || "").toLowerCase();
      const description = ((event as any).description || "").toLowerCase();
      
      // Show if event mentions user's name, team, or is a general event
      return title.includes(userName) || 
             title.includes(teamName) ||
             title.includes("practice") ||
             title.includes("game") ||
             title.includes("training") ||
             title.includes("skills") ||
             description.includes(userName) ||
             description.includes(teamName);
    });
  }, [displayEvents, currentUser, userTeam]);

  // Get events for selected date
  const eventsForSelectedDate = useMemo(() => {
    return relevantEvents.filter(event => 
      isSameDay(new Date(event.startTime || (event as any).start_time), selectedDate)
    );
  }, [relevantEvents, selectedDate]);

  // Get dates that have events for calendar display
  const eventDateStrings = useMemo(() => {
    const eventDates = new Set<string>();
    relevantEvents.forEach(event => {
      eventDates.add(new Date(event.startTime || (event as any).start_time).toDateString());
    });
    return eventDates;
  }, [relevantEvents]);

  // Calendar helper functions
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    const daysInMonth = eachDayOfInterval({ start: firstDay, end: lastDay });
    const startingDayOfWeek = getDay(firstDay);
    
    const calendarDays = [];
    
    // Previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = new Date(year, month - 1, prevMonth.getDate() - i);
      calendarDays.push({ date: day, isCurrentMonth: false });
    }
    
    // Current month's days
    daysInMonth.forEach(day => {
      calendarDays.push({ date: day, isCurrentMonth: true });
    });
    
    // Next month's leading days (fill to complete the grid if needed)
    const totalCells = calendarDays.length;
    const remainingCells = totalCells < 35 ? 35 - totalCells : 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
      const nextMonthDay = new Date(year, month + 1, day);
      calendarDays.push({ date: nextMonthDay, isCurrentMonth: false });
    }
    
    return calendarDays;
  };

  const formatEventTime = (startTime: string) => {
    try {
      return format(new Date(startTime), 'h:mm a');
    } catch {
      return 'Time TBD';
    }
  };

  const previousMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('right');
    setTimeout(() => {
      setCurrentDate(subMonths(currentDate, 1));
      setSlideDirection('slide-in-left');
      setTimeout(() => {
        setSlideDirection(null);
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  const nextMonth = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlideDirection('left');
    setTimeout(() => {
      setCurrentDate(addMonths(currentDate, 1));
      setSlideDirection('slide-in-right');
      setTimeout(() => {
        setSlideDirection(null);
        setIsAnimating(false);
      }, 50);
    }, 150);
  };

  const selectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const calendarDays = renderCalendar();

  // ===== Check-in logic
  const MS = {
    HOUR: 60 * 60 * 1000,
    MIN: 60 * 1000,
  };
  const isAdvanceWindow = (start: Date, now = new Date()) => {
    const t = start.getTime();
    const n = now.getTime();
    return n >= t - 48 * MS.HOUR && n <= t - 6 * MS.HOUR;
  };
  const isOnsiteWindow = (start: Date, now = new Date()) => {
    const t = start.getTime();
    const n = now.getTime();
    // 1h before until 15m after tip-off
    return n >= t - 1 * MS.HOUR && n <= t + 15 * MS.MIN;
  };

  const checkinByEvent = useMemo(() => {
    const map = new Map<string | number, { advance?: CheckIn; onsite?: CheckIn }>();
    for (const c of checkins) {
      const entry = map.get(c.eventId) || {};
      if (c.type === "advance") entry.advance = c;
      if (c.type === "onsite") entry.onsite = c;
      map.set(c.eventId, entry);
    }
    return map;
  }, [checkins]);

  // Get coordinates helper
  const getEventCoords = (ev: any): { lat?: number; lng?: number; address?: string } => {
    if (typeof ev.locationLat === "number" && typeof ev.locationLng === "number")
      return { lat: ev.locationLat, lng: ev.locationLng };
    if (ev.locationCoords && typeof ev.locationCoords.lat === "number")
      return { lat: ev.locationCoords.lat, lng: ev.locationCoords.lng };
    if (ev.location) return { address: ev.location as string };
    return {};
  };

  const geocodeIfNeeded = async (address?: string) => {
    if (!address) return undefined;
    try {
      const res = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      if (!res.ok) return undefined;
      const j = await res.json();
      if (j && typeof j.lat === "number" && typeof j.lng === "number") return { lat: j.lat, lng: j.lng };
    } catch {}
    return undefined;
  };

  const haversineMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(a));
    return R * c;
  };

  const doAdvanceCheckIn = async (eventId: string | number) => {
    createCheckInMutation.mutate({ eventId, type: "advance" });
  };

  const doOnsiteCheckIn = async (ev: any) => {
    const start = new Date(ev.startTime || (ev as any).start_time);
    if (!isOnsiteWindow(start)) {
      toast({ title: "Not in on-site window", description: "Try within 1 hour before start (or up to 15m after)." });
      return;
    }

    const coords = getEventCoords(ev);
    let eventLat = coords.lat;
    let eventLng = coords.lng;

    if ((eventLat == null || eventLng == null) && coords.address) {
      const gc = await geocodeIfNeeded(coords.address);
      if (gc) {
        eventLat = gc.lat;
        eventLng = gc.lng;
      }
    }

    if (eventLat == null || eventLng == null) {
      toast({
        title: "Location unavailable",
        description: "This event has no mappable location, so on-site check-in is disabled.",
        variant: "destructive",
      });
      return;
    }

    if (!("geolocation" in navigator)) {
      toast({
        title: "GPS not supported",
        description: "Your device does not support location services.",
        variant: "destructive",
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const d = haversineMeters(latitude, longitude, eventLat!, eventLng!);
        const within = d <= 150; // 150m radius
        if (!within) {
          toast({
            title: "Too far from venue",
            description: `Move closer to the event location to check in (≈${Math.round(d)}m away).`,
            variant: "destructive",
          });
          return;
        }
        createCheckInMutation.mutate({ eventId: ev.id, type: "onsite", lat: latitude, lng: longitude });
      },
      (err) => {
        toast({
          title: "Location denied",
          description: "Enable location permissions to complete on-site check-in.",
          variant: "destructive",
        });
        console.error(err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Seed editable values when entering edit mode
  const primeEditable = () => {
    setEditableProfile((prev) => ({
      ...prev,
      age: prev.age || "",
      height: prev.height || "",
      weight: prev.weight || "",
      location: prev.location || "",
      position: currentChild?.position || prev.position || "",
      jerseyNumber: (currentChild?.jerseyNumber as any)?.toString() || prev.jerseyNumber || "",
      instagram: prev.instagram || "",
      twitter: prev.twitter || "",
      tiktok: prev.tiktok || "",
    }));
  };

  // Build rings data for UypTrophyRings using real awards data
  const ringsData = useMemo(() => {
    console.log('Awards Summary:', awardsSummary); // Debug log
    if (!awardsSummary) {
      return {
        trophies:   { earned: 0, total: 10 },
        hallOfFame: { earned: 0, total: 8  },
        superstar:  { earned: 0, total: 12 },
        allStar:    { earned: 0, total: 20 },
        starter:    { earned: 0, total: 18 },
        prospect:   { earned: 0, total: 24 },
      };
    }
    
    // Count awards by prestige level from the allAwards array
    const allAwards = awardsSummary.allAwards || [];
    const prestigeCounts = {
      HallOfFame: 0,
      Superstar: 0,
      AllStar: 0,
      Starter: 0,
      Prospect: 0,
    };
    
    allAwards.forEach((award: any) => {
      if (award.prestige && prestigeCounts.hasOwnProperty(award.prestige)) {
        prestigeCounts[award.prestige as keyof typeof prestigeCounts]++;
      }
    });
    
    // Use the actual award counts from the API
    return {
      trophies:   { earned: awardsSummary.totalTrophies || 0, total: 20 },
      hallOfFame: { earned: prestigeCounts.HallOfFame, total: 8  },
      superstar:  { earned: prestigeCounts.Superstar, total: 12 },
      allStar:    { earned: prestigeCounts.AllStar, total: 20 },
      starter:    { earned: prestigeCounts.Starter, total: 18 },
      prospect:   { earned: prestigeCounts.Prospect, total: 24 },
    };
  }, [awardsSummary]);

  // Handle unlock with PIN
  const handleUnlockClick = () => {
    setPinDialogOpen(true);
  };
  
  const handlePinSuccess = () => {
    // Remove lock
    localStorage.removeItem("deviceLockedToPlayer");
    localStorage.removeItem("deviceLockPIN");
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new Event('deviceLockChanged'));
    
    toast({
      title: "Device Unlocked",
      description: "You can now access all player dashboards and the account page.",
    });
  };

  /* =================== UI =================== */
  return (
    <div className="scrollable-page bg-gray-50 safe-bottom">
      {/* Top Bar (QR removed) */}
      <header className="bg-white shadow-sm safe-top">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            {isDeviceLocked ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={handleUnlockClick}
                aria-label="Unlock Device"
                data-testid="button-unlock-device"
              >
                <Lock className="h-5 w-5 text-red-600" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12"
                onClick={() => setLocation("/profile-gateway")}
                aria-label="Switch Profile"
                data-testid="button-switch-profile"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
            )}
            <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => setLocation("/player-settings")}
            >
              <MoreHorizontal className="h-12 w-12" />
            </Button>
            </div>
          </div>
        </div>
      </header>
      {/* Main */}
      <main className="max-w-md mx-auto">
        {/* Announcement Banner */}
        <div className="px-6 pt-4">
          <AnnouncementBanner />
        </div>
        {/* Avatar header */}
        <div className="px-6 py-6 text-center">
          <div className="flex justify-center mb-2">
            <ProfileAvatarRing
              src={displayProfile.profileImageUrl}
              initials={initials}
              size={88}
            />
          </div>
          <div className="text-sm text-gray-600">
            Hey, <span className="font-semibold text-gray-900">{displayProfile.firstName}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6">
          <div className="flex justify-between items-center">
            <TabButton label="activity" activeTab={activeTab} onClick={handleTabChange} Icon={CalendarIcon} />
            <TabButton label="video" activeTab={activeTab} onClick={handleTabChange} Icon={Play} />
            <TabButton label="team" activeTab={activeTab} onClick={handleTabChange} Icon={Shirt} />
            <TabButton label="profile" activeTab={activeTab} onClick={handleTabChange} Icon={User} />
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6">
          {/* Activity */}
          {activeTab === "activity" && (
            <div className="-mx-6">
              {/* Push Notification Setup */}
              <div className="px-6 mb-6">
                <PushNotificationSetup compact />
              </div>
              {/* Event Summaries - moved above calendar */}
              <div className="px-6 py-6 space-y-4">
                <section className="space-y-2">
                  <h3 className="text-lg font-bold text-gray-900">Today</h3>
                  {todayEvents.length ? (
                    todayEvents.map((event) => (
                      <div 
                        key={event.id} 
                        className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setSelectedEvent(event);
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
                          setSelectedEvent(event);
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

              {/* Calendar component - moved below events */}
              <PlayerCalendar 
                events={relevantEvents.map(convertEventToUypEvent)} 
                currentUser={{
                  id: currentUser.id,
                  email: currentUser.email || '',
                  firstName: currentUser.firstName || undefined,
                  lastName: currentUser.lastName || undefined
                }} 
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
          )}

          {/* Event Detail Modal */}
          <EventDetailModal
            event={selectedEvent}
            userId={activeProfile?.id || currentChildProfile?.id || currentUser.id}
            userRole={currentUser.role as 'admin' | 'coach' | 'player' | 'parent'}
            open={eventDetailOpen}
            onOpenChange={setEventDetailOpen}
          />

          {/* Activity Original (commented out) */}
          {false && activeTab === "activity" && (
            <div className="space-y-8">
              {/* ===== Check-In Tasks (appears above calendar) */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Check-In Tasks</h3>
                </div>

                {/* Build list from next 7 days of events */}
                <div className="space-y-3">
                  {displayEvents
                    .filter((ev) => {
                      const start = new Date(ev.startTime || (ev as any).start_time);
                      const now = new Date();
                      // Only show within next 7 days or today (and not past far)
                      const within7d = start.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
                      return within7d;
                    })
                    .slice(0, 8)
                    .map((ev) => {
                      const start = new Date(ev.startTime || (ev as any).start_time);
                      const check = checkinByEvent.get(ev.id) || {};
                      const advanceDone = !!check.advance;
                      const onsiteDone = !!check.onsite;
                      const inAdvance = isAdvanceWindow(start);
                      const inOnsite = isOnsiteWindow(start);
                      const canAdvance = inAdvance && !advanceDone;
                      const canOnsite = inOnsite && !onsiteDone;

                      return (
                        <div key={ev.id} className="p-3 bg-white rounded-lg shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-red-100 text-red-700 text-[11px] px-2 py-0.5">Event</Badge>
                                <span className="text-xs text-gray-500">
                                  {format(start, "EEE, MMM d • h:mm a")}
                                </span>
                              </div>
                              <div className="mt-1 text-sm font-semibold text-gray-900">
                                {(ev as any).title || (ev as any).summary || "Scheduled Event"}
                              </div>
                              {(ev as any).location && (
                                <div className="mt-1 text-xs text-gray-600 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {(ev as any).location}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col gap-2 min-w-[150px]">
                              {/* RSVP (Advance) */}
                              <Button
                                disabled={!canAdvance}
                                onClick={() => doAdvanceCheckIn(ev.id)}
                                className={`h-9 ${canAdvance ? "" : "opacity-50 cursor-not-allowed"}`}
                                variant={advanceDone ? "secondary" : "default"}
                              >
                                {advanceDone ? "RSVP’d" : "RSVP Check-In"}
                              </Button>

                              {/* On-site */}
                              <Button
                                disabled={!canOnsite}
                                onClick={() => doOnsiteCheckIn(ev)}
                                className={`h-9 ${canOnsite ? "" : "opacity-50 cursor-not-allowed"}`}
                                variant={onsiteDone ? "secondary" : "default"}
                              >
                                {onsiteDone ? "On-Site Done" : "On-Site Check-In"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                  {displayEvents.length === 0 && (
                    <div className="text-sm text-gray-500">No upcoming events to check in.</div>
                  )}
                </div>
              </section>


              {/* View Calendar Button */}
              <section className="px-6 py-4">
                <Button
                  variant="outline"
                  className="w-full text-red-600 border-red-600 hover:bg-red-50"
                  onClick={() => setLocation("/schedule")}
                >
                  View Calendar
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </section>
            </div>
          )}

          {/* Video */}
          {activeTab === "video" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div
                className="cursor-pointer transition-transform hover:scale-105"
                onClick={() => setShowFoundationProgram(true)}
                data-testid="foundation-program-logo"
              >
                <img
                  src="/foundation-logo.png"
                  alt="BoxStat Foundation Program"
                  className="w-48 h-auto drop-shadow-lg hover:drop-shadow-xl transition-all"
                />
                <div className="text-center mt-4">
                  <div className="text-lg font-bold text-gray-900">Foundation Program</div>
                  <div className="text-sm text-gray-600">Tap to learn more</div>
                </div>
              </div>
            </div>
          )}

          {/* Team */}
          {activeTab === "team" && <TeamBlock />}

          {/* Profile */}
          {activeTab === "profile" && (
            <div className="scrollable-page bg-gradient-to-b from-gray-50 to-white safe-bottom -mx-6 px-6 pb-10">
              {/* Futuristic Bio Section */}
              <div className="relative px-0 pt-6">
                <motion.section
                  initial={{ y: 24, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="relative rounded-3xl bg-white/70 backdrop-blur-xl overflow-hidden"
                >
                    {/* Decorative grid overlay */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.06]"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)",
                        backgroundSize: "16px 16px",
                      }}
                    />

                    {/* Header */}
                    <div className="relative px-6 pt-8 pb-5 text-center bg-[#fbfbfc]">
                      
                      <h1
                        className="mt-3 text-4xl font-black tracking-tight leading-tight"
                        style={{
                          color: "#d82428",
                          textShadow: "0 1px 0 rgba(255,255,255,0.6)",
                        }}
                      >
                        {displayProfile?.firstName || "Jack"} {displayProfile?.lastName || "Meadows"}
                      </h1>

                      <div className="mt-1 text-sm font-medium text-gray-700">
                        {editableProfile.position ? (
                          <>
                            {editableProfile.position} #{editableProfile.jerseyNumber || "—"}
                          </>
                        ) : (
                          <span className="text-gray-400">Position not set</span>
                        )}
                        {editableProfile.city && (
                          <div className="text-xs text-gray-600 mt-1">From {editableProfile.city}</div>
                        )}
                      </div>

                      {userTeam?.name && (
                        <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-red-50 text-[13px] font-semibold text-[#d82428] px-3 py-1.5 ring-1 ring-[rgba(216,36,40,0.18)]">
                          <Shirt className="h-4 w-4 text-[#d82428]" />
                          {userTeam?.name}
                        </div>
                      )}
                    </div>

                    {/* Info grid */}
                    <div className="relative px-6 pb-8 bg-[#f9fafb]">
                      <div className="grid grid-cols-3 gap-3">
                        <motion.div
                          initial={{ y: 12, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0, duration: 0.35 }}
                          className="group rounded-2xl bg-white/70 ring-1 ring-black/5 p-3 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-500">
                            <span
                              className="grid place-items-center h-6 w-6 rounded-lg bg-red-50 ring-1 ring-[rgba(216,36,40,0.20)]"
                              style={{ color: "#d82428" }}
                            >
                              <Ruler className="h-4 w-4" />
                            </span>
                            <span>HEIGHT</span>
                          </div>
                          <div className="mt-1.5 text-[15px] font-bold text-gray-900 tracking-tight">
                            {editableProfile.height || <span className="text-gray-400 text-sm">Not set</span>}
                          </div>
                          <div className="mt-2 h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent" />
                        </motion.div>

                        <motion.div
                          initial={{ y: 12, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          transition={{ delay: 0.05, duration: 0.35 }}
                          className="group rounded-2xl bg-white/70 ring-1 ring-black/5 p-3 shadow-sm hover:shadow-md transition-all"
                        >
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-gray-500">
                            <span
                              className="grid place-items-center h-6 w-6 rounded-lg bg-red-50 ring-1 ring-[rgba(216,36,40,0.20)]"
                              style={{ color: "#d82428" }}
                            >
                              <Target className="h-4 w-4" />
                            </span>
                            <span>DIVISION</span>
                          </div>
                          <div className="mt-1.5 text-[15px] font-bold text-gray-900 tracking-tight">
                            {userTeam?.divisionId ? (
                              divisions.find((d: any) => d.id === userTeam.divisionId)?.name || userTeam.divisionId
                            ) : (
                              <span className="text-gray-400 text-sm">Not assigned</span>
                            )}
                          </div>
                          <div className="mt-2 h-px bg-gradient-to-r from-transparent via-red-200/60 to-transparent" />
                        </motion.div>

                        </div>
                    </div>
                </motion.section>
              </div>

              {/* Settings Section */}
              {isEditingProfile && (
                <div className="p-6 bg-white rounded-lg shadow-sm">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Profile Information</h3>
                  <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                        <Select value={editableProfile.position || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, position: v }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select position" />
                          </SelectTrigger>
                          <SelectContent>
                            {POSITION_OPTIONS.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jersey Number</label>
                        <Select value={editableProfile.jerseyNumber || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, jerseyNumber: v }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select number" />
                          </SelectTrigger>
                          <SelectContent>
                            {JERSEY_OPTIONS.map((n) => (
                              <SelectItem key={n} value={n}>
                                #{n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                        <Select value={editableProfile.height || ""} onValueChange={(v) => setEditableProfile((p) => ({ ...p, height: v }))}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select height" />
                          </SelectTrigger>
                          <SelectContent>
                            {HEIGHT_OPTIONS.map((h) => (
                              <SelectItem key={h} value={h}>
                                {h}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                        <CityTypeahead
                          value={editableProfile.city}
                          onChange={(city) => setEditableProfile((p) => ({ ...p, city: city, location: city }))}
                        />
                      </div>
                    </div>
                    
                    {/* Privacy Settings */}
                    <div className="pt-4 border-t">
                      <h4 className="text-md font-medium text-gray-900 mb-3">Privacy Settings</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Profile Discoverable</span>
                          <p className="text-xs text-gray-500">Allow others to find your profile</p>
                        </div>
                        <button
                          onClick={async () => {
                            const newValue = !privacySettings.discoverable;
                            setPrivacySettings(prev => ({ ...prev, discoverable: newValue }));
                            try {
                              await fetch('/api/privacy', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ settings: { searchable: newValue } })
                              });
                            } catch (error) {
                              console.error('Failed to update privacy settings:', error);
                            }
                          }}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            privacySettings.discoverable ? 'bg-red-600' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              privacySettings.discoverable ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {/* Save Button */}
                    <div className="flex justify-end pt-4">
                      <SaveProfile
                        profileId={displayProfile?.id}
                        editableProfile={editableProfile}
                        setEditableProfile={setEditableProfile}
                        setIsEditingProfile={setIsEditingProfile}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* UYP Ranking Percentile */}
              <div className="px-2">
                <div className="max-w-[340px] mx-auto">
                  <SkillBar 
                    label="UYP RANKING PERCENTILE"  
                    value={overallSkillScore} 
                    onClick={() => setLocation("/skills")} 
                  />
                </div>
              </div>

              {/* Trophies & Badges */}
              <div className="p-2">
                <div 
                  className="cursor-pointer" 
                  onClick={() => setLocation("/trophies-badges")}
                  data-testid="trophy-rings-clickable"
                >
                  <UypTrophyRings data={ringsData} size={109} stroke={8} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Foundation Program Popup (unchanged) */}
      <Dialog open={showFoundationProgram} onOpenChange={setShowFoundationProgram}>
        <DialogContent
          className="max-w-4xl mx-auto bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto p-0"
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle className="sr-only">BoxStat Foundation Program</DialogTitle>
          <div className="relative">
            {/* Header */}
            <header className="px-6 pt-10 pb-6">
              <div className="text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">UYP Foundation Program</h1>
                <p className="mt-2 max-w-2xl mx-auto text-sm leading-6 text-gray-700">Master your fundamentals in 12 weeks. Five Skill drills and one Strength & Conditioning exercise each week.</p>
              </div>
            </header>

            {/* Feature strip */}
            <section className="px-6 pb-6">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-600">Weekly Flow</p>
                    <p className="mt-1 text-sm text-gray-700">5 Skill & 1 S&C video in one focused session.</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-600">For All Levels</p>
                    <p className="mt-1 text-sm text-gray-700">Simple, game-ready drills that scale with your pace.</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-4">
                    <p className="text-sm font-semibold text-red-600">Clear Milestones</p>
                    <p className="mt-1 text-sm text-gray-700">Track progress with weekly quizzes and reflections.</p>
                  </div>
                </div>
              </div>
            </section>

            
          </div>
        </DialogContent>
      </Dialog>
      {/* PIN Dialog for unlocking */}
      <PINDialog
        open={pinDialogOpen}
        onOpenChange={setPinDialogOpen}
        mode="verify"
        onSuccess={handlePinSuccess}
        title="Enter PIN to Unlock"
        description="Enter your 4-digit PIN to unlock the device"
      />
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
      className={`flex flex-col items-center space-y-3 py-4 px-3 ${active ? "text-red-600" : "text-gray-400"}`}
      style={{ color: active ? "#d82428" : undefined }}
    >
      <Icon className="h-6 w-6" />
      <div
        className={`h-1 w-12 rounded-full transition-all duration-200 ${active ? "opacity-100" : "opacity-0"}`}
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
      {editing ? <div className="w-48 text-right">{editControl}</div> : <span className="text-gray-600">{viewValue || "—"}</span>}
    </div>
  );
}

function CityTypeahead({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [q, setQ] = useState(value || "");
  const { data: cities = [] } = useQuery<string[]>({
    queryKey: ["/api/locations", q],
    enabled: q.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/locations?query=${encodeURIComponent(q)}`);
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

function ProfileAvatarRing({
  src,
  initials,
  size = 80, // inner avatar size (px)
}: {
  src?: string;
  initials: string;
  size?: number;
}) {
  return (
    <motion.div
      className="inline-block rounded-full p-[3px] bg-[conic-gradient(at_50%_50%,#fecaca,#fde8e8,#fecaca)] shadow-sm"
      animate={{ rotate: 360 }}
      transition={{ duration: 20, ease: "linear", repeat: Infinity }}
      whileHover={{ scale: 1.03 }}
      style={{
        // outer diameter = inner + padding; p-[3px] adds ~6px total
        width: size + 6,
        height: size + 6,
      }}
    >
      <div className="rounded-full overflow-hidden bg-white ring-4 ring-white shadow-md"
           style={{ width: size, height: size }}>
        <Avatar className="w-full h-full">
          <AvatarImage src={src} alt="Player Avatar" />
          <AvatarFallback className="text-lg font-bold bg-gray-200">
            {initials}
          </AvatarFallback>
        </Avatar>
      </div>
    </motion.div>
  );
}

function SkillBar({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void;
}) {
  return (
    <motion.div
      onClick={onClick}
      className="space-y-2 cursor-pointer p-2 rounded-lg"
      whileHover={{ scale: 1.01 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-red-600 font-semibold">{value}%</span>
      </div>

      {/* Wider track to visually line up with trophy rings */}
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <motion.div
          className="bg-red-600 h-2.5 rounded-full"
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </motion.div>
  );
}

function PriceCard({ title, priceLine, cta, badge }: { title: string; priceLine: string; cta: string; badge?: string }) {
  return (
    <div className="group relative h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-lg flex flex-col">
      {badge && (
        <span className="absolute -top-3 right-4 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
          {badge}
        </span>
      )}
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-red-600" />
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
      </div>
      <div className="mb-1 text-3xl font-extrabold tracking-tight text-gray-900">{priceLine}</div>
      <p className="mb-4 text-sm text-gray-500">{title === "Monthly" ? "Cancel anytime" : "One-time payment"}</p>
      <ul className="mb-6 space-y-3 text-sm text-gray-700">
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>12-week curriculum with weekly checklist</span>
        </li>
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>Five Skill + S&C videos each week (one focused session)</span>
        </li>
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>Basketball IQ videos</span>
        </li>
        <li className="flex items-start gap-3">
          <Check className="mt-0.5 h-4 w-4 text-red-600" />
          <span>Weekly quiz + reflection</span>
        </li>
      </ul>
      <div className="mt-auto">
        <button className="h-12 w-full rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700">
          {cta}
        </button>
      </div>
    </div>
  );
}

// Type for program membership response
interface ProgramMembership {
  enrollmentId: number;
  programId: string;
  programName: string;
  programType: string | null;
  hasSubgroups: boolean;
  subgroupLabel: string;
  rosterVisibility: string;
  chatMode: string;
  status: string;
  remainingCredits: number | null;
  totalCredits: number | null;
  teams: Array<{
    teamId: number | null;  // teams.id is serial (integer)
    teamName: string | null;
    memberRole: string;
    coachId: string | null;
    members?: Array<{
      id: string | undefined;
      name: string | undefined;
      role: string;
      profilePic: string | null | undefined;
    }>;
  }>;
}

// Individual program card with its subgroups
function ProgramCard({ 
  membership, 
  displayProfileId,
}: { 
  membership: ProgramMembership;
  displayProfileId: string | undefined;
}) {
  const [expandedTeamId, setExpandedTeamId] = useState<number | null>(null);
  
  // Get icon based on program type or name
  const getProgramIcon = () => {
    const name = membership.programName.toLowerCase();
    if (name.includes('club') || name.includes('youth')) return <Shirt className="h-6 w-6 text-red-600" />;
    if (name.includes('skill') || name.includes('training')) return <Dumbbell className="h-6 w-6 text-blue-600" />;
    if (name.includes('private') || name.includes('coach')) return <Users className="h-6 w-6 text-green-600" />;
    return <Trophy className="h-6 w-6 text-red-600" />;
  };
  
  const getSubgroupColor = () => {
    const label = membership.subgroupLabel.toLowerCase();
    if (label === 'team') return 'bg-red-100 text-red-700';
    if (label === 'level') return 'bg-blue-100 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <Card className="border-0 shadow-sm mb-4" data-testid={`program-card-${membership.programId}`}>
      <CardContent className="p-4">
        {/* Program Header */}
        <div className="flex items-start space-x-4 mb-4">
          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
            {getProgramIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900" data-testid={`text-program-name-${membership.programId}`}>
              {membership.programName}
            </h3>
            {membership.programType && (
              <p className="text-sm text-gray-600">{membership.programType}</p>
            )}
            {membership.remainingCredits !== null && (
              <div className="text-xs text-gray-500 mt-1">
                {membership.remainingCredits} of {membership.totalCredits} credits remaining
              </div>
            )}
          </div>
        </div>
        
        {/* Subgroups (Teams/Levels/Groups) - only show if program has subgroups */}
        {membership.hasSubgroups && membership.teams.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-700">
              Your {membership.subgroupLabel}{membership.teams.length > 1 ? 's' : ''}:
            </div>
            {membership.teams.map((team) => (
              <SubgroupCard
                key={team.teamId}
                team={team}
                membership={membership}
                displayProfileId={displayProfileId}
                isExpanded={expandedTeamId === team.teamId}
                onToggle={() => setExpandedTeamId(expandedTeamId === team.teamId ? null : team.teamId)}
                subgroupColor={getSubgroupColor()}
              />
            ))}
          </div>
        )}
        
        {/* No subgroups message */}
        {membership.hasSubgroups && membership.teams.length === 0 && (
          <div className="text-sm text-gray-500 italic">
            No {membership.subgroupLabel.toLowerCase()} assigned yet
          </div>
        )}
        
        {/* Programs without subgroups (like Private Training) - show program-level info */}
        {!membership.hasSubgroups && (
          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              This program does not have {membership.subgroupLabel.toLowerCase()}s.
            </div>
            
            {/* Credits info for pack holders */}
            {membership.totalCredits && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Credits:</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                  {membership.remainingCredits ?? 0} / {membership.totalCredits}
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Individual subgroup (team/level/group) card with expandable roster and chat
function SubgroupCard({
  team,
  membership,
  displayProfileId,
  isExpanded,
  onToggle,
  subgroupColor,
}: {
  team: ProgramMembership['teams'][0];
  membership: ProgramMembership;
  displayProfileId: string | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  subgroupColor: string;
}) {
  const [, navigate] = useLocation();
  // Visibility checks from program social settings
  const showRoster = membership.rosterVisibility !== 'hidden';
  const showChat = membership.chatMode !== 'disabled';
  
  // Use members data from the program-memberships response (already fetched)
  // This avoids an extra API call for roster data
  const teamMembers = team.members || [];
  
  // Fetch coach info only when expanded and we have a coach
  const { data: coachInfo } = useQuery<any>({
    queryKey: ["/api/users", team.coachId],
    enabled: isExpanded && !!team.coachId,
  });

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden" data-testid={`subgroup-${team.teamId}`}>
      {/* Subgroup Header - clickable to expand */}
      <div 
        className="p-3 bg-gray-50 flex items-center justify-between cursor-pointer hover:bg-gray-100"
        onClick={onToggle}
        data-testid={`subgroup-header-${team.teamId}`}
      >
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 text-xs font-medium rounded ${subgroupColor}`}>
            {team.teamName}
          </span>
          {team.coachId && (
            <span className="text-xs text-gray-500">
              with Coach
            </span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
      </div>
      
      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Roster Section - only if visible */}
          {showRoster && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2" data-testid={`roster-title-${team.teamId}`}>
                {membership.subgroupLabel} Roster
              </h4>
              {teamMembers.length === 0 && !coachInfo ? (
                <div className="text-sm text-gray-500">No members yet.</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {/* Coach Entry */}
                  {coachInfo && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={coachInfo.profileImageUrl} />
                        <AvatarFallback className="text-xs bg-red-600 text-white">
                          {coachInfo.firstName?.[0]}{coachInfo.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {coachInfo.firstName} {coachInfo.lastName}
                          <span className="ml-2 px-1.5 py-0.5 text-xs bg-red-600 text-white rounded">COACH</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Member Entries (from program-memberships response) */}
                  {teamMembers.map((member: any, index: number) => {
                    const memberKey = member.id || `member-${index}`;
                    const memberName = member.name || 'Unknown';
                    const initials = memberName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();
                    const isCoach = member.role === 'coach' || member.role === 'head_coach' || member.role === 'assistant_coach';
                    
                    // Skip coaches in member list (already shown above)
                    if (isCoach) return null;
                    
                    return (
                      <div 
                        key={memberKey}
                        className={`flex items-center gap-2 p-2 rounded ${
                          member.id ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-60'
                        }`}
                        onClick={() => member.id && navigate(`/players/${member.id}`)}
                        data-testid={`roster-member-${memberKey}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.profilePic} />
                          <AvatarFallback className="text-xs bg-red-100 text-red-600">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="text-sm">
                          <span className="font-medium text-gray-900">{memberName}</span>
                          {member.role && member.role !== 'player' && (
                            <span className="text-xs text-gray-400 ml-1">({member.role})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          
          {/* Chat Section - only if enabled */}
          {showChat && team.teamId && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2" data-testid={`chat-title-${team.teamId}`}>
                {membership.chatMode === 'announcements' ? 'Announcements' : `${membership.subgroupLabel} Chat`}
              </h4>
              <TeamChat 
                teamId={Number(team.teamId)}
                currentProfileId={displayProfileId}
                readOnly={membership.chatMode === 'announcements'}
              />
            </div>
          )}
          
          {/* Message if no roster or chat visible */}
          {!showRoster && !showChat && (
            <div className="text-sm text-gray-500 italic">
              Roster and chat are not available for this {membership.subgroupLabel.toLowerCase()}.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TeamBlock() {
  const { user } = useAuth();
  const currentUser = user as UserType;
  const { currentChildProfile } = useAppMode();
  
  // Fetch active profile from localStorage (same as main dashboard)
  const localSelectedPlayerId = typeof window !== "undefined" ? localStorage.getItem("selectedPlayerId") : null;
  const activeProfileId = (currentUser as any)?.activeProfileId || localSelectedPlayerId;
  const { data: activeProfile } = useQuery<UserType>({
    queryKey: [`/api/profile/${activeProfileId}`],
    enabled: !!activeProfileId,
  });
  
  // Use active profile if available (for parents), otherwise use currentUser (for players)
  const displayProfile = activeProfile || currentUser;
  
  // Use child profile ID if viewing as child, otherwise use current user ID
  const userIdForPrograms = activeProfile?.id || currentChildProfile?.id || currentUser.id;
  
  // Fetch program memberships with social settings
  const { data: programMemberships = [], isLoading: isLoadingPrograms } = useQuery<ProgramMembership[]>({
    queryKey: ["/api/users", userIdForPrograms, "program-memberships"],
    enabled: !!userIdForPrograms,
  });
  
  // Fetch direct team assignment (fallback for when no program enrollments exist)
  const { data: directTeam } = useQuery<Team>({
    queryKey: ["/api/users", userIdForPrograms, "team"],
    enabled: !!userIdForPrograms,
  });
  
  // Check if the user has any teams shown via program memberships
  const hasTeamsInPrograms = programMemberships.some(m => m.teams && m.teams.length > 0);

  return (
    <div className="space-y-6" data-testid="team-block">
      {/* Programs Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4" data-testid="text-my-programs">My Programs</h2>
        
        {isLoadingPrograms ? (
          <div className="text-sm text-gray-500">Loading programs...</div>
        ) : programMemberships.length === 0 && !directTeam ? (
          <div className="text-sm text-gray-500 mb-4" data-testid="text-no-programs">
            No programs enrolled yet. Contact your organization to get started!
          </div>
        ) : (
          <div className="space-y-4">
            {programMemberships.map((membership) => (
              <ProgramCard
                key={membership.enrollmentId}
                membership={membership}
                displayProfileId={displayProfile?.id}
              />
            ))}
            
            {/* Show direct team assignment if user has a team but no program enrollments or no teams in programs */}
            {directTeam && !hasTeamsInPrograms && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" data-testid="direct-team-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Users className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">My Team</h3>
                    <p className="text-sm text-gray-500">Direct team assignment</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-red-600" />
                    <span className="font-medium text-gray-900">{directTeam.name}</span>
                  </div>
                  {directTeam.divisionId && (
                    <p className="text-sm text-gray-500 mt-1">Division {directTeam.divisionId}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveProfile({
  profileId,
  editableProfile,
  setEditableProfile,
  setIsEditingProfile,
}: {
  profileId: string | number | undefined;
  editableProfile: any;
  setEditableProfile: (fn: any) => void;
  setIsEditingProfile: (b: boolean) => void;
}) {
  const { user } = useAuth();
  const currentUser = user as UserType;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const updateProfile = useMutation({
    mutationFn: async (payload: any) => {
      return await apiRequest(`/api/profile/${profileId}`, {
        method: "PATCH",
        data: payload,
      });
    },
    onSuccess: () => {
      toast({ title: "Profile updated", description: "Changes saved." });
      // Invalidate all profile-related queries to force refresh
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${profileId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/profile/${currentUser.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/child-profiles", currentUser.id] });
      setIsEditingProfile(false);
    },
    onError: (e) => toast({ title: "Save failed", description: String(e), variant: "destructive" }),
  });

  return (
    <Button size="sm" onClick={() => updateProfile.mutate(editableProfile)} disabled={updateProfile.isPending}>
      {updateProfile.isPending ? "Saving..." : "Save Changes"}
    </Button>
  );
}
