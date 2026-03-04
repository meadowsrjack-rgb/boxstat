# BoxStat - Basketball Management Platform

## Overview
BoxStat is a cross-platform Progressive Web App (PWA) designed to streamline basketball league operations. It manages communication, scheduling, player development, and team activities, aiming for a superior user experience and operational efficiency. The platform includes secure authentication and robust data management, with the ambition to become a leading mobile platform for sports management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is a React 18 PWA built with TypeScript and Vite. Styling is handled by Radix UI, shadcn/ui, and Tailwind CSS. Wouter is used for routing, and TanStack Query manages server state. It supports full PWA capabilities and native iOS deployment via Capacitor. The design is mobile-first, responsive, and features a red theme, with specific dashboards for players and coaches (including a QR scanner for check-ins), and a Player Mode with restricted payment access.

### Backend
The backend is developed with Node.js and Express.js (TypeScript, ESM). It incorporates a custom email/password authentication system with verification, magic links, and a pending registration system. Session management uses persistent Express sessions with PostgreSQL storage. CORS is configured for web and mobile. Stripe is integrated for payments, and WebSockets provide real-time features. APIs are RESTful.

### Database
PostgreSQL, hosted on Neon serverless, is used with Drizzle ORM. The schema is organized to support core functionalities, waiver management, product and enrollment systems, and a multi-channel notification system. Key tables include `users` (multi-role), `teams`, `events`, `payments`, `waivers`, `programs`, `product_enrollments`, and `notifications`.

### Key Features & Design Decisions
-   **Authentication & Registration**: Features email verification, magic links, and a non-blocking registration flow. Includes session-aware email verification, iOS app redirect for magic links, and source platform tracking.
-   **Hub & Spoke Navigation**: Intelligent routing after login based on user role via a DashboardDispatcher, including a Profile Gateway ("Who's watching?") for multi-profile accounts. Dynamic player status tags are displayed on player cards.
-   **User & Player Management**: Supports single parent accounts with linked child profiles, a PIN-secured Dual Mode System (Parent/Player), and Parental Device Lock.
-   **Team & Coach Management**: Coaches manage teams, view rosters, evaluate players, award badges, and utilize real-time team chat. Coach dashboard tabs: calendar, team, profile, docs. Coach profiles (experience, bio, philosophy, previous teams, etc.) are viewable by players and parents. Players can click on coaches in their team tab to see the coach's profile. Parents can view teams/coaches via team dropdowns in the settings player cards (expandable roster + clickable coaches that open coach profile dialog). Coach profile dialog (`CoachProfileDialog.tsx`) now resolves profile data across linked accounts (accountHolderId fallback for multi-role users). Coach settings (`coach-setting-pages.tsx`) resolves the correct coach profile ID from accountProfiles for save/upload operations. Public coach profile API: `GET /api/coach-profile/:id`. Team members detail API: `GET /api/teams/:teamId/members-detail`. Parent settings player cards show OVR skill rating bar (fetches `/api/players/:id/latest-evaluation`, parent-authorized).
-   **Admin Team Assignment with Auto-Enrollment**: Provides methods for assigning players to teams with automatic enrollment into associated programs.
-   **Event & Scheduling**: In-app CRUD for events with color-coded UI, player RSVP, and GPS-based check-in (200m geofencing) using OpenStreetMap. Events support configurable player self-RSVP toggle - when disabled, only parent/guardian can RSVP for players, with an informational message displayed to players. Events store an IANA timezone (e.g., "America/Los_Angeles") and all times are converted to/from UTC using timezone-aware logic that automatically handles daylight saving changes. Recurring events preserve wall-clock time across DST boundaries.
-   **Payment & Awards**: Stripe integration for secure payments supporting various billing models, and a comprehensive 100-trophy/badge achievement system.
-   **Admin Panel**: Comprehensive CRUD for system entities, detailed user views, and a calendar for event management. Includes dedicated tabs for Overview, Users, Programs, Events, Awards, Store, Waivers, and Notifications. Programs serve as a central management hub. Role management uses an "Add Role / Remove Role" pattern: roles cannot be changed via the edit user form (displayed read-only). Instead, admins add new role profiles or remove secondary ones from the User Detail view. The primary account profile cannot be removed. Backend blocks role, userType, accountHolderId, and organizationId changes via PATCH.
-   **Notifications**: Multi-channel (in-app, email, push) notification system with advanced recipient targeting and web push support. Features scheduled and recurring messaging with campaign management. Includes automatic scheduled notifications: event reminders (24h, 2h, 30min before), check-in availability alerts, and RSVP window closing warnings.
-   **Legacy Migration System**: Supports migration of subscriptions from a legacy system, including auto-detection during registration and assignment to player profiles. Supports two CSV import types: Stripe Subscriptions export (with subscription IDs and period dates) and Stripe Payments export (with amounts, descriptions, dates). Payment imports require dates with explicit years (2020-2030 range) for historical accuracy; rows without valid dates are skipped. Enrollments display color-coded expiration status (Active/Expiring Soon/Expired) with 14-day warning threshold.
-   **Native iOS Launch Experience**: Implements Capacitor Splash Screen with 3-step "Handoff" strategy (Native Splash → HTML Bridge → React App) for seamless Apple-like instant launch feel. Includes red pulsing ring animation, manual hide triggers, and zero white-flash transitions.
-   **iOS Scroll & Keyboard Fixes**: Uses "Fixed Curtain" pattern (detached background layer + transparent content wrapper) across all pages to prevent white gaps during iOS keyboard appearance and overscroll. Applies to all auth pages, dashboards, and profile gateway.
-   **Marketing Landing Page**: Professional Stripe-like marketing website for web visitors at `/`. Features hero section, role-based login cards (Parent/Player/Coach), features showcase, dashboard previews, testimonials, pricing tiers, and sales contact section. Platform detection routes iOS app users to the original app landing while web users see the marketing page. The `/app` route provides direct access to the app landing.

