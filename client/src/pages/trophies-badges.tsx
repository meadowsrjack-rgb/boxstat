import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AWARDS } from "../lib/awards.registry";
import { ChevronLeft, ChevronRight, X, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

// Import trophy images
import heartHustleImage from "@assets/Heart & Hustle Award_1754973783768.png";
import spiritAwardImage from "@assets/Spirit Award_1754973783769.png";
import coachAwardImage from "@assets/Coach Award_1754973783767.png";
import mostImprovedImage from "@assets/Season MIP Award_1754973783767.png";
import seasonMvpImage from "@assets/Season MVP Award_1754973783769.png";

export default function TrophiesBadges() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [modal, setModal] = useState({ open: false, icon: "", title: "", desc: "", progress: "" });
  
  // Carousel state
  const [orgCarouselIndex, setOrgCarouselIndex] = useState(0);
  const [seasonCarouselIndex, setSeasonCarouselIndex] = useState(0);

  // Mock user stats for demo - in real app this would come from API
  const mockUserStats = {
    mvpCount: 10,
    clutchCount: 7,
    comebackCount: 4,
    hustleCount: 10,
    teammateCount: 6,
    sportsmanshipCount: 10,
    studentCount: 8,
    leadByExampleCount: 5,
    practicesTotal: 150,
    skillsTotal: 75,
    gamesTotal: 80,
    fnhGamesTotal: 25,
    practiceStreak: 8,
    rsvpStreak: 12,
    referrals: 2,
    holidayGamesCount: 1,
    yearsActive: 2,
    season: {
      mvp: 2,
      hustle: 3,
      teammate: 1,
      sportsmanship: 2,
      clutch: 1,
      comeback: 1,
      student: 2,
      leadByExample: 1
    },
    foundation: {
      totalVideos: 45,
      skillsCompleted: 25,
      scCompleted: 8,
      iqCompleted: 7
    }
  };

  const openModal = (icon: string, title: string, desc: string, progress: string = "") => 
    setModal({ open: true, icon, title, desc, progress });
  
  const closeModal = () => setModal({ open: false, icon: "", title: "", desc: "", progress: "" });

  // Get trophy image for specific trophies
  const getTrophyImage = (trophyId: string) => {
    const imageMap: Record<string, string> = {
      "coach-choice": coachAwardImage,
      "most-improved": mostImprovedImage,
      "mvp-season": seasonMvpImage,
    };
    return imageMap[trophyId];
  };

  // Filter badges and trophies first
  const trophies = AWARDS.filter(award => award.kind === "Trophy");
  const badges = AWARDS.filter(award => award.kind === "Badge");
  
  // Calculate tier counts
  const getTierCounts = () => {
    const counts = {
      Trophy: allTrophies.length,
      HallOfFamer: badges.filter(b => b.tier === "HallOfFamer").length,
      Superstar: badges.filter(b => b.tier === "Superstar").length,
      AllStar: badges.filter(b => b.tier === "AllStar").length,
      Starter: badges.filter(b => b.tier === "Starter").length,
      Prospect: badges.filter(b => b.tier === "Prospect").length
    };
    return counts;
  };
  
  const tierCounts = getTierCounts();
  
  // Handle tier filter clicks
  const handleTierFilter = (tier: string) => {
    if (tierFilter === tier) {
      setTierFilter(null); // Deselect if same tier clicked
    } else {
      setTierFilter(tier);
    }
  };
  
  // All trophies combined
  const allTrophies = [
    {
      id: "heart-hustle",
      name: "The UYP Heart and Hustle Award",
      description: "The ultimate recognition of effort and determination! This yearly award goes to the single player across all of UYP who most consistently gave their all, demonstrating exceptional effort and determination in every practice and game. This is the highest honor for work ethic in the entire organization.",
      image: heartHustleImage
    },
    {
      id: "spirit",
      name: "The Spirit Award", 
      description: "The pinnacle of character recognition! Awarded to the one player across the entire UYP organization who best maintained a positive attitude, lifted team morale, and represented the character of UYP both on and off the court. This award recognizes the player who embodies the true spirit of basketball.",
      image: spiritAwardImage
    },
    ...trophies.map(trophy => ({
      id: trophy.id,
      name: trophy.name,
      description: trophy.description,
      image: getTrophyImage(trophy.id)
    }))
  ];

  // Auto-advance carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setOrgCarouselIndex((prev) => (prev + 1) % allTrophies.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [allTrophies.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeModal();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Helper function to check if badge is earned
  const isBadgeEarned = (award: typeof AWARDS[0]) => {
    if (award.progressKind === "manual") return false; // Manual awards handled by coaches
    
    if (award.progressKind === "counter" && award.counterOf) {
      const statValue = mockUserStats[award.counterOf.stat as keyof typeof mockUserStats] as number;
      return statValue >= award.counterOf.target;
    }
    
    if (award.progressKind === "streak" && award.streakOf) {
      const statValue = mockUserStats[award.streakOf.stat as keyof typeof mockUserStats] as number;
      return statValue >= award.streakOf.target;
    }
    

    
    return false;
  };

  // Helper function to get progress for badge
  const getBadgeProgress = (award: typeof AWARDS[0]) => {
    if (award.progressKind === "manual") return "Coach Awarded";
    
    if (award.progressKind === "counter" && award.counterOf) {
      const statValue = mockUserStats[award.counterOf.stat as keyof typeof mockUserStats] as number;
      return `${Math.min(statValue, award.counterOf.target)}/${award.counterOf.target}`;
    }
    
    if (award.progressKind === "streak" && award.streakOf) {
      const statValue = mockUserStats[award.streakOf.stat as keyof typeof mockUserStats] as number;
      return `${Math.min(statValue, award.streakOf.target)}/${award.streakOf.target}`;
    }
    

    
    return "0/1";
  };

  // Get icon for award type
  const getAwardIcon = (award: typeof AWARDS[0]) => {
    const iconMap: Record<string, string> = {
      // Hall of Famer icons
      "superstar-10x-mvp": "⭐",
      "prime-time-10x-clutch": "🌟",
      "force-of-will-10x-comeback": "💪",
      "relentless-10x-hustle": "🔋",
      "the-linchpin-10x-teammate": "🔗",
      "spirit-of-game-10x-sportsmanship": "🏅",
      "coach-on-court-10x-student": "🧠",
      "the-paragon-10x-lead-by-example": "👑",
      "coaches-choice-collection": "🎖️",
      "the-trifecta": "🎯",
      "character-captain": "🛡️",
      "practice-legend": "🏋️",
      "skills-virtuoso": "🎪",
      "franchise-player": "🏆",
      "fnh-hall-of-famer": "🌙",
      "dynasty-member": "👑",
      "foundation-alumnus": "🎓",
      
      // Superstar icons
      "marquee-player-5x-mvp": "🌟",
      "ice-in-veins-5x-clutch": "🧊",
      "momentum-shifter-5x-comeback": "⚡",
      "the-workhorse-5x-hustle": "🐎",
      "the-cornerstone-5x-teammate": "🗿",
      "the-ambassador-5x-sportsmanship": "🤝",
      "the-tactician-5x-student": "🎯",
      "the-blueprint-5x-lead-by-example": "📐",
      "the-pillar": "🏛️",
      "ironman": "🤖",
      "fnh-ironman": "🌙",
      "practice-centurion": "💯",
      "skills-specialist": "🔧",
      "century-club": "💯",
      "fnh-legend": "🌟",
      "team-veteran": "🎖️",
      "foundation-graduate": "🎓",
      "technique-titan": "⚒️",
      "peak-performer": "💪",
      "basketball-savant": "🧠",
      "perfect-attendance-online": "✅",
      
      // All-Star icons
      "game-changer-3x-mvp": "🎮",
      "the-closer-3x-clutch": "🎯",
      "the-sparkplug-3x-comeback": "⚡",
      "the-engine-3x-hustle": "🔧",
      "the-glue-3x-teammate": "🧲",
      "class-act-3x-sportsmanship": "🎭",
      "the-protege-3x-student": "👨‍🎓",
      "the-standard-3x-lead-by-example": "📏",
      "the-dependable": "⏰",
      "recruiter": "👥",
      "practice-fiend": "🔥",
      "skills-devotee": "🙏",
      "seasoned-competitor": "🏀",
      "fnh-veteran": "🌙",
      "first-year-anniversary": "🎂",
      "half-time-adjustments": "⚡",
      "monthly-module-master": "📅",
      "skills-sharp-shooter": "🎯",
      "conditioning-core": "💪",
      "strategic-specialist": "🎯",
      "mid-season-mentor": "👨‍🏫",
      
      // Starter icons
      "locked-in": "🔒",
      "on-the-ball": "⚽",
      "tournament-titan": "🏆",
      "dedicated-grinder": "⚙️",
      "skills-seeker": "🔍",
      "regular-competitor": "🏀",
      "fnh-regular": "🌙",
      "game-mvp": "🏆",
      "clutch-player": "⏰",
      "comeback-kid": "↩️",
      "sportsmanship-award": "🤝",
      "hustle-award": "🏃",
      "teammate-award": "👥",
      "student-of-the-game": "📚",
      "lead-by-example": "👨‍🏫",
      "weekly-warm-up": "📅",
      "film-study": "🎬",
      "skill-builder": "🔨",
      "foundation-force": "💪",
      "court-visionary": "👁️",
      "back-to-back-sessions": "🔄",
      
      // Prospect icons
      "checked-in": "✅",
      "road-warrior": "🚗",
      "holiday-hero": "🎄",
      "the-debut": "🆕",
      "friday-follower": "🌙",
      "heating-up": "🔥",
      "game-planner": "📋",
      "practice-planner": "📝",
      "first-reps": "1️⃣",
      "skill-starter": "🚀",
      "first-ten": "🔟",
      "fnh-fighter": "🥊",
      "digital-first-steps": "👶",
      "virtual-handles": "🎮",
      "remote-strength": "💪",
      "mindful-start": "🧘"
    };
    
    return iconMap[award.id] || "🏆";
  };

  // Badges filtering
  
  // Define tier order for sorting
  const tierOrder = {
    "HallOfFamer": 1,
    "Superstar": 2,
    "AllStar": 3,
    "Starter": 4,
    "Prospect": 5
  };

  const filteredBadges = badges
    .filter(badge => {
      // Apply tier filter first
      if (tierFilter && badge.tier !== tierFilter) return false;
      
      // Then apply status filter
      if (filter === "all") return true;
      if (filter === "earned") return isBadgeEarned(badge);
      if (filter === "progress") return !isBadgeEarned(badge);
      return true;
    })
    .sort((a, b) => {
      // When showing all badges, sort by tier order (HOF to Prospect)
      if (filter === "all") {
        return tierOrder[a.tier as keyof typeof tierOrder] - tierOrder[b.tier as keyof typeof tierOrder];
      }
      return 0;
    });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back Button */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setLocation("/player-dashboard")}
          data-testid="button-back"
          className="text-gray-700 hover:text-red-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-red-400 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Trophy/Badge Filter Header */}
      <div className="mb-12">
        <div className="flex justify-center items-center gap-6 px-4">
          {/* Trophy Filter */}
          <div 
            className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
              tierFilter === 'Trophy' ? 'transform scale-110 drop-shadow-lg' : 'hover:scale-105'
            }`}
            onClick={() => handleTierFilter('Trophy')}
            data-testid="filter-trophy"
          >
            <div className={`relative ${tierFilter === 'Trophy' ? 'animate-pulse' : ''}`}>
              <div className="text-6xl">🏆</div>
              <div className={`absolute -top-1 -right-1 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 ${
                tierFilter === 'Trophy' ? 'animate-bounce bg-red-600' : ''
              }`}>
                {tierCounts.Trophy}
              </div>
            </div>
          </div>

          {/* Hall of Famer */}
          <div 
            className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
              tierFilter === 'HallOfFamer' ? 'transform scale-110 drop-shadow-lg' : 'hover:scale-105'
            }`}
            onClick={() => handleTierFilter('HallOfFamer')}
            data-testid="filter-halloffamer"
          >
            <div className={`relative ${tierFilter === 'HallOfFamer' ? 'animate-pulse' : ''}`}>
              <div className="w-16 h-16 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-b from-yellow-300 to-yellow-500 rounded-full"></div>
              </div>
              <div className={`absolute -top-1 -right-1 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 ${
                tierFilter === 'HallOfFamer' ? 'animate-bounce bg-red-600' : ''
              }`}>
                {tierCounts.HallOfFamer}
              </div>
            </div>
          </div>

          {/* Superstar */}
          <div 
            className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
              tierFilter === 'Superstar' ? 'transform scale-110 drop-shadow-lg' : 'hover:scale-105'
            }`}
            onClick={() => handleTierFilter('Superstar')}
            data-testid="filter-superstar"
          >
            <div className={`relative ${tierFilter === 'Superstar' ? 'animate-pulse' : ''}`}>
              <div className="w-16 h-16 bg-gradient-to-b from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-b from-purple-400 to-purple-600 rounded-full"></div>
              </div>
              <div className={`absolute -top-1 -right-1 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 ${
                tierFilter === 'Superstar' ? 'animate-bounce bg-red-600' : ''
              }`}>
                {tierCounts.Superstar}
              </div>
            </div>
          </div>

          {/* AllStar */}
          <div 
            className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
              tierFilter === 'AllStar' ? 'transform scale-110 drop-shadow-lg' : 'hover:scale-105'
            }`}
            onClick={() => handleTierFilter('AllStar')}
            data-testid="filter-allstar"
          >
            <div className={`relative ${tierFilter === 'AllStar' ? 'animate-pulse' : ''}`}>
              <div className="w-16 h-16 bg-gradient-to-b from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
              </div>
              <div className={`absolute -top-1 -right-1 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 ${
                tierFilter === 'AllStar' ? 'animate-bounce bg-red-600' : ''
              }`}>
                {tierCounts.AllStar}
              </div>
            </div>
          </div>

          {/* Starter */}
          <div 
            className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
              tierFilter === 'Starter' ? 'transform scale-110 drop-shadow-lg' : 'hover:scale-105'
            }`}
            onClick={() => handleTierFilter('Starter')}
            data-testid="filter-starter"
          >
            <div className={`relative ${tierFilter === 'Starter' ? 'animate-pulse' : ''}`}>
              <div className="w-16 h-16 bg-gradient-to-b from-green-500 to-green-700 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-b from-green-400 to-green-600 rounded-full"></div>
              </div>
              <div className={`absolute -top-1 -right-1 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 ${
                tierFilter === 'Starter' ? 'animate-bounce bg-red-600' : ''
              }`}>
                {tierCounts.Starter}
              </div>
            </div>
          </div>

          {/* Prospect */}
          <div 
            className={`flex flex-col items-center cursor-pointer transition-all duration-300 ${
              tierFilter === 'Prospect' ? 'transform scale-110 drop-shadow-lg' : 'hover:scale-105'
            }`}
            onClick={() => handleTierFilter('Prospect')}
            data-testid="filter-prospect"
          >
            <div className={`relative ${tierFilter === 'Prospect' ? 'animate-pulse' : ''}`}>
              <div className="w-16 h-16 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-12 h-12 bg-gradient-to-b from-gray-300 to-gray-500 rounded-full"></div>
              </div>
              <div className={`absolute -top-1 -right-1 min-w-[24px] h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1 ${
                tierFilter === 'Prospect' ? 'animate-bounce bg-red-600' : ''
              }`}>
                {tierCounts.Prospect}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trophies Section */}
      {(!tierFilter || tierFilter === 'Trophy') && (
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🏆 Trophies
          </h2>


        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {/* Heart & Hustle Award */}
          <button
            onClick={() => openModal("", "The UYP Heart and Hustle Award", "The ultimate recognition of effort and determination! This yearly award goes to the single player across all of UYP who most consistently gave their all, demonstrating exceptional effort and determination in every practice and game. This is the highest honor for work ethic in the entire organization.")}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 flex items-center gap-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            data-testid="trophy-heart-hustle"
          >
            <div className="text-4xl">🏆</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">♥ & Hustle</div>
          </button>

          {/* Spirit Award */}
          <button
            onClick={() => openModal("", "The Spirit Award", "The pinnacle of character recognition! Awarded to the one player across the entire UYP organization who best maintained a positive attitude, lifted team morale, and represented the character of UYP both on and off the court. This award recognizes the player who embodies the true spirit of basketball.")}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 flex items-center gap-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            data-testid="trophy-spirit"
          >
            <div className="text-4xl">🏆</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">Spirit</div>
          </button>

          {/* Season MVP */}
          <button
            onClick={() => openModal("", "Season MVP Trophy", "Awarded to the Most Valuable Player of the season, recognizing outstanding performance, leadership, and contribution to team success throughout the entire season.")}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 flex items-center gap-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            data-testid="trophy-mvp"
          >
            <div className="text-4xl">🏆</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">MVP</div>
          </button>

          {/* Most Improved Player */}
          <button
            onClick={() => openModal("", "Most Improved Player Trophy", "Recognizes the player who has shown the greatest improvement in skills, attitude, and performance throughout the season. This award celebrates growth, dedication, and the commitment to getting better every day.")}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 flex items-center gap-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            data-testid="trophy-mip"
          >
            <div className="text-4xl">🏆</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">MIP</div>
          </button>

          {/* Coach's Choice */}
          <button
            onClick={() => openModal("", "Coach's Choice Trophy", "A special recognition awarded at the coach's discretion to a player who exemplifies the values and spirit of the team. This award recognizes qualities that go beyond statistics - leadership, character, and positive impact on teammates.")}
            className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 flex items-center gap-4 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors col-span-2 justify-center"
            data-testid="trophy-coach"
          >
            <div className="text-4xl">🏆</div>
            <div className="text-lg font-semibold text-gray-800 dark:text-gray-200">Coach</div>
          </button>
        </div>
        </div>
      )}

      {/* Badges Section */}
      {(!tierFilter || tierFilter !== 'Trophy') && (
        <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🎖️ Badges
        </h2>


        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "all"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("all")}
            data-testid="filter-all"
          >
            All Badges
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "earned"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("earned")}
            data-testid="filter-earned"
          >
            Earned
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "progress"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("progress")}
            data-testid="filter-progress"
          >
            In Progress
          </button>

        </div>

        {/* Achievement Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredBadges.map((badge) => {
            const isEarned = isBadgeEarned(badge);
            const progress = getBadgeProgress(badge);
            
            // Get tier-specific styling
            const getTierStyles = () => {
              switch (badge.tier) {
                case "HallOfFamer":
                  return isEarned 
                    ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-300 dark:border-emerald-600"
                    : "bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-300 dark:border-yellow-600";
                case "Superstar":
                  return isEarned 
                    ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-300 dark:border-emerald-600"
                    : "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-300 dark:border-purple-600";
                case "AllStar":
                  return isEarned 
                    ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-300 dark:border-emerald-600"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-300 dark:border-blue-600";
                case "Starter":
                  return isEarned 
                    ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-300 dark:border-emerald-600"
                    : "bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-900/20 dark:to-teal-900/20 border-green-300 dark:border-green-600";
                case "Prospect":
                  return isEarned 
                    ? "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-300 dark:border-emerald-600"
                    : "bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-300 dark:border-gray-600";
                default:
                  return "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700";
              }
            };
            
            return (
              <div
                key={badge.id}
                className={`${getTierStyles()} rounded-lg border p-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 flex flex-col items-center text-center`}
                onClick={() =>
                  openModal(
                    getAwardIcon(badge),
                    badge.name,
                    badge.description,
                    progress
                  )
                }
                data-testid={`badge-${badge.id}`}
              >
                <div className="mb-3">
                  <div className="text-3xl mb-2">{getAwardIcon(badge)}</div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    isEarned 
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  }`}>
                    {progress}
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  {badge.name}
                </div>
              </div>
            );
          })}
        </div>

        {filteredBadges.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400" data-testid="no-results">
            <p>No badges found for the selected filter.</p>
          </div>
        )}
        </div>
      )}

      {/* Trophy Modal */}
      {modal.open && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-2xl w-full relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              data-testid="modal-close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              {/* Display large trophy image based on the title */}
              <div className="mb-6">
                {modal.title.includes("Heart and Hustle") && (
                  <img src={heartHustleImage} alt="Heart & Hustle Award" className="w-64 h-64 object-contain mx-auto" />
                )}
                {modal.title.includes("Spirit") && (
                  <img src={spiritAwardImage} alt="Spirit Award" className="w-64 h-64 object-contain mx-auto" />
                )}
                {modal.title.includes("MVP") && (
                  <img src={seasonMvpImage} alt="Season MVP Trophy" className="w-64 h-64 object-contain mx-auto" />
                )}
                {modal.title.includes("Most Improved") && (
                  <img src={mostImprovedImage} alt="Most Improved Player Trophy" className="w-64 h-64 object-contain mx-auto" />
                )}
                {modal.title.includes("Coach") && (
                  <img src={coachAwardImage} alt="Coach's Choice Trophy" className="w-64 h-64 object-contain mx-auto" />
                )}
              </div>
              <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                {modal.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4 text-left leading-relaxed">{modal.desc}</p>
              {modal.progress && (
                <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  Progress: {modal.progress}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}