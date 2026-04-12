-- Add skill_level to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "skill_level" varchar;

-- Add tryout columns to products (programs) table
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tryout_enabled" boolean DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tryout_price" integer;

-- Add tryout columns to product_enrollments table
ALTER TABLE "product_enrollments" ADD COLUMN IF NOT EXISTS "is_tryout" boolean DEFAULT false;
ALTER TABLE "product_enrollments" ADD COLUMN IF NOT EXISTS "recommended_team_id" integer;
