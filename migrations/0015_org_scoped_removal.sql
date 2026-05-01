-- Task #353: Org-scoped parent removal audit + orphan parent reminder pipeline.

CREATE TABLE IF NOT EXISTS "admin_removal_audits" (
  "id" serial PRIMARY KEY NOT NULL,
  "organization_id" varchar NOT NULL,
  "action" varchar NOT NULL,
  "actor_id" varchar,
  "target_user_id" varchar NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "admin_removal_audits_org_id_idx"
  ON "admin_removal_audits" ("organization_id");

CREATE INDEX IF NOT EXISTS "admin_removal_audits_target_idx"
  ON "admin_removal_audits" ("target_user_id");

CREATE TABLE IF NOT EXISTS "orphan_parent_reminders" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" varchar NOT NULL UNIQUE,
  "baseline_at" timestamp NOT NULL,
  "reminders_sent" integer DEFAULT 0 NOT NULL,
  "last_reminder_at" timestamp,
  "soft_deleted_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "orphan_parent_reminders_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "orphan_parent_reminders_pipeline_idx"
  ON "orphan_parent_reminders" ("soft_deleted_at", "reminders_sent");
