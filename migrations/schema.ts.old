import { pgTable, foreignKey, serial, varchar, integer, timestamp, numeric, text, boolean, real, date, index, jsonb, unique, check, doublePrecision, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const purchasesStatusEnum = pgEnum("purchases_status_enum", ['active', 'pending', 'expired', 'cancelled'])


export const attendances = pgTable("attendances", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        eventId: integer("event_id").notNull(),
        checkedInAt: timestamp("checked_in_at", { mode: 'string' }).defaultNow(),
        qrCodeData: varchar("qr_code_data").notNull(),
        type: varchar().default('advance'),
        latitude: numeric(),
        longitude: numeric(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "attendances_user_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "attendances_event_id_events_id_fk"
                }),
]);

export const announcements = pgTable("announcements", {
        id: serial().primaryKey().notNull(),
        title: varchar().notNull(),
        content: text().notNull(),
        authorId: varchar("author_id").notNull(),
        teamId: integer("team_id"),
        priority: varchar().default('medium'),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.authorId],
                        foreignColumns: [users.id],
                        name: "announcements_author_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.teamId],
                        foreignColumns: [teams.id],
                        name: "announcements_team_id_teams_id_fk"
                }),
]);

export const messages = pgTable("messages", {
        id: serial().primaryKey().notNull(),
        senderId: varchar("sender_id").notNull(),
        content: text().notNull(),
        teamId: integer("team_id").notNull(),
        messageType: varchar("message_type").default('text'),
        isModerated: boolean("is_moderated").default(false),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.senderId],
                        foreignColumns: [users.id],
                        name: "messages_sender_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.teamId],
                        foreignColumns: [teams.id],
                        name: "messages_team_id_teams_id_fk"
                }),
]);

export const payments = pgTable("payments", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        amount: real().notNull(),
        currency: varchar().default('usd'),
        paymentType: varchar("payment_type").notNull(),
        stripePaymentId: varchar("stripe_payment_id"),
        status: varchar().default('pending'),
        description: text(),
        dueDate: date("due_date"),
        paidAt: timestamp("paid_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        sportsEnginePaymentId: varchar("sports_engine_payment_id"),
        sportsEngineTransactionId: varchar("sports_engine_transaction_id"),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "payments_user_id_users_id_fk"
                }),
]);

export const playerStats = pgTable("player_stats", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        eventId: integer("event_id").notNull(),
        points: integer().default(0),
        assists: integer().default(0),
        rebounds: integer().default(0),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "player_stats_user_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "player_stats_event_id_events_id_fk"
                }),
]);

export const userBadges = pgTable("user_badges", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        badgeId: integer("badge_id"),
        earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow(),
        profileId: varchar("profile_id"),
        badgeType: varchar("badge_type", { length: 50 }),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "user_badges_user_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.badgeId],
                        foreignColumns: [badges.id],
                        name: "user_badges_badge_id_badges_id_fk"
                }),
        foreignKey({
                        columns: [table.profileId],
                        foreignColumns: [profiles.id],
                        name: "user_badges_profile_id_fkey"
                }),
]);

export const sessions = pgTable("sessions", {
        sid: varchar().primaryKey().notNull(),
        sess: jsonb().notNull(),
        expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
        index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const teams = pgTable("teams", {
        id: serial().primaryKey().notNull(),
        name: varchar().notNull(),
        ageGroup: varchar("age_group").notNull(),
        color: varchar().default('#1E40AF').notNull(),
        coachId: varchar("coach_id"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        division: varchar({ length: 100 }),
        coachNames: varchar("coach_names", { length: 255 }),
        notionId: varchar("notion_id", { length: 255 }),
        program: varchar(),
}, (table) => [
        foreignKey({
                        columns: [table.coachId],
                        foreignColumns: [users.id],
                        name: "teams_coach_id_users_id_fk"
                }),
        unique("teams_notion_id_key").on(table.notionId),
]);

export const deviceModeConfig = pgTable("device_mode_config", {
        id: serial().primaryKey().notNull(),
        deviceId: varchar("device_id").notNull(),
        parentId: varchar("parent_id").notNull(),
        childProfileId: integer("child_profile_id"),
        mode: varchar().default('parent').notNull(),
        pinHash: varchar("pin_hash"),
        isLocked: boolean("is_locked").default(false).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.parentId],
                        foreignColumns: [users.id],
                        name: "device_mode_config_parent_id_users_id_fk"
                }),
        unique("device_mode_config_device_id_parent_id_unique").on(table.deviceId, table.parentId),
]);

