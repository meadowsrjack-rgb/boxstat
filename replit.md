# UYP Basketball League Mobile App

## Overview
The UYP Basketball League Mobile App is a cross-platform solution designed to streamline league operations, enhance communication, and manage schedules, player development, and team activities for youth basketball leagues. It aims to improve user experience through PWA features, secure authentication, and robust data management. The long-term vision is to become a leading mobile platform for youth sports leagues, offering unparalleled user experience and operational efficiency with potential for broader market reach.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite build tool.
- **UI/Styling**: Radix UI components with shadcn/ui design system, Tailwind CSS.
- **Routing & State**: Wouter for routing, TanStack Query for server state management.
- **PWA**: Full Progressive Web App capabilities for a native-like experience.
- **UI/UX Decisions**: Mobile-first responsive design, UYP Basketball red theme, PWA capabilities. Player dashboard includes skills progress and achievement counters. Coach dashboard features QR scanner for check-ins. Player Mode restricts payment access.

### Backend Architecture
- **Runtime**: Node.js with Express.js (TypeScript, ESM modules).
- **Authentication**: Custom email/password with email verification and magic link login. Uses pending registration system to prevent partial account creation.
- **Session Management**: Persistent Express sessions with PostgreSQL storage (30-day expiration, rolling refresh on each request). Sessions survive server restarts and keep users logged in.
- **Payment Processing**: Stripe for payments.
- **Communication**: WebSocket support for real-time features.
- **API Design**: RESTful endpoints.

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema**: Supports users, teams, events, payments, facilities, pending_registrations, a 5-tier badge/trophy system, UYP Legacy, Team Trophies, Divisions, Skills, and Notifications. Includes a dual-table structure for player data (Profiles for app users, Players for Notion-synced roster data).
- **Programs**: Supports 10 programs (e.g., Skills Academy, FNHTL, Youth-Club, High-School) with support for ongoing/infinite programs.
- **Divisions**: Age/level divisions with linked teams (team_ids array) to organize players and associate them with relevant teams.
- **Teams**: Comprehensive team structure following BoxStat schema.
- **User Fields**: Comprehensive user data including organization_id, division_id, products, skills_assessments, height_in, position, profile_visibility, bio, notes, guardian_id, emergency_contact_json, and last_login. Includes performance tracking fields.
- **Payments Table**: Added playerId field to track which specific player a payment covers in per-player billing scenarios. This ensures accurate payment status attribution across siblings with different packages. **Schema Change**: The player_id column has been added to the payments table. For new deployments, run `drizzle-kit push` to sync the schema or manually add the column: `ALTER TABLE payments ADD COLUMN IF NOT EXISTS player_id VARCHAR;`
- **Pending Registrations**: New table to prevent partial account creation during registration. Email verification creates a pending_registration record; user account is only created after all steps are completed with password set.

