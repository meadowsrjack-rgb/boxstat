# BoxStat - Basketball Management Platform

## Overview
BoxStat is a cross-platform Progressive Web App (PWA) designed to manage basketball league operations. It streamlines communication, scheduling, player development, and team activities. The platform aims to provide a superior user experience and operational efficiency, with features like secure authentication and robust data management. Its long-term vision is to become a leading mobile platform for sports management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18 with TypeScript and Vite, styled with Radix UI, shadcn/ui, and Tailwind CSS. Wouter handles routing, and TanStack Query manages server state. It features full PWA capabilities and is configured for native iOS deployment via Capacitor, including comprehensive App Store deployment workflows. The design is mobile-first, responsive, and uses a red theme. Key UI elements include player dashboards with skill tracking, coach dashboards with QR scanners for check-ins, and a Player Mode that restricts payment access.

**Desktop & Mobile Scrolling**: The app uses standard document scrolling with `overflow-y: auto` on body. Pages use a `.scrollable-page` utility class and `min-h-full` to ensure proper content flow. The black background on html/body prevents iOS Safari safe-area gaps while allowing normal vertical scrolling on all platforms.

### Backend
The backend is built with Node.js and Express.js (TypeScript, ESM). It includes a custom email/password authentication system with verification and magic links, utilizing a pending registration system. Session management uses persistent Express sessions with PostgreSQL storage. CORS is configured for mobile apps and web browsers. Stripe handles payment processing, and WebSockets provide real-time features. APIs are RESTful.

### Database
PostgreSQL, hosted on Neon serverless, is used with Drizzle ORM for type-safe operations. The schema has been restructured to align with admin dashboard tabs for better organization:

**Core Tables:**
- `users`: Multi-role architecture (player, parent, coach, admin sharing same email) with profile gateway routing
- `teams`, `team_memberships`: Team management with role-based assignments (head_coach, assistant_coach, manager, player)
- `facilities`: Training and game locations with geocoding support
- `events`, `event_targets`: Events with normalized targeting (teams, roles, programs, divisions, specific users)
- `payments`: Stripe integration with per-player billing and various billing models

**Waiver System:**
- `waivers`: Base waiver definitions
- `waiver_versions`: Versioned waiver content with publish workflow
- `waiver_signatures`: User signatures with status tracking (valid/superseded/revoked) - publishing new version automatically supersedes existing signatures

**Product & Enrollment System:**
- `programs`, `packages/products`: Reusable program and package definitions with `accessTag` (club_member/pack_holder/none) and `sessionCount` for credit-based products
- `product_enrollments`: Consolidated enrollment tracking with `remainingCredits` and `totalCredits` for credit-based access, and legacy migration support via metadata field
- **Program-Team Hierarchy**: Teams are now children of programs via `teams.programId` foreign key. Programs define social settings (hasSubgroups, subgroupLabel, rosterVisibility, chatMode) that control how teams/groups display in player dashboards. Dynamic labels support "Team" (Youth Club), "Level" (Skills Academy), "Group" (Private Training) terminology.

**Notification System:**
- `notifications`: Unified notification storage with multi-type support (announcement, notification, message)
- `notification_templates`: Reusable templates with variable placeholders
- `notification_topics`: Categorization and subscription control for notifications
- `messages`: Team-specific chat messages (separate from notifications)

**Additional Tables:**
- `pending_registrations`: Multi-step registration flow with session/platform tracking
- `migration_lookup`, `subscriptions`: Legacy UYP subscription migration support
- `badges`, `trophies`, `trophy_assignments`: 5-tier achievement system
- `age_divisions`, `levels`, `coaches`: Program configuration and coach profiles

### Key Features & Design Decisions
- **Authentication & Registration**: Features a required email verification, magic link, and a non-blocking registration flow using the pending registration system. Key features include:
  - **Session-Aware Email Verification**: When users verify their email by clicking the link, the original session (browser tab or iOS app) is notified via polling. The verify-email page shows "You can close this tab" with platform-specific instructions (iOS vs web) instead of logging in the clicked tab.
  - **iOS App Redirect for Magic Links**: Magic links requested from the iOS app will redirect back to the iOS app via custom URL scheme (`boxstat://auth?token=...`) when clicked from email.
  - **Source Platform Tracking**: The `pending_registrations` table tracks `sourcePlatform` (ios/web) and `sessionId` to correlate original sessions with verification clicks.
  - **Verification Polling**: Registration flow polls `/api/auth/check-verification-status` every 3 seconds to detect when email is verified and automatically advances to step 2.
- **Hub & Spoke Navigation**: After login, users are routed through a DashboardDispatcher that intelligently routes based on role:
  - Solo players → Player Dashboard directly
  - Parents without managed players → Parent Dashboard
  - Parents with managed players, coaches, admins → Profile Gateway ("Who's watching?" screen)
  - Profile Gateway shows role-specific cards with account holder name, Coach View, Admin View, and player profile cards
  - **Player Status Tags**: Dynamic status badges on player cards with priority ordering:
    - "Payment Due" (red) - payment pending/overdue
    - "Low Balance" (amber) - less than 3 pack credits remaining
    - "Club Member" (green) - active subscription
    - "Pack Holder" (blue) - has credits but no subscription
  - Respects backend-stored preferences (activeProfileId, defaultDashboardView) and remembers last viewed profile via localStorage
  - "Switch Profile" button on dashboards returns to Profile Gateway
