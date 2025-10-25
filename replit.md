# UYP Basketball League Mobile App

## Overview
This cross-platform mobile application for the UYP Basketball youth league provides tailored interfaces for Parents and Players. It aims to streamline league operations, enhance communication, and offer a comprehensive platform for managing schedules, player development, and team activities. Built with a modern full-stack architecture, it uses React/TypeScript for the frontend, Express.js for the backend, and PostgreSQL for the database. The application focuses on improving user experience through PWA features, secure authentication, and robust data management, while also providing tools for coaches and administrators to manage teams and player development effectively.

## Recent Changes (October 2025)
- **Authentication System Overhaul**: Implemented complete email verification and magic link system using Resend.
  - Email verification required before login (24-hour token expiry)
  - Magic link passwordless login (15-minute token expiry)
  - Removed Replit Auth integration - BoxStat now manages its own authentication
  - Users verified through boxstat.app domain
  - Database schema updated with verification fields (verified, verificationToken, verificationExpiry, magicLinkToken, magicLinkExpiry)
  - Backend endpoints: GET /api/auth/verify-email, POST /api/auth/request-magic-link, GET /api/auth/magic-link-login
  - **Email Deliverability Improvements** (Oct 24, 2025):
    - Professional email templates with plain text versions to avoid spam filters
    - Removed emojis and excessive styling from emails
    - Table-based HTML layout for better compatibility
    - Subject lines: "Verify Your Email Address - BoxStat" and "Your Secure Login Link - BoxStat"
    - **Email Template Updates** (Oct 24, 2025):
      - Replaced red banner with BoxStat logo for better branding
      - Logo served from `/assets/logo` endpoint (120px height, auto width)
      - Centered headings for improved visual hierarchy
      - Clean, professional design to reduce spam filtering
      - Verification and magic link buttons tested and working correctly
  - **Registration Flow Enhancement** (Oct 24, 2025):
    - Users can now continue registration BEFORE email verification (non-blocking flow)
    - Verification reminder banner displayed on registration steps 2+
    - After email verification, backend checks Stripe for existing customer data
    - If Stripe customer found, automatically prefills user name and phone number
    - Success message indicates when Stripe data was found and used
  - **Security Fix** (Oct 24, 2025):
    - Tokens now properly cleared using `null` instead of `undefined` after verification/login
    - Prevents potential token reuse issues
  - **Session Cookie Fix** (Oct 24, 2025):
    - Added `trust proxy` setting to support secure cookies behind Replit's HTTPS proxy
    - Changed `sameSite` cookie attribute to 'lax' for proper session persistence in production
    - Fixed 401 errors after login in published/production environment
    - Sessions now work correctly across both development and production deployments
  - **Add Player Functionality Fix** (Oct 24, 2025):
    - Added missing database columns: accountHolderId, registrationType, packageSelected, teamAssignmentStatus, hasRegistered
    - Created POST /api/account/players endpoint for parents to add child players from account page
    - Child players now properly link to parent accounts via accountHolderId
    - Account page displays all linked child players correctly
    - Payment tracking and active player count updates work properly
  - **Self-Registering Player Fix** (Oct 24, 2025):
    - Fixed bug where self-registering players were saved with role='parent' instead of role='player'
    - Self-registered players now correctly appear in their account page with registration details
    - Added registrationType field to track 'myself' vs 'my_child' registration flows
    - Admin accounts can now add players (previously only parents could add players)
  - **Add Player Payment Flow Implementation** (Oct 25, 2025):
    - Restored 5-step add-player flow with Stripe payment integration (Name → DOB → Gender → Package Selection → Payment Summary)
    - Each child player registration requires payment for selected program/package
    - Database schema: Added paymentStatus ("pending"/"paid") and stripeCheckoutSessionId fields to users table
    - POST /api/account/players creates pending player and returns Stripe Checkout session URL
    - After package selection, redirects to Stripe for secure payment processing
    - Stripe webhook (checkout.session.completed) marks player as paid and finalizes registration
    - Success flow: Payment → redirect to /unified-account?payment=success → player appears in account
    - Fixed DbStorage.getProgram() method (was returning undefined, now properly returns programs from hardcoded list)
    - Fixed GET /api/account/players to properly handle admin accounts (was returning empty array)
    - End-to-end tested with Stripe test mode - complete flow verified
  - **Player Profile Field Display Fix** (Oct 25, 2025):
    - Removed all hardcoded placeholder values from player dashboard profile display
    - Players now added to database with NULL values for optional fields (position, height, city, team)
    - Profile fields display "Not set" (gray text) when NULL instead of defaults like "Guard", "5'9"", "Irvine"
    - Age now calculated in real-time from dateOfBirth using calculateAge() helper function
    - Team badge only displays when teamName exists (no default "High School Elite")
    - Fields remain blank until user manually sets them in Settings > Profile Information
  - TODO: Add Google OAuth and Apple Sign-In (passport-google-oauth20 and passport-apple already installed)
