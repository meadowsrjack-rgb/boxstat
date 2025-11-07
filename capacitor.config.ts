import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.boxstat.app',
  appName: 'BoxStat',
  webDir: 'dist/public',
  server: {
    // Use your production URL when deployed
    // url: 'https://your-app.replit.app',
    // cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#DC2626', // BoxStat red theme
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#DC2626',
      showSpinner: false,
    },
    Geolocation: {
      // Permissions for geo-fencing check-ins
    },
  },
};

export default config;