- **User & Player Management**: Supports single parent accounts with linked child profiles, a Dual Mode System (Parent/Player) secured by PIN, and a Parental Device Lock feature. Player profiles require verification and completion to become public, with profile photo uploads.
- **Team & Coach Management**: Coaches can manage multiple teams, view rosters (including Notion-synced players), evaluate players, award badges, and use real-time team chat. Roster management aligns with Notion data.
- **Event & Scheduling**: In-app CRUD for events, color-coded UI, and player RSVP with GPS-based check-in (200m geofencing) using OpenStreetMap and Leaflet. Events support multi-select targeting and display real-time distance indicators for participants. Event filtering is dynamic based on user mode (Parent/Player).
- **Payment & Awards**: Integrates Stripe for secure payments and a robust payment status system that handles various billing models (Per Player, Per Family, Organization-Wide). The Make Payment dialog conditionally shows player selection based on package billing model, with validation to ensure per-player packages are properly attributed. Package displays show subscription type badges (Subscription/One-Time) and billing information prominently. A comprehensive 100-trophy/badge system supports automatic and manual awards. The admin dashboard includes a Recent Transactions card showing the 5 most recent payments with user attribution and collapsible full transaction history.
- **Admin Panel**: Provides comprehensive CRUD for system entities, detailed user views with integrated skill assessments and awards tracking, and a calendar for event management. User detail views display performance stats, skill evaluation history with category-based scoring, and earned badges/trophies for comprehensive player progress monitoring. The Overview tab features a Recent Transactions card with payment history and user name lookups. Admin dashboard tabs: Overview, Users, Teams, Programs, Events, Awards, Products, Waivers, Notifications. The Programs tab manages program definitions with social settings (hasSubgroups, subgroupLabel, rosterVisibility, chatMode) and shows linked teams. Teams are created under programs via programId field.
- **Notifications**: A multi-channel notification system (in-app, email, push) with advanced recipient targeting (users, roles, teams, divisions) and multi-type selections. Includes a complete web push notification system with VAPID authentication and iOS PWA support. Notifications are automatically marked as read when clicked, providing a seamless user experience without manual mark-as-read actions. The system properly uses the `types` field (array) in the notifications schema for flexible categorization.
- **Legacy Migration System**: Supports migrating subscriptions from the legacy UYP system. When users register with an email matching the `migration_lookup` table, subscriptions are automatically transferred to their "wallet" as unassigned subscriptions. The standard red/white `AnnouncementBanner` displays an "Action Required" notification when unassigned subscriptions exist, with an "Assign to Players" button that routes to the account page. Parents can then assign these subscriptions to their player profiles. Player cards display subscription badges after assignment. The system includes:
  - `migration_lookup` table: Stores legacy subscription data keyed by email
  - `subscriptions` table: Stores owned subscriptions with optional player assignment
  - Auto-detection during registration via `/api/registration/complete`
  - Assignment API via `/api/subscriptions/assign`
  - `seed_migration.js` script for populating test migration data

## Deployment Workflow

### Simplified iOS Deployment (One Command!)

When you make code changes and want to deploy to your iPhone:

**Step 1 - On Replit:**
```bash
./scripts/deploy-ios.sh
```
This builds production files and commits changes to git.

**Step 2 - On your Mac:**
```bash
cd ~/Documents/boxstat && ./deploy-to-mac.sh
```
This pulls latest code, builds, syncs to iOS, and opens Xcode automatically.

**Step 3 - In Xcode:**
- Select your iPhone as target
- Click Run (▶️) to install

**For major updates** (like new push notification features):
- Press Shift+Cmd+K to clean build in Xcode
- Delete the app from your iPhone first
- Then click Run for a fresh install

### Quick Fixes Without Full Deploy

For small backend-only changes (no iOS code changes):
- Just edit files on Replit
- Development server auto-reloads
- Changes appear immediately on web app

## External Dependencies

- **Apple Push Notification service (APNs)**: Direct iOS push notifications using HTTP/2 and JWT authentication (APNS_AUTH_KEY, APNS_KEY_ID, APNS_TEAM_ID). Production apps use api.push.apple.com, development uses sandbox.
- **Firebase Cloud Messaging**: Android push notifications via Firebase Admin SDK
- **Web Push (VAPID)**: Browser push notifications for PWA users
- **Resend**: Email service for authentication flows
- **Stripe**: Payment processing, customer management, and transaction handling
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Database operations and migrations
- **Multer**: Handling multipart/form-data for file uploads
- **WebSocket**: Native support for real-time communication
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Server state management and caching
- **Leaflet & OpenStreetMap**: Mapping solution with Nominatim geocoding for location services and geo-fencing
- **Capacitor**: Native iOS deployment and native feature access