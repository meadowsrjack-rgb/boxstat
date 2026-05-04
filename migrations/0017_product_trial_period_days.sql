-- Task #363: Add Trial Period (days) field to subscription programs.
-- Reuse existing duration_days column for "Ends After (days)".
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "trial_period_days" integer;
