-- Add xp_reward column to award_definitions table
ALTER TABLE "award_definitions" ADD COLUMN IF NOT EXISTS "xp_reward" integer DEFAULT 50;

-- Backfill XP values by tier
UPDATE "award_definitions" SET "xp_reward" = 50
  WHERE "tier" IN ('Prospect', 'Starter', 'Bronze', 'Badge') AND "xp_reward" IS NULL OR "xp_reward" = 50;

UPDATE "award_definitions" SET "xp_reward" = CASE
  WHEN "tier" IN ('Prospect', 'Starter', 'Bronze', 'Badge') THEN 50
  WHEN "tier" IN ('AllStar', 'All-Star', 'Silver', 'Team') THEN 100
  WHEN "tier" IN ('Superstar', 'Gold', 'Platinum', 'Trophy') THEN 200
  WHEN "tier" IN ('HallOfFamer', 'HOF', 'Diamond') THEN 300
  WHEN "tier" IN ('Legacy', 'Legend') THEN 500
  ELSE 50
END;
