import { relations } from "drizzle-orm/relations";
import { users, attendances, events, announcements, teams, messages, payments, playerStats, userBadges, badges, profiles, deviceModeConfig, trainingProgress, trainingSubscriptions, teamMessages, familyMembers, accounts, playerTasks, playerPoints, userTrophies, profilePrivacy, profileClaims, profileRelationships, notifications, trustedDevices, deviceSettings, coachTeams, teamJoinRequests, playerEvaluations, followedNotionPlayers } from "./schema";

export const attendancesRelations = relations(attendances, ({one}) => ({
	user: one(users, {
		fields: [attendances.userId],
		references: [users.id]
	}),
	event: one(events, {
		fields: [attendances.eventId],
		references: [events.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	attendances: many(attendances),
	announcements: many(announcements),
	messages: many(messages),
	payments: many(payments),
	playerStats: many(playerStats),
	userBadges: many(userBadges),
	teams: many(teams),
	deviceModeConfigs: many(deviceModeConfig),
	trainingProgresses: many(trainingProgress),
	trainingSubscriptions: many(trainingSubscriptions),
	teamMessages: many(teamMessages),
	familyMembers_parentId: many(familyMembers, {
		relationName: "familyMembers_parentId_users_id"
	}),
	familyMembers_playerId: many(familyMembers, {
		relationName: "familyMembers_playerId_users_id"
	}),
	account: one(accounts, {
		fields: [users.linkedAccountId],
		references: [accounts.id]
	}),
	playerTasks_playerId: many(playerTasks, {
		relationName: "playerTasks_playerId_users_id"
	}),
	playerTasks_assignedBy: many(playerTasks, {
		relationName: "playerTasks_assignedBy_users_id"
	}),
	playerPoints: many(playerPoints),
	events: many(events),
	userTrophies: many(userTrophies),
	coachTeams: many(coachTeams),
	teamJoinRequests_playerId: many(teamJoinRequests, {
		relationName: "teamJoinRequests_playerId_users_id"
	}),
	teamJoinRequests_coachId: many(teamJoinRequests, {
		relationName: "teamJoinRequests_coachId_users_id"
	}),
	teamJoinRequests_decidedBy: many(teamJoinRequests, {
		relationName: "teamJoinRequests_decidedBy_users_id"
	}),
	playerEvaluations_playerId: many(playerEvaluations, {
		relationName: "playerEvaluations_playerId_users_id"
	}),
	playerEvaluations_coachId: many(playerEvaluations, {
		relationName: "playerEvaluations_coachId_users_id"
	}),
}));

export const eventsRelations = relations(events, ({one, many}) => ({
	attendances: many(attendances),
	playerStats: many(playerStats),
	playerTasks: many(playerTasks),
	team: one(teams, {
		fields: [events.teamId],
		references: [teams.id]
	}),
	user: one(users, {
		fields: [events.playerId],
		references: [users.id]
	}),
}));

export const announcementsRelations = relations(announcements, ({one}) => ({
	user: one(users, {
		fields: [announcements.authorId],
		references: [users.id]
	}),
	team: one(teams, {
		fields: [announcements.teamId],
		references: [teams.id]
	}),
}));

export const teamsRelations = relations(teams, ({one, many}) => ({
	announcements: many(announcements),
	messages: many(messages),
	user: one(users, {
		fields: [teams.coachId],
		references: [users.id]
	}),
	events: many(events),
	coachTeams: many(coachTeams),
	teamJoinRequests: many(teamJoinRequests),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	user: one(users, {
		fields: [messages.senderId],
		references: [users.id]
	}),
	team: one(teams, {
		fields: [messages.teamId],
		references: [teams.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user: one(users, {
		fields: [payments.userId],
		references: [users.id]
	}),
}));

export const playerStatsRelations = relations(playerStats, ({one}) => ({
	user: one(users, {
		fields: [playerStats.userId],
		references: [users.id]
	}),
	event: one(events, {
		fields: [playerStats.eventId],
		references: [events.id]
	}),
}));

export const userBadgesRelations = relations(userBadges, ({one}) => ({
	user: one(users, {
		fields: [userBadges.userId],
		references: [users.id]
	}),
	badge: one(badges, {
		fields: [userBadges.badgeId],
		references: [badges.id]
	}),
	profile: one(profiles, {
		fields: [userBadges.profileId],
		references: [profiles.id]
	}),
}));

export const badgesRelations = relations(badges, ({many}) => ({
	userBadges: many(userBadges),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	userBadges: many(userBadges),
	userTrophies: many(userTrophies),
	profilePrivacies: many(profilePrivacy),
	profileClaims: many(profileClaims),
	profileRelationships_parentProfileId: many(profileRelationships, {
		relationName: "profileRelationships_parentProfileId_profiles_id"
	}),
	profileRelationships_playerProfileId: many(profileRelationships, {
		relationName: "profileRelationships_playerProfileId_profiles_id"
	}),
	notifications: many(notifications),
	teamJoinRequests: many(teamJoinRequests),
	playerEvaluations: many(playerEvaluations),
	account: one(accounts, {
		fields: [profiles.accountId],
		references: [accounts.id]
	}),
}));

export const deviceModeConfigRelations = relations(deviceModeConfig, ({one}) => ({
	user: one(users, {
		fields: [deviceModeConfig.parentId],
		references: [users.id]
	}),
}));

export const trainingProgressRelations = relations(trainingProgress, ({one}) => ({
	user: one(users, {
		fields: [trainingProgress.userId],
		references: [users.id]
	}),
	trainingSubscription: one(trainingSubscriptions, {
		fields: [trainingProgress.subscriptionId],
		references: [trainingSubscriptions.id]
	}),
}));

export const trainingSubscriptionsRelations = relations(trainingSubscriptions, ({one, many}) => ({
	trainingProgresses: many(trainingProgress),
	user: one(users, {
		fields: [trainingSubscriptions.userId],
		references: [users.id]
	}),
}));

export const teamMessagesRelations = relations(teamMessages, ({one}) => ({
	user: one(users, {
		fields: [teamMessages.senderId],
		references: [users.id]
	}),
}));

export const familyMembersRelations = relations(familyMembers, ({one}) => ({
	user_parentId: one(users, {
		fields: [familyMembers.parentId],
		references: [users.id],
		relationName: "familyMembers_parentId_users_id"
	}),
	user_playerId: one(users, {
		fields: [familyMembers.playerId],
		references: [users.id],
		relationName: "familyMembers_playerId_users_id"
	}),
}));

export const accountsRelations = relations(accounts, ({many}) => ({
	users: many(users),
	profileRelationships: many(profileRelationships),
	trustedDevices: many(trustedDevices),
	deviceSettings: many(deviceSettings),
	followedNotionPlayers: many(followedNotionPlayers),
	profiles: many(profiles),
}));

export const playerTasksRelations = relations(playerTasks, ({one, many}) => ({
	user_playerId: one(users, {
		fields: [playerTasks.playerId],
		references: [users.id],
		relationName: "playerTasks_playerId_users_id"
	}),
	user_assignedBy: one(users, {
		fields: [playerTasks.assignedBy],
		references: [users.id],
		relationName: "playerTasks_assignedBy_users_id"
	}),
	event: one(events, {
		fields: [playerTasks.eventId],
		references: [events.id]
	}),
	playerPoints: many(playerPoints),
}));

export const playerPointsRelations = relations(playerPoints, ({one}) => ({
	user: one(users, {
		fields: [playerPoints.playerId],
		references: [users.id]
	}),
	playerTask: one(playerTasks, {
		fields: [playerPoints.taskId],
		references: [playerTasks.id]
	}),
}));

export const userTrophiesRelations = relations(userTrophies, ({one}) => ({
	user: one(users, {
		fields: [userTrophies.userId],
		references: [users.id]
	}),
	profile: one(profiles, {
		fields: [userTrophies.profileId],
		references: [profiles.id]
	}),
}));

export const profilePrivacyRelations = relations(profilePrivacy, ({one}) => ({
	profile: one(profiles, {
		fields: [profilePrivacy.profileId],
		references: [profiles.id]
	}),
}));

export const profileClaimsRelations = relations(profileClaims, ({one}) => ({
	profile: one(profiles, {
		fields: [profileClaims.profileId],
		references: [profiles.id]
	}),
}));

export const profileRelationshipsRelations = relations(profileRelationships, ({one}) => ({
	account: one(accounts, {
		fields: [profileRelationships.accountId],
		references: [accounts.id]
	}),
	profile_parentProfileId: one(profiles, {
		fields: [profileRelationships.parentProfileId],
		references: [profiles.id],
		relationName: "profileRelationships_parentProfileId_profiles_id"
	}),
	profile_playerProfileId: one(profiles, {
		fields: [profileRelationships.playerProfileId],
		references: [profiles.id],
		relationName: "profileRelationships_playerProfileId_profiles_id"
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	profile: one(profiles, {
		fields: [notifications.profileId],
		references: [profiles.id]
	}),
}));

export const trustedDevicesRelations = relations(trustedDevices, ({one}) => ({
	account: one(accounts, {
		fields: [trustedDevices.userId],
		references: [accounts.id]
	}),
}));

export const deviceSettingsRelations = relations(deviceSettings, ({one}) => ({
	account: one(accounts, {
		fields: [deviceSettings.userId],
		references: [accounts.id]
	}),
}));

export const coachTeamsRelations = relations(coachTeams, ({one}) => ({
	user: one(users, {
		fields: [coachTeams.coachId],
		references: [users.id]
	}),
	team: one(teams, {
		fields: [coachTeams.teamId],
		references: [teams.id]
	}),
}));

export const teamJoinRequestsRelations = relations(teamJoinRequests, ({one}) => ({
	user_playerId: one(users, {
		fields: [teamJoinRequests.playerId],
		references: [users.id],
		relationName: "teamJoinRequests_playerId_users_id"
	}),
	profile: one(profiles, {
		fields: [teamJoinRequests.playerProfileId],
		references: [profiles.id]
	}),
	team: one(teams, {
		fields: [teamJoinRequests.teamId],
		references: [teams.id]
	}),
	user_coachId: one(users, {
		fields: [teamJoinRequests.coachId],
		references: [users.id],
		relationName: "teamJoinRequests_coachId_users_id"
	}),
	user_decidedBy: one(users, {
		fields: [teamJoinRequests.decidedBy],
		references: [users.id],
		relationName: "teamJoinRequests_decidedBy_users_id"
	}),
}));

export const playerEvaluationsRelations = relations(playerEvaluations, ({one}) => ({
	user_playerId: one(users, {
		fields: [playerEvaluations.playerId],
		references: [users.id],
		relationName: "playerEvaluations_playerId_users_id"
	}),
	user_coachId: one(users, {
		fields: [playerEvaluations.coachId],
		references: [users.id],
		relationName: "playerEvaluations_coachId_users_id"
	}),
	profile: one(profiles, {
		fields: [playerEvaluations.profileId],
		references: [profiles.id]
	}),
}));

export const followedNotionPlayersRelations = relations(followedNotionPlayers, ({one}) => ({
	account: one(accounts, {
		fields: [followedNotionPlayers.accountId],
		references: [accounts.id]
	}),
}));