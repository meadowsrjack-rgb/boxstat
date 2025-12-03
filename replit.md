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
PostgreSQL, hosted on Neon serverless, is used with Drizzle ORM for type-safe operations. The schema supports users, teams, events, payments, facilities, and a 5-tier badge/trophy system. It includes structures for various programs, age/level divisions, and comprehensive user data fields. A dual-table structure manages player data, distinguishing between app users and Notion-synced roster data. A `playerId` field in the payments table ensures accurate per-player billing. A `pending_registrations` table prevents partial account creation during the multi-step registration process.

### Key Features & Design Decisions
- **Authentication & Registration**: Features a required email verification, magic link, and a non-blocking registration flow using the pending registration system.
- **Hub & Spoke Navigation**: After login, users are routed through a DashboardDispatcher that intelligently routes based on role:
  - Solo players → Player Dashboard directly
  - Parents without managed players → Parent Dashboard
  - Parents with managed players, coaches, admins → Profile Gateway ("Who's watching?" screen)
  - Profile Gateway shows role-specific cards with account holder name, Coach View, Admin View, and player profile cards
  - Respects backend-stored preferences (activeProfileId, defaultDashboardView) and remembers last viewed profile via localStorage
  - "Switch Profile" button on dashboards returns to Profile Gateway
- **User & Player Management**: Supports single parent accounts with linked child profiles, a Dual Mode System (Parent/Player) secured by PIN, and a Parental Device Lock feature. Player profiles require verification and completion to become public, with profile photo uploads.
- **Team & Coach Management**: Coaches can manage multiple teams, view rosters (including Notion-synced players), evaluate players, award badges, and use real-time team chat. Roster management aligns with Notion data.
- **Event & Scheduling**: In-app CRUD for events, color-coded UI, and player RSVP with GPS-based check-in (200m geofencing) using OpenStreetMap and Leaflet. Events support multi-select targeting and display real-time distance indicators for participants. Event filtering is dynamic based on user mode (Parent/Player).
- **Payment & Awards**: Integrates Stripe for secure payments and a robust payment status system that handles various billing models (Per Player, Per Family, Organization-Wide). The Make Payment dialog conditionally shows player selection based on package billing model, with validation to ensure per-player packages are properly attributed. Package displays show subscription type badges (Subscription/One-Time) and billing information prominently. A comprehensive 100-trophy/badge system supports automatic and manual awards. The admin dashboard includes a Recent Transactions card showing the 5 most recent payments with user attribution and collapsible full transaction history.
- **Admin Panel**: Provides comprehensive CRUD for system entities, detailed user views with integrated skill assessments and awards tracking, and a calendar for event management. User detail views display performance stats, skill evaluation history with category-based scoring, and earned badges/trophies for comprehensive player progress monitoring. The Overview tab features a Recent Transactions card with payment history and user name lookups.
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