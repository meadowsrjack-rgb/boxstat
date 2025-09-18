"use client";

import { useAuth } from "@/hooks/useAuth";
import UypTrophyRings from "@/components/UypTrophyRings";
import PlayerCalendar from "@/components/PlayerCalendar";
import EventDetailPanel from "@/components/EventDetailPanel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Event } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Bell,
  MoreHorizontal,
  Calendar as CalendarIcon,
  Users,
  UserPlus,
  CreditCard,
  ChevronRight,
  MapPin,
  Check,
  Gauge,
  Sparkles,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Globe,
  Calendar,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { format, isSameDay, isAfter, startOfDay } from "date-fns";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

/* ===== Types ===== */
type UypEvent = Event;

type LinkedPlayer = {
  id: number;
  firstName: string;
  lastName: string;
  teamName?: string;
  profileImageUrl?: string;
  jerseyNumber?: number | null;
  position?: string | null;
  age?: number | null;
  skills?: { label: string; value: number }[]; // e.g., shooting/dribbling/passing
  awardsSummary?: {
    trophiesCount?: number;
    hofBadgesCount?: number;
    superstarBadgesCount?: number;
    allStarBadgesCount?: number;
    starterBadgesCount?: number;
    rookieBadgesCount?: number;
  };
  nextEvent?: {
    id: string | number;
    title: string;
    startTime: string;
    location?: string;
  } | null;
};

type BillingSummary = {
  planName: string;
  status: "paid" | "past_due" | "unpaid" | "trialing";
  nextPaymentDue: string | null; // ISO
  amountDueCents: number | null;
  currency: string; // "usd"
  last4?: string;
};

