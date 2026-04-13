-- Add min_age and max_age columns to teams table for explicit age range matching
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "min_age" integer;
ALTER TABLE "teams" ADD COLUMN IF NOT EXISTS "max_age" integer;
