import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Medal, ArrowLeft, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

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

const TIER_COLORS = {
  Prospect: "bg-gray-500",
  Starter: "bg-green-500",
  "All-Star": "bg-blue-500",
  Superstar: "bg-purple-500",
  HOF: "bg-yellow-500",
  Legacy: "bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500"
};

const TIER_TEXT_COLORS = {
  Prospect: "text-gray-400",
  Starter: "text-green-400",
  "All-Star": "text-blue-400",
  Superstar: "text-purple-400",
  HOF: "text-yellow-400",
  Legacy: "text-purple-400"
};

const TIER_BORDER_COLORS = {
  Prospect: "border-gray-500",
  Starter: "border-green-500",
  "All-Star": "border-blue-500",
  Superstar: "border-purple-500",
  HOF: "border-yellow-500",
  Legacy: "border-purple-500"
};

const TRIGGER_LABELS: Record<TriggerCategory, string> = {
  checkin: "Check-in",
  system: "Collection",
  time: "Time",
  store: "Store",
  manual: "Manual"
};

export default function TrophiesBadgesPage() {
  const { user } = useAuth();
  const { currentChildProfile } = useAppMode();
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const [selectedTier, setSelectedTier] = useState<"all" | TierType>("all");
  const [selectedTrigger, setSelectedTrigger] = useState<"all" | TriggerCategory>("all");
  const [selectedProgram, setSelectedProgram] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "tier">("newest");

  // Support Player Mode - show awards for the active child profile if one is selected
  // Priority: URL playerId param > localStorage selectedPlayerId > currentChildProfile (device config) > user.activeProfileId > user.id
  const urlParams = new URLSearchParams(searchString);
  const urlPlayerId = urlParams.get("playerId");
  const selectedPlayerId = typeof window !== "undefined" ? localStorage.getItem("selectedPlayerId") : null;
  const activeProfileId = urlPlayerId || (user as any)?.activeProfileId || selectedPlayerId;
  const viewingUserId = activeProfileId || currentChildProfile?.id || user?.id;

  // Fetch award definitions
  const { data: awardDefinitions, isLoading: loadingDefinitions } = useQuery<AwardDefinition[]>({
    queryKey: ["/api/award-definitions"],
    enabled: !!user,
  });

  // Fetch user's award records (for the active profile or logged-in user)
  // Use /api/users/{userId}/awards endpoint which returns allAwards array
  const { data: userAwardsResponse, isLoading: loadingUserAwards } = useQuery<{ allAwards: UserAwardRecord[] }>({
    queryKey: ["/api/users", viewingUserId, "awards"],
    enabled: !!user && !!viewingUserId,
  });
  
  // Extract userAwardRecords from the response
  const userAwardRecords = userAwardsResponse?.allAwards || [];

  // Fetch user's program memberships for program filter
  const { data: programMemberships = [] } = useQuery<ProgramMembership[]>({
    queryKey: ["/api/users", viewingUserId, "program-memberships"],
    enabled: !!viewingUserId,
  });

  // Combine award definitions with user award data
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

  // Available awards (not yet earned)
  const availableAwards = useMemo<AwardDefinition[]>(() => {
    if (!awardDefinitions) return [];
    const earnedIds = new Set(earnedAwards.map(a => a.id));
    return awardDefinitions.filter(def => def.active && !earnedIds.has(def.id));
  }, [awardDefinitions, earnedAwards]);

  // Tier hierarchy for sorting (highest first)
  const tierOrder = ["Legacy", "HOF", "Superstar", "All-Star", "Starter", "Prospect"];

  // Helper to check if award belongs to selected program
  const matchesProgram = (award: AwardDefinition) => {
    if (selectedProgram === "all") return true;
    // Awards with no programIds are global and should show for all
    if (!award.programIds || award.programIds.length === 0) return true;
    return award.programIds.includes(selectedProgram);
  };

  // Filter and sort awards
  const filteredEarnedAwards = useMemo(() => {
    let filtered = earnedAwards;

    // Filter by tier
    if (selectedTier !== "all") {
      filtered = filtered.filter(award => award.tier === selectedTier);
    }

    // Filter by trigger category
    if (selectedTrigger !== "all") {
      filtered = filtered.filter(award => (award.triggerCategory || "manual") === selectedTrigger);
    }

    // Filter by program
    filtered = filtered.filter(matchesProgram);

    // Sort
    return filtered.sort((a, b) => {
      if (sortBy === "newest") {
        return new Date(b.earnedDate).getTime() - new Date(a.earnedDate).getTime();
      } else if (sortBy === "oldest") {
        return new Date(a.earnedDate).getTime() - new Date(b.earnedDate).getTime();
      } else { // tier
        return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
      }
    });
  }, [earnedAwards, selectedTier, selectedTrigger, selectedProgram, sortBy]);

  const filteredAvailableAwards = useMemo(() => {
    let filtered = availableAwards;

    // Filter by tier
    if (selectedTier !== "all") {
      filtered = filtered.filter(award => award.tier === selectedTier);
    }

    // Filter by trigger category
    if (selectedTrigger !== "all") {
      filtered = filtered.filter(award => (award.triggerCategory || "manual") === selectedTrigger);
    }

    // Filter by program
    filtered = filtered.filter(matchesProgram);

    // Sort by tier
    return filtered.sort((a, b) => {
      return tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier);
    });
  }, [availableAwards, selectedTier, selectedTrigger, selectedProgram]);

  // Calculate statistics - group by tier
  const stats = useMemo(() => {
    return {
      total: earnedAwards.length,
      legacy: earnedAwards.filter(a => a.tier === "Legacy").length,
      hof: earnedAwards.filter(a => a.tier === "HOF").length,
      superstar: earnedAwards.filter(a => a.tier === "Superstar").length,
      allStar: earnedAwards.filter(a => a.tier === "All-Star").length,
      starter: earnedAwards.filter(a => a.tier === "Starter").length,
      prospect: earnedAwards.filter(a => a.tier === "Prospect").length,
    };
  }, [earnedAwards]);

  const isLoading = loadingDefinitions || loadingUserAwards;

  const handleBack = () => {
    setLocation("/player-dashboard");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric" 
    });
  };

  return (
    <div className="scrollable-page bg-gradient-to-b from-red-950 via-gray-900 to-black text-white safe-bottom">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            data-testid="button-back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Awards</h1>
            <p className="text-sm text-gray-400 mt-1" data-testid="text-page-subtitle">
              Track your achievements and earn rewards for your dedication
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <div className="text-center p-3" data-testid="card-stat-legacy">
            <p className="text-xl font-bold text-white">{stats.legacy}</p>
            <p className="text-xs font-medium bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">Legacy</p>
          </div>
          <div className="text-center p-3" data-testid="card-stat-hof">
            <p className="text-xl font-bold text-white">{stats.hof}</p>
            <p className="text-xs font-medium text-yellow-500">HOF</p>
          </div>
          <div className="text-center p-3" data-testid="card-stat-superstar">
            <p className="text-xl font-bold text-white">{stats.superstar}</p>
            <p className="text-xs font-medium text-purple-500">Superstar</p>
          </div>
          <div className="text-center p-3" data-testid="card-stat-allstar">
            <p className="text-xl font-bold text-white">{stats.allStar}</p>
            <p className="text-xs font-medium text-blue-500">All-Star</p>
          </div>
          <div className="text-center p-3" data-testid="card-stat-starter">
            <p className="text-xl font-bold text-white">{stats.starter}</p>
            <p className="text-xs font-medium text-green-500">Starter</p>
          </div>
          <div className="text-center p-3" data-testid="card-stat-prospect">
            <p className="text-xl font-bold text-white">{stats.prospect}</p>
            <p className="text-xs font-medium text-gray-400">Prospect</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-3">
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
          </CardContent>
        </Card>

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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="pt-6">
                      <Skeleton className="h-32 w-full mb-4 bg-white/10" />
                      <Skeleton className="h-4 w-3/4 mb-2 bg-white/10" />
                      <Skeleton className="h-3 w-full bg-white/10" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredEarnedAwards.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-12 pb-12 text-center">
                  <Medal className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2 text-[#9ca3af]" data-testid="text-empty-state">
                    No Awards Yet
                  </h3>
                  <p className="text-gray-400" data-testid="text-empty-message">
                    Start attending practices and games to earn your first trophy!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredEarnedAwards.map((award) => (
                  <Card
                    key={award.id}
                    className={`bg-white/5 border-2 ${TIER_BORDER_COLORS[award.tier]} hover:scale-105 transition-transform duration-200`}
                    data-testid={`card-award-${award.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={TIER_COLORS[award.tier]} data-testid={`badge-tier-${award.id}`}>
                          {award.tier}
                        </Badge>
                        {award.triggerCategory && (
                          <Badge variant="outline" className="border-white/20" data-testid={`badge-trigger-${award.id}`}>
                            {TRIGGER_LABELS[award.triggerCategory]}
                          </Badge>
                        )}
                      </div>
                      <div className="aspect-square bg-white/10 rounded-lg flex items-center justify-center mb-4 overflow-hidden">
                        {award.imageUrl ? (
                          <img
                            src={award.imageUrl}
                            alt={award.name}
                            className="w-full h-full object-contain"
                            data-testid={`img-award-${award.id}`}
                          />
                        ) : (
                          <Medal className={`h-20 w-20 ${TIER_TEXT_COLORS[award.tier]}`} />
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight" data-testid={`text-award-name-${award.id}`}>
                        {award.name}
                      </CardTitle>
                      {award.description && (
                        <CardDescription className="text-gray-400 text-sm mt-2" data-testid={`text-award-description-${award.id}`}>
                          {award.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-400" data-testid={`text-earned-date-${award.id}`}>
                        Earned: {formatDate(award.earnedDate)}
                      </p>
                      {award.year && (
                        <p className="text-xs text-gray-400" data-testid={`text-award-year-${award.id}`}>
                          Year: {award.year}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Available Awards Tab */}
          <TabsContent value="available" className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card key={i} className="bg-white/5 border-white/10">
                    <CardContent className="pt-6">
                      <Skeleton className="h-32 w-full mb-4 bg-white/10" />
                      <Skeleton className="h-4 w-3/4 mb-2 bg-white/10" />
                      <Skeleton className="h-3 w-full bg-white/10" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAvailableAwards.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="pt-12 pb-12 text-center">
                  <Medal className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-xl font-semibold mb-2">
                    All Awards Earned!
                  </h3>
                  <p className="text-gray-400">
                    Congratulations! You've earned all available awards.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredAvailableAwards.map((award) => (
                  <Card
                    key={award.id}
                    className="bg-white/5 border-white/10 opacity-60 hover:opacity-80 transition-opacity duration-200"
                    data-testid={`card-available-award-${award.id}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={`${TIER_COLORS[award.tier]} opacity-50`} data-testid={`badge-tier-available-${award.id}`}>
                          {award.tier}
                        </Badge>
                        {award.triggerCategory && (
                          <Badge variant="outline" className="border-white/20 opacity-50" data-testid={`badge-trigger-available-${award.id}`}>
                            {TRIGGER_LABELS[award.triggerCategory]}
                          </Badge>
                        )}
                      </div>
                      <div className="aspect-square bg-white/10 rounded-lg flex items-center justify-center mb-4 overflow-hidden grayscale">
                        {award.imageUrl ? (
                          <img
                            src={award.imageUrl}
                            alt={award.name}
                            className="w-full h-full object-contain"
                            data-testid={`img-available-award-${award.id}`}
                          />
                        ) : (
                          <Medal className="h-20 w-20 text-gray-400" />
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight text-gray-300" data-testid={`text-available-award-name-${award.id}`}>
                        {award.name}
                      </CardTitle>
                      {award.description && (
                        <CardDescription className="text-gray-400 text-sm mt-2" data-testid={`text-available-award-description-${award.id}`}>
                          {award.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-400">🔒 Not yet earned</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