export const trainingProgress = pgTable("training_progress", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        subscriptionId: integer("subscription_id").notNull(),
        moduleId: integer("module_id").notNull(),
        moduleTitle: varchar("module_title").notNull(),
        completedAt: timestamp("completed_at", { mode: 'string' }),
        progress: integer().default(0),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "training_progress_user_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.subscriptionId],
                        foreignColumns: [trainingSubscriptions.id],
                        name: "training_progress_subscription_id_training_subscriptions_id_fk"
                }),
]);

export const trainingSubscriptions = pgTable("training_subscriptions", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        programId: integer("program_id").notNull(),
        programTitle: varchar("program_title").notNull(),
        subscriptionType: varchar("subscription_type").notNull(),
        status: varchar().default('active'),
        sportsEngineSubscriptionId: varchar("sports_engine_subscription_id"),
        startDate: timestamp("start_date", { mode: 'string' }).defaultNow(),
        endDate: timestamp("end_date", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "training_subscriptions_user_id_users_id_fk"
                }),
]);

export const teamMessages = pgTable("team_messages", {
        id: serial().primaryKey().notNull(),
        teamId: integer("team_id").notNull(),
        senderId: varchar("sender_id").notNull(),
        message: text().notNull(),
        messageType: varchar("message_type").default('text'),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.senderId],
                        foreignColumns: [users.id],
                        name: "team_messages_sender_id_fkey"
                }),
        check("team_messages_message_type_check", sql`(message_type)::text = ANY ((ARRAY['text'::character varying, 'announcement'::character varying, 'system'::character varying])::text[])`),
]);

export const familyMembers = pgTable("family_members", {
        id: serial().primaryKey().notNull(),
        parentId: varchar("parent_id").notNull(),
        playerId: varchar("player_id").notNull(),
        relationship: varchar().default('parent').notNull(),
        canMakePayments: boolean("can_make_payments").default(true).notNull(),
        canViewReports: boolean("can_view_reports").default(true).notNull(),
        emergencyContact: boolean("emergency_contact").default(false).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.parentId],
                        foreignColumns: [users.id],
                        name: "family_members_parent_id_fkey"
                }),
        foreignKey({
                        columns: [table.playerId],
                        foreignColumns: [users.id],
                        name: "family_members_player_id_fkey"
                }),
        unique("family_members_parent_id_player_id_key").on(table.parentId, table.playerId),
]);

