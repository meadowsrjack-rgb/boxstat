# UYP Basketball League Mobile App

## Overview
The UYP Basketball League Mobile App is a cross-platform solution designed for parents and players to streamline league operations, enhance communication, and manage schedules, player development, and team activities. It aims to provide a comprehensive platform for the youth league, improving user experience through PWA features, secure authentication, and robust data management. The application also includes tools for coaches and administrators for effective team and player development management. The long-term vision is to establish a leading mobile platform for youth sports leagues, offering unparalleled user experience and operational efficiency, with potential for broader market reach beyond basketball.

## Recent Changes

### Admin Panel Expansion - Divisions, Skills, Notifications (Oct 27, 2025)
- **Database Schema Enhancements**: Added three new tables with complete TypeScript interfaces and Zod validation
  - **Divisions Table**: organizationId, name, description, ageRange, programIds[], isActive, createdAt
  - **Skills Table**: organizationId, playerId, category, score (1-10), notes, evaluatedBy, evaluationDate, createdAt
  - **Notifications Table**: organizationId, title, message, type, recipientIds[], sentBy, sendDate, isRead, createdAt
  - Added divisionId foreign key to teams table (references divisions.id)
  - Enhanced events table with visibility and assignTo JSONB fields for scoped event management
  - Enhanced payments table with packageId, programId, organizationId fields to track transactions
  - Fixed User interface to include all database fields (city, height, age, emergencyContact, emergencyPhone, medicalInfo, allergies)
  - Location: shared/schema.ts

- **Storage Layer Implementation**: Full CRUD operations for all new entities
  - Added methods to IStorage interface for divisions, skills, and notifications
  - Implemented all methods in MemStorage class using in-memory Maps with auto-incrementing IDs
  - Implemented all methods in DatabaseStorage class using Drizzle ORM with proper database queries
  - Added mapper functions (mapDbDivisionToDivision, mapDbSkillToSkill, mapDbNotificationToNotification)
  - Location: server/storage-impl.ts

- **API Routes**: RESTful endpoints with full authentication and validation
  - **Divisions API**: GET/POST /api/divisions, GET/PATCH/DELETE /api/divisions/:id (admin/coach only)
  - **Skills API**: GET/POST /api/skills, GET/PATCH/DELETE /api/skills/:id (coach/admin only, supports playerId filter)
  - **Notifications API**: GET/POST /api/notifications, GET/PATCH/DELETE /api/notifications/:id, PATCH /api/notifications/:id/read
  - All routes use Zod schema validation (insertDivisionSchema, insertSkillSchema, insertNotificationSchema)
  - Proper authorization checks based on user role
  - Comprehensive error handling with appropriate HTTP status codes
  - Location: server/routes.ts (lines 1653-1989)

- **Admin Dashboard UI**: Three new tabs with full CRUD interfaces
  - **Divisions Tab**: Create, edit, delete divisions with table view showing name, description, age range, programs, status
  - **Skills Tab**: Create, edit, delete skills with player filter, table view with visual star ratings
  - **Notifications Tab**: Create, edit, delete notifications with recipient selection, table view with read status
  - All tabs use TanStack Query for data fetching and mutations
  - Form validation using react-hook-form with Zod resolvers
  - Success/error toast notifications for all operations
  - Comprehensive data-testid attributes for testing
  - Location: client/src/pages/admin-dashboard.tsx

- **Architect Review**: All changes reviewed and approved by architect
  - No critical issues identified
  - Implementation follows best practices and existing patterns
  - Clean integration across schema, storage, API, and UI layers
  - Proper error handling and security throughout

### Complete Profile Photo Upload System (Oct 27, 2025)
- **Parent Settings Routes Added**: Registered all parent-settings routes in App.tsx (were missing)
  - Main route: `/parent-settings`
  - Sub-routes: profile, privacy, notifications, security, connections, legal, devices, danger
  - Location: client/src/App.tsx (lines 44, 76-85, 261, 272-280)
