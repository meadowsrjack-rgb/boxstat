ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "is_pinned" boolean DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "chat_mutes" (
"id" serial PRIMARY KEY NOT NULL,
"user_id" varchar NOT NULL,
"team_id" integer NOT NULL,
"channel" varchar NOT NULL,
"muted_by" varchar NOT NULL,
"created_at" timestamp DEFAULT now(),
CONSTRAINT "chat_mutes_user_team_channel_unique" UNIQUE("user_id","team_id","channel")
);