export const users = pgTable("users", {
        id: varchar().primaryKey().notNull(),
        email: varchar(),
        firstName: varchar("first_name"),
        lastName: varchar("last_name"),
        profileImageUrl: varchar("profile_image_url"),
        role: varchar().default('parent').notNull(),
        parentId: varchar("parent_id"),
        teamId: integer("team_id"),
        stripeCustomerId: varchar("stripe_customer_id"),
        stripeSubscriptionId: varchar("stripe_subscription_id"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        sportsEngineCustomerId: varchar("sports_engine_customer_id"),
        sportsEngineSubscriptionId: varchar("sports_engine_subscription_id"),
        userType: varchar("user_type").default('parent').notNull(),
        dateOfBirth: date("date_of_birth"),
        phoneNumber: varchar("phone_number"),
        emergencyContact: varchar("emergency_contact"),
        emergencyPhone: varchar("emergency_phone"),
        address: text(),
        medicalInfo: text("medical_info"),
        allergies: text(),
        jerseyNumber: integer("jersey_number"),
        position: varchar(),
        schoolGrade: varchar("school_grade"),
        parentalConsent: boolean("parental_consent").default(false),
        profileCompleted: boolean("profile_completed").default(false),
        qrCodeData: varchar("qr_code_data"),
        teamName: varchar("team_name"),
        age: varchar(),
        height: varchar(),
        passcode: varchar({ length: 4 }),
        password: varchar(),
        city: varchar(),
        youthClubTeam: varchar("youth_club_team"),
        linkedAccountId: varchar("linked_account_id"),
        activeProfileId: varchar("active_profile_id"),
        verified: boolean().default(false),
        verificationToken: varchar("verification_token"),
        verificationExpiry: timestamp("verification_expiry", { mode: 'string' }),
        magicLinkToken: varchar("magic_link_token"),
        magicLinkExpiry: timestamp("magic_link_expiry", { mode: 'string' }),
        googleId: varchar("google_id"),
        appleId: varchar("apple_id"),
}, (table) => [
        foreignKey({
                        columns: [table.linkedAccountId],
                        foreignColumns: [accounts.id],
                        name: "users_linked_account_id_fkey"
                }),
        unique("users_email_unique").on(table.email),
        unique("users_linked_account_id_key").on(table.linkedAccountId),
]);

export const playerTasks = pgTable("player_tasks", {
        id: serial().primaryKey().notNull(),
        playerId: varchar("player_id").notNull(),
        taskType: varchar("task_type").notNull(),
        title: varchar().notNull(),
        description: text(),
        assignedBy: varchar("assigned_by"),
        eventId: integer("event_id"),
        videoId: varchar("video_id"),
        homeworkContent: text("homework_content"),
        pointsValue: integer("points_value").default(10),
        dueDate: date("due_date"),
        isCompleted: boolean("is_completed").default(false),
        completedAt: timestamp("completed_at", { mode: 'string' }),
        completionMethod: varchar("completion_method"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.playerId],
                        foreignColumns: [users.id],
                        name: "player_tasks_player_id_fkey"
                }),
        foreignKey({
                        columns: [table.assignedBy],
                        foreignColumns: [users.id],
                        name: "player_tasks_assigned_by_fkey"
                }),
        foreignKey({
                        columns: [table.eventId],
                        foreignColumns: [events.id],
                        name: "player_tasks_event_id_fkey"
                }),
        check("player_tasks_task_type_check", sql`(task_type)::text = ANY ((ARRAY['practice'::character varying, 'game'::character varying, 'skills'::character varying, 'video'::character varying, 'homework'::character varying, 'bio_complete'::character varying])::text[])`),
        check("player_tasks_completion_method_check", sql`(completion_method)::text = ANY ((ARRAY['qr_scan'::character varying, 'manual'::character varying, 'video_watch'::character varying, 'auto'::character varying])::text[])`),
]);

export const playerPoints = pgTable("player_points", {
        id: serial().primaryKey().notNull(),
        playerId: varchar("player_id").notNull(),
        taskId: integer("task_id"),
        points: integer().notNull(),
        reason: varchar().notNull(),
        earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.playerId],
                        foreignColumns: [users.id],
                        name: "player_points_player_id_fkey"
                }),
        foreignKey({
                        columns: [table.taskId],
                        foreignColumns: [playerTasks.id],
                        name: "player_points_task_id_fkey"
                }),
]);

export const events = pgTable("events", {
        id: serial().primaryKey().notNull(),
        title: varchar().notNull(),
        description: text(),
        eventType: varchar("event_type").notNull(),
        startTime: timestamp("start_time", { mode: 'string' }).notNull(),
        endTime: timestamp("end_time", { mode: 'string' }).notNull(),
        location: varchar().notNull(),
        teamId: integer("team_id"),
        opponentTeam: varchar("opponent_team"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        childProfileId: integer("child_profile_id"),
        isRecurring: boolean("is_recurring").default(false),
        recurringType: varchar("recurring_type"),
        recurringEndDate: timestamp("recurring_end_date", { mode: 'string' }),
        playerId: varchar("player_id"),
        googleEventId: text("google_event_id"),
        lastSyncedAt: timestamp("last_synced_at", { mode: 'string' }),
        isActive: boolean("is_active").default(true),
        latitude: doublePrecision(),
        longitude: doublePrecision(),
        tags: text().array(),
}, (table) => [
        foreignKey({
                        columns: [table.teamId],
                        foreignColumns: [teams.id],
                        name: "events_team_id_teams_id_fk"
                }),
        foreignKey({
                        columns: [table.playerId],
                        foreignColumns: [users.id],
                        name: "events_player_id_fkey"
                }),
]);

export const userTrophies = pgTable("user_trophies", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        trophyName: varchar("trophy_name").notNull(),
        trophyDescription: text("trophy_description"),
        earnedAt: timestamp("earned_at", { mode: 'string' }).defaultNow(),
        profileId: varchar("profile_id"),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "user_trophies_user_id_fkey"
                }),
        foreignKey({
                        columns: [table.profileId],
                        foreignColumns: [profiles.id],
                        name: "user_trophies_profile_id_fkey"
                }),
]);

