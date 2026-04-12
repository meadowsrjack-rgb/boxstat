import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Medal, ArrowLeft, Lock, Trophy, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getAwardIcon, isIconIdentifier } from "@/components/awards/awardIcons";

type TierType = "Prospect" | "Starter" | "All-Star" | "Superstar" | "HOF" | "Legacy";
type TriggerCategory = "checkin" | "system" | "time" | "store" | "manual";

interface AwardDefinition {
  id: number;
  name: string;
  tier: TierType;
  description: string | null;
  imageUrl: string | null;
  active: boolean;
  triggerCategory?: TriggerCategory;
  threshold?: number;
  programIds?: string[] | null;
}

interface ProgramMembership {
  enrollmentId: number;
  programId: string;
  programName: string;
}

interface UserAwardRecord {
  id: number;
  userId: string;
  awardId: number;
  awardedAt: string;
  awardedBy: string | null;
  year: number | null;
  notes: string | null;
  visible: boolean;
}

interface AwardWithDetails extends AwardDefinition {
  earnedDate: string;
  awardedBy?: string;
  year?: number;
  notes?: string;
}

const TIER_GRADIENT = {
  Prospect: "from-gray-500/20 to-gray-600/10 border-gray-500/40",
  Starter: "from-green-500/20 to-green-600/10 border-green-500/40",
  "All-Star": "from-blue-500/20 to-blue-600/10 border-blue-500/40",
  Superstar: "from-purple-500/20 to-purple-600/10 border-purple-500/40",
  HOF: "from-yellow-500/20 to-yellow-600/10 border-yellow-500/40",
  Legacy: "from-pink-500/20 via-yellow-500/10 to-purple-500/20 border-purple-500/40",
};

const TIER_ICON_COLOR = {
  Prospect: "text-gray-400",
  Starter: "text-green-400",
  "All-Star": "text-blue-400",
  Superstar: "text-purple-400",
  HOF: "text-yellow-400",
  Legacy: "text-pink-400",
};

const TIER_GLOW = {
  Prospect: "",
  Starter: "drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]",
  "All-Star": "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]",
  Superstar: "drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]",
  HOF: "drop-shadow-[0_0_10px_rgba(234,179,8,0.6)]",
  Legacy: "drop-shadow-[0_0_12px_rgba(236,72,153,0.5)]",
};

const TIER_BADGE_COLOR = {
  Prospect: "bg-gray-500/20 text-gray-300 border-gray-500/50",
  Starter: "bg-green-500/20 text-green-300 border-green-500/50",
  "All-Star": "bg-blue-500/20 text-blue-300 border-blue-500/50",
  Superstar: "bg-purple-500/20 text-purple-300 border-purple-500/50",
  HOF: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  Legacy: "bg-pink-500/20 text-pink-300 border-pink-500/50",
};

const TRIGGER_LABELS: Record<TriggerCategory, string> = {
  checkin: "Check-in",
  system: "Collection",
  time: "Time",
  store: "Store",
  manual: "Manual"
};

function AwardIcon({ award, className }: { award: AwardDefinition; className?: string }) {
  const iconId = award.imageUrl;
  if (iconId && isIconIdentifier(iconId)) {
    const LucideIcon = getAwardIcon(iconId)!;
    return <LucideIcon className={className} />;
  }
  if (iconId) {
    return (
      <img
        src={iconId}
        alt={award.name}
        className="w-full h-full object-contain"
      />
    );
  }
  return <Medal className={className} />;
}

