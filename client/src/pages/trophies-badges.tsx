import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AWARDS } from "../lib/awards.registry";
import "./trophies-badges.css";

export default function TrophiesBadges() {
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState({ open: false, icon: "", title: "", desc: "", progress: "" });

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
    
    if (award.progressKind === "composite" && award.composite) {
      return award.composite.every(req => {
        if (req.seasonScoped) {
          const seasonValue = mockUserStats.season[req.stat as keyof typeof mockUserStats.season] as number;
          return seasonValue >= (req.min || 1);
        } else {
          const statValue = mockUserStats[req.stat as keyof typeof mockUserStats] as number;
          return statValue >= (req.min || 1);
        }
      });
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
    
    if (award.progressKind === "composite" && award.composite) {
      const completed = award.composite.filter(req => {
        if (req.seasonScoped) {
          const seasonValue = mockUserStats.season[req.stat as keyof typeof mockUserStats.season] as number;
          return seasonValue >= (req.min || 1);
        } else {
          const statValue = mockUserStats[req.stat as keyof typeof mockUserStats] as number;
          return statValue >= (req.min || 1);
        }
      }).length;
      return `${completed}/${award.composite.length}`;
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

  // Filter badges and trophies
  const trophies = AWARDS.filter(award => award.kind === "Trophy");
  const badges = AWARDS.filter(award => award.kind === "Badge");
  
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
    <div className="container">
      <div className="header" />

      {/* Trophies Section */}
      <div className="trophies-section">
        <h2 className="section-title">🏆 Trophies</h2>
        <p className="section-subtitle">
          The most prestigious awards recognizing exceptional season-long achievements
        </p>

        <div className="trophies-grid">
          <div className="trophy-subsection">
            <h3 className="subsection-title">🌟 UYP Legacy Trophies (Yearly)</h3>
            <p className="subsection-description">
              Premier organization-wide honors - only one recipient selected from all UYP teams
            </p>

            <div className="trophy-cards-grid">
              <div
                className="trophy-card legacy-trophy"
                onClick={() =>
                  openModal(
                    "❤️‍🔥",
                    "The UYP Heart and Hustle Award",
                    "The ultimate recognition of effort and determination! This yearly award goes to the single player across all of UYP who most consistently gave their all, demonstrating exceptional effort and determination in every practice and game. This is the highest honor for work ethic in the entire organization."
                  )
                }
                data-testid="trophy-heart-hustle"
              >
                <div className="trophy-icon-container">
                  <div className="trophy-icon">❤️‍🔥</div>
                  <div className="trophy-status">Not Awarded</div>
                </div>
                <div className="trophy-title">The UYP Heart and Hustle Award</div>
                <div className="trophy-description">
                  Organization's highest honor for effort and determination
                </div>
              </div>

              <div
                className="trophy-card legacy-trophy"
                onClick={() =>
                  openModal(
                    "✨",
                    "The Spirit Award",
                    "The pinnacle of character recognition! Awarded to the one player across the entire UYP organization who best maintained a positive attitude, lifted team morale, and represented the character of UYP both on and off the court. This award recognizes the player who embodies the true spirit of basketball."
                  )
                }
                data-testid="trophy-spirit"
              >
                <div className="trophy-icon-container">
                  <div className="trophy-icon">✨</div>
                  <div className="trophy-status">Not Awarded</div>
                </div>
                <div className="trophy-title">The Spirit Award</div>
                <div className="trophy-description">Highest character honor across entire organization</div>
              </div>
            </div>
          </div>

          {/* Coach-Awarded Team Trophies */}
          <div className="trophy-subsection">
            <h3 className="subsection-title">🏆 Coach-Awarded Team Trophies</h3>
            <p className="subsection-description">
              Season-long achievements recognized by your coach
            </p>

            <div className="trophy-cards-grid">
              {trophies.map((trophy) => (
                <div
                  key={trophy.id}
                  className="trophy-card team-trophy"
                  onClick={() =>
                    openModal(
                      getAwardIcon(trophy),
                      trophy.name,
                      trophy.description
                    )
                  }
                  data-testid={`trophy-${trophy.id}`}
                >
                  <div className="trophy-icon-container">
                    <div className="trophy-icon">{getAwardIcon(trophy)}</div>
                    <div className="trophy-status">Not Awarded</div>
                  </div>
                  <div className="trophy-title">{trophy.name}</div>
                  <div className="trophy-description">{trophy.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div className="badges-section">
        <h2 className="section-title">🎖️ Achievement Badges</h2>
        <p className="section-subtitle">
          Unlock these badges by reaching milestones and demonstrating consistent excellence
        </p>

        {/* Filter Buttons */}
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === "all" ? "active" : ""}`}
            onClick={() => setFilter("all")}
            data-testid="filter-all"
          >
            All Badges
          </button>
          <button
            className={`filter-btn ${filter === "earned" ? "active" : ""}`}
            onClick={() => setFilter("earned")}
            data-testid="filter-earned"
          >
            Earned
          </button>
          <button
            className={`filter-btn ${filter === "progress" ? "active" : ""}`}
            onClick={() => setFilter("progress")}
            data-testid="filter-progress"
          >
            In Progress
          </button>
          <button
            className={`filter-btn ${filter === "hall-of-famer" ? "active" : ""}`}
            onClick={() => setFilter("hall-of-famer")}
            data-testid="filter-hall-of-famer"
          >
            Hall of Famer
          </button>
          <button
            className={`filter-btn ${filter === "superstar" ? "active" : ""}`}
            onClick={() => setFilter("superstar")}
            data-testid="filter-superstar"
          >
            Superstar
          </button>
          <button
            className={`filter-btn ${filter === "all-star" ? "active" : ""}`}
            onClick={() => setFilter("all-star")}
            data-testid="filter-all-star"
          >
            All-Star
          </button>
          <button
            className={`filter-btn ${filter === "starter" ? "active" : ""}`}
            onClick={() => setFilter("starter")}
            data-testid="filter-starter"
          >
            Starter
          </button>
          <button
            className={`filter-btn ${filter === "prospect" ? "active" : ""}`}
            onClick={() => setFilter("prospect")}
            data-testid="filter-prospect"
          >
            Prospect
          </button>
        </div>

        {/* Achievement Cards Grid */}
        <div className="achievements-grid">
          {filteredBadges.map((badge) => {
            const isEarned = isBadgeEarned(badge);
            const progress = getBadgeProgress(badge);
            const tierClass = badge.tier.toLowerCase().replace("of", "-of").replace(/([A-Z])/g, "-$1").toLowerCase();
            
            return (
              <div
                key={badge.id}
                className={`achievement-card ${tierClass} ${isEarned ? "achieved" : ""}`}
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
                <div className="icon-container">
                  <div className="achievement-icon">{getAwardIcon(badge)}</div>
                  <div className={`progress-indicator ${isEarned ? "completed" : ""}`}>
                    {progress}
                  </div>
                </div>
                <div className="achievement-title">{badge.name}</div>
              </div>
            );
          })}
        </div>

        {filteredBadges.length === 0 && (
          <div className="no-results" data-testid="no-results">
            <p>No badges found for the selected filter.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {modal.open && (
        <div className="modal" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-content">
            <div className="modal-icon">{modal.icon}</div>
            <div className="modal-title">{modal.title}</div>
            <div className="modal-description">{modal.desc}</div>
            {modal.progress && (
              <div className="modal-progress">
                Progress: {modal.progress}
              </div>
            )}
            <button className="close-modal" onClick={closeModal} data-testid="close-modal">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}