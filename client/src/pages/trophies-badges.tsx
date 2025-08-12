import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AWARDS } from "../lib/awards.registry";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Import trophy images
import heartHustleImage from "@assets/Heart & Hustle Award_1754973783768.png";
import spiritAwardImage from "@assets/Spirit Award_1754973783769.png";
import coachAwardImage from "@assets/Coach Award_1754973783767.png";
import mostImprovedImage from "@assets/Season MIP Award_1754973783767.png";
import seasonMvpImage from "@assets/Season MVP Award_1754973783769.png";

export default function TrophiesBadges() {
  const [filter, setFilter] = useState("all");
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
  
  const filteredBadges = badges.filter(badge => {
    if (filter === "all") return true;
    if (filter === "earned") return isBadgeEarned(badge);
    if (filter === "progress") return !isBadgeEarned(badge);
    if (filter === "hall-of-famer") return badge.tier === "HallOfFamer";
    if (filter === "superstar") return badge.tier === "Superstar";
    if (filter === "all-star") return badge.tier === "AllStar";
    if (filter === "starter") return badge.tier === "Starter";
    if (filter === "prospect") return badge.tier === "Prospect";
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8" />

      {/* Trophies Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🏆 Trophies
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-8 max-w-3xl mx-auto">
          The most prestigious awards recognizing exceptional season-long achievements
        </p>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center">
            <span className="text-3xl mr-3">🏆</span>
            Trophy Collection
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Organization-wide honors and season achievements
          </p>

            <div className="relative">
              <div className="flex justify-center">
                {allTrophies.length > 0 && (
                  <div
                    className="cursor-pointer transition-all duration-500 hover:scale-105 flex flex-col items-center text-center"
                    onClick={() => {
                      const currentTrophy = allTrophies[orgCarouselIndex];
                      openModal("", currentTrophy.name, currentTrophy.description);
                    }}
                    data-testid={`trophy-${allTrophies[orgCarouselIndex]?.id}`}
                  >
                    {allTrophies[orgCarouselIndex]?.image ? (
                      <img 
                        src={allTrophies[orgCarouselIndex].image} 
                        alt={allTrophies[orgCarouselIndex].name}
                        className="w-48 h-48 object-contain transition-opacity duration-500"
                      />
                    ) : (
                      <div className="text-8xl text-gray-400 dark:text-gray-500 transition-opacity duration-500">
                        {getAwardIcon(trophies.find(t => t.id === allTrophies[orgCarouselIndex]?.id) || trophies[0])}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              {allTrophies.length > 1 && (
                <>
                  <button
                    onClick={() => setOrgCarouselIndex((prev) => (prev - 1 + allTrophies.length) % allTrophies.length)}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    data-testid="trophy-carousel-prev"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                  
                  <button
                    onClick={() => setOrgCarouselIndex((prev) => (prev + 1) % allTrophies.length)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white dark:bg-gray-800 rounded-full p-2 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    data-testid="trophy-carousel-next"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>

                  {/* Dots indicator */}
                  <div className="flex justify-center mt-4 space-x-2">
                    {allTrophies.map((_, index: number) => (
                      <button
                        key={index}
                        onClick={() => setOrgCarouselIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === orgCarouselIndex 
                            ? 'bg-yellow-500' 
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                        data-testid={`trophy-dot-${index}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-center mb-4 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          🎖️ Achievement Badges
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 text-center mb-8 max-w-3xl mx-auto">
          Unlock these badges by reaching milestones and demonstrating consistent excellence
        </p>

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
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "hall-of-famer"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("hall-of-famer")}
            data-testid="filter-hall-of-famer"
          >
            Hall of Famer
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "superstar"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("superstar")}
            data-testid="filter-superstar"
          >
            Superstar
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "all-star"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("all-star")}
            data-testid="filter-all-star"
          >
            All-Star
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "starter"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("starter")}
            data-testid="filter-starter"
          >
            Starter
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
              filter === "prospect"
                ? "bg-blue-500 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
            }`}
            onClick={() => setFilter("prospect")}
            data-testid="filter-prospect"
          >
            Prospect
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

      {/* Modal */}
      {modal.open && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" 
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 max-w-md w-full relative">
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              data-testid="modal-close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h3 className="text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
                {modal.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{modal.desc}</p>
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