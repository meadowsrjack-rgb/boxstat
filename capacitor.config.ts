import type { CapacitorConfig } from '@capacitor/cli';

// Check if we're in dev mode (uses local bundle) or production mode (uses remote URL)
const isDevMode = process.env.CAPACITOR_MODE !== 'production';

const config: CapacitorConfig = {
  appId: 'com.boxstat.app',
  appName: 'BoxStat',
  webDir: 'dist/public',
  // Only set server.url in production mode - dev mode uses local bundled assets
  ...(isDevMode ? {} : {
    server: {
      url: 'https://boxstat.app',
      cleartext: false,
    },
  }),
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#FFFFFF',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },
    Geolocation: {
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
