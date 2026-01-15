# BoxStat - Basketball Management Platform

## Overview
BoxStat is a cross-platform Progressive Web App (PWA) designed to streamline basketball league operations. It manages communication, scheduling, player development, and team activities, aiming for a superior user experience and operational efficiency. The platform includes secure authentication and robust data management, with the ambition to become a leading mobile platform for sports management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is a React 18 PWA built with TypeScript and Vite. Styling is handled by Radix UI, shadcn/ui, and Tailwind CSS. Wouter is used for routing, and TanStack Query manages server state. It supports full PWA capabilities and native iOS deployment via Capacitor. The design is mobile-first, responsive, and features a red theme, with specific dashboards for players and coaches (including a QR scanner for check-ins), and a Player Mode with restricted payment access.

### Backend
The backend is developed with Node.js and Express.js (TypeScript, ESM). It incorporates a custom email/password authentication system with verification, magic links, and a pending registration system. Session management uses persistent Express sessions with PostgreSQL storage. CORS is configured for web and mobile. Stripe is integrated for payments, and WebSockets provide real-time features. APIs are RESTful.

### Database
PostgreSQL, hosted on Neon serverless, is used with Drizzle ORM. The schema is organized to support core functionalities, waiver management, product and enrollment systems, and a multi-channel notification system. Key tables include `users` (multi-role), `teams`, `events`, `payments`, `waivers`, `programs`, `product_enrollments`, and `notifications`.

### Key Features & Design Decisions
-   **Authentication & Registration**: Features email verification, magic links, and a non-blocking registration flow. Includes session-aware email verification, iOS app redirect for magic links, and source platform tracking.
-   **Hub & Spoke Navigation**: Intelligent routing after login based on user role via a DashboardDispatcher, including a Profile Gateway ("Who's watching?") for multi-profile accounts. Dynamic player status tags are displayed on player cards.
-   **User & Player Management**: Supports single parent accounts with linked child profiles, a PIN-secured Dual Mode System (Parent/Player), and Parental Device Lock.
-   **Team & Coach Management**: Coaches manage teams, view rosters, evaluate players, award badges, and utilize real-time team chat.
-   **Admin Team Assignment with Auto-Enrollment**: Provides methods for assigning players to teams with automatic enrollment into associated programs.
-   **Event & Scheduling**: In-app CRUD for events with color-coded UI, player RSVP, and GPS-based check-in (200m geofencing) using OpenStreetMap.
-   **Payment & Awards**: Stripe integration for secure payments supporting various billing models, and a comprehensive 100-trophy/badge achievement system.
-   **Admin Panel**: Comprehensive CRUD for system entities, detailed user views, and a calendar for event management. Includes dedicated tabs for Overview, Users, Programs, Events, Awards, Store, Waivers, and Notifications. Programs serve as a central management hub.
-   **Notifications**: Multi-channel (in-app, email, push) notification system with advanced recipient targeting and web push support. Features scheduled and recurring messaging with campaign management.
-   **Legacy Migration System**: Supports migration of subscriptions from a legacy system, including auto-detection during registration and assignment to player profiles. Supports two CSV import types: Stripe Subscriptions export (with subscription IDs and period dates) and Stripe Payments export (with amounts, descriptions, dates). Payment imports require dates with explicit years (2020-2030 range) for historical accuracy; rows without valid dates are skipped. Enrollments display color-coded expiration status (Active/Expiring Soon/Expired) with 14-day warning threshold.
-   **Native iOS Launch Experience**: Implements Capacitor Splash Screen with 3-step "Handoff" strategy (Native Splash → HTML Bridge → React App) for seamless Apple-like instant launch feel. Includes red pulsing ring animation, manual hide triggers, and zero white-flash transitions.
-   **iOS Scroll & Keyboard Fixes**: Uses "Fixed Curtain" pattern (detached background layer + transparent content wrapper) across all pages to prevent white gaps during iOS keyboard appearance and overscroll. Applies to all auth pages, dashboards, and profile gateway.

## External Dependencies

-   **Apple Push Notification service (APNs)**: For iOS push notifications.
-   **Firebase Cloud Messaging**: For Android push notifications.
-   **Web Push (VAPID)**: For PWA browser push notifications.
-   **Resend**: Email service.
-   **Stripe**: Payment processing.
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Drizzle ORM**: Database operations.
-   **Multer**: File uploads.
-   **WebSocket**: Real-time communication.
-   **Radix UI**: Accessible UI components.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **TanStack Query**: Server state management.
-   **Leaflet & OpenStreetMap**: Mapping, geocoding, and geo-fencing.
-   **Capacitor**: Native iOS deployment and feature access.