/* =================== Parent Dashboard =================== */
export default function ParentDashboard() {
  const { user } = useAuth();
  const currentUser = user as UserType | null;
  const [activeTab, setActiveTab] = useState<"calendar" | "players" | "payments">(() => {
    if (typeof window === "undefined") return "calendar";
    return (localStorage.getItem("parentDashboardTab") as any) || "calendar";
  });
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Enhanced calendar state
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventDetailOpen, setEventDetailOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("parentDashboardTab", activeTab);
  }, [activeTab]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  /* ===== Data ===== */
  // All events visible to parent (aggregated from linked players)
  const { data: parentEvents = [] as UypEvent[] } = useQuery<UypEvent[]>({
    queryKey: ["/api/parent/events"],
    queryFn: async () => {
      const res = await fetch("/api/parent/events", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Linked players with snapshot data (skills/awards/next event)
  const { data: linkedPlayers = [] as LinkedPlayer[] } = useQuery<LinkedPlayer[]>({
    queryKey: ["/api/parent/players"],
    queryFn: async () => {
      const res = await fetch("/api/parent/players", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Billing summary for indicators + Stripe portal link
  const { data: billing } = useQuery<BillingSummary | null>({
    queryKey: ["/api/billing/summary"],
    queryFn: async () => {
      const res = await fetch("/api/billing/summary", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  /* ===== Mutations ===== */
  const linkPlayerMutation = useMutation({
    mutationFn: async (payload: { playerId: string }) => {
      const res = await fetch("/api/parent/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ playerId: payload.playerId }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e.message || "Failed to add player");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Player linked", description: "We’ve added this player to your account and will auto-follow their activity." });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/events"] });
    },
    onError: (e: any) => toast({ title: "Couldn’t add player", description: String(e?.message || e), variant: "destructive" }),
  });

  const unlinkPlayerMutation = useMutation({
    mutationFn: async (playerId: number) => {
      const res = await fetch(`/api/parent/players/${playerId}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to remove player");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Player removed", description: "This player is no longer linked to your account." });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/players"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parent/events"] });
    },
  });

  const openStripePortal = async () => {
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", credentials: "include" });
      const j = await res.json();
      if (j?.url) window.location.href = j.url;
      else {
        const errorMessage = j?.error || "Please try again.";
        toast({ title: "Couldn't open billing portal", description: errorMessage, variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Billing portal error", description: "Please try again.", variant: "destructive" });
    }
  };

  // Today & upcoming (for small summaries under calendar)
  const todayEvents = useMemo(() => {
    const today = new Date();
    return parentEvents.filter((ev) => isSameDay(new Date((ev as any).startTime || (ev as any).start_time), today));
  }, [parentEvents]);

  const upcomingEvents = useMemo(() => {
    if (isSameDay(selectedDate, new Date())) {
      const start = startOfDay(new Date());
      return parentEvents
        .filter((ev) => isAfter(new Date((ev as any).startTime || (ev as any).start_time), start))
        .filter((ev) => !isSameDay(new Date((ev as any).startTime || (ev as any).start_time), new Date()))
        .slice(0, 3);
    } else {
      return parentEvents
        .filter((ev) => isSameDay(new Date((ev as any).startTime || (ev as any).start_time), selectedDate))
        .slice(0, 10);
    }
  }, [parentEvents, selectedDate]);

  const initials = `${(currentUser.firstName || "").charAt(0)}${(currentUser.lastName || "").charAt(0)}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar (kept from player view) */}
      <header className="bg-white shadow-sm">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="icon" className="h-12 w-12" aria-label="Notifications">
              <Bell className="h-12 w-12" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12"
              onClick={() => setLocation("/parent-settings")}
              aria-label="Settings"
            >
              <MoreHorizontal className="h-12 w-12" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-md mx-auto">
        {/* Avatar header */}
        <div className="px-6 py-6 text-center">
          <div className="flex justify-center mb-2">
            <ProfileAvatarRing src={currentUser.profileImageUrl || undefined} initials={initials} size={88} />
          </div>
          <div className="text-sm text-gray-600" data-testid="text-greeting">
            Hey, <span className="font-semibold text-gray-900">{currentUser.firstName}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6" data-testid="parent-dashboard-tabs">
          <div className="flex justify-between items-center">
            <TabButton label="calendar" activeTab={activeTab} onClick={setActiveTab} Icon={CalendarIcon} />
            <TabButton label="players" activeTab={activeTab} onClick={setActiveTab} Icon={Users} />
            <TabButton label="payments" activeTab={activeTab} onClick={setActiveTab} Icon={CreditCard} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6">
          {activeTab === "calendar" && (
            <div className="-mx-6">
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
                          setSelectedEvent(event as Event);
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
                          setSelectedEvent(event as Event);
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
                events={parentEvents as any} 
                currentUser={{...currentUser, email: currentUser.email || ''}}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
              />
            </div>
          )}

          {activeTab === "players" && (
            <div data-testid="players-tab-content">
              <PlayersTab />
            </div>
          )}

          {activeTab === "payments" && (
            <PaymentsTab billing={billing || undefined} onOpenStripe={openStripePortal} />
          )}

          {/* Event Detail Modal */}
          <EventDetailPanel
            event={selectedEvent}
            userId={currentUser.id}
            open={eventDetailOpen}
            onOpenChange={setEventDetailOpen}
          />
        </div>
      </main>
    </div>
  );
}

/* ===== Small components reused from the player view styling ===== */
function TabButton({
  label,
  activeTab,
  onClick,
  Icon,
}: {
  label: "calendar" | "players" | "payments";
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

function ProfileAvatarRing({
  src,
  initials,
  size = 80,
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
      style={{ width: size + 6, height: size + 6 }}
    >
      <div className="rounded-full overflow-hidden bg-white ring-4 ring-white shadow-md" style={{ width: size, height: size }}>
        <Avatar className="w-full h-full">
          <AvatarImage src={src} alt="Parent Avatar" />
          <AvatarFallback className="text-lg font-bold bg-gray-200">{initials}</AvatarFallback>
        </Avatar>
      </div>
    </motion.div>
  );
}

/* =================== Players Tab =================== */
function PlayersTab() {
  const [, setLocation] = useLocation();

  // Query for comprehensive player data
  const { data: linkedPlayers = [], isLoading } = useQuery({
    queryKey: ['/api/parent/players/comprehensive'],
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Linked Players</h2>
      </div>

      {/* Player Snapshots */}
      {isLoading ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <div className="text-sm text-gray-500">Loading player information...</div>
          </CardContent>
        </Card>
      ) : linkedPlayers.length ? (
        <div className="space-y-4">
          {linkedPlayers.map((player: any) => (
            <ComprehensivePlayerSnapshot key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center text-sm text-gray-500">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <div className="text-gray-500 mb-2">No players linked yet</div>
            <div className="text-xs text-gray-400">Players will automatically appear here when linked to your account</div>
          </CardContent>
        </Card>
      )}

      {/* Helpful tip */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-red-600" />
            <p className="text-sm text-gray-600">
              Player snapshots show real-time data including skills, achievements, attendance, and upcoming events.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ComprehensivePlayerSnapshot({ player }: { player: any }) {
  const [, setLocation] = useLocation();
  
  return (
    <Card 
      className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow hover:border-blue-300"
      onClick={() => setLocation(`/player-profile/${player.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Player Avatar */}
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg flex items-center justify-center font-bold text-lg">
            {player.firstName?.[0]?.toUpperCase() || 'P'}{player.lastName?.[0]?.toUpperCase() || ''}
          </div>
          
          {/* Player Info */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg text-gray-900">
                  {player.firstName} {player.lastName}
                </h3>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    {player.team?.name || 'No team assigned'}
                  </span>
                  {player.age && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Age {player.age}
                    </span>
                  )}
                  {player.jerseyNumber && (
                    <span className="text-blue-600 font-medium">#{player.jerseyNumber}</span>
                  )}
                </div>
              </div>
              
              {/* Registration Status */}
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                player.registrationStatus === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : player.registrationStatus === 'payment_required'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {player.registrationStatus === 'active' ? 'Up to Date' : 
                 player.registrationStatus === 'payment_required' ? 'Payment Required' : 'Pending'}
              </div>
            </div>
            
            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 mb-3">
              {/* Skill Rating */}
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{player.skillRating || '--'}</div>
                <div className="text-xs text-gray-500">Skill Rating</div>
              </div>
              
              {/* Trophies */}
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-600">{player.trophyCount || 0}</div>
                <div className="text-xs text-gray-500">Trophies</div>
              </div>
              
              {/* Badges */}
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{player.badgeCount || 0}</div>
                <div className="text-xs text-gray-500">Badges</div>
              </div>
              
              {/* Achievement Total */}
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{(player.trophyCount || 0) + (player.badgeCount || 0)}</div>
                <div className="text-xs text-gray-500">Total Awards</div>
              </div>
            </div>
            
            {/* Last Check-in */}
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Last check-in:</span>
              {player.lastCheckin ? (
                <span>
                  {new Date(player.lastCheckin.checkedInAt).toLocaleDateString()} at {player.lastCheckin.location || 'Unknown location'}
                </span>
              ) : (
                <span className="text-gray-400">No recent check-ins</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlayerSnapshot({ player, onRemove }: { player: LinkedPlayer; onRemove: () => void }) {
  const initials = `${player.firstName?.[0] || ""}${player.lastName?.[0] || ""}`.toUpperCase();

  const ringsData = useMemo(() => ({
    trophies: { earned: player.awardsSummary?.trophiesCount ?? 0, total: 10 },
    hallOfFame: { earned: player.awardsSummary?.hofBadgesCount ?? 0, total: 8 },
    superstar: { earned: player.awardsSummary?.superstarBadgesCount ?? 0, total: 12 },
    allStar: { earned: player.awardsSummary?.allStarBadgesCount ?? 0, total: 20 },
    starter: { earned: player.awardsSummary?.starterBadgesCount ?? 0, total: 18 },
    prospect: { earned: player.awardsSummary?.rookieBadgesCount ?? 0, total: 24 },
  }), [player.awardsSummary]);

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="shrink-0">
            <ProfileAvatarRing src={player.profileImageUrl} initials={initials} size={64} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <div className="truncate">
                <h4 className="font-semibold text-gray-900 truncate">
                  {player.firstName} {player.lastName}
                </h4>
                <div className="text-xs text-gray-600 mt-0.5">
                  {player.position || "Player"}
                  {player.jerseyNumber != null ? (
                    <span className="ml-1">#{player.jerseyNumber}</span>
                  ) : null}
                  {player.teamName ? <span className="ml-2 text-gray-500">• {player.teamName}</span> : null}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={onRemove}>Remove</Button>
            </div>

            {/* Rings + Skill snapshots */}
            <div className="mt-3 grid grid-cols-5 gap-2 items-center">
              <div className="col-span-2">
                <div className="cursor-pointer" onClick={() => (window.location.href = `/trophies-badges?playerId=${player.id}`)}>
                  <UypTrophyRings data={ringsData} size={76} stroke={6} />
                </div>
              </div>
              <div className="col-span-3 space-y-2">
                {(player.skills || [
                  { label: "SHOOTING", value: 0 },
                  { label: "DRIBBLING", value: 0 },
                  { label: "PASSING", value: 0 },
                ]).slice(0, 3).map((s) => (
                  <SkillBar key={s.label} label={s.label} value={s.value} onClick={() => (window.location.href = `/skills?playerId=${player.id}`)} />
                ))}
              </div>
            </div>

            {/* Next event */}
            <div className="mt-3">
              {player.nextEvent ? (
                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-700">
                    <div className="font-medium text-gray-900">{player.nextEvent.title}</div>
                    <div className="mt-0.5 text-[11px] text-gray-600">
                      {format(new Date(player.nextEvent.startTime), "EEE, MMM d • h:mm a")} {player.nextEvent.location ? "• " + player.nextEvent.location : ""}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              ) : (
                <div className="text-xs text-gray-500">No upcoming events.</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* =================== Registration & Payment Status Tab =================== */
function PaymentsTab({ billing, onOpenStripe }: { billing?: BillingSummary; onOpenStripe: () => void }) {
  const { data: account } = useQuery({
    queryKey: ["/api/account/me"],
    queryFn: async () => {
      const res = await fetch("/api/account/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['/api/profiles/me'],
    queryFn: async () => {
      const res = await fetch('/api/profiles/me', { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (!account) {
    return (
      <div className="space-y-5">
        <div className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Account Not Found</h2>
          <p className="text-gray-600">
            We couldn't find your account information. Please contact support for assistance.
          </p>
        </div>
      </div>
    );
  }

  const getRegistrationStatusInfo = (status: string) => {
    switch (status) {
      case 'active':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          label: 'Active',
          variant: 'default' as const,
          description: 'Your registration is complete and active'
        };
      case 'payment_required':
        return {
          icon: <CreditCard className="w-5 h-5 text-orange-600" />,
          label: 'Payment Required',
          variant: 'destructive' as const,
          description: 'Payment is needed to complete registration'
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-gray-600" />,
          label: 'Pending',
          variant: 'secondary' as const,
          description: 'Registration is being processed'
        };
    }
  };

  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          label: 'Paid',
          variant: 'default' as const
        };
      case 'overdue':
        return {
          icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
          label: 'Overdue',
          variant: 'destructive' as const
        };
      default:
        return {
          icon: <Clock className="w-5 h-5 text-yellow-600" />,
          label: 'Pending',
          variant: 'secondary' as const
        };
    }
  };

  const registrationInfo = getRegistrationStatusInfo(account.registrationStatus);
  const paymentInfo = getPaymentStatusInfo(account.paymentStatus);
  const playerProfiles = profiles.filter((p: any) => p.profileType === 'player');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-2" data-testid="title-registration">
          Registration & Payment Status
        </h2>
        <p className="text-gray-600">
          View your registration and payment status for UYP Basketball
        </p>
      </div>

      {/* Alert for payment required */}
      {account.registrationStatus === 'payment_required' && (
        <Alert className="border-orange-200 bg-orange-50" data-testid="alert-payment-required">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700">
            <strong>Payment Required:</strong> Your registration is pending payment. 
            You should have received payment instructions via email. Please complete payment to activate your account.
          </AlertDescription>
        </Alert>
      )}

      {account.paymentStatus === 'overdue' && (
        <Alert className="border-red-200 bg-red-50" data-testid="alert-payment-overdue">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            <strong>Payment Overdue:</strong> Your payment is overdue. 
            Please complete payment immediately to avoid service interruption.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Registration Status Card */}
        <Card data-testid="card-registration-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {registrationInfo.icon}
              Registration Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant={registrationInfo.variant} data-testid="badge-registration-status">
                {registrationInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {registrationInfo.description}
            </p>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Account Email:</span>
                <span className="font-medium" data-testid="text-account-email">{account.email}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Status Card */}
        <Card data-testid="card-payment-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {paymentInfo.icon}
              Payment Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant={paymentInfo.variant} data-testid="badge-payment-status">
                {paymentInfo.label}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              Payments are processed through our registration system. 
              {account.paymentStatus === 'pending' && ' You will receive payment instructions via email.'}
              {account.paymentStatus === 'overdue' && ' Please check your email for payment details.'}
            </p>
            {account.paymentStatus !== 'paid' && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-blue-700 text-sm">
                  <strong>Need Help?</strong> If you have questions about payment or haven't received instructions, 
                  please contact our support team.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Players Information */}
      <Card data-testid="card-players-info">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Registered Players ({playerProfiles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {playerProfiles.length > 0 ? (
            <div className="grid gap-4">
              {playerProfiles.map((player: any, index: number) => (
                <div 
                  key={player.id} 
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  data-testid={`player-card-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {player.firstName.charAt(0)}{player.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`player-name-${index}`}>
                        {player.firstName} {player.lastName}
                      </p>
                      <p className="text-sm text-gray-600">
                        {player.jerseyNumber && `#${player.jerseyNumber} • `}
                        Player Profile
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" data-testid={`player-status-${index}`}>
                    Registered
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No player profiles found</p>
              <p className="text-sm text-gray-500 mt-2">
                Player profiles will appear here once registration is complete
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      {account.registrationStatus === 'active' && (
        <Card data-testid="card-next-steps">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Check the schedule for upcoming practices and games</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Complete player profiles with emergency contacts</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Download the team communication app if available</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ===== Shared SkillBar from player view ===== */
function SkillBar({ label, value, onClick }: { label: string; value: number; onClick?: () => void }) {
  return (
    <motion.div onClick={onClick} className="space-y-1 cursor-pointer" whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
      <div className="flex justify-between text-[11px]">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-red-600 font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <motion.div className="bg-red-600 h-2 rounded-full" initial={{ width: 0 }} whileInView={{ width: `${value}%` }} viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6, ease: "easeOut" }} />
      </div>
    </motion.div>
  );
}
