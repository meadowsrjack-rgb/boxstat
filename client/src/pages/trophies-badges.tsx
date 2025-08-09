
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { AWARDS, TIER_ORDER } from "@/lib/awards.registry";
import { MOCK_USER_STATS, getAwardProgress } from "@/lib/awards.progress";
import { 
  loadAwardsFilters, 
  saveAwardsFilters, 
  AwardsFilterState, 
  FILTER_OPTIONS 
} from "@/state/awardsFilters";
import { AwardCard } from "@/components/awards/AwardCard";
import { AwardOverlay } from "@/components/awards/AwardOverlay";
import { Award } from "@/lib/awards.types";

export default function TrophiesBadges() {
  const [, setLocation] = useLocation();
  const [filters, setFilters] = useState<AwardsFilterState>(loadAwardsFilters);
  const [selectedAward, setSelectedAward] = useState<Award | null>(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Mock user stats - in real app, this would come from your user data
  const userStats = MOCK_USER_STATS;

  // Update filters and persist to localStorage
  const updateFilters = (newFilters: Partial<AwardsFilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    saveAwardsFilters(updated);
  };

  // Filter and sort awards
  const filteredAndSortedAwards = useMemo(() => {
    let filtered = AWARDS.filter(award => {
      // Search query filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!award.name.toLowerCase().includes(query) && 
            !award.description.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Tier filter
      if (filters.tier && award.tier !== filters.tier) {
        return false;
      }

      // Category filter
      if (filters.category && award.category !== filters.category) {
        return false;
      }

      // Show only earned filter
      if (filters.showOnlyEarned) {
        const progress = getAwardProgress(award, userStats);
        if (!progress.earned) {
          return false;
        }
      }

      return true;
    });

    // Sort awards
    switch (filters.sort) {
      case "alpha":
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "tier":
        filtered.sort((a, b) => {
          const tierA = TIER_ORDER.indexOf(a.tier);
          const tierB = TIER_ORDER.indexOf(b.tier);
          if (tierA !== tierB) return tierA - tierB;
          return a.name.localeCompare(b.name);
        });
        break;
      case "completion":
        filtered.sort((a, b) => {
          const progressA = getAwardProgress(a, userStats);
          const progressB = getAwardProgress(b, userStats);
          
          // Earned awards first
          if (progressA.earned !== progressB.earned) {
            return progressA.earned ? -1 : 1;
          }
          
          // Then by progress percentage
          const percentA = progressA.target ? (progressA.current || 0) / progressA.target : 0;
          const percentB = progressB.target ? (progressB.current || 0) / progressB.target : 0;
          return percentB - percentA;
        });
        break;
      case "recent":
        // For demo purposes, just sort by earned status then tier
        filtered.sort((a, b) => {
          const progressA = getAwardProgress(a, userStats);
          const progressB = getAwardProgress(b, userStats);
          if (progressA.earned !== progressB.earned) {
            return progressA.earned ? -1 : 1;
          }
          const tierA = TIER_ORDER.indexOf(a.tier);
          const tierB = TIER_ORDER.indexOf(b.tier);
          return tierA - tierB;
        });
        break;
      default:
        break;
    }

    return filtered;
  }, [filters, searchQuery, userStats]);

  // Statistics
  const stats = useMemo(() => {
    const totalAwards = AWARDS.length;
    const earnedAwards = AWARDS.filter(award => 
      getAwardProgress(award, userStats).earned
    ).length;
    const trophies = AWARDS.filter(award => award.kind === "Trophy");
    const earnedTrophies = trophies.filter(award => 
      getAwardProgress(award, userStats).earned
    ).length;
    const badges = AWARDS.filter(award => award.kind === "Badge");
    const earnedBadges = badges.filter(award => 
      getAwardProgress(award, userStats).earned
    ).length;

    return {
      totalAwards,
      earnedAwards,
      totalTrophies: trophies.length,
      earnedTrophies,
      totalBadges: badges.length,
      earnedBadges
    };
  }, [userStats]);

  const handleAwardClick = (award: Award) => {
    setSelectedAward(award);
    setIsOverlayOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-md mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setLocation('/player-dashboard')}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Trophies & Badges</h1>
              <p className="text-sm text-gray-600">
                {stats.earnedAwards}/{stats.totalAwards} earned • 
                {stats.earnedTrophies}/{stats.totalTrophies} trophies • 
                {stats.earnedBadges}/{stats.totalBadges} badges
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-md mx-auto p-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search awards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters & Sort</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <select 
              value={filters.tier || ""} 
              onChange={(e) => updateFilters({ tier: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {FILTER_OPTIONS.tiers.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
            
            <select 
              value={filters.category || ""} 
              onChange={(e) => updateFilters({ category: e.target.value || undefined })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {FILTER_OPTIONS.categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            
            <select 
              value={filters.sort || "tier"} 
              onChange={(e) => updateFilters({ sort: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              {FILTER_OPTIONS.sorts.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
            
            <div className="flex items-center">
              <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showOnlyEarned || false}
                  onChange={(e) => updateFilters({ showOnlyEarned: e.target.checked })}
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Only Earned
              </label>
            </div>
          </div>
        </div>

        {/* Awards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Awards ({filteredAndSortedAwards.length})
            </h2>
          </div>
          
          {filteredAndSortedAwards.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No awards found matching your filters.</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  updateFilters({ 
                    tier: undefined, 
                    category: undefined, 
                    showOnlyEarned: false 
                  });
                }}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {filteredAndSortedAwards.map((award) => (
                <AwardCard
                  key={award.id}
                  award={award}
                  userStats={userStats}
                  onClick={() => handleAwardClick(award)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Award Detail Overlay */}
      <AwardOverlay
        award={selectedAward}
        userStats={userStats}
        isOpen={isOverlayOpen}
        onClose={() => {
          setIsOverlayOpen(false);
          setSelectedAward(null);
        }}
      />
    </div>
  );
}
