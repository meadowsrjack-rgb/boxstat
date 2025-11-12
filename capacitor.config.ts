import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boxstat.app',
  appName: 'BoxStat',
  webDir: 'dist/public',
  server: {
    // Production backend URL
    url: 'https://boxstat.replit.app',
    cleartext: false, // Use HTTPS for security
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#FFFFFF', // White background to prevent red bleed
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#FFFFFF', // White splash screen
      showSpinner: false,
    },
    Geolocation: {
      // Permissions for geo-fencing check-ins
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
