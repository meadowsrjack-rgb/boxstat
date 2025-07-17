# UYP Basketball League Mobile App

## Overview

This is a comprehensive cross-platform mobile application for the UYP Basketball youth league based in Costa Mesa, CA. The app serves two distinct user groups - Parents and Players - with specialized interfaces and features tailored to each user type. The application is built using a modern full-stack architecture with React/TypeScript frontend, Express.js backend, and PostgreSQL database with Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

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
- **PWA Features**: Service worker for offline functionality and app-like experience

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
- **Event Types**: Practices, games, and tournaments
- **Calendar Integration**: Color-coded events with team-specific views
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
- **Payments**: SportsEngine API integration and payment processing
- **Sessions**: Secure session secrets for production

The application follows a mobile-first responsive design with PWA capabilities, ensuring users can access the app seamlessly across devices with offline functionality where appropriate.