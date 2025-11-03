# UYP Basketball League Mobile App

## Overview
The UYP Basketball League Mobile App is a cross-platform solution designed to streamline league operations, enhance communication, and manage schedules, player development, and team activities for youth basketball leagues. It aims to improve user experience through PWA features, secure authentication, and robust data management. The long-term vision is to become a leading mobile platform for youth sports leagues, offering unparalleled user experience and operational efficiency with potential for broader market reach.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### Family Account Event Filtering (November 2025)
- **Problem Solved**: Team assignments in the Users table were propagating to all family members, causing events to appear on everyone's dashboard instead of only the specific player's dashboard.
- **Solution**:
  1. Player Mode (viewing as specific child): Events filtered by ONLY that child's teamId/divisionId
  2. Parent Mode (no child selected): Events aggregated from ALL children's teams + parent's own team
  3. Sibling Isolation: Siblings do not see each other's team-specific events
- **Implementation**:
  - Frontend passes `childProfileId` query parameter from `useAppMode()` hook
  - Backend `/api/events` and `/api/events/upcoming` accept childProfileId
  - Three-mode filtering: Player Mode (single child), Parent Mode (all children), Regular Mode (own team)
  - Deduplication of teamIds/divisionIds to prevent duplicate events
  - Data leak prevention with early null checks
- **Technical Details**:
  - Uses storage layer abstraction (no direct DB queries)
  - Works with both MemStorage (testing) and DatabaseStorage (production)
  - Maintains single-organization architecture (all family members in same org)

### Event Multi-Select Targeting (November 2025)
- **Feature**: Enhanced event creation/edit to support multi-select targeting for specific users, teams, and divisions
- **Implementation**:
  1. Added "Specific User(s)", "Team(s)", and "Division(s)" options to Event For dropdown
  2. Multi-select checkbox interface for each targeting type with selection counters
  3. Backend support for `assignTo` and `visibility` JSONB fields with users/teams/divisions arrays
  4. Event filtering based on user's assigned team/division or direct user assignment
  5. Backward compatibility maintained for legacy targetType/targetId format
- **Visibility Rules**: Events are visible to users if:
  - User ID is in assignTo.users array
  - User's teamId is in assignTo.teams array
  - User's divisionId is in assignTo.divisions array
  - User's role is in assignTo.roles array
  - Admins see all events regardless of targeting
- **UI/UX**: Selection counters show "X item(s) selected"; selections clear when targetType changes

### Team Display Fix (November 2025)
- **Issue**: Team names not displaying on player cards (account page) and admin dashboard Team Info tab
- **Root Cause**: Missing API endpoint `/api/users/:userId/team` and type mismatch in admin dashboard (teamId/divisionId as strings vs numbers)
- **Solution**:
  1. Created new API endpoint `GET /api/users/:userId/team` with proper authorization checks
  2. Added Number() type coercion in admin dashboard team/division lookups
- **Authorization**: Endpoint allows access if requester is (1) same user, (2) same organization, (3) admin role, or (4) coach role
- **Security**: Fixed multi-tenant data leakage vulnerability by adding authorization checks before returning team data

### Event Participant List (November 2025)
- **Feature**: Added Participant List to Event Details showing which users are invited to specific events
- **Problem Solved**: Previously, the Participant List showed ALL users in the organization instead of filtering based on event visibility/targeting
- **Implementation**:
  1. Created new backend endpoint `GET /api/events/:eventId/participants` with visibility-based filtering
  2. Filters participants based on event's `assignTo` and `visibility` configuration (users, teams, divisions, roles)
  3. Added Participant List UI to both EventDetailModal and Admin Dashboard Event Details dialog
  4. Shows Name, Email, and Role for invited participants (limited to first 20)
- **Authorization**: Only admins and coaches can view participant lists
- **Filtering Logic**: Includes users if their ID is in assignTo.users, their teamId is in assignTo.teams, their divisionId is in assignTo.divisions, or their role is in assignTo.roles
- **UI/UX**: Displays in a card with table format showing participant details; appears only when eventParticipants.length > 0

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite build tool.
- **UI/Styling**: Radix UI components with shadcn/ui design system, Tailwind CSS.
- **Routing & State**: Wouter for routing, TanStack Query for server state management.
- **PWA**: Full Progressive Web App capabilities for a native-like experience.

