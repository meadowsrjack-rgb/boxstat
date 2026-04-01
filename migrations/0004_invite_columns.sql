ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_token" varchar(64);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "invite_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" varchar(20) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "activated_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "subscription_end_date" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "parent_email" varchar(255);
