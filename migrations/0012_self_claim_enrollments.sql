-- Task #248: Parent self-claim "join existing club team" during signup.
-- Adds two columns to product_enrollments so we can distinguish parent-driven
-- claims from admin-assigned grants and remember the raw club subscription
-- end date the parent reported (separate from the computed pay-by `end_date`).

ALTER TABLE "product_enrollments"
  ADD COLUMN IF NOT EXISTS "is_self_claimed" boolean DEFAULT false;

ALTER TABLE "product_enrollments"
  ADD COLUMN IF NOT EXISTS "self_claimed_end_date" date;
