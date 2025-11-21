# BoxStat Mobile - Setup Instructions

## Quick Start

Follow these steps to get the Expo mobile app running:

### 1. Navigate to the mobile directory

```bash
cd mobile
```

### 2. Install dependencies

```bash
npm install
```

This will install all required packages including:
- expo and expo-router (navigation)
- expo-secure-store (secure token storage)
- @tanstack/react-query (API state management)
- expo-constants (environment variables)
- expo-status-bar (status bar styling)
- All required React Native dependencies

### 3. Start the development server

```bash
npx expo start
```

Or use the npm scripts:

```bash
npm start        # Start Expo dev server
npm run ios      # Run on iOS simulator (macOS only)
npm run android  # Run on Android emulator
npm run web      # Run in web browser
```

### 4. Connect your device or emulator

After starting the dev server, you have several options:

**Option A: Physical Device (Recommended for testing)**
1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
2. Scan the QR code shown in the terminal
3. The app will load on your device

**Option B: iOS Simulator (macOS only)**
1. Press `i` in the terminal
2. Xcode iOS Simulator will launch automatically

**Option C: Android Emulator**
1. Start Android Studio emulator first
2. Press `a` in the terminal
3. App will install and launch on emulator

**Option D: Web Browser**
1. Press `w` in the terminal
2. App will open in your default browser

## Environment Configuration

### Backend Connection

The app automatically connects to the correct backend:

- **iOS Simulator**: `http://localhost:5000`
- **Android Emulator**: `http://10.0.2.2:5000`  
- **Production**: `https://boxstat.replit.app`

To override, create a `.env` file:

```bash
cp .env.example .env
```

Then edit `.env`:

```
EXPO_PUBLIC_API_URL=http://your-custom-url:5000
```

### Testing Backend Connection

Make sure your Express backend is running:

```bash
# In the root directory (not mobile/)
npm run dev
```

The backend should be accessible at `http://localhost:5000`

## Project Structure

```
mobile/
├── app/                    # Expo Router pages (file-based routing)
│   ├── _layout.tsx         # Root layout with QueryClient provider
│   └── index.tsx           # Home/landing screen
├── components/             # Reusable UI components (create as needed)
├── services/
│   ├── api.ts              # HTTP client with typed API methods
│   └── auth.ts             # Authentication service with SecureStore
├── hooks/
│   └── useAuth.ts          # Authentication React hook
├── utils/
│   └── constants.ts        # App colors, spacing, typography
├── assets/                 # Images, fonts, splash screens
├── app.json                # Expo configuration
├── app.config.js           # Dynamic Expo config with env vars
├── package.json            # Dependencies
└── tsconfig.json           # TypeScript config
```

## Key Features Implemented

### 1. expo-router Navigation
- File-based routing system
- Automatic deep linking
- Type-safe navigation
- Configured in `app/_layout.tsx`

### 2. API Client (`services/api.ts`)
- Automatic baseURL detection (localhost vs production)
- Platform-specific URLs (iOS/Android handling)
- Session cookie support
- Pre-configured endpoints for:
  - Authentication (login, logout, getCurrentUser)
  - Users (getProfile, updateProfile)
  - Events (getAll, getById, checkIn)
  - Teams (getAll, getById, getRoster)

### 3. Authentication (`services/auth.ts` & `hooks/useAuth.ts`)
- Secure token storage using expo-secure-store
- Persistent login sessions
- User state management
- Easy-to-use hook: `const { user, isAuthenticated, login, logout } = useAuth()`

### 4. React Query Integration
- Configured in root layout
- 5-minute stale time
- Automatic retries
- Optimistic updates ready

## Next Steps for Development

### 1. Add Authentication Screens

Create login/signup screens:

```bash
mobile/app/login.tsx
mobile/app/signup.tsx
```

### 2. Add Protected Routes

Use the `useAuth` hook to protect routes:

```typescript
// In any screen
import { useAuth } from '../hooks/useAuth';
import { Redirect } from 'expo-router';

export default function ProtectedScreen() {
  const { isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }
  
  // ... protected content
}
```

### 3. Create UI Components

Add reusable components in `mobile/components/`:
- Button.tsx
- Card.tsx
- Input.tsx
- LoadingSpinner.tsx
- etc.

### 4. Add More Screens

Create new screens by adding files to `app/`:
- `app/events.tsx` - Events list
- `app/events/[id].tsx` - Event details (dynamic route)
- `app/profile.tsx` - User profile
- `app/team.tsx` - Team roster
- etc.

Expo Router automatically creates routes based on file names!

### 5. Implement Features

Use the provided API client and React Query:

```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

function EventsList() {
  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => api.events.getAll(),
  });
  
  if (isLoading) return <Text>Loading...</Text>;
  
  return (
    <FlatList
      data={events}
      renderItem={({ item }) => <EventCard event={item} />}
    />
  );
}
```

## Troubleshooting

### "Cannot connect to backend"

1. Verify backend is running: `npm run dev` in root directory
2. Check backend is on port 5000: `http://localhost:5000`
3. For Android emulator, backend must use `http://10.0.2.2:5000`
4. For physical device, backend must be accessible on local network
   - Use your computer's local IP (e.g., `http://192.168.1.100:5000`)
   - Update EXPO_PUBLIC_API_URL in .env

### "Module not found" errors

```bash
cd mobile
rm -rf node_modules
npm install
npx expo start -c  # -c clears cache
```

### iOS build issues

- Make sure Xcode is installed (macOS only)
- Run `npx expo prebuild` to generate iOS project
- Try: `cd ios && pod install && cd ..`

### Android build issues

- Install Android Studio and set up emulator
- Set ANDROID_HOME environment variable
- Run `npx expo prebuild` to generate Android project

## Building for Production

When ready to deploy:

### EAS Build (Recommended)

1. Install EAS CLI: `npm install -g eas-cli`
2. Login: `eas login`
3. Configure: `eas build:configure`
4. Build for iOS: `eas build --platform ios`
5. Build for Android: `eas build --platform android`

See [EAS Build docs](https://docs.expo.dev/build/introduction/) for details.

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router Docs](https://docs.expo.dev/router/introduction/)
- [React Native Docs](https://reactnative.dev/)
- [TanStack Query Docs](https://tanstack.com/query/latest)

## Support

For issues specific to BoxStat mobile app, check:
- Backend API documentation
- Existing web app implementation (in `client/` directory)
- Database schema (in `shared/schema.ts`)