export const accounts = pgTable("accounts", {
        id: varchar().primaryKey().notNull(),
        email: varchar(),
        primaryAccountType: varchar("primary_account_type").notNull(),
        accountCompleted: boolean("account_completed").default(false),
        stripeCustomerId: varchar("stripe_customer_id"),
        sportsEngineCustomerId: varchar("sports_engine_customer_id"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        registrationStatus: varchar("registration_status").default('pending'),
        paymentStatus: varchar("payment_status").default('pending'),
        magicLinkToken: varchar("magic_link_token"),
        magicLinkExpires: timestamp("magic_link_expires", { mode: 'string' }),
        firstName: varchar("first_name"),
        lastName: varchar("last_name"),
}, (table) => [
        unique("accounts_email_key").on(table.email),
        check("accounts_primary_account_type_check", sql`(primary_account_type)::text = ANY ((ARRAY['parent'::character varying, 'player'::character varying, 'coach'::character varying])::text[])`),
]);

export const profilePrivacy = pgTable("profile_privacy", {
        profileId: varchar("profile_id").primaryKey().notNull(),
        settings: jsonb().default({}).notNull(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.profileId],
                        foreignColumns: [profiles.id],
                        name: "profile_privacy_profile_id_fkey"
                }).onDelete("cascade"),
]);

export const profileClaims = pgTable("profile_claims", {
        profileId: varchar("profile_id").primaryKey().notNull(),
        claimCode: varchar("claim_code").notNull(),
        dob: date(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.profileId],
                        foreignColumns: [profiles.id],
                        name: "profile_claims_profile_id_fkey"
                }).onDelete("cascade"),
        unique("profile_claims_claim_code_key").on(table.claimCode),
]);

export const players = pgTable("players", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        fullName: varchar("full_name", { length: 255 }).notNull(),
        photoUrl: varchar("photo_url", { length: 500 }),
        jerseyNumber: varchar("jersey_number", { length: 10 }),
        dob: date(),
        teamId: integer("team_id"),
        status: varchar({ length: 50 }).default('active'),
        claimState: varchar("claim_state", { length: 50 }).default('unclaimed'),
        guardianEmail: varchar("guardian_email", { length: 255 }),
        guardianPhone: varchar("guardian_phone", { length: 20 }),
        notionId: varchar("notion_id", { length: 255 }).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        email: varchar(),
        age: varchar(),
        height: varchar(),
        city: varchar(),
        position: varchar(),
        program: varchar(),
        registrationStatus: varchar("registration_status").default('active'),
        appProfileStatus: varchar("app_profile_status").default('no'),
        skillRating: integer("skill_rating"),
        ratingYear: integer("rating_year"),
        ratingQuarter: varchar("rating_quarter"),
}, (table) => [
        unique("players_notion_id_key").on(table.notionId),
]);

