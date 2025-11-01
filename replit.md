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

### Key Features & Design Decisions
- **Authentication Flow**: Email/password with required verification, magic link, non-blocking registration, and automatic coach detection. Users are directed to appropriate dashboards.
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
- **Admin Panel**: Comprehensive CRUD operations for users, teams, events, awards, packages, divisions, skills, and notifications, with robust table views, search functionality, and a calendar view for event management. Users table includes `isActive` toggle. Functional cascading dropdowns for user editing (Program filters Team and Division).

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