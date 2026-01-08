import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'boxstat.app',
  appName: 'BoxStat',
  webDir: 'dist/public',
  
  // Root-level backgroundColor ensures WebView background matches app theme during rubber-banding
  backgroundColor: '#ffffff',

  // Always load from live server for iOS - ensures latest JavaScript is used
  // without requiring cap sync after every code change
  server: {
    url: 'https://boxstat.app',
    cleartext: false,
  },
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
      resize: 'none', /* Prevents the whole screen from shoving up when keyboard appears */
      style: 'DARK',
    },
    SplashScreen: {
      launchShowDuration: 3000,
      autoHide: false,
      // Match splash screen to app theme (white background)
      backgroundColor: '#ffffff', 
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