export const approvals = pgTable("approvals", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        playerId: varchar("player_id").notNull(),
        accountId: varchar("account_id").notNull(),
        coachId: varchar("coach_id"),
        status: varchar({ length: 50 }).default('pending'),
        notes: text(),
        expiresAt: timestamp("expires_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        endpoint: text().notNull(),
        p256DhKey: text("p256dh_key").notNull(),
        authKey: text("auth_key").notNull(),
        userAgent: text("user_agent"),
        deviceType: varchar("device_type", { length: 20 }),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        lastUsed: timestamp("last_used", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
        index("idx_push_subscriptions_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
        index("idx_push_subscriptions_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        unique("push_subscriptions_user_id_endpoint_key").on(table.userId, table.endpoint),
        check("push_subscriptions_device_type_check", sql`(device_type)::text = ANY ((ARRAY['desktop'::character varying, 'mobile'::character varying, 'tablet'::character varying])::text[])`),
]);

export const purchases = pgTable("purchases", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        productId: varchar("product_id"),
        productName: varchar("product_name"),
        productLabel: varchar("product_label").notNull(),
        amount: numeric().notNull(),
        currency: varchar().notNull(),
        status: purchasesStatusEnum().notNull(),
        purchasedAt: timestamp("purchased_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
        expiresAt: timestamp("expires_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        leadConnectorOrderId: varchar("lead_connector_order_id"),
});

export const profileRelationships = pgTable("profile_relationships", {
        id: serial().primaryKey().notNull(),
        accountId: varchar("account_id").notNull(),
        parentProfileId: varchar("parent_profile_id").notNull(),
        playerProfileId: varchar("player_profile_id").notNull(),
        relationship: varchar().notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        canMakePayments: boolean("can_make_payments").default(true).notNull(),
        canViewReports: boolean("can_view_reports").default(true).notNull(),
        emergencyContact: boolean("emergency_contact").default(false).notNull(),
}, (table) => [
        foreignKey({
                        columns: [table.accountId],
                        foreignColumns: [accounts.id],
                        name: "profile_relationships_account_id_fkey"
                }),
        foreignKey({
                        columns: [table.parentProfileId],
                        foreignColumns: [profiles.id],
                        name: "profile_relationships_parent_profile_id_fkey"
                }),
        foreignKey({
                        columns: [table.playerProfileId],
                        foreignColumns: [profiles.id],
                        name: "profile_relationships_child_profile_id_fkey"
                }),
        check("profile_relationships_relationship_type_check", sql`(relationship)::text = ANY ((ARRAY['parent'::character varying, 'guardian'::character varying, 'coach'::character varying])::text[])`),
]);

export const notifications = pgTable("notifications", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        type: varchar({ length: 50 }).notNull(),
        title: varchar({ length: 255 }).notNull(),
        message: text().notNull(),
        priority: varchar({ length: 10 }).default('normal'),
        isRead: boolean("is_read").default(false),
        isPushSent: boolean("is_push_sent").default(false),
        pushSentAt: timestamp("push_sent_at", { mode: 'string' }),
        actionUrl: varchar("action_url", { length: 500 }),
        data: jsonb(),
        expiresAt: timestamp("expires_at", { mode: 'string' }),
        createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        profileId: varchar("profile_id"),
}, (table) => [
        index("idx_notifications_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
        index("idx_notifications_is_read").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
        index("idx_notifications_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
        index("idx_notifications_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.profileId],
                        foreignColumns: [profiles.id],
                        name: "notifications_profile_id_fkey"
                }),
        check("notifications_priority_check", sql`(priority)::text = ANY ((ARRAY['low'::character varying, 'normal'::character varying, 'high'::character varying])::text[])`),
]);

export const notificationPreferences = pgTable("notification_preferences", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        eventRsvp: boolean("event_rsvp").default(true),
        eventCheckin: boolean("event_checkin").default(true),
        eventReminders: boolean("event_reminders").default(true),
        trophyProgress: boolean("trophy_progress").default(true),
        badgeEarned: boolean("badge_earned").default(true),
        trainingReminders: boolean("training_reminders").default(true),
        skillsEvaluation: boolean("skills_evaluation").default(true),
        improvementRecommendation: boolean("improvement_recommendation").default(true),
        paymentDue: boolean("payment_due").default(true),
        teamMessages: boolean("team_messages").default(true),
        pushNotifications: boolean("push_notifications").default(true),
        emailNotifications: boolean("email_notifications").default(true),
        quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default('22:00'),
        quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default('07:00'),
        createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        teamUpdates: boolean("team_updates").default(true),
        eventChanges: boolean("event_changes").default(true),
        playerCheckIn: boolean("player_check_in").default(true),
        playerRsvp: boolean("player_rsvp").default(true),
        playerAwards: boolean("player_awards").default(true),
        playerProgress: boolean("player_progress").default(true),
        smsNotifications: boolean("sms_notifications").default(false),
}, (table) => [
        unique("notification_preferences_user_id_key").on(table.userId),
]);

export const trustedDevices = pgTable("trusted_devices", {
        id: varchar().default(sql`gen_random_uuid()`).primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        deviceFingerprint: varchar("device_fingerprint").notNull(),
        deviceName: varchar("device_name").notNull(),
        deviceType: varchar("device_type").notNull(),
        userAgent: text("user_agent"),
        lastLocation: varchar("last_location"),
        lastIpAddress: varchar("last_ip_address"),
        isCurrent: boolean("is_current").default(false),
        isActive: boolean("is_active").default(true),
        lastUsed: timestamp("last_used", { mode: 'string' }).defaultNow(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [accounts.id],
                        name: "trusted_devices_user_id_fkey"
                }),
        unique("trusted_devices_user_id_device_fingerprint_key").on(table.userId, table.deviceFingerprint),
        check("trusted_devices_device_type_check", sql`(device_type)::text = ANY ((ARRAY['desktop'::character varying, 'mobile'::character varying, 'tablet'::character varying])::text[])`),
]);

export const deviceSettings = pgTable("device_settings", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        locationPermissions: boolean("location_permissions").default(true),
        notificationPermissions: boolean("notification_permissions").default(true),
        cameraPermissions: boolean("camera_permissions").default(false),
        microphonePermissions: boolean("microphone_permissions").default(false),
        autoLogin: boolean("auto_login").default(true),
        biometricLogin: boolean("biometric_login").default(false),
        twoFactorEnabled: boolean("two_factor_enabled").default(false),
        trustedDevicesOnly: boolean("trusted_devices_only").default(false),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [accounts.id],
                        name: "device_settings_user_id_fkey"
                }),
        unique("device_settings_user_id_key").on(table.userId),
]);

