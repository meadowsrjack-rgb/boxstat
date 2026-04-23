-- Task #253: Admin verification workflow for parent self-claimed enrollments.
-- Adds two timestamp columns to product_enrollments so admins can record when
-- they verified or rejected a parent-driven self-claim.

ALTER TABLE "product_enrollments"
  ADD COLUMN IF NOT EXISTS "self_claim_verified_at" timestamp;

ALTER TABLE "product_enrollments"
  ADD COLUMN IF NOT EXISTS "self_claim_rejected_at" timestamp;
