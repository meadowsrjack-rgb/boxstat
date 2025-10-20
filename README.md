# Sports Management Platform

A comprehensive Progressive Web App (PWA) for youth sports organizations. This white-label platform provides a complete digital solution for team management, event scheduling, player development tracking, and family communication.

## ✨ Features

### Core Functionality
- **White-Label Branding** - Customize with your organization's logo, colors, and terminology
- **Multi-Organization Support** - Each organization gets their own branded instance
- **Admin Management** - Comprehensive admin tools for managing all aspects of your organization
- **Progressive Web App (PWA)** - Installable on mobile devices with native app experience
- **Multi-Role System** - Supports Admin, Coach, Player, and Parent profiles
- **Real-time Team Chat** - Instant communication for teams and families
- **Event Management** - Schedule practices, games, and tournaments
- **Attendance Tracking** - QR code check-ins and event attendance

### User Types & Features
- **Admins**: Full control over organization settings, branding, users, teams, events, payments, and awards
- **Coaches**: Team management, roster oversight, announcements, and player development tracking
- **Parents**: Family management, view schedules, payments, and child progress
- **Players**: View schedules, track achievements, team communication, and skill development

### White-Label Customization
- **Custom Branding**: Upload your logo and set primary/secondary colors
- **Sport Configuration**: Configure for any sport (basketball, soccer, baseball, etc.)
- **Custom Terminology**: Customize terms like "player/athlete", "coach/trainer", "practice/training"
- **Program Management**: Create and manage your own programs, age groups, and divisions
- **Feature Toggles**: Enable/disable payments, awards, messaging, events, and training modules

### Management Features
- **User Management**: Create and manage admin, coach, player, and parent accounts
- **Team Management**: Create teams, assign coaches, manage rosters
- **Event Scheduling**: Schedule games, practices, tournaments with automated notifications
- **Payment Tracking**: Track registration fees, uniform costs, and other payments
- **Awards System**: Create custom badges and trophies for player recognition
- **Announcements**: Organization-wide or team-specific announcements
- **Messaging**: Real-time team chat and communication

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Radix UI** components with shadcn/ui design system
- **Tailwind CSS** with custom design tokens
- **Wouter** for client-side routing
- **TanStack Query** for server state management

### Backend
- **Node.js** with Express.js framework
- **TypeScript** with ESM modules
- **In-Memory Storage** (easily extendable to PostgreSQL or other databases)

### Features
- **PWA Support** for offline functionality and mobile installation
- **Real-time Updates** via WebSocket connections
- **Responsive Design** optimized for mobile, tablet, and desktop
- **Dark Mode** support (optional)

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd sports-management-platform
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:5000`

### Default Admin Access
The platform comes with a default organization and admin account:
- **Organization**: My Sports Organization
- **Subdomain**: default
- **Admin Email**: admin@example.com

You can customize the organization settings from the Admin Dashboard.

## 📱 Installation as PWA

### iOS Installation
1. Open the app in **Safari** (not Chrome or other browsers)
2. Tap the **Share** button at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right corner
5. Launch the app from your home screen

### Android Installation
1. Open the app in Chrome or Edge
2. Tap the menu (three dots)
3. Select **"Add to Home Screen"** or **"Install App"**
4. Tap **"Install"** to confirm
5. Launch the app from your app drawer or home screen

## 🎨 Customization

### Organization Setup
1. Log in as an admin
2. Navigate to Admin Dashboard > Organization Settings
3. Customize:
   - Organization name and subdomain
   - Sport type
   - Logo and brand colors
   - Terminology (customize labels for players, coaches, etc.)
   - Enable/disable features

### Program Management
1. Navigate to Admin Dashboard > Programs
2. Create programs specific to your organization
3. Define age groups and divisions
4. Assign teams to programs

### User Management
1. Navigate to Admin Dashboard > Users
2. Create accounts for coaches, players, and parents
3. Assign users to teams
4. Manage permissions and access levels

## 🏗 Architecture

### Data Models
- **Organization**: Multi-tenant model with branding and configuration
- **User**: Unified user model supporting admin, coach, player, and parent roles
- **Team**: Teams with multiple coaches and players
- **Event**: Flexible events (practices, games, tournaments, etc.)
- **Award**: Custom badges and trophies for recognition
- **Payment**: Track fees and payments
- **Program**: Configurable programs for different age groups/skill levels

### Storage
The platform uses in-memory storage by default for simplicity and portability. For production use, you can easily extend the `IStorage` interface in `server/storage-impl.ts` to use PostgreSQL, MongoDB, or any other database.

## 📄 License

This project is available for use by sports organizations. Please contact for commercial licensing options.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, please contact your organization administrator or the platform maintainer.

---

Built with ❤️ for youth sports organizations
