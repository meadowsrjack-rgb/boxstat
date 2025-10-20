# UYP Basketball League Mobile App

## Overview
This cross-platform mobile application for the UYP Basketball youth league provides tailored interfaces for Parents and Players. It aims to streamline league operations, enhance communication, and offer a comprehensive platform for managing schedules, player development, and team activities. Built with a modern full-stack architecture, it uses React/TypeScript for the frontend, Express.js for the backend, and PostgreSQL for the database. The application focuses on improving user experience through PWA features, secure authentication, and robust data management, while also providing tools for coaches and administrators to manage teams and player development effectively.

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
- **Schema**: Comprehensive schema supporting users, teams, events, payments, badge/trophy system.
- **Player Data Model**: Dual-table structure:
  - **Profiles Table**: App user profiles with program, registration status, skill ratings (with year/quarter tracking)
  - **Players Table**: Notion-synced roster data with app profile status indicator (yes/no)
- **Programs**: 10 total programs including Skills Academy sub-programs (SA-Special-Needs, SA-Rookies, SA-Beginner, SA-Intermediate, SA-Advanced, SA-Elite), plus FNHTL, Youth-Club, and High-School
- **Badge & Trophy System**: 5-tier achievement system
  - **Prospect (Grey)**: First steps and introductory achievements
  - **Starter (Green)**: Habit builders, early consistency
  - **All-Star (Blue)**: Recognition and milestones
  - **Superstar (Purple)**: Elite consistency, long-term dedication
  - **Hall of Fame (Gold)**: Ultra-rare, lifetime-defining achievements
  - **Trophies**: UYP Legacy (yearly org-wide) and Team (seasonal coach-awarded)

### Key Features & Design Decisions
- **Authentication Flow**: Post-login account linking system with automatic coach detection via email domain. Users are directed to appropriate dashboards (coach, parent, or player) based on profile type.
- **User Management**: Single Parent account with linked child profiles. Implements a Dual Mode System (Parent/Player) secured by a 4-digit PIN. Users can delete their profiles (parent, player, or coach) from settings.
- **Player Profile Management**: Profiles require verification to become public/searchable, linking with the Notion database via email matching. Profiles start as unverified and are filtered from public search results until verified. All required fields must be completed (name, date of birth, jersey number, team, height, city, position).
- **Team Management**: Teams are organized into four programs with rosters synced from Notion databases. Players can directly select and be assigned to teams without approval. Coaches join existing teams from a comprehensive list and can manually add/remove players.
  - **Skills Academy** (5 teams): Rookies, Intermediate, Advanced, Elite, Special Needs
  - **FNHTL** (13 teams): Dragons, Eagles, Trojans, Titans, Bruins, Silverswords, Vikings, Storm, Dolphins, Anteaters, Wildcats, Wolverines, Wizards
  - **Youth Club** (11 teams): 10u Black, 12u Black, 12u Red, Youth Girls Black, Youth Girls Red, 13u White, 13u Black, 14u Black, 14u Gray, 14u Red, Black Elite
  - **High School** (4 teams): High-School-Elite, High-School-Red, High-School-Black, High-School-White
- **Roster Management**: Coach dashboards display all Notion players for their teams, indicating players without app accounts and disabling actions for them. **App team assignments always take precedence over Notion data** - if a player changes their team in the app, the app assignment overrides what Notion says.
- **Notion Sync**: Syncs player data from Notion database on startup and automatically every 24 hours at 2 AM Pacific Time. Pulls from 4 team columns: Youth Club Team, High School Team, FNHTL Team, and Skills Academy Session. Players read from Current Program, Grade, Status, and Session fields.
- **Event & Scheduling**: Handles various event types, integrated with Google Calendar for hourly sync. Features an enhanced calendar UI with color-coded events and a sliding drawer for details. Players can RSVP to events within a specific window and check-in using device GPS location (within 200m of event).
  - **Tag-Based Event Filtering**: Events can be tagged for targeted visibility. Tags are parsed from Google Calendar event descriptions and stored in the database. Three tag levels:
    - **Org-Level**: UYP (all), Leadership (coaches), Coaches (coaches), Parents (parents), Players (players)
    - **Program-Level**: Skills-Academy, FNHTL, Youth-Club, High-School (shows to profiles in that program)
    - **Team-Level**: Specific team names like Youth-Girls-Black, 10u-Black (shows to players on team, parents with children on team, coaches assigned to team)
  - Events without tags show to everyone (legacy behavior). Team name matching is normalized to handle spaces vs hyphens.
- **Payment Integration**: Uses SportsEngine for secure payment processing (league fees, uniforms, tournaments) with transaction tracking and quick pay options.
- **UI/UX**: Mobile-first responsive design, UYP Basketball branding with a red theme, and PWA capabilities. Player dashboard includes skills progress and interactive trophy/badge counters. Coach dashboard features a QR code scanner for player check-ins and team management. Player Mode restricts access to pricing/payment options.
- **Lead Evaluation**: Coaches can create detailed player evaluations with skill ratings (1-5 scale) for various aspects, exportable as PDF or shareable via Web Share API.
- **Coach Settings**: Coaching experience includes years of experience, bio, previous teams coached, playing experience, and coaching philosophy. Team management functionality is centralized in the Coach Dashboard's Team tab.

## External Dependencies

### Authentication & Security
- **Replit Auth**: OpenID Connect-based authentication.

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