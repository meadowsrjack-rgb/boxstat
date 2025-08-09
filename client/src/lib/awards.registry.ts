import { Award } from "./awards.types";

export const AWARDS: Award[] = [
  // Legacy Trophies (Coach-Awarded End of Season)
  {
    id: "coach-choice",
    kind: "Trophy",
    name: "Coach's Choice",
    tier: "Legacy",
    category: "SeasonalLegacy",
    description: "Special recognition from coach for exceptional character and dedication.",
    iconName: "trophy-coach-choice",
    progressKind: "manual",
    triggerSources: ["coachAward"],
    tags: ["Coach", "Special"]
  },
  {
    id: "most-improved",
    kind: "Trophy", 
    name: "Most Improved",
    tier: "Legacy",
    category: "SeasonalLegacy",
    description: "Awarded to the player who showed the greatest improvement over the season.",
    iconName: "trophy-most-improved",
    progressKind: "manual",
    triggerSources: ["coachAward"],
    tags: ["Improvement", "Season"]
  },
  {
    id: "leadership",
    kind: "Trophy",
    name: "Leadership",
    tier: "Legacy", 
    category: "SeasonalLegacy",
    description: "For demonstrating exceptional leadership on and off the court.",
    iconName: "trophy-leadership",
    progressKind: "manual",
    triggerSources: ["coachAward"],
    tags: ["Leadership", "Character"]
  },
  {
    id: "mvp-season",
    kind: "Trophy",
    name: "Season MVP",
    tier: "Legacy",
    category: "SeasonalLegacy", 
    description: "Most Valuable Player for the entire season.",
    iconName: "trophy-mvp-season",
    progressKind: "manual",
    triggerSources: ["coachAward"],
    tags: ["MVP", "Season"]
  },
  {
    id: "championship",
    kind: "Trophy",
    name: "Championship",
    tier: "Legacy",
    category: "SeasonalLegacy",
    description: "Team championship winner - the ultimate achievement.",
    iconName: "trophy-championship", 
    progressKind: "manual",
    triggerSources: ["coachAward"],
    tags: ["Championship", "Team"]
  },

  // Team Trophies (Coach-Awarded for Specific Achievements)
  {
    id: "team-mvp",
    kind: "Trophy",
    name: "Team MVP",
    tier: "Team",
    category: "InGamePerformance",
    description: "Most Valuable Player recognition from coach.",
    iconName: "trophy-team-mvp",
    progressKind: "manual", 
    triggerSources: ["coachAward"],
    tags: ["MVP", "Team"]
  },
  {
    id: "team-hustle",
    kind: "Trophy",
    name: "Team Hustle",
    tier: "Team",
    category: "InGamePerformance",
    description: "Hustle Player recognition from coach.",
    iconName: "trophy-team-hustle",
    progressKind: "manual",
    triggerSources: ["coachAward"], 
    tags: ["Hustle", "Team"]
  },

  // Hall of Famer Badges (Elite - Yellow)
  {
    id: "superstar",
    kind: "Badge",
    name: "Superstar",
    tier: "HallOfFamer",
    category: "InGamePerformance",
    description: "Earned 10 MVP awards - the pinnacle of individual performance.",
    iconName: "badge-superstar",
    progressKind: "counter",
    counterOf: { stat: "mvpCount", target: 10, label: "MVP awards" },
    triggerSources: ["coachAward"],
    tags: ["MVP", "Elite"]
  },
  {
    id: "legend",
    kind: "Badge", 
    name: "Legend",
    tier: "HallOfFamer",
    category: "InGamePerformance",
    description: "Earned 10 Hustle awards - legendary work ethic and determination.",
    iconName: "badge-legend",
    progressKind: "counter",
    counterOf: { stat: "hustleCount", target: 10, label: "Hustle awards" },
    triggerSources: ["coachAward"],
    tags: ["Hustle", "Elite"]
  },
  {
    id: "century",
    kind: "Badge",
    name: "Century",
    tier: "HallOfFamer", 
    category: "Attendance",
    description: "Attended 100 total practices - shows incredible dedication.",
    iconName: "badge-century",
    progressKind: "counter",
    counterOf: { stat: "practicesTotal", target: 100, label: "practices attended" },
    triggerSources: ["attendance"],
    tags: ["Practices", "Elite"]
  },
  {
    id: "training-master",
    kind: "Badge",
    name: "Training Master", 
    tier: "HallOfFamer",
    category: "TrainingProgram",
    description: "Completed 25 training programs - mastery through dedication.",
    iconName: "badge-training-master",
    progressKind: "counter",
    counterOf: { stat: "trainingProgramsCompleted", target: 25, label: "programs completed" },
    triggerSources: ["trainingCompletion"],
    tags: ["Training", "Elite"]
  },

  // Superstar Badges (Advanced - Purple) 
  {
    id: "star-player",
    kind: "Badge",
    name: "Star Player",
    tier: "Superstar",
    category: "InGamePerformance", 
    description: "Earned 5 MVP awards - a true star on the court.",
    iconName: "badge-star-player",
    progressKind: "counter",
    counterOf: { stat: "mvpCount", target: 5, label: "MVP awards" },
    triggerSources: ["coachAward"],
    tags: ["MVP", "Performance"]
  },
  {
    id: "workhorse",
    kind: "Badge",
    name: "Workhorse", 
    tier: "Superstar",
    category: "InGamePerformance",
    description: "Earned 5 Hustle awards - relentless effort and energy.",
    iconName: "badge-workhorse", 
    progressKind: "counter",
    counterOf: { stat: "hustleCount", target: 5, label: "Hustle awards" },
    triggerSources: ["coachAward"],
    tags: ["Hustle", "Work Ethic"]
  },
  {
    id: "practice-veteran",
    kind: "Badge",
    name: "Practice Veteran",
    tier: "Superstar",
    category: "Attendance",
    description: "Attended 50 total practices - veteran-level commitment.",
    iconName: "badge-practice-veteran",
    progressKind: "counter", 
    counterOf: { stat: "practicesTotal", target: 50, label: "practices attended" },
    triggerSources: ["attendance"],
    tags: ["Practices", "Veteran"]
  },
  {
    id: "training-expert",
    kind: "Badge",
    name: "Training Expert",
    tier: "Superstar",
    category: "TrainingProgram",
    description: "Completed 15 training programs - expert-level skill development.",
    iconName: "badge-training-expert",
    progressKind: "counter",
    counterOf: { stat: "trainingProgramsCompleted", target: 15, label: "programs completed" },
    triggerSources: ["trainingCompletion"],
    tags: ["Training", "Expert"]
  },

  // All-Star Badges (Solid - Blue)
  {
    id: "standout",
    kind: "Badge", 
    name: "Standout",
    tier: "AllStar",
    category: "InGamePerformance",
    description: "Earned 3 MVP awards - consistently stands out from the crowd.",
    iconName: "badge-standout",
    progressKind: "counter",
    counterOf: { stat: "mvpCount", target: 3, label: "MVP awards" },
    triggerSources: ["coachAward"],
    tags: ["MVP", "Consistent"]
  },
  {
    id: "grinder",
    kind: "Badge",
    name: "Grinder",
    tier: "AllStar", 
    category: "InGamePerformance",
    description: "Earned 3 Hustle awards - never stops grinding and working hard.",
    iconName: "badge-grinder",
    progressKind: "counter",
    counterOf: { stat: "hustleCount", target: 3, label: "Hustle awards" },
    triggerSources: ["coachAward"],
    tags: ["Hustle", "Persistence"]
  },
  {
    id: "practice-regular",
    kind: "Badge",
    name: "Practice Regular",
    tier: "AllStar",
    category: "Attendance",
    description: "Attended 25 total practices - regular attendance shows commitment.",
    iconName: "badge-practice-regular", 
    progressKind: "counter",
    counterOf: { stat: "practicesTotal", target: 25, label: "practices attended" },
    triggerSources: ["attendance"],
    tags: ["Practices", "Regular"]
  },
  {
    id: "training-specialist", 
    kind: "Badge",
    name: "Training Specialist",
    tier: "AllStar",
    category: "TrainingProgram",
    description: "Completed 10 training programs - developing specialized skills.",
    iconName: "badge-training-specialist",
    progressKind: "counter",
    counterOf: { stat: "trainingProgramsCompleted", target: 10, label: "programs completed" },
    triggerSources: ["trainingCompletion"],
    tags: ["Training", "Specialist"]
  },

  // Starter Badges (First Achievements - Green)
  {
    id: "rising-star",
    kind: "Badge",
    name: "Rising Star",
    tier: "Starter",
    category: "InGamePerformance",
    description: "Earned first MVP award - a star is born!",
    iconName: "badge-rising-star",
    progressKind: "counter",
    counterOf: { stat: "mvpCount", target: 1, label: "MVP awards" },
    triggerSources: ["coachAward"],
    tags: ["MVP", "First"]
  },
  {
    id: "hustler",
    kind: "Badge",
    name: "Hustler", 
    tier: "Starter",
    category: "InGamePerformance",
    description: "Earned first Hustle award - showing that winning effort!",
    iconName: "badge-hustler",
    progressKind: "counter",
    counterOf: { stat: "hustleCount", target: 1, label: "Hustle awards" },
    triggerSources: ["coachAward"],
    tags: ["Hustle", "First"]
  },
  {
    id: "practice-starter",
    kind: "Badge",
    name: "Practice Starter",
    tier: "Starter",
    category: "Attendance",
    description: "Attended 10 total practices - building the foundation of success.",
    iconName: "badge-practice-starter",
    progressKind: "counter",
    counterOf: { stat: "practicesTotal", target: 10, label: "practices attended" },
    triggerSources: ["attendance"],
    tags: ["Practices", "Foundation"]
  },
  {
    id: "training-beginner",
    kind: "Badge",
    name: "Training Beginner",
    tier: "Starter", 
    category: "TrainingProgram",
    description: "Completed 5 training programs - beginning the journey to excellence.",
    iconName: "badge-training-beginner",
    progressKind: "counter",
    counterOf: { stat: "trainingProgramsCompleted", target: 5, label: "programs completed" },
    triggerSources: ["trainingCompletion"],
    tags: ["Training", "Beginner"]
  },

  // Prospect Badges (Entry Level - Grey)
  {
    id: "first-mvp",
    kind: "Badge",
    name: "First MVP",
    tier: "Prospect",
    category: "InGamePerformance",
    description: "For earning your very first MVP award.",
    iconName: "badge-first-mvp",
    progressKind: "counter",
    counterOf: { stat: "mvpCount", target: 1, label: "MVP awards" },
    triggerSources: ["coachAward"],
    tags: ["MVP", "Milestone"]
  },
  {
    id: "first-hustle",
    kind: "Badge",
    name: "First Hustle", 
    tier: "Prospect",
    category: "InGamePerformance",
    description: "For earning your very first Hustle award.",
    iconName: "badge-first-hustle",
    progressKind: "counter",
    counterOf: { stat: "hustleCount", target: 1, label: "Hustle awards" },
    triggerSources: ["coachAward"],
    tags: ["Hustle", "Milestone"]
  },
  {
    id: "first-practice",
    kind: "Badge",
    name: "First Practice",
    tier: "Prospect",
    category: "Attendance",
    description: "For attending your very first practice.",
    iconName: "badge-first-practice",
    progressKind: "counter",
    counterOf: { stat: "practicesTotal", target: 1, label: "practices attended" },
    triggerSources: ["attendance"],
    tags: ["Practices", "First"]
  },
  {
    id: "first-training",
    kind: "Badge",
    name: "First Training",
    tier: "Prospect",
    category: "TrainingProgram",
    description: "For completing your very first training program.",
    iconName: "badge-first-training", 
    progressKind: "counter",
    counterOf: { stat: "trainingProgramsCompleted", target: 1, label: "programs completed" },
    triggerSources: ["trainingCompletion"],
    tags: ["Training", "First"]
  }
];

export const TIER_ORDER = ["Prospect", "Starter", "AllStar", "Superstar", "HallOfFamer", "Team", "Legacy"];