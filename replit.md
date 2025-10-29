# UYP Basketball League Mobile App

## Overview
The UYP Basketball League Mobile App is a cross-platform solution for parents and players to streamline league operations, enhance communication, and manage schedules, player development, and team activities. It aims to provide a comprehensive platform for youth leagues, improving user experience through PWA features, secure authentication, and robust data management. The long-term vision is to establish a leading mobile platform for youth sports leagues, offering unparalleled user experience and operational efficiency, with potential for broader market reach.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### Google Maps Location Autocomplete & Geo-fencing (Oct 29, 2025)
- **Google Maps Places Autocomplete Integration**: Event creation now uses Google Maps for location search
  - **Component**: Created `GooglePlacesAutocomplete.tsx` using new PlaceAutocompleteElement API (post-March 2025)
  - **Features**: 
    - Real-time location search with autocomplete suggestions
    - Automatic coordinate capture (latitude/longitude) when place is selected
    - Country restrictions (US, CA) for relevant results
    - Fallback to manual input if API unavailable
    - Script loaded once and reused across app
  - **Integration**: Replaced manual location input in admin event creation form
  - **Schema Updates**: Event creation now captures and stores latitude/longitude coordinates
  - **User Experience**: "Search for a location..." prompt with helpful description about geo-fencing
- **Check-in Radius**: Set to 200 meters
  - Default radius in CheckInButton component: 200 meters
  - Proximity validation for on-site check-ins within 200m of event location
- **Bug Fix**: Resolved React "setState during render" warning in CheckInButton
  - Moved distance calculation from useMemo to useEffect
  - Cleaner state management without render-time side effects
- **API Key**: Uses `VITE_GOOGLE_MAPS_API_KEY` environment variable
- **Geo-fencing Flow**: Location search → coordinates saved → check-in validation within 200m radius

### Admin Panel - Active Toggle Fix (Oct 28, 2025)
- **Critical Database Schema Fix**: Added missing `isActive` column to users table
  - Column was defined in TypeScript interface but missing from Drizzle schema
  - Added as `boolean("is_active").default(true).notNull()` to ensure all users default to active
  - Pushed schema change to database successfully
- **Fixed Toggle Mutation Logic**: Removed optimistic updates that were causing React component confusion
  - Removed optimistic cache updates that were triggering premature list re-sorting
  - Added disabled state to Switch during mutation to prevent race conditions
  - Toggle now updates backend first, then refreshes UI with correct state
- **Verified Functionality**: End-to-end testing confirmed all toggle features work correctly
  - Each toggle operates independently without affecting others
  - Visual feedback: red when active, gray when inactive
  - Backend persistence: isActive values correctly stored and retrieved
  - Users maintain their position in the list when toggled (no automatic re-sorting)
  - No race conditions or flickering during updates
- Architect verified: PASS - production-ready implementation

### Admin Panel - Calendar View for Event Management (Oct 28, 2025)
- **Full Calendar View Implementation**: Built comprehensive calendar view for Events tab
  - **Monthly Calendar Grid**: Displays all days of the month with proper alignment and empty cells for days before month starts
  - **Event Display**: Events shown on their respective dates with up to 3 events visible per day, "+X more" indicator for overflow
  - **Color-Coded Event Types**: 
    - Practice: Blue
    - Game: Red
    - Tournament: Purple
    - Meeting: Green
  - **Interactive Features**: Events are clickable to open edit dialog, today's date highlighted with red background
  - **Navigation Controls**: Previous/Next month buttons, "Today" button to jump to current month
  - **UI Enhancements**: Color legend, hover effects, responsive design, proper borders and spacing
  - **Performance**: Efficient event filtering by date, no performance issues
  - Architect verified: PASS - production-ready implementation

### Admin Panel - Functional Edit Dialogs & Users Table Restructure (Oct 28, 2025)
- **Users Table Restructure**: Updated from 19 to 15 columns matching exact specification
  - **Columns**: First Name, Last Name, Email, Phone, Role, Club, Program, Team, Division, DOB, Packages, Skill Level, Awards, Active, Actions
  - **Removed**: Stripe ID, Last Payment, Next Payment, Registered, Created
  - Split Name into separate First Name and Last Name columns
  - Added responsive horizontal scrolling for smaller screens

