# BoxStat - Basketball Management Platform

## Overview
BoxStat is a cross-platform Progressive Web App (PWA) designed to manage basketball league operations. It streamlines communication, scheduling, player development, and team activities. The platform aims to provide a superior user experience and operational efficiency, with features like secure authentication and robust data management. Its long-term vision is to become a leading mobile platform for sports management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend uses React 18 with TypeScript and Vite, styled with Radix UI, shadcn/ui, and Tailwind CSS. Wouter handles routing, and TanStack Query manages server state. It features full PWA capabilities and is configured for native iOS deployment via Capacitor, including comprehensive App Store deployment workflows. The design is mobile-first, responsive, and uses a red theme. Key UI elements include player dashboards with skill tracking, coach dashboards with QR scanners for check-ins, and a Player Mode that restricts payment access.

### Backend
The backend is built with Node.js and Express.js (TypeScript, ESM). It includes a custom email/password authentication system with verification and magic links, utilizing a pending registration system. Session management uses persistent Express sessions with PostgreSQL storage. CORS is configured for mobile apps and web browsers. Stripe handles payment processing, and WebSockets provide real-time features. APIs are RESTful.

### Database
PostgreSQL, hosted on Neon serverless, is used with Drizzle ORM for type-safe operations. The schema supports users, teams, events, payments, facilities, and a 5-tier badge/trophy system. It includes structures for various programs, age/level divisions, and comprehensive user data fields. A dual-table structure manages player data, distinguishing between app users and Notion-synced roster data. A `playerId` field in the payments table ensures accurate per-player billing. A `pending_registrations` table prevents partial account creation during the multi-step registration process.

### Key Features & Design Decisions
- **Authentication & Registration**: Features a required email verification, magic link, and a non-blocking registration flow using the pending registration system.
- **User & Player Management**: Supports single parent accounts with linked child profiles, a Dual Mode System (Parent/Player) secured by PIN, and a Parental Device Lock feature. Player profiles require verification and completion to become public, with profile photo uploads.
- **Team & Coach Management**: Coaches can manage multiple teams, view rosters (including Notion-synced players), evaluate players, award badges, and use real-time team chat. Roster management aligns with Notion data.
- **Event & Scheduling**: In-app CRUD for events, color-coded UI, and player RSVP with GPS-based check-in (200m geofencing) using OpenStreetMap and Leaflet. Events support multi-select targeting and display real-time distance indicators for participants. Event filtering is dynamic based on user mode (Parent/Player).
- **Payment & Awards**: Integrates Stripe for secure payments and a robust payment status system that handles various billing models. A comprehensive 100-trophy/badge system supports automatic and manual awards.
- **Admin Panel**: Provides comprehensive CRUD for system entities, detailed user views, and a calendar for event management.
- **Notifications**: A multi-channel notification system (in-app, email, push) with advanced recipient targeting (users, roles, teams, divisions) and multi-type selections. Includes a complete web push notification system with VAPID authentication and iOS PWA support.

## External Dependencies

- **Resend**: Email service for authentication flows.
- **Stripe**: Payment processing, customer management, and transaction handling.
- **Neon Database**: Serverless PostgreSQL hosting.
- **Drizzle ORM**: Database operations and migrations.
- **Multer**: Handling multipart/form-data for file uploads.
- **WebSocket**: Native support for real-time communication.
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **TanStack Query**: Server state management and caching.
- **Leaflet & OpenStreetMap**: Mapping solution with Nominatim geocoding for location services and geo-fencing.