- **Unified Account Avatar Fix**: Updated player cards to use Avatar component with AvatarImage
  - Replaced hardcoded gradient div with proper Avatar/AvatarImage/AvatarFallback
  - Now displays profileImageUrl when available, falls back to initials
  - Location: client/src/pages/unified-account.tsx (lines 6, 245-250)
- **Cache Invalidation Enhancement**: Added `/api/account/players` to cache invalidation
  - All settings pages (player, parent, coach) now invalidate account/players cache after upload
  - Ensures unified-account page shows updated photos immediately
  - Locations: player-setting-pages.tsx (line 119), parent-setting-pages.tsx (line 120), coach-setting-pages.tsx (line 127)
- **End-to-End Functionality**: Profile photos now work across all account types and pages
  - Parents can upload photos for themselves via /parent-settings/profile
  - Parents can upload photos for children via player settings
  - Photos persist and display on: settings pages, player dashboard, unified-account page
  - Each user (parent/child) has independent profileImageUrl field
- **Testing**: E2E test verified complete workflow: parent uploads own photo, uploads child photos, all display correctly on unified-account and player dashboard, photos persist after page refresh

### Profile Photo Upload Implementation (Oct 25, 2025)
- **Image Upload Endpoint**: Created POST /api/upload-profile-photo endpoint to handle profile photo uploads
  - Backend uses multer middleware for multipart/form-data file handling
  - Files saved to public/uploads/ directory with unique filenames (profile-{timestamp}-{random}.{ext})
  - File validation: Max 5MB, image types only (jpeg, jpg, png, gif, webp)
  - Authorization: Parents can upload for children, users can upload for self, admins can upload for anyone
  - Security: Files are deleted if authorization fails or any error occurs (prevents unauthorized file persistence)
  - Response: Returns image URL (/uploads/filename) and updates user's profileImageUrl in database
  - Location: server/routes.ts (lines ~36-68 for multer config, lines ~1166-1224 for endpoint)
- **Testing**: E2E test verified uploads work, images persist after reload, and display on both settings and dashboard

### Database Layer Profile Field Fix (Oct 25, 2025)
- **Height & City Persistence Fix**: Fixed database layer to properly save and retrieve all profile fields
  - Root cause: storage-impl.ts was missing height, city, age, and other fields in TWO locations
  - Fixed updateUser method: Added city, height, age, emergencyContact, emergencyPhone, medicalInfo, allergies to dbUpdates object
  - Fixed mapDbUserToUser mapper: Added same fields to database-to-application mapping function
  - Result: All profile fields now persist correctly and round-trip through the database layer
  - Testing: E2E test verified height and city save, persist after reload, and display on both settings and dashboard
  - Location: server/storage-impl.ts (lines ~1194-1224 for updateUser, lines ~1735-1779 for mapper)

### Player Profile Settings Fixes (Oct 25, 2025)
- **Team Field Removal**: Removed team selector from player-editable profile settings
  - Deleted team field from player-dashboard.tsx Profile tab (editableProfile state)
  - Deleted team field from player-setting-pages.tsx (state, queries, UI components)
  - Team assignment remains admin-only, not editable by players
  - Locations: player-dashboard.tsx SaveProfile component, player-setting-pages.tsx PlayerProfilePage
- **Profile Save Bug Fix**: Fixed PATCH /api/profile/undefined 404 errors
  - Added profileId fallback pattern: `activeProfileId || user.id` in both profile editing interfaces
  - player-dashboard.tsx: SaveProfile component now receives displayProfile.id as prop
  - player-setting-pages.tsx: Added const profileId with fallback, updated all queries/mutations
- **Cache Invalidation Fix**: Fixed profile updates not showing in UI
  - Root cause: Cache invalidation keys were mismatched with actual query keys
  - player-setting-pages.tsx: Updated mutations to invalidate correct keys: `/api/profile/${id}`, `/api/auth/user`, `/api/child-profiles`
  - player-dashboard.tsx: Added child-profiles cache invalidation to SaveProfile mutation
  - Profile photo upload: Fixed cache invalidation to use same correct keys
  - Testing: Verified profile updates (Position, Jersey, City) now display correctly in both player settings and player dashboard after save

