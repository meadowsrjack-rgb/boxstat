"use client";

import { useAuth } from "@/hooks/useAuth";
import UypTrophyRings from "@/components/UypTrophyRings";
import PlayerCalendar from "@/components/PlayerCalendar";
import EventDetailPanel from "@/components/EventDetailPanel";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import type { User as UserType, Event } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
          <div className="text-sm text-gray-600">
            Welcome back, <span className="font-semibold text-gray-900">{currentUser.firstName}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-6">
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
            <PlayersTab
              players={linkedPlayers}
              onAdd={(payload) => linkPlayerMutation.mutate(payload)}
              onRemove={(id) => unlinkPlayerMutation.mutate(id)}
              isAdding={linkPlayerMutation.isPending}
            />
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
function PlayersTab({
  players,
  onAdd,
  onRemove,
  isAdding,
}: {
  players: LinkedPlayer[];
  onAdd: (p: { playerId: string }) => void;
  onRemove: (id: number) => void;
  isAdding: boolean;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  // Search players query using Notion data
  const { data: searchResponse, isLoading: isSearching } = useQuery({
    queryKey: ['/api/search/notion-players', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return { ok: true, players: [] };
      
      const response = await fetch(`/api/search/notion-players?q=${encodeURIComponent(searchQuery)}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const searchResults = searchResponse?.players || [];

  const handleAddPlayer = () => {
    if (selectedPlayer) {
      onAdd({ playerId: selectedPlayer.id });
      setShowAdd(false);
      setSearchQuery("");
      setSelectedPlayer(null);
    }
  };

  const resetSearch = () => {
    setSearchQuery("");
    setSelectedPlayer(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Players</h2>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-4 w-4 mr-2" /> Add Player
        </Button>
      </div>

      {/* List */}
      {players.length ? (
        <div className="space-y-4">
          {players.map((p) => (
            <PlayerSnapshot key={p.id} player={p} onRemove={() => onRemove(p.id)} />
          ))}
        </div>
      ) : (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-6 text-center text-sm text-gray-500">
            No players linked yet. Click <span className="font-medium text-gray-700">Add Player</span> to get started.
          </CardContent>
        </Card>
      )}

      {/* Helpful tip */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-5 w-5 text-red-600" />
            <p className="text-sm text-gray-600">
              Search and link players to automatically import their calendar, skills, and trophies to your dashboard.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add dialog with search */}
      <Dialog open={showAdd} onOpenChange={(open) => { setShowAdd(open); if (!open) resetSearch(); }}>
        <DialogContent className="max-w-lg mx-auto bg-white text-gray-900 rounded-2xl shadow-2xl border border-gray-200 p-0">
          <DialogTitle className="sr-only">Add Player</DialogTitle>
          <div className="p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900">Search and Add Player</h3>
            <p className="text-sm text-gray-600">Search for a player to add them to your dashboard.</p>

            {/* Search Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">Search Players</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input 
                  placeholder="Search by name, team, or program..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {searchQuery.length >= 2 && (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {isSearching ? (
                  <div className="text-center py-4 text-sm text-gray-500">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((player: any) => (
                    <div
                      key={player.id}
                      onClick={() => setSelectedPlayer(player)}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlayer?.id === player.id
                          ? "border-red-500 bg-red-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="font-medium text-gray-900">{player.displayText || player.fullName}</div>
                      {player.team && (
                        <div className="text-sm text-gray-600">{player.team}</div>
                      )}
                      {player.currentProgram && (
                        <Badge variant="secondary" className="mt-1 text-xs">
                          {player.currentProgram}
                        </Badge>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-sm text-gray-500">No players found</div>
                )}
              </div>
            )}

            {searchQuery.length < 2 && (
              <div className="text-center py-4 text-sm text-gray-500">
                Type at least 2 characters to search
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setShowAdd(false); resetSearch(); }}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={!selectedPlayer || isAdding}
                onClick={handleAddPlayer}
              >
                {isAdding ? "Adding…" : "Add Player"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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

/* =================== Payments Tab =================== */
function PaymentsTab({ billing, onOpenStripe }: { billing?: BillingSummary; onOpenStripe: () => void }) {
  const { data: account } = useQuery({
    queryKey: ["/api/account/me"],
    queryFn: async () => {
      const res = await fetch("/api/account/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case "payment_required":
        return <Badge className="bg-red-100 text-red-700">Payment Required</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-700">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Unknown</Badge>;
    }
  };

  const getPaymentBadge = (paymentStatus: string) => {
    switch (paymentStatus) {
      case "paid":
        return <Badge className="bg-green-100 text-green-700">Paid</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-700">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-700">Overdue</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-900">Registration Status</h2>

      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Registration Status */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Registration</div>
                <div className="font-semibold text-gray-900">
                  {account?.registrationStatus === "active" ? "Complete" : "Incomplete"}
                </div>
              </div>
              <div>
                {getStatusBadge(account?.registrationStatus || "pending")}
              </div>
            </div>

            {/* Payment Status */}
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Payment</div>
                <div className="font-semibold text-gray-900">
                  {account?.paymentStatus === "paid" ? "Complete" : 
                   account?.paymentStatus === "overdue" ? "Overdue" : "Pending"}
                </div>
              </div>
              <div>
                {getPaymentBadge(account?.paymentStatus || "pending")}
              </div>
            </div>

            {/* Account Email */}
            <div className="pt-2 border-t border-gray-100">
              <div className="text-sm text-gray-500">Account</div>
              <div className="font-semibold text-gray-900">{account?.email || "—"}</div>
            </div>

            {/* Status Message */}
            {account?.registrationStatus === "active" && account?.paymentStatus === "paid" && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-sm text-green-700 font-medium">
                  ✓ Your registration is complete and payment is up to date!
                </div>
              </div>
            )}

            {account?.registrationStatus === "payment_required" && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-sm text-red-700 font-medium">
                  Payment is required to complete your registration.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