### Backend Architecture
- **Runtime**: Node.js with Express.js (TypeScript, ESM modules).
- **Authentication**: Custom email/password with email verification and magic link login.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Payment Processing**: Stripe for payments.
- **Communication**: WebSocket support for real-time features.
- **API Design**: RESTful endpoints.

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema**: Supports users, teams, events, payments, facilities, a 5-tier badge/trophy system, UYP Legacy, Team Trophies, Divisions, Skills, and Notifications. Includes a dual-table structure for player data (Profiles for app users, Players for Notion-synced roster data).
- **Programs**: Supports 10 programs (e.g., Skills Academy, FNHTL, Youth-Club, High-School) with support for ongoing/infinite programs.
- **Divisions**: Age/level divisions with linked teams (team_ids array). Used to organize players into age groups and associate them with relevant teams.
- **Teams**: Comprehensive team structure following BoxStat schema with fields: id (serial), name, organizationId, programType ("Team"/"Skills"/"FNH"/"Camp"/"Training"/"Special"), divisionId (FK to divisions), coachId (FK to users), assistantCoachIds (varchar[]), season, organization, location, scheduleLink, rosterSize (default 0), active (default true), notes, createdAt, updatedAt. Foreign keys link coaches to users and divisions.
- **User Fields**: Comprehensive user data including organization_id, division_id, products (JSONB array for active subscriptions), skills_assessments (JSONB year-tagged results), height_in (INTEGER), position (PG/SG/SF/PF/C), profile_visibility (BOOLEAN), bio (TEXT), notes (TEXT for admin use), guardian_id (FK to users), emergency_contact_json (JSONB), and last_login (TIMESTAMP). Includes performance tracking fields: total_practices, total_games, consecutive_checkins, videos_completed, years_active.

### Key Features & Design Decisions
- **Authentication Flow**: Email/password with required verification, magic link, non-blocking registration, and automatic coach detection. Users are directed to appropriate dashboards.
- **Registration Flow**: Streamlined 5-step process for "myself" registration (Email → Intent → Info → Package → Account) and 6-step process for "my_child" registration (Email → Intent → Parent Info → Player Info → Package → Account). Payment step has been removed from initial registration to simplify onboarding; payments are handled separately via the account page. Test-only API endpoint (POST /api/test/verify-email) available in development/test environments for automated testing.
- **User Management**: Single Parent account with linked child profiles; Dual Mode System (Parent/Player) secured by PIN. Profile deletion option available.
- **Player Profile Management**: Profiles require verification and completion of all required fields to become public/searchable. Profile photo upload system implemented.
- **Team Management**: Teams organized into programs with Notion-synced rosters. Coaches can join existing teams and manage players.
- **Roster Management**: Coach dashboards display Notion players; actions for players without app accounts are disabled.
- **Notion Sync**: Player data syncs from Notion databases on startup and daily.
- **Event & Scheduling**: In-app event management for admins/coaches with CRUD, color-coded UI. Players can RSVP and check-in via GPS (200m radius geo-fencing). OpenStreetMap with Nominatim geocoding for location search and Leaflet for interactive maps. LocationSearch component displays saved facilities as quick-select options for easy event location setup.
- **Facility Management**: Admin-only CRUD operations for predefined facility locations. Five facilities are seeded on development startup (Momentous Sports Center, Ladera Sports Center, AIM Sports Group, MAP Sports Facility, Clava Sports Facility). Facilities auto-populate in event creation with stored addresses and coordinates.
- **Payment Integration**: Stripe for secure payment processing (fees, uniforms, tournaments) with transaction and subscription tracking.
- **UI/UX**: Mobile-first responsive design, UYP Basketball red theme, PWA capabilities. Player dashboard includes skills progress and achievement counters. Coach dashboard features QR scanner for check-ins. Player Mode restricts payment access.
- **Lead Evaluation**: Coaches can create detailed player evaluations with skill ratings (1-5) and export/share them.
- **Coach Settings**: Customizable coach profiles with experience, bio, previous teams, playing experience, and philosophy.
- **Admin Panel**: Comprehensive CRUD operations for users, teams, events, awards, divisions, skills, and notifications, with robust table views, search functionality, and a calendar view for event management. Users table features a clean, simplified view showing only Profile Info columns (First Name, Last Name, Email, Phone, DOB, Role, Active, Actions) with a "View Details" button that opens a comprehensive dialog with sidebar navigation and 6 categorized sections: 🏀 Team Info (role, organization, program, team, division, position, height, guardian, bio), 💳 Billing (Stripe customer ID, packages, products), 📈 Performance (total_practices, total_games, consecutive_checkins, videos_completed, years_active, skill level as stat cards), 🧠 Skills & Awards (awards with trophy icons, skills assessments by year), 🩺 Admin Notes (emergency contact, internal notes), ⚙️ System Meta (user ID, active status, last login, timestamps, verified status in accordion). The detail view uses a vertical sidebar navigation on desktop (horizontal scrollable on mobile) with proper ARIA attributes for accessibility. Table is swipeable on mobile devices for touch-based scrolling. Edit form includes fields for Position, Height (inches), Bio, and Admin Notes. Functional cascading dropdowns for user editing (Program filters Team and Division). Teams tab displays: Team Name | Program Type | Division | Coach | Season | Roster | Active with comprehensive create/edit forms including all BoxStat fields. Events tab shows team programType alongside team names for clarity.

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