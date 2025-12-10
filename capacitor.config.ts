import type { CapacitorConfig } from '@capacitor/cli';

const isDevMode = process.env.CAPACITOR_MODE !== 'production';

const config: CapacitorConfig = {
  appId: 'com.boxstat.app',
  appName: 'BoxStat',
  webDir: 'dist/public',
  ...(isDevMode ? {} : {
    server: {
      url: 'https://boxstat.app',
      cleartext: false,
    },
  }),
  ios: {
    contentInset: 'automatic',
    // FIX 1: Change native background from White to Black
    backgroundColor: '#000000', 
  },
  plugins: {
    Keyboard: {
      // FIX 2: Control keyboard resize behavior
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 20000,
      // FIX 3: Match splash screen to app theme
      backgroundColor: '#000000',
      launchAutoHide: false,
      showSpinner: true,
      androidSpinnerStyle: 'large',
      iosSpinnerStyle: 'small',
      spinnerColor: '#d82428',
      splashFullScreen: true,
      splashImmersive: true,
    },
    Geolocation: {},
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;