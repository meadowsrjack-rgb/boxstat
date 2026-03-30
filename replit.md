# BoxStat - Basketball Management Platform

## Overview
BoxStat is a cross-platform Progressive Web App (PWA) designed to streamline basketball league operations by managing communication, scheduling, player development, and team activities. It aims to provide a superior user experience and operational efficiency, integrating secure authentication and robust data management. The project's ambition is to become a leading mobile platform for sports management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
The frontend is a React 18 PWA, built with TypeScript and Vite. It utilizes Radix UI, shadcn/ui, and Tailwind CSS for styling, Wouter for routing, and TanStack Query for server state management. It supports full PWA capabilities and native iOS deployment via Capacitor. The design is mobile-first, responsive, and features a red theme with specialized dashboards for players and coaches, including a QR scanner for check-ins, and a Player Mode with restricted payment access.

### Backend
The backend is developed using Node.js and Express.js (TypeScript, ESM). It includes a custom email/password authentication system with verification, magic links, and pending registration. Session management is handled by persistent Express sessions with PostgreSQL storage. CORS is configured for both web and mobile. Stripe is integrated for payments, and WebSockets provide real-time features. APIs are RESTful.

### Database
PostgreSQL, hosted on Neon serverless, is used in conjunction with Drizzle ORM. The schema supports core functionalities, waiver management, product and enrollment systems, and a multi-channel notification system. Key tables include `users` (multi-role), `teams`, `events`, `payments`, `waivers`, `programs`, `product_enrollments`, and `notifications`.

### Key Features & Design Decisions
-   **Authentication & Registration**: Features email verification, magic links, and a non-blocking registration flow, with an iOS app redirect for magic links and source platform tracking. Address collection is a dedicated step during registration.
-   **Hub & Spoke Navigation**: Intelligent routing post-login based on user role via a DashboardDispatcher, including a Profile Gateway for multi-profile accounts.
-   **User & Player Management**: Supports single parent accounts with linked child profiles, a PIN-secured Dual Mode System (Parent/Player), and Parental Device Lock.
-   **Team & Coach Management**: Coaches can manage teams, view rosters, evaluate players, award badges, and use real-time team chat. Coach profiles are viewable by players and parents.
-   **Admin Team Assignment with Auto-Enrollment**: Facilitates player assignment to teams with automatic enrollment into associated programs.
-   **Event & Scheduling**: In-app CRUD for events with color-coded UI, player RSVP, and GPS-based check-in (200m geofencing) using OpenStreetMap. Events support configurable player self-RSVP toggles and handle timezones with DST.
-   **Payment & Awards**: Integrates Stripe for secure payments supporting various billing models, including subscription, prepaid, and one-time purchases, with flexible `billingIntervalDays` and installment plans. A 100-trophy/badge achievement system is also included. **Smart Installment Plans**: Admin UI shows only "Number of Installments" and "Pay-in-Full Discount (%)". Interval auto-calculated via `floor(duration * 0.75 / count)` snapped to nearest standard period (7/14/30/90/180 days). Per-payment price auto-derived. Changing price/duration re-syncs installment values. Parent checkout shows "Pay in Full" (with discount as strikethrough) and "Installment Plan" with human-readable labels (weekly/bi-weekly/monthly/quarterly). Backend applies `payInFullDiscount` to Stripe checkout. Installment checkout uses `cancel_at` with month-aware date math.
-   **Admin Panel**: Provides comprehensive CRUD operations for system entities, detailed user views, and calendar-based event management. Role management is handled via an "Add Role / Remove Role" pattern.
-   **Notifications**: Features a multi-channel (in-app, email, push) notification system with advanced recipient targeting, including automatic scheduled notifications (event reminders, check-in availability), attendance-based notifications (streaks, misses), and abandoned cart reminders.
-   **Legacy Migration System**: Supports migration of subscriptions from a legacy system using CSV imports and displays color-coded enrollment expiration statuses.
-   **PWA Caching Strategy**: Service worker (`sw.js`) uses network-first for navigation/HTML (offline fallback to cache), cache-first for fingerprinted assets (hashed filenames), and network-first for all other assets. `CACHE_VERSION` is a stable string bumped per deploy (currently `'6'`). Server-side: `index.html`, `sw.js`, `manifest.json` served with `no-cache`; hashed assets get `immutable, 1y`; other static files get `1h`. Health endpoint at `GET /api/health` used by client to detect stale caches. On app load, if health check fails, only `boxstat-*` caches are cleared (not third-party).
-   **Native iOS Launch Experience**: Implements a Capacitor Splash Screen with a 3-step "Handoff" strategy for a seamless launch experience, including a red pulsing ring animation and zero white-flash transitions.
-   **Android App**: Capacitor Android platform configured with BoxStat branding, GPS/location permissions, push notification support, and deep links.
-   **iOS Scroll & Keyboard Fixes**: Utilizes a "Fixed Curtain" pattern to prevent visual glitches during iOS keyboard appearance and overscroll.
-   **Marketing Landing Page**: A professional Stripe-like marketing website accessible at `/` for web visitors, featuring hero section, role-based login cards, features showcase, and pricing (Starter $99, Growth $249, Pro $499, Enterprise custom).
-   **Organization Owner Signup**: Coaches/club owners can sign up at `/signup` to create their own organization and become its admin. 4-step flow: org info → personal info → password → billing. Backend creates org + admin user with auto-login. Step 4 shows selected plan summary and redirects to Stripe Checkout for platform subscription. Plan passed via `?plan=` query param from pricing page. Stripe webhook handles `platform_subscription` type to update org `platformPlan`, `platformSubscriptionId`, `platformSubscriptionStatus` columns. Users can skip billing and set it up later from dashboard.
-   **Coupon System**: Admins generate time-limited discount coupons from program detail pages (Product Settings tab → Coupons section). Coupons have a 24-hour expiry, configurable max uses, and support percentage or fixed-amount discounts. Parents apply coupon codes during the checkout/enrollment dialog. Server validates coupon (org-scoped, program-scoped if set, expiry, max uses) and adjusts Stripe line item price. Coupon usage is incremented only on successful payment via webhook (not on checkout creation). Coupons table: `coupons` with code, organizationId, programId, discountType, discountValue, expiresAt, maxUses, currentUses, isActive, createdBy. CRM Quotes tab was removed in favor of this system.

## External Dependencies

-   **Apple Push Notification service (APNs)**: iOS push notifications.
-   **Firebase Cloud Messaging**: Android push notifications.
-   **Web Push (VAPID)**: PWA browser push notifications.
-   **Resend**: Email service.
-   **Stripe / Stripe Connect (Express)**: Payment processing via Destination Charges with a 1% BoxStat platform fee. Each org onboards via Stripe Connect Express to receive payouts. Admin dashboard "Payment Setup" section handles onboarding — no raw API keys needed.
-   **Neon Database**: Serverless PostgreSQL hosting.
-   **Drizzle ORM**: Database operations.
-   **Multer**: File uploads.
-   **WebSocket**: Real-time communication.
-   **Radix UI**: Accessible UI components.
-   **Tailwind CSS**: Utility-first CSS framework.
-   **TanStack Query**: Server state management.
-   **Leaflet & OpenStreetMap**: Mapping, geocoding, and geo-fencing.
-   **Capacitor**: Native iOS deployment and feature access.