- **Users Edit Dialog - Production-Ready Cascading Dropdowns**:
  - Full edit capability with updateUser mutation (PATCH /api/users/${id})
  - All user fields pre-populated in edit form
  - **Cascading Dropdown Logic**:
    - Program dropdown → filters Team and Division dropdowns
    - When program changes → clears team, teamId, division, divisionId (prevents inconsistent relationships)
    - Division dropdown filters by program IDs (programIds array)
    - Team dropdown filters by selected program
  - Club field auto-filled from organization.name (disabled)
  - Active status toggle using Switch component
  - Architect verified: PASS - production-ready implementation

- **Edit Dialogs Implemented for All Tabs**:
  - **Teams**: Edit name, division, ageGroup, coachId, description
  - **Events**: Edit title, description, startTime, endTime, location, type, targetType, targetId
  - **Awards**: Edit name, description, criteria, iconUrl
  - **Programs**: Edit name, description, startDate, endDate, capacity, fee (with ongoing checkbox)
  - **Divisions, Skills, Notifications**: Already had working edit dialogs (verified)

- **Technical Details**:
  - All edit dialogs use controlled Dialog pattern with proper state management
  - Forms pre-populate with current data using defaultValue
  - All mutations use HTTP PATCH method with cache invalidation
  - Consistent data-testid attributes for testing
  - Zero LSP errors, application running successfully

- **Bug Fixes During Implementation**:
  - Fixed cascading dropdown to use program IDs instead of names
  - Fixed PATCH payload to include programId and divisionId
  - Fixed team consistency by clearing teamId when program changes
  - Verified edit button functionality (Dialog opens correctly when editingUser is set)
  - Added Active column toggle switch for quick status updates without opening edit dialog
  - Fixed storage layer to update timestamps: updatedAt is now set on every user modification in both MemStorage and DatabaseStorage
  - Set new users to active (isActive: true) by default

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
- **Schema**: Supports users, teams, events, payments, a 5-tier badge/trophy system (Prospect, Starter, All-Star, Superstar, Hall of Fame), UYP Legacy, and Team Trophies. New tables for Divisions, Skills, and Notifications.
- **Player Data Model**: Dual-table structure (Profiles for app users, Players for Notion-synced roster data).
- **Programs**: Supports 10 programs, including Skills Academy (SA-Special-Needs, SA-Rookies, SA-Beginner, SA-Intermediate, SA-Advanced, SA-Elite), FNHTL, Youth-Club, and High-School, with support for ongoing/infinite programs.

### Key Features & Design Decisions
- **Authentication Flow**: Email/password with required verification, magic link option, non-blocking registration allowing Stripe data auto-prefill, and automatic coach detection. Users are directed to appropriate dashboards (coach, parent, player).
- **User Management**: Single Parent account with linked child profiles; Dual Mode System (Parent/Player) secured by PIN. Profile deletion option available.
- **Player Profile Management**: Profiles require verification and completion of all required fields (name, DOB, jersey number, team, height, city, position) to become public/searchable. Profile photo upload system implemented for all account types.
- **Team Management**: Teams organized into four programs (Skills Academy, FNHTL, Youth Club, High School) with Notion-synced rosters. Coaches can join existing teams and manage players. App team assignments override Notion data.
- **Roster Management**: Coach dashboards display Notion players for their teams; actions for players without app accounts are disabled.
- **Notion Sync**: Player data syncs from Notion databases on startup and daily.
- **Event & Scheduling**: In-app event management for admins/coaches with CRUD operations, color-coded UI, and sliding drawer for details. Players can RSVP and check-in via GPS.
- **Payment Integration**: Stripe for secure payment processing (fees, uniforms, tournaments) with transaction and subscription tracking.
- **UI/UX**: Mobile-first responsive design, UYP Basketball red theme, PWA capabilities. Player dashboard includes skills progress and achievement counters. Coach dashboard features QR scanner for check-ins. Player Mode restricts payment access.
- **Lead Evaluation**: Coaches can create detailed player evaluations with skill ratings (1-5) and export/share them.
- **Coach Settings**: Customizable coach profiles with experience, bio, previous teams, playing experience, and philosophy.
- **Admin Panel**: Comprehensive CRUD operations for users, teams, events, awards, packages, divisions, skills, and notifications, with robust table views and search functionality.

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