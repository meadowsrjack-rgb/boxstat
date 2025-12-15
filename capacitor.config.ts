import type { CapacitorConfig } from '@capacitor/cli';

const isDevMode = process.env.CAPACITOR_MODE !== 'production';

const config: CapacitorConfig = {
  appId: 'com.boxstat.app',
  appName: 'BoxStat',
  webDir: 'dist/public',
  
  // Root-level backgroundColor ensures WebView background is black during rubber-banding
  backgroundColor: '#000000',

  ...(isDevMode ? {} : {
    server: {
      url: 'https://boxstat.app',
      cleartext: false,
    },
  }),
  ios: {
    // 'never' allows app to go full-bleed behind notch, letting CSS env() handle safe areas
    contentInset: 'never',
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 3000,
      autoHide: false,
      // FIX 3: Match splash screen to app theme
      backgroundColor: '#000000', 
      showSpinner: true,
      androidSpinnerStyle: 'large',
      spinnerColor: '#d82428',
    },
    Geolocation: {},
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;