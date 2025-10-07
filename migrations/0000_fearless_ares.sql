CREATE TABLE "accounts" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"primary_account_type" varchar NOT NULL,
	"account_completed" boolean DEFAULT false,
	"registration_status" varchar DEFAULT 'pending',
	"payment_status" varchar DEFAULT 'pending',
	"magic_link_token" varchar,
	"magic_link_expires" timestamp,
	"stripe_customer_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "accounts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "announcement_acknowledgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"acknowledged_at" timestamp DEFAULT now(),
	CONSTRAINT "announcement_acknowledgments_announcement_id_user_id_unique" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"content" text NOT NULL,
	"author_id" varchar NOT NULL,
	"team_id" integer,
	"priority" varchar DEFAULT 'medium',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "approvals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"type" varchar DEFAULT 'claim' NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "attendances" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"event_id" integer NOT NULL,
	"checked_in_at" timestamp DEFAULT now(),
	"qr_code_data" varchar,
	"type" varchar DEFAULT 'advance',
	"latitude" real,
	"longitude" real
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar NOT NULL,
	"color" varchar NOT NULL,
	"tier" varchar NOT NULL,
	"type" varchar NOT NULL,
	"criteria" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "claim_codes" (
	"player_id" varchar NOT NULL,
	"contact" varchar NOT NULL,
	"code" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"attempts" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "claim_codes_player_id_contact_unique" UNIQUE("player_id","contact")
);
--> statement-breakpoint
CREATE TABLE "coach_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"coach_id" varchar NOT NULL,
	"team_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	CONSTRAINT "coach_teams_coach_id_team_id_unique" UNIQUE("coach_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "device_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"location_permissions" boolean DEFAULT true,
	"notification_permissions" boolean DEFAULT true,
	"camera_permissions" boolean DEFAULT false,
	"microphone_permissions" boolean DEFAULT false,
	"auto_login" boolean DEFAULT true,
	"biometric_login" boolean DEFAULT false,
	"two_factor_enabled" boolean DEFAULT false,
	"trusted_devices_only" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "device_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "drills" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"difficulty" varchar NOT NULL,
	"category" varchar NOT NULL,
	"video_url" varchar,
	"instructions" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"event_type" varchar NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"location" varchar NOT NULL,
	"latitude" real,
	"longitude" real,
	"team_id" integer,
	"player_id" varchar,
	"opponent_team" varchar,
	"is_recurring" boolean DEFAULT false,
	"recurring_type" varchar,
	"recurring_end_date" timestamp,
	"google_event_id" varchar,
	"last_synced_at" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "events_google_event_id_unique" UNIQUE("google_event_id")
);
--> statement-breakpoint
CREATE TABLE "family_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"parent_id" varchar NOT NULL,
	"player_id" varchar NOT NULL,
	"relationship" varchar DEFAULT 'parent' NOT NULL,
	"can_make_payments" boolean DEFAULT true NOT NULL,
	"can_view_reports" boolean DEFAULT true NOT NULL,
	"emergency_contact" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "family_members_parent_id_player_id_unique" UNIQUE("parent_id","player_id")
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"player_id" varchar NOT NULL,
	"account_id" varchar NOT NULL,
	"relationship" varchar DEFAULT 'parent',
	"is_primary" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "guardians_player_id_account_id_unique" UNIQUE("player_id","account_id")
);
--> statement-breakpoint
CREATE TABLE "message_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"emoji" varchar NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "message_reactions_message_id_user_id_emoji_unique" UNIQUE("message_id","user_id","emoji")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"team_id" integer NOT NULL,
	"message_type" varchar DEFAULT 'text',
	"is_moderated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"event_rsvp" boolean DEFAULT true,
	"event_checkin" boolean DEFAULT true,
	"event_reminders" boolean DEFAULT true,
	"trophy_progress" boolean DEFAULT true,
	"badge_earned" boolean DEFAULT true,
	"training_reminders" boolean DEFAULT true,
	"skills_evaluation" boolean DEFAULT true,
	"improvement_recommendation" boolean DEFAULT true,
	"payment_due" boolean DEFAULT true,
	"team_messages" boolean DEFAULT true,
	"push_notifications" boolean DEFAULT true,
	"email_notifications" boolean DEFAULT true,
	"quiet_hours_start" varchar DEFAULT '22:00',
	"quiet_hours_end" varchar DEFAULT '07:00',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "notification_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"message" text NOT NULL,
	"data" jsonb,
	"is_read" boolean DEFAULT false,
	"is_push_sent" boolean DEFAULT false,
	"push_sent_at" timestamp,
	"priority" varchar DEFAULT 'normal',
	"expires_at" timestamp,
	"action_url" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" real NOT NULL,
	"currency" varchar DEFAULT 'usd',
	"payment_type" varchar NOT NULL,
	"stripe_payment_id" varchar,
	"sports_engine_payment_id" varchar,
	"sports_engine_transaction_id" varchar,
	"status" varchar DEFAULT 'pending',
	"description" text,
	"due_date" date,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_evaluations" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar NOT NULL,
	"coach_id" varchar NOT NULL,
	"quarter" varchar NOT NULL,
	"year" integer NOT NULL,
	"scores" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "player_evaluations_player_id_quarter_year_unique" UNIQUE("player_id","quarter","year")
);
--> statement-breakpoint
CREATE TABLE "player_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar NOT NULL,
	"task_id" integer,
	"points" integer NOT NULL,
	"reason" varchar NOT NULL,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"event_id" integer NOT NULL,
	"points" integer DEFAULT 0,
	"assists" integer DEFAULT 0,
	"rebounds" integer DEFAULT 0,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "player_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar NOT NULL,
	"task_type" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"assigned_by" varchar,
	"event_id" integer,
	"video_id" varchar,
	"homework_content" text,
	"points_value" integer DEFAULT 10,
	"due_date" date,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"completion_method" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"full_name" varchar NOT NULL,
	"dob" date,
	"jersey_number" varchar,
	"photo_url" varchar,
	"team_id" integer,
	"status" varchar DEFAULT 'active' NOT NULL,
	"claim_state" varchar DEFAULT 'unclaimed' NOT NULL,
	"guardian_email" varchar,
	"guardian_phone" varchar,
	"notion_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "players_notion_id_unique" UNIQUE("notion_id")
);
--> statement-breakpoint
CREATE TABLE "profile_relationships" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"parent_profile_id" varchar,
	"player_profile_id" varchar,
	"relationship" varchar DEFAULT 'parent' NOT NULL,
	"can_make_payments" boolean DEFAULT true NOT NULL,
	"can_view_reports" boolean DEFAULT true NOT NULL,
	"emergency_contact" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "profile_relationships_parent_profile_id_player_profile_id_unique" UNIQUE("parent_profile_id","player_profile_id")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar PRIMARY KEY NOT NULL,
	"account_id" varchar NOT NULL,
	"profile_type" varchar NOT NULL,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"date_of_birth" date,
	"phone_number" varchar,
	"emergency_contact" varchar,
	"emergency_phone" varchar,
	"address" text,
	"medical_info" text,
	"allergies" text,
	"team_id" varchar,
	"jersey_number" integer,
	"position" varchar,
	"school_grade" varchar,
	"parental_consent" boolean DEFAULT false,
	"profile_completed" boolean DEFAULT false,
	"verified" boolean DEFAULT false,
	"qr_code_data" varchar,
	"passcode" varchar(4),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"product_id" varchar NOT NULL,
	"product_label" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"lead_connector_order_id" varchar,
	"amount" integer NOT NULL,
	"currency" varchar DEFAULT 'usd' NOT NULL,
	"purchased_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"device_type" varchar,
	"is_active" boolean DEFAULT true,
	"last_used" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "push_subscriptions_user_id_endpoint_unique" UNIQUE("user_id","endpoint")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"announcement_id" integer NOT NULL,
	"user_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now(),
	"notes" text,
	CONSTRAINT "task_completions_announcement_id_user_id_unique" UNIQUE("announcement_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "team_join_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"player_id" varchar NOT NULL,
	"player_profile_id" varchar,
	"team_id" integer NOT NULL,
	"team_name" varchar NOT NULL,
	"coach_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp DEFAULT now(),
	"decided_at" timestamp,
	"decided_by" varchar
);
--> statement-breakpoint
CREATE TABLE "team_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"sender_id" varchar NOT NULL,
	"message" text NOT NULL,
	"message_type" varchar DEFAULT 'text' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"age_group" varchar NOT NULL,
	"color" varchar DEFAULT '#1E40AF' NOT NULL,
	"coach_id" varchar,
	"division" varchar,
	"coach_names" varchar,
	"notion_id" varchar,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "teams_notion_id_unique" UNIQUE("notion_id")
);
--> statement-breakpoint
CREATE TABLE "training_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"subscription_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"module_title" varchar NOT NULL,
	"completed_at" timestamp,
	"progress" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "training_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"program_id" integer NOT NULL,
	"program_title" varchar NOT NULL,
	"subscription_type" varchar NOT NULL,
	"status" varchar DEFAULT 'active',
	"sports_engine_subscription_id" varchar,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trophies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"icon" varchar NOT NULL,
	"type" varchar NOT NULL,
	"criteria" jsonb NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "trusted_devices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"device_fingerprint" varchar NOT NULL,
	"device_name" varchar NOT NULL,
	"device_type" varchar NOT NULL,
	"user_agent" text,
	"last_location" varchar,
	"last_ip_address" varchar,
	"is_current" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"last_used" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "trusted_devices_user_id_device_fingerprint_unique" UNIQUE("user_id","device_fingerprint")
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"badge_id" integer NOT NULL,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_trophies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"trophy_name" varchar NOT NULL,
	"trophy_description" text,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"user_type" varchar NOT NULL,
	"linked_account_id" varchar,
	"date_of_birth" date,
	"phone_number" varchar,
	"emergency_contact" varchar,
	"emergency_phone" varchar,
	"address" text,
	"medical_info" text,
	"allergies" text,
	"team_id" integer,
	"team_name" varchar,
	"age" varchar,
	"height" varchar,
	"jersey_number" integer,
	"position" varchar,
	"city" varchar,
	"school_grade" varchar,
	"parental_consent" boolean DEFAULT false,
	"profile_completed" boolean DEFAULT false,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"qr_code_data" varchar,
	"passcode" varchar(4),
	"youth_club_team" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_linked_account_id_unique" UNIQUE("linked_account_id")
);
--> statement-breakpoint
ALTER TABLE "announcement_acknowledgments" ADD CONSTRAINT "announcement_acknowledgments_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcement_acknowledgments" ADD CONSTRAINT "announcement_acknowledgments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_codes" ADD CONSTRAINT "claim_codes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_teams" ADD CONSTRAINT "coach_teams_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_teams" ADD CONSTRAINT "coach_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_settings" ADD CONSTRAINT "device_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_message_id_announcements_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_reactions" ADD CONSTRAINT "message_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_evaluations" ADD CONSTRAINT "player_evaluations_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_evaluations" ADD CONSTRAINT "player_evaluations_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_points" ADD CONSTRAINT "player_points_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_points" ADD CONSTRAINT "player_points_task_id_player_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."player_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_stats" ADD CONSTRAINT "player_stats_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tasks" ADD CONSTRAINT "player_tasks_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tasks" ADD CONSTRAINT "player_tasks_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_tasks" ADD CONSTRAINT "player_tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_relationships" ADD CONSTRAINT "profile_relationships_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_relationships" ADD CONSTRAINT "profile_relationships_parent_profile_id_profiles_id_fk" FOREIGN KEY ("parent_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_relationships" ADD CONSTRAINT "profile_relationships_player_profile_id_profiles_id_fk" FOREIGN KEY ("player_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchases" ADD CONSTRAINT "purchases_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_announcement_id_announcements_id_fk" FOREIGN KEY ("announcement_id") REFERENCES "public"."announcements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_player_id_users_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_player_profile_id_profiles_id_fk" FOREIGN KEY ("player_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_join_requests" ADD CONSTRAINT "team_join_requests_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_messages" ADD CONSTRAINT "team_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_coach_id_users_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_progress" ADD CONSTRAINT "training_progress_subscription_id_training_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."training_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_subscriptions" ADD CONSTRAINT "training_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trusted_devices" ADD CONSTRAINT "trusted_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_trophies" ADD CONSTRAINT "user_trophies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_linked_account_id_accounts_id_fk" FOREIGN KEY ("linked_account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_team_join_requests_coach" ON "team_join_requests" USING btree ("coach_id");--> statement-breakpoint
CREATE INDEX "idx_team_join_requests_status" ON "team_join_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_team_join_requests_player" ON "team_join_requests" USING btree ("player_id");