- **Google Calendar Integration Removed**: Removed all Google Calendar sync functionality. Events are now created and managed directly by admins and coaches within the app via the admin dashboard. Admins can create events individually or bulk upload via CSV. Backend endpoints support full CRUD operations (POST/PATCH/DELETE /api/events).
- **Stripe Payment Integration**: Replaced LeadConnector forms with Stripe Checkout flow. Added GET /api/payments/checkout-session endpoint, webhook handler, and updated family-onboarding.tsx and payments.tsx to redirect to Stripe for payment processing.
- **Child Profile Display Fix**: Added GET /api/profile/:id endpoint to fetch child profiles. Player dashboard now correctly displays child's name ("Hey, [ChildName]") instead of parent's name after registration. Uses activeProfileId to determine which profile to show.
- **Package Selection Flow**: After family registration, package selections are saved and users redirect to /payments for Stripe Checkout. Webhook marks packages as paid on completion.

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
- **Authentication**: Custom email/password with email verification and magic link login (Resend)
- **Session Management**: Express sessions with PostgreSQL storage
- **Payment Processing**: Stripe for payment intents, subscriptions, and customer management
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
- **Authentication Flow**: 
  - Email/password authentication with required email verification before login
  - Magic link passwordless login option (15-minute expiry)
  - Non-blocking registration flow - users can fill out registration form while awaiting email verification
  - Stripe customer data lookup and auto-prefill after email verification
  - Post-login account linking system with automatic coach detection via email domain
  - Users directed to appropriate dashboards (coach, parent, or player) based on profile type
- **User Management**: Single Parent account with linked child profiles. Implements a Dual Mode System (Parent/Player) secured by a 4-digit PIN. Users can delete their profiles (parent, player, or coach) from settings.
- **Player Profile Management**: Profiles require verification to become public/searchable, linking with the Notion database via email matching. Profiles start as unverified and are filtered from public search results until verified. All required fields must be completed (name, date of birth, jersey number, team, height, city, position).
- **Team Management**: Teams are organized into four programs with rosters synced from Notion databases. Players can directly select and be assigned to teams without approval. Coaches join existing teams from a comprehensive list and can manually add/remove players.
  - **Skills Academy** (5 teams): Rookies, Intermediate, Advanced, Elite, Special Needs
  - **FNHTL** (13 teams): Dragons, Eagles, Trojans, Titans, Bruins, Silverswords, Vikings, Storm, Dolphins, Anteaters, Wildcats, Wolverines, Wizards
  - **Youth Club** (11 teams): 10u Black, 12u Black, 12u Red, Youth Girls Black, Youth Girls Red, 13u White, 13u Black, 14u Black, 14u Gray, 14u Red, Black Elite
  - **High School** (4 teams): High-School-Elite, High-School-Red, High-School-Black, High-School-White
- **Roster Management**: Coach dashboards display all Notion players for their teams, indicating players without app accounts and disabling actions for them. **App team assignments always take precedence over Notion data** - if a player changes their team in the app, the app assignment overrides what Notion says.
- **Notion Sync**: Syncs player data from Notion database on startup and automatically every 24 hours at 2 AM Pacific Time. Pulls from 4 team columns: Youth Club Team, High School Team, FNHTL Team, and Skills Academy Session. Players read from Current Program, Grade, Status, and Session fields.
- **Event & Scheduling**: Handles various event types managed by admins and coaches within the app. Features an enhanced calendar UI with color-coded events and a sliding drawer for details. Players can RSVP to events within a specific window and check-in using device GPS location (within 200m of event). Events can be created individually via the admin dashboard or bulk uploaded via CSV.
- **Payment Integration**: Uses Stripe for secure payment processing (league fees, uniforms, tournaments) with transaction tracking, subscription management, and customer data integration.
- **UI/UX**: Mobile-first responsive design, UYP Basketball branding with a red theme, and PWA capabilities. Player dashboard includes skills progress and interactive trophy/badge counters. Coach dashboard features a QR code scanner for player check-ins and team management. Player Mode restricts access to pricing/payment options.
- **Lead Evaluation**: Coaches can create detailed player evaluations with skill ratings (1-5 scale) for various aspects, exportable as PDF or shareable via Web Share API.
- **Coach Settings**: Coaching experience includes years of experience, bio, previous teams coached, playing experience, and coaching philosophy. Team management functionality is centralized in the Coach Dashboard's Team tab.

## External Dependencies

### Authentication & Security
- **Custom Authentication**: Email/password with email verification via Resend
- **Magic Links**: Passwordless login via email (15-minute expiry)
- **Resend**: Email service for verification and magic link emails
- **Future**: Google OAuth and Apple Sign-In (packages installed, not yet configured)

### Payment Processing
- **SportsEngine**: For payment processing, customer management, and transaction handling.

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: For database operations and migrations.

### Real-time Features
- **WebSocket**: Native WebSocket support for real-time communication.

### UI & Development
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state management and caching.