export const coachTeams = pgTable("coach_teams", {
        id: serial().primaryKey().notNull(),
        coachId: varchar("coach_id").notNull(),
        teamId: integer("team_id").notNull(),
        assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.coachId],
                        foreignColumns: [users.id],
                        name: "coach_teams_coach_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.teamId],
                        foreignColumns: [teams.id],
                        name: "coach_teams_team_id_fkey"
                }).onDelete("cascade"),
        unique("coach_teams_coach_id_team_id_key").on(table.coachId, table.teamId),
]);

export const teamJoinRequests = pgTable("team_join_requests", {
        id: serial().primaryKey().notNull(),
        playerId: varchar("player_id").notNull(),
        playerProfileId: varchar("player_profile_id"),
        teamId: integer("team_id").notNull(),
        teamName: varchar("team_name").notNull(),
        coachId: varchar("coach_id").notNull(),
        status: varchar().default('pending').notNull(),
        requestedAt: timestamp("requested_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        decidedAt: timestamp("decided_at", { mode: 'string' }),
        decidedBy: varchar("decided_by"),
}, (table) => [
        index("idx_team_join_requests_coach").using("btree", table.coachId.asc().nullsLast().op("text_ops")),
        index("idx_team_join_requests_player").using("btree", table.playerId.asc().nullsLast().op("text_ops")),
        index("idx_team_join_requests_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.playerId],
                        foreignColumns: [users.id],
                        name: "team_join_requests_player_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.playerProfileId],
                        foreignColumns: [profiles.id],
                        name: "team_join_requests_player_profile_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.teamId],
                        foreignColumns: [teams.id],
                        name: "team_join_requests_team_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.coachId],
                        foreignColumns: [users.id],
                        name: "team_join_requests_coach_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.decidedBy],
                        foreignColumns: [users.id],
                        name: "team_join_requests_decided_by_fkey"
                }),
        check("team_join_requests_status_check", sql`(status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])`),
]);