### Key Features & Design Decisions
- **Authentication Flow**: Email/password with required verification, magic link, non-blocking registration, and automatic coach detection. Uses pending registration system to prevent partial account creation. Users are directed to appropriate dashboards.
- **Registration Flow**: Streamlined 4-step process for "myself" registration and 5-step process for "my_child" registration. Package/program selection has been removed from registration and is now handled separately via the account page after registration. **Pending Registration System**: Step 1 creates a pending_registration record (not a user account). Email verification marks the pending_registration as verified. User account is only created at the final step when all data and password are provided. The pending_registration is deleted after successful account creation.
- **User Management**: Single Parent account with linked child profiles; Dual Mode System (Parent/Player) secured by PIN. Profile deletion option available.
- **Parental Device Lock**: Parents can lock a device to a specific child's dashboard with 4-digit PIN protection. When locking from the unified account page, parents create a PIN. The lock icon in the player dashboard requires the correct PIN to unlock, preventing unauthorized access. Player settings provides a PIN-free unlock option (parent bypass) if the PIN is forgotten. Lock is client-side using localStorage with keys `deviceLockedToPlayer` and `deviceLockPIN`. When locked, back navigation is blocked and replaced with a clickable lock icon. All components synchronize lock state via custom `deviceLockChanged` event. Player cards show lock status with color-coded icons (red when locked, gray when unlocked) and visual "Device locked to this player" messages.
- **Player Profile Management**: Profiles require verification and completion of all required fields to become public/searchable. Profile photo upload system implemented.
- **Team Management**: Teams organized into programs with Notion-synced rosters. Coaches can be assigned to teams as head coach (coachId) or assistant coach (assistantCoachIds). Coaches can join existing teams via the coach dashboard.
- **Coach Dashboard**: Multi-team support with team selection interface. Coaches can view all assigned teams (both head and assistant positions), access full team rosters with app users and Notion-synced players, manage player assignments, evaluate players, award badges/trophies, and access team chat for each assigned team. TeamChat component provides real-time messaging via WebSocket. Player removal uses organization-based security checks for safe idempotent roster management. Award system fully integrated with endpoints at `/api/coach/award` for awarding and `/api/users/:userId/{awards|badges|trophies}` for display.
- **Roster Management**: Coach dashboards display Notion players; actions for players without app accounts are disabled.
- **Notion Sync**: Player data syncs from Notion databases on startup and daily.
- **Event & Scheduling**: In-app event management for admins/coaches with CRUD, color-coded UI. Players can RSVP and check-in via GPS (200m radius geo-fencing). OpenStreetMap with Nominatim geocoding for location search and Leaflet for interactive maps. LocationSearch component displays saved facilities as quick-select options. Event creation/edit supports multi-select targeting for specific users, teams, and divisions. Visibility rules ensure correct event display for users, teams, divisions, and roles. Participant lists are available for events. **Real-time Distance Indicator**: EventDetailModal displays a color-coded distance indicator for players/parents showing their real-time distance from the event location. The indicator is green when within the check-in radius (≤200m by default), red when outside the radius (>200m), and gray while fetching location. It shows the exact distance in meters, the configured check-in radius, and helpful messages about check-in eligibility. Admins and coaches do not see the distance indicator as they bypass location checks.
- **Family Account Event Filtering**: Events are filtered to show only those relevant to the selected child in Player Mode, or aggregated from all children and the parent in Parent Mode. Siblings do not see each other's team-specific events.
- **Facility Management**: Admin-only CRUD operations for predefined facility locations. Facilities auto-populate in event creation with stored addresses and coordinates.
- **Payment Integration**: Stripe for secure payment processing (fees, uniforms, tournaments) with transaction and subscription tracking.
- **Payment Status System**: Comprehensive payment status derivation using derivePlayerStatus utility that accurately handles per-player, per-family, and organization-wide billing models. Displays color-coded status indicators (Active/Pending/One-Time Paid) on player cards in Unified Account page. Payments with playerId field ensure accurate per-player billing attribution, preventing false "Active" statuses for unpaid siblings.
- **Lead Evaluation**: Coaches can create detailed player evaluations with skill ratings (1-5) and export/share them.
- **Coach Settings**: Customizable coach profiles with experience, bio, previous teams, playing experience, and philosophy.
- **Admin Panel**: Comprehensive CRUD operations for users, teams, events, awards, divisions, skills, and notifications, with robust table views, search functionality, and a calendar view for event management. Detailed user view with sidebar navigation and categorized sections: Team Info, Billing, Performance, Skills & Awards, Admin Notes, and System Meta. Awards display correctly across all tables and views through integrated award endpoints.
- **Awards System**: Complete 100-trophy/badge system with automatic and manual triggering. Awards are granted via `/api/coach/award` endpoint and displayed through `/api/users/:userId/awards`, `/api/users/:userId/badges`, and `/api/users/:userId/trophies` endpoints. System calls `evaluateAwardsForUser()` after each award to update cached user profiles, ensuring awards appear immediately on player cards, trophies/badges pages, unified account page, and admin dashboard tables. Award IDs are synchronized between frontend (CoachAwardDialogs.tsx) and backend (shared/awards.registry.ts) to ensure proper award assignment.

## External Dependencies

### Authentication & Security
- **Resend**: Email service for verification and magic link emails.

### Payment Processing
- **Stripe**: For payment processing, customer management, and transaction handling.

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: For database operations and migrations.
- **Multer**: For handling multipart/form-data file uploads (e.g., profile photos).

### Real-time Features
- **WebSocket**: Native WebSocket support for real-time communication.

### UI & Development
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state management and caching.
- **Leaflet & OpenStreetMap**: Free, open-source mapping solution with Nominatim geocoding for location search and coordinates for geo-fencing.