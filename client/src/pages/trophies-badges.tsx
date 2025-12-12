import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Award, ArrowLeft, Filter } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type TierType = "Gold" | "Purple" | "Blue" | "Green" | "Grey" | "Special";
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
  Gold: "bg-yellow-500",
  Purple: "bg-purple-500",
  Blue: "bg-blue-500",
  Green: "bg-green-500",
  Grey: "bg-gray-500",
  Special: "bg-gradient-to-r from-purple-500 to-yellow-500"
};

const TIER_TEXT_COLORS = {
  Gold: "text-yellow-600 dark:text-yellow-400",
  Purple: "text-purple-600 dark:text-purple-400",
  Blue: "text-blue-600 dark:text-blue-400",
  Green: "text-green-600 dark:text-green-400",
  Grey: "text-gray-600 dark:text-gray-400",
  Special: "text-purple-600 dark:text-purple-400"
};

const TIER_BORDER_COLORS = {
  Gold: "border-yellow-500",
  Purple: "border-purple-500",
  Blue: "border-blue-500",
  Green: "border-green-500",
  Grey: "border-gray-500",
  Special: "border-purple-500"
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
  const [selectedTier, setSelectedTier] = useState<"all" | TierType>("all");
  const [selectedTrigger, setSelectedTrigger] = useState<"all" | TriggerCategory>("all");
  const [selectedProgram, setSelectedProgram] = useState<"all" | string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "tier">("newest");

  // Support Player Mode - show awards for the active child profile if one is selected
  // Priority: localStorage selectedPlayerId > currentChildProfile (device config) > user.activeProfileId > user.id
  const selectedPlayerId = typeof window !== "undefined" ? localStorage.getItem("selectedPlayerId") : null;
  const activeProfileId = (user as any)?.activeProfileId || selectedPlayerId;
  const viewingUserId = activeProfileId || currentChildProfile?.id || user?.id;

  // Fetch award definitions
  const { data: awardDefinitions, isLoading: loadingDefinitions } = useQuery<AwardDefinition[]>({
    queryKey: ["/api/award-definitions"],
    enabled: !!user,
  });

  // Fetch user's award records (for the active profile or logged-in user)
  const { data: userAwardRecords, isLoading: loadingUserAwards } = useQuery<UserAwardRecord[]>({
    queryKey: ["/api/user-awards", viewingUserId],
    queryFn: async () => {
      const endpoint = activeProfileId 
        ? `/api/user-awards?userId=${activeProfileId}`
        : "/api/user-awards";
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user awards");
      return res.json();
    },
    enabled: !!user && !!viewingUserId,
  });

  // Fetch user's program memberships for program filter
  const { data: programMemberships = [] } = useQuery<ProgramMembership[]>({
    queryKey: ["/api/users", viewingUserId, "program-memberships"],
    enabled: !!viewingUserId,
  });

  // Combine award definitions with user award data
  const earnedAwards = useMemo<AwardWithDetails[]>(() => {
    if (!awardDefinitions || !userAwardRecords) return [];
    
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

  // Tier hierarchy for sorting
  const tierOrder = ["Gold", "Special", "Purple", "Blue", "Green", "Grey"];

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
    const gold = earnedAwards.filter(a => a.tier === "Gold");
    const purple = earnedAwards.filter(a => a.tier === "Purple");
    const other = earnedAwards.filter(a => !["Gold", "Purple"].includes(a.tier));
    return {
      total: earnedAwards.length,
      gold: gold.length,
      purple: purple.length,
      available: availableAwards.length,
    };
  }, [earnedAwards, availableAwards]);

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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="bg-white/5 border-white/10" data-testid="card-stat-total">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Earned</p>
                  <p className="text-3xl font-bold text-white">{stats.total}</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10" data-testid="card-stat-gold">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Gold</p>
                  <p className="text-3xl font-bold text-white">{stats.gold}</p>
                </div>
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10" data-testid="card-stat-purple">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Purple</p>
                  <p className="text-3xl font-bold text-white">{stats.purple}</p>
                </div>
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10" data-testid="card-stat-available">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Available</p>
                  <p className="text-3xl font-bold text-white">{stats.available}</p>
                </div>
                <Award className="h-8 w-8 text-gray-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="h-4 w-4" />
              <span className="font-semibold">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Tier</label>
                <Select value={selectedTier} onValueChange={(value) => setSelectedTier(value as any)}>
                  <SelectTrigger className="bg-white/10 border-white/20" data-testid="select-tier">
                    <SelectValue />
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
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Category</label>
                <Select value={selectedTrigger} onValueChange={(value) => setSelectedTrigger(value as any)}>
                  <SelectTrigger className="bg-white/10 border-white/20" data-testid="select-trigger">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="checkin">Check-in</SelectItem>
                    <SelectItem value="system">Collection</SelectItem>
                    <SelectItem value="time">Time</SelectItem>
                    <SelectItem value="store">Store</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {programMemberships.length > 0 && (
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">Program</label>
                  <Select value={selectedProgram} onValueChange={(value) => setSelectedProgram(value)}>
                    <SelectTrigger className="bg-white/10 border-white/20" data-testid="select-program">
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
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Sort By</label>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
                  <SelectTrigger className="bg-white/10 border-white/20" data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="tier">Tier (High to Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                  <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-500" />
                  <h3 className="text-xl font-semibold mb-2" data-testid="text-empty-state">
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
                          <Trophy className={`h-20 w-20 ${TIER_TEXT_COLORS[award.tier]}`} />
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
                  <Award className="h-16 w-16 mx-auto mb-4 text-gray-500" />
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
                          <Trophy className="h-20 w-20 text-gray-500" />
                        )}
                      </div>
                      <CardTitle className="text-lg leading-tight text-gray-400" data-testid={`text-available-award-name-${award.id}`}>
                        {award.name}
                      </CardTitle>
                      {award.description && (
                        <CardDescription className="text-gray-500 text-sm mt-2" data-testid={`text-available-award-description-${award.id}`}>
                          {award.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-gray-500">🔒 Not yet earned</p>
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
