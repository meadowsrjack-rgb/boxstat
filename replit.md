# UYP Basketball League Mobile App

## Overview
This is a cross-platform mobile application for the UYP Basketball youth league, serving Parents and Players with tailored interfaces and features. The application aims to streamline league operations, enhance communication, and provide a comprehensive platform for managing schedules, player development, and team activities. It is built with a modern full-stack architecture using React/TypeScript frontend, Express.js backend, and a PostgreSQL database.

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
- **User Management**: Single Parent account with linked child profiles (data objects, not independent users). Implements a Dual Mode System (Parent Mode with full access, Player Mode with restricted child access) secured by a 4-digit PIN.
- **QR Code Check-in**: Secure gym entry and attendance tracking at Momentous Sports Center using static QR codes per player.
- **Team Management**: Age-grouped teams with coaches and player rosters, supporting real-time chat and player performance tracking.
- **Event & Scheduling**: Handles various event types, integrated with Google Calendar for automatic hourly sync (upyourperformance@gmail.com). Features advanced event parsing, interactive filtering, and an enhanced calendar UI with color-coded events and a modern sliding drawer for details.
- **Payment Integration**: Uses SportsEngine for secure payment processing (league fees, uniforms, tournaments) with transaction tracking and quick pay options.
- **UI/UX**: Mobile-first responsive design, UYP Basketball branding with a red theme, and PWA capabilities for offline functionality. Player dashboard includes skills progress, interactive trophy/badge counters, and profile photo upload. Coach dashboard is coach-focused with QR code scanner for player check-ins and team management features. Player Mode hides pricing and payment options, showing only purchased content.

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