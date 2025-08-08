# UYP Basketball League Mobile App

A comprehensive Progressive Web App (PWA) for the UYP Basketball youth league based in Costa Mesa, CA. This application provides a complete digital platform for team and family management with robust authentication, Google Calendar integration, and multi-profile support.

## 🏀 Features

### Core Functionality
- **Progressive Web App (PWA)** - Installable on iOS devices with native app experience
- **Google Calendar Integration** - Real-time sync with UYP's calendar (upyourperformance@gmail.com)
- **Multi-Profile System** - Single accounts support multiple user types (Parent, Player, Coach)
- **Real-time Team Chat** - WebSocket-powered team communication
- **QR Code Check-ins** - Secure gym entry and attendance tracking
- **Payment Integration** - SportsEngine payment processing for fees and registrations

### User Types & Features
- **Parents**: Family management, payment processing, child profile management
- **Players**: Skill tracking, trophies/badges, team communication, schedule viewing
- **Coaches**: Team management, QR code scanning, announcements, curriculum access

### Advanced Features
- **Trophies & Badges System** - Tiered achievement tracking (Grey → Green → Blue → Purple → Yellow)
- **Skills Ratings** - Individual player performance tracking with progress bars
- **Event Management** - Practices, games, tournaments, camps, and skills sessions
- **Demo Mode** - Full-featured demo system for testing and presentations

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
- **PostgreSQL** with Neon serverless hosting
- **Drizzle ORM** for type-safe database operations
- **WebSocket** support for real-time features

### External Integrations
- **Replit Auth** with OpenID Connect
- **Google Calendar API** for event synchronization
- **SportsEngine** for payment processing
- **Express Sessions** with PostgreSQL storage

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Google Calendar API credentials
- Replit Auth setup

### Environment Variables
```bash
DATABASE_URL=your_postgresql_connection_string
GOOGLE_CALENDAR_API_KEY=your_google_calendar_api_key
GOOGLE_CALENDAR_ID=upyourperformance@gmail.com
```

### Installation
1. Clone the repository
```bash
git clone [repository-url]
cd uyp-basketball-app
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your actual values
```

4. Initialize the database
```bash
npm run db:push
```

5. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## 📱 PWA Installation

### iOS Installation
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will install as a native-like experience

### Features
- Offline functionality with service worker
- Native-like interface without browser chrome
- Apple Touch Icons optimized for iOS
- Standalone display mode

## 🗄 Database Schema

The application uses a comprehensive PostgreSQL schema with:
- **Users & Teams** - Core user and team management
- **Events & Attendance** - Calendar integration and check-ins
- **Trophies & Badges** - Achievement tracking system
- **Payments** - SportsEngine integration
- **Messages** - Team communication
- **Profiles** - Multi-profile account system

## 🔄 Google Calendar Sync

- **Automatic Sync** - Hourly scheduled synchronization
- **Real-time Events** - 100+ events synced from UYP's calendar
- **Smart Categorization** - Automatic event type detection
- **Team Assignment** - Events automatically assigned to appropriate teams

## 👥 Demo Mode

The application includes a comprehensive demo system:
- **Profile Selection** - Switch between Parent, Player, and Coach views
- **Sample Data** - Realistic demo data for all features
- **Full Functionality** - All features work in demo mode
- **Testing Interface** - "Test New Account Signup" for development

## 🏆 Achievement System

### Trophy Tiers
- **Legacy Trophies** - Season-end achievements
- **Team Trophies** - Collaborative accomplishments

### Badge Categories
- **Grey** - Participation (Rookie, Team Player)
- **Green** - Effort (Hustle, Improvement)
- **Blue** - Skills (Sharp Shooter, Defensive Wall)
- **Purple** - Leadership (Team Captain, Mentor)
- **Yellow** - Elite (Hall of Famer, Champion)

## 🔐 Security Features

- **Replit Auth** - Secure OpenID Connect authentication
- **Session Management** - PostgreSQL-based session storage
- **API Protection** - Authenticated routes with proper middleware
- **Data Validation** - Zod schemas for all data inputs

## 📈 Development

### Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate migration files
```

### Project Structure
```
├── client/          # React frontend application
├── server/          # Express.js backend API
├── shared/          # Shared types and schemas
├── attached_assets/ # Project assets and images
└── replit.md       # Project documentation and preferences
```

## 🚢 Deployment

The application is optimized for deployment on Replit with:
- **Automatic Builds** - Vite builds optimized static assets
- **Database Migrations** - Drizzle handles schema updates
- **Environment Configuration** - Secure environment variable management
- **Health Checks** - Built-in monitoring and error handling

## 📝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software developed for UYP Basketball League.

## 🤝 Support

For support and questions, contact the development team or refer to the project documentation in `replit.md`.

---

**UYP Basketball League** - Empowering young athletes through technology and community.