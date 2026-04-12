import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useAppMode } from "@/hooks/useAppMode";
import { ArrowLeft, Trophy, ChevronDown, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { isIconIdentifier } from "@/components/awards/awardIcons";
import { AwardBadge } from "@/components/awards/AwardBadge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type TierType = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond" | "Legend";
type TriggerCategory = "checkin" | "system" | "time" | "store" | "manual" | "rsvp" | "streak" | "evaluation" | "stat" | "video";

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

const TRIGGER_LABELS: Record<TriggerCategory, string> = {
  checkin: "Attendance",
  system: "Collection",
  time: "Loyalty",
  store: "Store",
  manual: "Recognition",
  rsvp: "RSVP",
  streak: "Consistency",
  evaluation: "Development",
  stat: "Stats",
  video: "Training",
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
  const [activeTab, setActiveTab] = useState<"earned" | "available">("earned");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const earnedTabRef = useRef<HTMLButtonElement>(null);
  const availableTabRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [selectedAward, setSelectedAward] = useState<EarnedAward | null>(null);

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

  const tierOrder = ["Legend", "Diamond", "Platinum", "Gold", "Silver", "Bronze"];

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
    legend: earnedAwards.filter(a => a.tier === "Legend").length,
    diamond: earnedAwards.filter(a => a.tier === "Diamond").length,
    platinum: earnedAwards.filter(a => a.tier === "Platinum").length,
    gold: earnedAwards.filter(a => a.tier === "Gold").length,
    silver: earnedAwards.filter(a => a.tier === "Silver").length,
    bronze: earnedAwards.filter(a => a.tier === "Bronze").length,
  }), [earnedAwards]);

  const isLoading = loadingDefinitions || loadingUserAwards;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  useEffect(() => {
    const updateIndicator = () => {
      const bar = tabBarRef.current;
      const activeRef = activeTab === "earned" ? earnedTabRef.current : availableTabRef.current;
      if (!bar || !activeRef) return;
      const barRect = bar.getBoundingClientRect();
      const tabRect = activeRef.getBoundingClientRect();
      setIndicatorStyle({ left: tabRect.left - barRect.left, width: tabRect.width });
    };
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeTab]);

  const tierFilterLabel = selectedTier === "all" ? "Tier" : selectedTier;
  const categoryFilterLabel = selectedTrigger === "all" ? "Category" : TRIGGER_LABELS[selectedTrigger];
  const sortLabel = sortBy === "newest" ? "Newest" : sortBy === "oldest" ? "Oldest" : "By Tier";
  const programFilterLabel = selectedProgram === "all"
    ? "Program"
    : (programMemberships.find(p => p.programId === selectedProgram)?.programName ?? "Program");

  return (
    <div className="scrollable-page bg-white text-[#1a1a1a] safe-bottom">
      {/* Top Bar */}
      <div className="sticky top-0 z-50 bg-white border-b border-[#f0f0f0] flex items-center gap-3.5 px-5 py-3">
        <button
          onClick={() => setLocation("/player-dashboard")}
          className="p-2 rounded-lg text-[#888] hover:bg-[#f5f5f5] hover:text-[#333] transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-[17px] font-semibold tracking-tight" data-testid="text-page-title">Awards</h1>
      </div>

      {/* Overview section label */}
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#b0b0b0] px-5 pt-5 pb-2.5">
        Overview
      </div>

      {/* Tier Summary Chips */}
      <div
        className="flex px-5 pb-4 overflow-x-auto gap-0"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
      >
        <div className="flex-1 min-w-0 text-center px-1.5 py-2.5" data-testid="card-stat-legend">
          <div className="text-[20px] font-bold leading-none text-[#1a1a1a]">{stats.legend}</div>
          <div
            className="text-[10px] font-semibold mt-1 tracking-[0.02em]"
            style={{
              background: "linear-gradient(90deg, #e74c4c, #f59e0b, #22c55e, #3b82f6, #a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Legend
          </div>
        </div>
        {[
          { count: stats.diamond, label: "Diamond", color: "text-[#5b21b6]", testId: "card-stat-diamond" },
          { count: stats.platinum, label: "Platinum", color: "text-[#155e75]", testId: "card-stat-platinum" },
          { count: stats.gold, label: "Gold", color: "text-[#854d0e]", testId: "card-stat-gold" },
          { count: stats.silver, label: "Silver", color: "text-[#475569]", testId: "card-stat-silver" },
          { count: stats.bronze, label: "Bronze", color: "text-[#92400e]", testId: "card-stat-bronze" },
        ].map(({ count, label, color, testId }) => (
          <div key={label} className="flex-1 min-w-0 text-center px-1.5 py-2.5" data-testid={testId}>
            <div className="text-[20px] font-bold leading-none text-[#1a1a1a]">{count}</div>
            <div className={`text-[10px] font-semibold mt-1 tracking-[0.02em] ${color}`}>{label}</div>
          </div>
        ))}
      </div>

      {/* Pill Filter Buttons */}
      <div className="flex flex-wrap gap-2 px-5 pb-4">
        {/* Tier filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border border-[#e8e8e8] bg-white text-xs font-medium text-[#666] hover:border-[#ccc] hover:text-[#333] transition-colors whitespace-nowrap"
              data-testid="select-tier"
            >
              {tierFilterLabel}
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedTier("all")}>All Tiers</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTier("Legend")}>Legend</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTier("Diamond")}>Diamond</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTier("Platinum")}>Platinum</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTier("Gold")}>Gold</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTier("Silver")}>Silver</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTier("Bronze")}>Bronze</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Category filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border border-[#e8e8e8] bg-white text-xs font-medium text-[#666] hover:border-[#ccc] hover:text-[#333] transition-colors whitespace-nowrap"
              data-testid="select-trigger"
            >
              {categoryFilterLabel}
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSelectedTrigger("all")}>All Categories</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTrigger("checkin")}>Check-in</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTrigger("system")}>Collection</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTrigger("time")}>Time</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTrigger("store")}>Store</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSelectedTrigger("manual")}>Manual</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Program filter */}
        {programMemberships.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border border-[#e8e8e8] bg-white text-xs font-medium text-[#666] hover:border-[#ccc] hover:text-[#333] transition-colors whitespace-nowrap"
                data-testid="select-program"
              >
                {programFilterLabel}
                <ChevronDown className="w-3.5 h-3.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setSelectedProgram("all")}>All Programs</DropdownMenuItem>
              {programMemberships.map((pm) => (
                <DropdownMenuItem key={pm.programId} onClick={() => setSelectedProgram(pm.programId)}>
                  {pm.programName}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Sort filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-1.5 px-3.5 py-[7px] rounded-full border border-[#e8e8e8] bg-white text-xs font-medium text-[#666] hover:border-[#ccc] hover:text-[#333] transition-colors whitespace-nowrap"
              data-testid="select-sort"
            >
              {sortLabel}
              <ChevronDown className="w-3.5 h-3.5 opacity-50" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setSortBy("newest")}>Newest</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("oldest")}>Oldest</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSortBy("tier")}>By Tier</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Tab Bar */}
      <div className="relative border-b-2 border-[#f0f0f0] flex px-5" ref={tabBarRef} data-testid="tabs-awards">
        <button
          ref={earnedTabRef}
          className={`flex-1 text-center py-3 text-[13px] font-medium transition-colors bg-transparent border-none font-inherit cursor-pointer ${activeTab === "earned" ? "text-[#1a1a1a] font-semibold" : "text-[#aaa]"}`}
          onClick={() => setActiveTab("earned")}
          data-testid="tab-earned"
        >
          Earned ({filteredEarnedAwards.length})
        </button>
        <button
          ref={availableTabRef}
          className={`flex-1 text-center py-3 text-[13px] font-medium transition-colors bg-transparent border-none font-inherit cursor-pointer ${activeTab === "available" ? "text-[#1a1a1a] font-semibold" : "text-[#aaa]"}`}
          onClick={() => setActiveTab("available")}
          data-testid="tab-available"
        >
          Available ({filteredAvailableAwards.length})
        </button>
        <div
          className="absolute bottom-[-2px] h-0.5 bg-[#d82428] rounded-[1px] transition-all duration-300"
          style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
        />
      </div>

      {/* Tab Content */}
      <div className="p-5">
        {activeTab === "earned" ? (
          isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 p-3.5 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
                  <Skeleton className="w-[60px] h-[60px] rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredEarnedAwards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f6f6f4] flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-[#ccc]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#999] mb-1.5" data-testid="text-empty-state">
                No Awards Yet
              </h3>
              <p className="text-[13px] text-[#bbb] max-w-[260px] leading-relaxed" data-testid="text-empty-message">
                Start attending practices and games to earn your first award.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredEarnedAwards.map((award) => (
                <div
                  key={award.id}
                  className="flex items-center gap-3.5 px-4 py-3.5 bg-[#fafafa] rounded-xl border border-[#f0f0f0] hover:bg-[#f5f5f5] hover:border-[#e0e0e0] transition-colors cursor-pointer"
                  data-testid={`card-award-${award.id}`}
                  onClick={() => setSelectedAward(award)}
                >
                  <AwardBadge
                    tier={award.tier}
                    icon={award.imageUrl && isIconIdentifier(award.imageUrl) ? award.imageUrl : null}
                    size={60}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-semibold text-[#1a1a1a] mb-0.5 truncate" data-testid={`text-award-name-${award.id}`}>
                      {award.name}
                    </h4>
                    {award.description && (
                      <p className="text-[12px] text-[#999] leading-snug" data-testid={`text-award-description-${award.id}`}>
                        {award.description}
                      </p>
                    )}
                    <p className="text-[11px] text-[#bbb] mt-1" data-testid={`text-earned-date-${award.id}`}>
                      Earned {formatDate(award.earnedDate)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-semibold tracking-[0.03em] px-2 py-[3px] rounded-[6px] flex-shrink-0 text-[#999]"
                    data-testid={`badge-tier-${award.id}`}
                  >
                    {award.tier}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          isLoading ? (
            <div className="flex flex-col gap-2.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3.5 p-3.5 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
                  <Skeleton className="w-[60px] h-[60px] rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredAvailableAwards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f6f6f4] flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-[#ccc]" />
              </div>
              <h3 className="text-[15px] font-semibold text-[#999] mb-1.5">
                All Awards Earned!
              </h3>
              <p className="text-[13px] text-[#bbb] max-w-[260px] leading-relaxed">
                Congratulations! You've earned all available awards.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredAvailableAwards.map((award) => {
                const progressPct = award.threshold ? 0 : null;
                return (
                  <div
                    key={award.id}
                    className="flex items-center gap-3.5 px-4 py-3.5 bg-[#fafafa] rounded-xl border border-[#f0f0f0] hover:bg-[#f5f5f5] hover:border-[#e0e0e0] transition-colors cursor-pointer"
                    data-testid={`card-available-award-${award.id}`}
                  >
                    <AwardBadge
                      tier={award.tier}
                      icon={award.imageUrl && isIconIdentifier(award.imageUrl) ? award.imageUrl : null}
                      size={60}
                      locked={true}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[14px] font-semibold text-[#1a1a1a] mb-0.5 truncate" data-testid={`text-available-award-name-${award.id}`}>
                        {award.name}
                      </h4>
                      {award.description && (
                        <p className="text-[12px] text-[#999] leading-snug" data-testid={`text-available-award-description-${award.id}`}>
                          {award.description}
                        </p>
                      )}
                      {progressPct !== null && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 bg-[#e8e8e8] rounded-[2px] overflow-hidden">
                            <div
                              className="h-full rounded-[2px] transition-all duration-400 bg-primary"
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-[#aaa] min-w-[30px] text-right">
                            {progressPct}%
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-semibold tracking-[0.03em] px-2 py-[3px] rounded-[6px] flex-shrink-0 text-[#999]"
                      data-testid={`badge-tier-available-${award.id}`}
                    >
                      {award.tier}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {selectedAward && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelectedAward(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-sm w-[90%] p-6 flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 text-[#999] hover:text-[#333] transition-colors"
              onClick={() => setSelectedAward(null)}
            >
              <X className="w-5 h-5" />
            </button>
            <AwardBadge
              tier={selectedAward.tier}
              icon={selectedAward.imageUrl && isIconIdentifier(selectedAward.imageUrl) ? selectedAward.imageUrl : null}
              size={160}
            />
            <h3 className="text-lg font-bold text-[#1a1a1a] text-center">{selectedAward.name}</h3>
            {selectedAward.description && (
              <p className="text-sm text-[#666] text-center leading-relaxed">{selectedAward.description}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-[#999]">
              <span className="font-semibold">{selectedAward.tier}</span>
              <span>·</span>
              <span>Earned {formatDate(selectedAward.earnedDate)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
