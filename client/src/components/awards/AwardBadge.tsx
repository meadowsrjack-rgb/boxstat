import { getAwardIcon } from "./awardIcons";

interface AwardBadgeProps {
  tier: string;
  icon?: string | null;
  size?: number;
  locked?: boolean;
  className?: string;
}

const TIER_MAP: Record<string, string> = {
  Bronze: "bronze",
  Silver: "silver",
  Gold: "gold",
  Platinum: "platinum",
  Diamond: "diamond",
  Legend: "legend",
  Prospect: "bronze",
  Starter: "silver",
  "All-Star": "gold",
  AllStar: "gold",
  Superstar: "platinum",
  HOF: "diamond",
  HallOfFamer: "diamond",
  Legacy: "legend",
  Badge: "bronze",
  Trophy: "gold",
};

export function AwardBadge({ tier, icon, size = 80, locked = false, className = "" }: AwardBadgeProps) {
  const tierSlug = TIER_MAP[tier] || "bronze";
  const LucideIcon = icon ? getAwardIcon(icon) : null;

  return (
    <div
      className={`relative flex-shrink-0 ${locked ? "grayscale opacity-50" : ""} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={`/badges/${tierSlug}.png`}
        alt={tier}
        className="w-full h-full object-contain"
        loading="lazy"
      />
      {LucideIcon && (
        <LucideIcon
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/90 drop-shadow-md"
          size={size * 0.32}
          strokeWidth={1.8}
        />
      )}
    </div>
  );
}