## External Dependencies

-   **Apple Push Notification service (APNs)**: For iOS push notifications.
-   **Firebase Cloud Messaging**: For Android push notifications.
-   **Web Push (VAPID)**: For PWA browser push notifications.
-   **Resend**: Email service.
-   **Stripe / Stripe Connect**: Payment processing via Destination Charges (2% platform fee). Orgs onboard through Stripe Connect Express; payments route through the platform account with `transfer_data.destination`. Legacy per-org API keys still supported as fallback.
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Drizzle ORM**: Database operations.
-   **Multer**: File uploads.
-   **WebSocket**: Real-time communication.
-   **Radix UI**: Accessible UI components.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **TanStack Query**: Server state management.
-   **Leaflet & OpenStreetMap**: Mapping, geocoding, and geo-fencing.
-   **Capacitor**: Native iOS deployment and feature access.

## Profile Image System
-   **Upload endpoint**: `POST /api/upload-profile-photo?profileId=xxx` — stores to `public/uploads/`, returns `{ success, imageUrl, message }`.
-   **Dashboard photo upload**: Player dashboard and coach dashboard avatars have a camera icon overlay; tapping opens a file picker to upload a new profile photo directly from the dashboard header.
-   **Parent photo upload**: Parent settings drawer in `unified-account.tsx` has a clickable avatar with camera icon for uploading parent profile photos.
-   **Coach settings upload**: `coach-setting-pages.tsx` Profile tab has a full photo upload area.
-   **Instant updates**: After upload, `setQueryData` optimistically updates the relevant caches (`/api/auth/user`, `/api/profile/:id`, `/api/account/profiles`, `/api/account/players`) so the new image appears immediately without page reload.
-   **Profile gateway**: `profile-gateway.tsx` shows actual profile images for Parent/Account, Coach, Admin, and Player cards with gradient+icon fallback when no image is set.