# UYP Basketball League Mobile App

## Overview

This is a comprehensive cross-platform mobile application for the UYP Basketball youth league based in Costa Mesa, CA. The app serves two distinct user groups - Parents and Players - with specialized interfaces and features tailored to each user type. The application is built using a modern full-stack architecture with React/TypeScript frontend, Express.js backend, and PostgreSQL database with Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

- **August 11, 2025**: Integrated beautiful calendar design into player dashboard first tab, replacing Today and Upcoming sections with comprehensive calendar component featuring UYP red branding and Google Calendar event integration
- **August 11, 2025**: Fixed React duplicate key warnings by removing duplicate award entries from awards registry and cleaned up trophy/badge pages by removing redundant fixed and working versions, leaving only the main comprehensive trophies-badges page
- **August 10, 2025**: Cleaned up trophy/badge page structure by removing redundant simple-trophies test page, leaving only the main comprehensive trophies-badges page and dashboard section
- **August 9, 2025**: Implemented comprehensive schedule page enhancements with advanced filtering and event parsing system
- **August 9, 2025**: Added FiltersBar component with interactive dropdowns for event types, age groups, teams, and coaches with localStorage persistence
- **August 9, 2025**: Created DayDrawer component with sliding sheet interface for detailed event viewing with independent scrolling
- **August 9, 2025**: Built parseEventMeta system to intelligently extract metadata from Google Calendar event titles (age groups, team names, coaches)
- **August 9, 2025**: Enhanced calendar with color-coded dots for different event types and real-time filtering capabilities
- **August 8, 2025**: Prepared comprehensive GitHub publication package with README, deployment guides, and security configurations
- **August 8, 2025**: Finalized Google Calendar API integration with 100+ real events displaying in schedule page
- **August 8, 2025**: Resolved API routing issues - `/api/events` now returns authentic Google Calendar data
- **August 7, 2025**: Implemented comprehensive Google Calendar API integration to sync UYP's calendar (upyourperformance@gmail.com) with the app
- **August 7, 2025**: Added Coach account type as third registration option with green theme and graduation cap icon
- **August 7, 2025**: Enhanced testing infrastructure with "Test New Account Signup" button that bypasses authentication
- **August 7, 2025**: Created automatic calendar sync scheduler that runs every hour using node-cron
- **August 7, 2025**: Added calendar sync management page with manual sync capability and event display
- **August 7, 2025**: Updated database schema to include Google Calendar integration fields (googleEventId, lastSyncedAt, isActive)
- **August 7, 2025**: Enhanced events table to support Google Calendar sync with proper event type detection and team assignment
- **August 6, 2025**: Created demo unified account system with profile selection functionality showing parent account with two children on different teams
- **August 6, 2025**: Successfully implemented comprehensive trophies and badges system with navigation functionality
- **August 6, 2025**: Fixed client-side routing issues with wouter setLocation for proper SPA navigation
- **August 6, 2025**: Added comprehensive trophies and badges system with tiered achievement structure
- **August 6, 2025**: Created dedicated trophies and badges page with filtering by tier and type
- **August 6, 2025**: Integrated trophies and badges section into player dashboard below skill ratings
- **August 6, 2025**: Updated database schema with trophies and userTrophies tables, enhanced badges table with tier/type system
- **July 31, 2025**: Enhanced PWA setup for iOS installation with proper manifest, service worker, and Apple touch icons
- **July 31, 2025**: Updated app icons with UYP Basketball branding using red theme (#d82428)
- **July 31, 2025**: Added comprehensive iOS PWA meta tags for standalone app experience
- **July 31, 2025**: Fixed player dashboard tab navigation spacing and enlarged top navigation icons
- **July 31, 2025**: Added schedule section to player dashboard with clickable navigation
- **July 28, 2025**: Created dynamic landing page with video background and interactive carousel
- **July 28, 2025**: Added swipeable feature carousel with 3 slides: Stay informed, Unlock potential, Train smarter
- **July 28, 2025**: Implemented working carousel indicators and auto-advancing slides every 4 seconds
- **July 28, 2025**: Redesigned Parent Dashboard with main tiles: Calendar, Payments, Children, Online Programs
- **July 28, 2025**: Added Account Status, Upcoming Events, and Announcements sections to Parent Dashboard
- **July 28, 2025**: Enhanced coach dashboard with Coach Resources section for curriculum and SOPs
- **July 28, 2025**: Removed Team Members tile and enhanced Team Roster as dedicated section
- **July 23, 2025**: Completely redesigned admin/coach dashboard to be coach-focused with mobile-first design
- **July 23, 2025**: Added QR code scanner functionality for player check-ins with camera integration
- **July 23, 2025**: Implemented team-centered coach dashboard with schedule, team members, and announcements
- **July 23, 2025**: Removed payment/billing features from coach dashboard - handled through SportsEngine
- **July 23, 2025**: Added team management features: homework assignment, team chat access, and schedule viewing
- **July 23, 2025**: Fixed missing storage functions for announcements and implemented proper coach team queries
- **July 17, 2025**: Updated training pages to hide pricing information in Player Mode - players only see purchased content
- **July 17, 2025**: Added payment restrictions for Player Mode - only parents can access payment pages
- **July 17, 2025**: Modified training program text to be child-appropriate in Player Mode
- **July 17, 2025**: Added training programs to both Parent and Player dashboards with dedicated sections and navigation
- **July 17, 2025**: Received single parent account system specifications with Parent Mode/Player Mode functionality requirements

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with custom design tokens
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management
- **PWA Features**: Full Progressive Web App with service worker, manifest, and iOS support
- **Mobile App**: Installable on iOS devices as standalone app with native-like experience

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **Real-time Communication**: WebSocket support for team chat
- **API Design**: RESTful endpoints with proper error handling

### Database Architecture
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema**: Comprehensive schema supporting users, teams, events, payments, and more
- **Migrations**: Drizzle Kit for schema migrations

## Key Components

### User Management System
- **Single Parent Account**: One primary user type (Parent) with email/password authentication
- **Linked Child Profiles**: Parents can create multiple child profiles as data objects (not independent users)
- **Dual Mode System**: Parent Mode (full access) and Player Mode (restricted child access)
- **PIN-Based Security**: 4-digit PIN system for securing Player Mode on devices
- **Device-Specific Locking**: Local storage-based device configuration for Player Mode

### QR Code Check-in System
- **Purpose**: Secure gym entry and attendance tracking at Momentous Sports Center
- **Implementation**: Static QR codes per player with large, accessible display
- **Backend Logging**: Tracks player name, team, date, and time of check-ins

### Team Management
- **Team Structure**: Age-grouped teams with coaches and player rosters
- **Team Communication**: Real-time chat system for team coordination
- **Player Stats**: Individual player performance tracking

### Event & Scheduling System
- **Event Types**: Practices, games, tournaments, camps, and skills sessions
- **Google Calendar Integration**: Automatic sync with UYP's public calendar (upyourperformance@gmail.com)
- **Calendar Sync**: Hourly automated sync with manual trigger capability
- **Event Management**: Automatic team assignment based on event titles and descriptions
- **Advanced Event Parsing**: Smart extraction of age groups, team names, and coaches from calendar event titles
- **Interactive Filtering**: Real-time filtering by event type, age groups, teams, and coaches with persistent preferences
- **Enhanced Calendar UI**: Color-coded dots for different event types with visual indicators on calendar dates
- **Modern Event Details**: Sliding drawer interface (DayDrawer) for comprehensive event information display
- **Calendar Integration**: Color-coded events with team-specific views and filterable display
- **Attendance Tracking**: QR code-based check-in system

### Payment Integration
- **SportsEngine Integration**: Secure payment processing for league fees, uniforms, and tournaments
- **Payment Types**: Registration, uniform purchases, tournament entries, and other fees
- **Payment History**: Complete transaction records with SportsEngine tracking
- **Quick Pay Options**: Direct payment buttons for common payment types

## Data Flow

1. **Authentication Flow**: Users authenticate via Replit Auth, creating sessions stored in PostgreSQL
2. **User Registration**: Parents register first, then create linked child accounts
3. **Team Assignment**: Users are assigned to teams based on age groups
4. **Event Management**: Coaches/admins create events, players check in via QR codes
5. **Communication**: Real-time messaging through WebSocket connections
6. **Payment Processing**: SportsEngine handles payment processing with local tracking

## External Dependencies

### Authentication & Security
- **Replit Auth**: OpenID Connect-based authentication system
- **Session Storage**: PostgreSQL-based session management

### Payment Processing
- **SportsEngine**: Payment processing, customer management, and transaction handling
- **Payment Integration**: Custom payment flow with SportsEngine API endpoints
- **Payment Dashboard**: Real-time payment status and history tracking

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting
- **Drizzle ORM**: Type-safe database operations and migrations

### Real-time Features
- **WebSocket**: Native WebSocket support for team chat
- **QR Code Generation**: Client-side QR code generation for check-ins
- **Calendar Sync**: Scheduled hourly sync with Google Calendar API

### UI & Development
- **Radix UI**: Accessible component primitives
- **Tailwind CSS**: Utility-first CSS framework
- **TanStack Query**: Server state management and caching

## Deployment Strategy

### Development Environment
- **Replit Integration**: Optimized for Replit development environment
- **Hot Reload**: Vite HMR for fast development cycles
- **Development Tools**: TypeScript checking, ESLint, and development banners

### Production Build
- **Frontend**: Vite builds optimized static assets
- **Backend**: esbuild compiles TypeScript to ESM for Node.js
- **Database**: Drizzle migrations handle schema updates
- **PWA**: Service worker caching for offline functionality

### Environment Configuration
- **Database**: PostgreSQL connection via DATABASE_URL
- **Authentication**: Replit Auth configuration
- **Google Calendar**: GOOGLE_CALENDAR_API_KEY and GOOGLE_CALENDAR_ID for calendar sync
- **Payments**: SportsEngine API integration and payment processing
- **Sessions**: Secure session secrets for production

The application follows a mobile-first responsive design with PWA capabilities, ensuring users can access the app seamlessly across devices with offline functionality where appropriate.