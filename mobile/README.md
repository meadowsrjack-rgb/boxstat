# BoxStat Mobile - Expo React Native App

This is the mobile application for BoxStat, built with Expo SDK 52, TypeScript, and expo-router.

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio

## Getting Started

### 1. Install Dependencies

```bash
cd mobile
npm install
```

### 2. Start the Development Server

```bash
npm start
```

This will start the Expo development server. You can then:

- Press `i` to open iOS simulator (macOS only)
- Press `a` to open Android emulator
- Scan the QR code with Expo Go app on your physical device

### 3. Running on Specific Platforms

```bash
# iOS (requires macOS)
npm run ios

# Android
npm run android

# Web
npm run web
```

## Project Structure

```
mobile/
├── app/               # Expo Router pages (file-based routing)
│   ├── _layout.tsx    # Root layout with navigation
│   └── index.tsx      # Home screen
├── components/        # Reusable UI components
├── services/          # API client and services
│   ├── api.ts         # HTTP client and API endpoints
│   └── auth.ts        # Authentication service
├── hooks/             # Custom React hooks
│   └── useAuth.ts     # Authentication hook
├── utils/             # Utility functions and constants
│   └── constants.ts   # App-wide constants
├── assets/            # Images, fonts, etc.
├── app.json           # Expo configuration
└── package.json       # Dependencies
```

## Configuration

### Environment Variables

Create an `app.config.js` file to configure environment-specific settings:

```javascript
export default {
  expo: {
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000',
    },
  },
};
```

### API Connection

The app automatically connects to:
- **Development (iOS simulator)**: `http://localhost:5000`
- **Development (Android emulator)**: `http://10.0.2.2:5000`
- **Production**: `https://boxstat.replit.app`

You can override this by setting `EXPO_PUBLIC_API_URL` in your environment.

## Key Features

- **expo-router**: File-based routing system
- **@tanstack/react-query**: Server state management and caching
- **expo-secure-store**: Secure token storage
- **expo-constants**: Access to environment variables
- **TypeScript**: Full type safety

## API Integration

The app connects to the existing Express backend at `/api/*` endpoints. Session cookies are automatically handled for authentication.

Example usage:

```typescript
import { api } from './services/api';

// Login
const user = await api.auth.login(email, password);

// Get events
const events = await api.events.getAll();

// Check in to event
await api.events.checkIn(eventId, { location: { lat, lng } });
```

## Authentication

Authentication uses secure session cookies with the backend. Tokens are stored in `expo-secure-store` for persistent login:

```typescript
import { useAuth } from './hooks/useAuth';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Use auth state...
}
```

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

Note: You'll need to set up EAS (Expo Application Services) for production builds. See [EAS Build documentation](https://docs.expo.dev/build/introduction/).

## Troubleshooting

### "Cannot connect to backend"

- Ensure the backend server is running on port 5000
- For Android emulator, use `http://10.0.2.2:5000` instead of `localhost`
- For physical devices, use your computer's local IP address

### "Expo Go not connecting"

- Ensure your device and development machine are on the same network
- Try restarting the Expo development server
- Clear the Expo cache: `expo start -c`

## Learn More

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/)
- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
