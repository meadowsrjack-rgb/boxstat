ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "manager_ids" varchar[] DEFAULT ARRAY[]::varchar[];--> statement-breakpoint
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "strength_coach_ids" varchar[] DEFAULT ARRAY[]::varchar[];
