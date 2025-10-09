# UYP Basketball League Mobile App

## Overview
This is a cross-platform mobile application for the UYP Basketball youth league, serving Parents and Players with tailored interfaces and features. The application aims to streamline league operations, enhance communication, and provide a comprehensive platform for managing schedules, player development, and team activities. It is built with a modern full-stack architecture using React/TypeScript frontend, Express.js backend, and a PostgreSQL database.

## Recent Changes
### Coach Roster Management Enhancement (October 8, 2025)
- **Complete Notion roster display**: Coach dashboards now display ALL players from the Notion database for their teams, not just those with app accounts. Players without app accounts are shown with visual indicators (grayed out, "No Account" badge).
- **Disabled actions for unregistered players**: Players without app accounts cannot receive awards, evaluations, or have their player cards viewed. Evaluate and Reward buttons are disabled and grayed out for these players.
- **Manual roster management**: Coaches can now manually add or remove players from their team rosters using "Add Player" and "Remove" buttons. Add player shows a dialog with all available app players not currently on the team.
- **Name-based player matching**: The system matches Notion players with app accounts by comparing full names (firstName + lastName), enabling proper account linking and status indication.

### Bug Fixes (October 9, 2025)
- **Fixed profile creation name bug**: Resolved critical bug where creating a new profile would overwrite the names of ALL existing profiles. The issue was in the POST /api/profiles endpoint which was incorrectly updating the user account's firstName and lastName with each new profile's data. Now each profile maintains its own independent name in the profiles table, and the user account data remains stable.

### Bug Fixes (October 8, 2025)
- **Fixed join request display in coach dashboard**: Join requests were silently failing to display when authentication errors occurred. Now properly throws errors with user-friendly error banner and retry button. Includes smart retry logic that prevents infinite loops on auth failures.
- **Fixed team selection during profile creation**: Team dropdown values were slugified (e.g., "youth-youth-girls-black") but backend expected actual team names ("Youth Girls Black"). Updated select values to use actual team names, ensuring join requests are created successfully when players select teams during profile creation.
- **Fixed team selection in player settings**: Similar issue where team select values didn't match backend expectations. Now using consistent team name format across all team selection UIs.
- **Fixed team change blocking when pending request exists**: Players can now change their team selection even when they have a pending join request. The system automatically cancels the old request (marks as rejected) and creates a new one when switching teams. Prevents duplicate requests to the same team.
- **Fixed profile creation field labels**: Removed "(Optional)" labels from Height and City fields since they are required fields. Only Phone Number remains marked as optional.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS
- **Routing**: Wouter
- **State Management**: TanStack Query for server state management
- **PWA Features**: Full Progressive Web App with service worker, manifest, and iOS support for a native-like experience.

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **Real-time Communication**: WebSocket support for features like team chat.
- **API Design**: RESTful endpoints.

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe operations and migrations.
- **Schema**: Comprehensive schema supporting users, teams, events, payments, etc.

### Key Features & Design Decisions
- **Authentication Flow**: Post-login account linking system with automatic coach detection. Users authenticate via Replit Auth, and the system automatically detects coaches by email domain (@upyourperformance.org or @upyourperformance.com). Coach profiles are auto-created and users are directed to coach dashboard. Non-coach users are presented with a simple profile type selection (parent or player) before being directed to their respective dashboards.
- **User Management**: Single Parent account with linked child profiles (data objects, not independent users). Implements a Dual Mode System (Parent Mode with full access, Player Mode with restricted child access) secured by a 4-digit PIN.
- **Player Profile Verification**: Player profiles must be verified before becoming public/searchable. During profile creation, only phone number is optional; all other fields (name, date of birth, jersey number, team, height, city, position) are required. Profiles start as unverified and can be verified by linking with the Notion database via the 'link' button (email matching). Unverified player profiles are filtered from public search results to ensure only registered UYP members are discoverable.
- **Profile Management**: Users can delete their profiles (parent, player, or coach) from settings. Deletion removes only the specific profile without affecting other profiles. Available in settings danger zone and player security tab with confirmation dialogs.
- **QR Code Check-in**: Secure gym entry and attendance tracking at Momentous Sports Center using static QR codes per player.
- **Team Management**: Age-grouped teams with coaches and player rosters, supporting real-time chat and player performance tracking. Players send join requests when selecting teams during profile creation or in settings. Join requests include both accountId (playerId) and profileId to properly link the request to the specific player profile. The system ensures profileId is always included by: (1) fetching current profile before allowing team selection, (2) disabling save button while profile loads, (3) throwing error if profileId is unavailable. Coaches view and manage these requests in their dashboard.
- **Event & Scheduling**: Handles various event types, integrated with Google Calendar for automatic hourly sync (upyourperformance@gmail.com). Features advanced event parsing, interactive filtering, and an enhanced calendar UI with color-coded events and a modern sliding drawer for details.
- **Payment Integration**: Uses SportsEngine for secure payment processing (league fees, uniforms, tournaments) with transaction tracking and quick pay options.
- **UI/UX**: Mobile-first responsive design, UYP Basketball branding with a red theme, and PWA capabilities for offline functionality. Player dashboard includes skills progress, interactive trophy/badge counters (32% larger total for better visibility with clickable navigation to trophies-badges page), and profile photo upload. Coach dashboard is coach-focused with QR code scanner for player check-ins and team management features. Player Mode hides pricing and payment options, showing only purchased content. Schedule navigation uses calendar icons for intuitive recognition.
- **Lead Evaluation**: Coaches can create detailed player evaluations with skill ratings (1-5 scale) for dribbling, shooting, passing, catching, coachability, and defense. Evaluations can be exported as PDF or shared directly via the Web Share API to messaging apps (Telegram, WhatsApp, etc.) on mobile devices.

## External Dependencies

### Authentication & Security
- **Replit Auth**: OpenID Connect-based authentication.
- **PostgreSQL**: For session management.

### Payment Processing
- **SportsEngine**: For payment processing, customer management, and transaction handling.

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: For database operations and migrations.

### Real-time Features
- **WebSocket**: Native WebSocket support for real-time communication.
- **Google Calendar API**: For syncing UYP's calendar and event data.

### UI & Development
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state management and caching.