### Find Players & Teams Search Fix (Oct 25, 2025)
- **Backend**: Updated all search endpoints to query Users table instead of non-existent Profiles table
  - Registered search routes in server/routes.ts: `app.use('/api/search', searchRoutes)`
  - Fixed authentication middleware in search.ts to use session-based auth (removed broken replitAuth)
  - Endpoints: GET /api/search/players, GET /api/search/teams, GET /api/search/teams/:teamId
  - Players search filters by `role='player' AND verified=TRUE` from Users table
  - Teams search queries Teams table with roster count/details from Users table
- **Frontend**: Updated PlayerSearch.tsx component to call `/api/search/players` instead of `/api/search/notion-players`
- **Location**: PlayerSearch component is in the Team tab of the player dashboard
- **Testing**: Verified searches for "John" return John Doe and John Jones; all search functionality working correctly

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript, Vite build tool.
- **UI/Styling**: Radix UI components with shadcn/ui design system, Tailwind CSS.
- **Routing & State**: Wouter for routing, TanStack Query for server state management.
- **PWA**: Full Progressive Web App capabilities for a native-like experience.

### Backend Architecture
- **Runtime**: Node.js with Express.js (TypeScript, ESM modules).
- **Authentication**: Custom email/password with email verification and magic link login via Resend.
- **Session Management**: Express sessions with PostgreSQL storage.
- **Payment Processing**: Stripe for payments.
- **Communication**: WebSocket support for real-time features.
- **API Design**: RESTful endpoints.

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting.
- **ORM**: Drizzle ORM for type-safe operations.
- **Schema**: Supports users, teams, events, payments, and a 5-tier badge/trophy system (Prospect, Starter, All-Star, Superstar, Hall of Fame) plus UYP Legacy and Team Trophies.
- **Player Data Model**: Dual-table structure (Profiles for app users, Players for Notion-synced roster data).
- **Programs**: Supports 10 programs, including Skills Academy (SA-Special-Needs, SA-Rookies, SA-Beginner, SA-Intermediate, SA-Advanced, SA-Elite), FNHTL, Youth-Club, and High-School.

### Key Features & Design Decisions
- **Authentication Flow**: Email/password with required verification, magic link option, non-blocking registration allowing Stripe data auto-prefill, and automatic coach detection. Users are directed to appropriate dashboards (coach, parent, player).
- **User Management**: Single Parent account with linked child profiles; Dual Mode System (Parent/Player) secured by PIN. Profile deletion option available.
- **Player Profile Management**: Profiles require verification and completion of all required fields (name, DOB, jersey number, team, height, city, position) to become public/searchable.
- **Team Management**: Teams organized into four programs (Skills Academy, FNHTL, Youth Club, High School) with Notion-synced rosters. Coaches can join existing teams and manage players. App team assignments override Notion data.
- **Roster Management**: Coach dashboards display Notion players for their teams; actions for players without app accounts are disabled.
- **Notion Sync**: Player data syncs from Notion databases on startup and daily (2 AM PT).
- **Event & Scheduling**: In-app event management for admins/coaches with CRUD operations, color-coded UI, and sliding drawer for details. Players can RSVP and check-in via GPS.
- **Payment Integration**: Stripe for secure payment processing (fees, uniforms, tournaments) with transaction and subscription tracking.
- **UI/UX**: Mobile-first responsive design, UYP Basketball red theme, PWA capabilities. Player dashboard includes skills progress and achievement counters. Coach dashboard features QR scanner for check-ins. Player Mode restricts payment access.
- **Lead Evaluation**: Coaches can create detailed player evaluations with skill ratings (1-5) and export/share them.
- **Coach Settings**: Customizable coach profiles with experience, bio, previous teams, playing experience, and philosophy.

## External Dependencies

### Authentication & Security
- **Resend**: Email service for verification and magic link emails.

### Payment Processing
- **Stripe**: For payment processing, customer management, and transaction handling.

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: For database operations and migrations.

### Real-time Features
- **WebSocket**: Native WebSocket support for real-time communication.

### UI & Development
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state management and caching.