export const playerEvaluations = pgTable("player_evaluations", {
        id: serial().primaryKey().notNull(),
        playerId: varchar("player_id").notNull(),
        coachId: varchar("coach_id").notNull(),
        scores: jsonb().notNull(),
        quarter: varchar({ length: 2 }).notNull(),
        year: integer().notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        notes: text(),
        profileId: varchar("profile_id"),
}, (table) => [
        foreignKey({
                        columns: [table.playerId],
                        foreignColumns: [users.id],
                        name: "player_evaluations_player_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.coachId],
                        foreignColumns: [users.id],
                        name: "player_evaluations_coach_id_fkey"
                }).onDelete("cascade"),
        foreignKey({
                        columns: [table.profileId],
                        foreignColumns: [profiles.id],
                        name: "player_evaluations_profile_id_fkey"
                }),
        unique("player_evaluations_player_id_quarter_year_key").on(table.playerId, table.quarter, table.year),
        check("player_evaluations_quarter_check", sql`(quarter)::text = ANY ((ARRAY['Q1'::character varying, 'Q2'::character varying, 'Q3'::character varying, 'Q4'::character varying])::text[])`),
]);

export const followedNotionPlayers = pgTable("followed_notion_players", {
        id: serial().primaryKey().notNull(),
        accountId: varchar("account_id").notNull(),
        notionPlayerId: varchar("notion_player_id").notNull(),
        playerName: varchar("player_name").notNull(),
        teamName: varchar("team_name"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.accountId],
                        foreignColumns: [accounts.id],
                        name: "followed_notion_players_account_id_fkey"
                }),
        unique("followed_notion_players_account_id_notion_player_id_key").on(table.accountId, table.notionPlayerId),
]);

export const profiles = pgTable("profiles", {
        id: varchar().primaryKey().notNull(),
        accountId: varchar("account_id").notNull(),
        profileType: varchar("profile_type").notNull(),
        firstName: varchar("first_name"),
        lastName: varchar("last_name"),
        profileImageUrl: varchar("profile_image_url"),
        dateOfBirth: date("date_of_birth"),
        phoneNumber: varchar("phone_number"),
        emergencyContact: varchar("emergency_contact"),
        emergencyPhone: varchar("emergency_phone"),
        address: text(),
        medicalInfo: text("medical_info"),
        allergies: text(),
        teamId: varchar("team_id"),
        jerseyNumber: integer("jersey_number"),
        position: varchar(),
        schoolGrade: varchar("school_grade"),
        parentalConsent: boolean("parental_consent").default(false),
        profileCompleted: boolean("profile_completed").default(false),
        qrCodeData: varchar("qr_code_data"),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        passcode: varchar({ length: 4 }),
        verified: boolean().default(false),
        age: varchar(),
        height: varchar(),
        city: varchar(),
        coachingExperience: text("coaching_experience"),
        yearsExperience: varchar("years_experience"),
        bio: text(),
        previousTeams: text("previous_teams"),
        playingExperience: text("playing_experience"),
        philosophy: text(),
        occupation: varchar(),
        workPhone: varchar("work_phone"),
        relationship: varchar(),
        program: varchar(),
        registrationStatus: varchar("registration_status").default('active'),
        skillRating: integer("skill_rating"),
        ratingYear: integer("rating_year"),
        ratingQuarter: varchar("rating_quarter"),
}, (table) => [
        foreignKey({
                        columns: [table.accountId],
                        foreignColumns: [accounts.id],
                        name: "profiles_account_id_fkey"
                }),
        check("profiles_profile_type_check", sql`(profile_type)::text = ANY ((ARRAY['parent'::character varying, 'player'::character varying, 'coach'::character varying])::text[])`),
        check("profiles_relationship_check", sql`(relationship)::text = ANY ((ARRAY['parent'::character varying, 'guardian'::character varying, 'sibling'::character varying, 'grandparent'::character varying])::text[])`),
]);

export const badges = pgTable("badges", {
        id: serial().primaryKey().notNull(),
        name: varchar().notNull(),
        description: text(),
        icon: varchar().notNull(),
        color: varchar().notNull(),
        criteria: jsonb().notNull(),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        slug: varchar(),
        tier: varchar(),
        category: varchar(),
        type: varchar(),
}, (table) => [
        unique("badges_slug_key").on(table.slug),
]);

export const trophies = pgTable("trophies", {
        id: serial().primaryKey().notNull(),
        name: varchar().notNull(),
        slug: varchar().notNull(),
        description: text(),
        icon: varchar().notNull(),
        type: varchar().notNull(),
        criteria: jsonb().notNull(),
        isActive: boolean("is_active").default(true),
        createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
        unique("trophies_slug_key").on(table.slug),
]);