export default function TrophiesBadgesPage() {
  const { user } = useAuth();
  const { currentChildProfile } = useAppMode();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [selectedTier, setSelectedTier] = useState<"all" | TierType>("all");
  const [selectedTrigger, setSelectedTrigger] = useState<"all" | TriggerCategory>("all");
  const [selectedProgram, setSelectedProgram] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "tier">("newest");

  const urlParams = new URLSearchParams(searchString);
  const urlPlayerId = urlParams.get("playerId");
  const selectedPlayerId = typeof window !== "undefined" ? localStorage.getItem("selectedPlayerId") : null;
  const activeProfileId = urlPlayerId || (user as any)?.activeProfileId || selectedPlayerId;
  const viewingUserId = activeProfileId || currentChildProfile?.id || user?.id;

  const { data: awardDefinitions, isLoading: loadingDefinitions } = useQuery<AwardDefinition[]>({
    queryKey: ["/api/award-definitions"],
    enabled: !!user,
  });

  const { data: userAwardsResponse, isLoading: loadingUserAwards } = useQuery<{ allAwards: UserAwardRecord[] }>({
    queryKey: ["/api/users", viewingUserId, "awards"],
    enabled: !!user && !!viewingUserId,
  });
  
  const userAwardRecords = userAwardsResponse?.allAwards || [];

  const { data: programMemberships = [] } = useQuery<ProgramMembership[]>({
    queryKey: ["/api/users", viewingUserId, "program-memberships"],
    enabled: !!viewingUserId,
  });

  const earnedAwards = useMemo<AwardWithDetails[]>(() => {
    if (!awardDefinitions || userAwardRecords.length === 0) return [];
    
    return userAwardRecords
      .filter(record => record.visible)
      .map(record => {
        const definition = awardDefinitions.find(def => def.id === record.awardId);
        if (!definition) return null;
        
        return {
          ...definition,
          earnedDate: record.awardedAt,
          awardedBy: record.awardedBy || undefined,
          year: record.year || undefined,
          notes: record.notes || undefined,
        } as AwardWithDetails;
      })
      .filter((award): award is AwardWithDetails => award !== null);
  }, [awardDefinitions, userAwardRecords]);

  const availableAwards = useMemo<AwardDefinition[]>(() => {
    if (!awardDefinitions) return [];
    const earnedIds = new Set(earnedAwards.map(a => a.id));
    return awardDefinitions.filter(def => def.active && !earnedIds.has(def.id));
  }, [awardDefinitions, earnedAwards]);

  const tierOrder = ["Legacy", "HOF", "Superstar", "All-Star", "Starter", "Prospect"];

  const matchesProgram = (award: AwardDefinition) => {
    if (selectedProgram === "all") return true;
    if (!award.programIds || award.programIds.length === 0) return true;
    return award.programIds.includes(selectedProgram);
  };

  const filteredEarnedAwards = useMemo(() => {
    let filtered = earnedAwards;
    if (selectedTier !== "all") filtered = filtered.filter(award => award.tier === selectedTier);
    if (selectedTrigger !== "all") filtered = filtered.filter(award => (award.triggerCategory || "manual") === selectedTrigger);
    filtered = filtered.filter(matchesProgram);

    return filtered.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime();
      if (sortBy === "oldest") return new Date(a.earnedDate).getTime() - new Date(b.earnedDate).getTime();
      return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    });
  }, [earnedAwards, selectedTier, selectedTrigger, selectedProgram, sortBy]);

  const filteredAvailableAwards = useMemo(() => {
    let filtered = availableAwards;
    if (selectedTier !== "all") filtered = filtered.filter(award => award.tier === selectedTier);
    if (selectedTrigger !== "all") filtered = filtered.filter(award => (award.triggerCategory || "manual") === selectedTrigger);
    filtered = filtered.filter(matchesProgram);
    return filtered.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));
  }, [availableAwards, selectedTier, selectedTrigger, selectedProgram]);

  const stats = useMemo(() => ({
    total: earnedAwards.length,
    legacy: earnedAwards.filter(a => a.tier === "Legacy").length,
    hof: earnedAwards.filter(a => a.tier === "HOF").length,
    superstar: earnedAwards.filter(a => a.tier === "Superstar").length,
    allStar: earnedAwards.filter(a => a.tier === "All-Star").length,
    starter: earnedAwards.filter(a => a.tier === "Starter").length,
    prospect: earnedAwards.filter(a => a.tier === "Prospect").length,
  }), [earnedAwards]);

  const isLoading = loadingDefinitions || loadingUserAwards;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <div className="scrollable-page bg-gradient-to-b from-slate-900 via-gray-900 to-black text-white safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setLocation("/player-dashboard")}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <Trophy className="h-7 w-7 text-yellow-400" />
              <h1 className="text-3xl font-bold" data-testid="text-page-title">Awards</h1>
            </div>
            <p className="text-sm text-gray-400 mt-1" data-testid="text-page-subtitle">
              Track your achievements and earn rewards for your dedication
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-yellow-400">{stats.total}</p>
            <p className="text-xs text-gray-400">Earned</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[
            { count: stats.legacy, label: "Legacy", color: "text-pink-400" },
            { count: stats.hof, label: "HOF", color: "text-yellow-400" },
            { count: stats.superstar, label: "Superstar", color: "text-purple-400" },
            { count: stats.allStar, label: "All-Star", color: "text-blue-400" },
            { count: stats.starter, label: "Starter", color: "text-green-400" },
            { count: stats.prospect, label: "Prospect", color: "text-gray-400" },
          ].map(({ count, label, color }) => (
            <div
              key={label}
              className="text-center p-3 bg-white/5 rounded-xl border border-white/10"
              data-testid={`card-stat-${label.toLowerCase().replace("-", "")}`}
            >
              <p className={`text-xl font-bold ${color}`}>{count}</p>
              <p className={`text-xs font-medium ${color} opacity-80`}>{label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white/5 border border-white/10 rounded-xl p-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Tier</label>
              <Select value={selectedTier} onValueChange={(value) => setSelectedTier(value as any)}>
                <SelectTrigger className="bg-white/10 border-white/20 h-8 text-xs" data-testid="select-tier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="Legacy">Legacy</SelectItem>
                  <SelectItem value="HOF">HOF</SelectItem>
                  <SelectItem value="Superstar">Superstar</SelectItem>
                  <SelectItem value="All-Star">All-Star</SelectItem>
                  <SelectItem value="Starter">Starter</SelectItem>
                  <SelectItem value="Prospect">Prospect</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Category</label>
              <Select value={selectedTrigger} onValueChange={(value) => setSelectedTrigger(value as any)}>
                <SelectTrigger className="bg-white/10 border-white/20 h-8 text-xs" data-testid="select-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="checkin">Check-in</SelectItem>
                  <SelectItem value="system">Collection</SelectItem>
                  <SelectItem value="time">Time</SelectItem>
                  <SelectItem value="store">Store</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Sort</label>
              <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                <SelectTrigger className="bg-white/10 border-white/20 h-8 text-xs" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="tier">By Tier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {programMemberships.length > 0 && (
            <div className="mt-2">
              <label className="text-xs text-gray-400 mb-1 block">Program</label>
              <Select value={selectedProgram} onValueChange={(value) => setSelectedProgram(value)}>
                <SelectTrigger className="bg-white/10 border-white/20 h-8 text-xs" data-testid="select-program">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programMemberships.map((pm) => (
                    <SelectItem key={pm.programId} value={pm.programId}>
                      {pm.programName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Awards Display */}
        <Tabs defaultValue="earned" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-white/10" data-testid="tabs-awards">
            <TabsTrigger value="earned" data-testid="tab-earned">
              Earned ({filteredEarnedAwards.length})
            </TabsTrigger>
            <TabsTrigger value="available" data-testid="tab-available">
              Available ({filteredAvailableAwards.length})
            </TabsTrigger>
          </TabsList>

          {/* Earned Awards Tab */}
          <TabsContent value="earned" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
                    <Skeleton className="h-4 w-3/4 bg-white/10" />
                    <Skeleton className="h-3 w-full bg-white/10" />
                  </div>
                ))}
              </div>
            ) : filteredEarnedAwards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 border border-white/10">
                  <Trophy className="h-10 w-10 text-gray-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-300" data-testid="text-empty-state">
                  No Awards Yet
                </h3>
                <p className="text-gray-500 max-w-xs" data-testid="text-empty-message">
                  Start attending practices and games to earn your first trophy!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredEarnedAwards.map((award) => (
                  <div
                    key={award.id}
                    className={`relative rounded-2xl border bg-gradient-to-br ${TIER_GRADIENT[award.tier]} p-4 flex flex-col items-center text-center gap-3 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-black/30`}
                    data-testid={`card-award-${award.id}`}
                  >
                    {/* Tier badge top-right */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        className={`text-[10px] px-1.5 py-0.5 border ${TIER_BADGE_COLOR[award.tier]}`}
                        data-testid={`badge-tier-${award.id}`}
                      >
                        {award.tier}
                      </Badge>
                    </div>

                    {/* Icon area */}
                    <div className={`w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center ${TIER_ICON_COLOR[award.tier]} ${TIER_GLOW[award.tier]}`}>
                      <AwardIcon award={award} className="w-full h-full" />
                    </div>

                    {/* Name */}
                    <p className="text-sm font-semibold leading-tight text-white" data-testid={`text-award-name-${award.id}`}>
                      {award.name}
                    </p>

                    {/* Description */}
                    {award.description && (
                      <p className="text-xs text-gray-400 leading-snug" data-testid={`text-award-description-${award.id}`}>
                        {award.description}
                      </p>
                    )}

                    {/* Footer info */}
                    <div className="mt-auto w-full space-y-1">
                      {award.triggerCategory && (
                        <Badge
                          variant="outline"
                          className="w-full justify-center text-[10px] border-white/20 text-gray-400"
                          data-testid={`badge-trigger-${award.id}`}
                        >
                          {TRIGGER_LABELS[award.triggerCategory]}
                        </Badge>
                      )}
                      <p className="text-[11px] text-gray-500" data-testid={`text-earned-date-${award.id}`}>
                        Earned {formatDate(award.earnedDate)}
                      </p>
                      {award.year && (
                        <p className="text-[11px] text-gray-500" data-testid={`text-award-year-${award.id}`}>
                          {award.year}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Available Awards Tab */}
          <TabsContent value="available" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                    <Skeleton className="h-24 w-full rounded-xl bg-white/10" />
                    <Skeleton className="h-4 w-3/4 bg-white/10" />
                    <Skeleton className="h-3 w-full bg-white/10" />
                  </div>
                ))}
              </div>
            ) : filteredAvailableAwards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4 border border-yellow-500/20">
                  <Star className="h-10 w-10 text-yellow-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-300">
                  All Awards Earned!
                </h3>
                <p className="text-gray-500 max-w-xs">
                  Congratulations! You've earned all available awards.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAvailableAwards.map((award) => (
                  <div
                    key={award.id}
                    className="relative rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col items-center text-center gap-3 opacity-60 hover:opacity-75 transition-opacity duration-200"
                    data-testid={`card-available-award-${award.id}`}
                  >
                    {/* Tier badge */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        className="text-[10px] px-1.5 py-0.5 border border-white/20 bg-white/10 text-gray-400"
                        data-testid={`badge-tier-available-${award.id}`}
                      >
                        {award.tier}
                      </Badge>
                    </div>

                    {/* Icon area (greyed out) */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-gray-600 grayscale">
                      <AwardIcon award={award} className="w-full h-full" />
                      {/* Lock overlay */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/50 rounded-full p-1.5">
                          <Lock className="h-4 w-4 text-white/60" />
                        </div>
                      </div>
                    </div>

                    {/* Name */}
                    <p className="text-sm font-semibold leading-tight text-gray-400" data-testid={`text-available-award-name-${award.id}`}>
                      {award.name}
                    </p>

                    {/* Description */}
                    {award.description && (
                      <p className="text-xs text-gray-500 leading-snug" data-testid={`text-available-award-description-${award.id}`}>
                        {award.description}
                      </p>
                    )}

                    {/* Footer */}
                    <div className="mt-auto w-full">
                      {award.triggerCategory && (
                        <Badge
                          variant="outline"
                          className="w-full justify-center text-[10px] border-white/10 text-gray-600"
                          data-testid={`badge-trigger-available-${award.id}`}
                        >
                          {TRIGGER_LABELS[award.triggerCategory]}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
