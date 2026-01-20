import { createRoot } from "react-dom/client";
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import App from "./App";
import "./index.css";
import "leaflet/dist/leaflet.css";

// Restore auth session from native storage before app renders (iOS persistence)
async function restoreNativeSession() {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  console.log(`🔄 Session restore check - Native: ${isNative}, Platform: ${platform}`);
  
  if (isNative) {
    try {
      console.log('🔄 Attempting to restore session from native Preferences...');
      
      const tokenResult = await Preferences.get({ key: 'authToken' });
      console.log('🔍 Token result from Preferences:', tokenResult.value ? 'TOKEN_EXISTS' : 'NULL');
      
      if (tokenResult.value) {
        localStorage.setItem('authToken', tokenResult.value);
        console.log('✅ Auth token restored to localStorage, length:', tokenResult.value.length);
      } else {
        console.log('⚠️ No auth token found in native Preferences');
      }
      
      const userResult = await Preferences.get({ key: 'userData' });
      if (userResult.value) {
        localStorage.setItem('userData', userResult.value);
        console.log('✅ User data restored to localStorage');
      }
    } catch (error) {
      console.error('❌ Error restoring native session:', error);
    }
  } else {
    console.log('ℹ️ Not native platform, skipping Preferences restore');
  }
}

// Initialize app
async function initApp() {
  // Restore session first (critical for iOS app restarts)
  await restoreNativeSession();
  
  // Register service worker for PWA functionality
  registerServiceWorker();
  
  // Render the app
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("Root container not found");
  }
  const root = createRoot(container);
  root.render(<App />);
}

function registerServiceWorker() {
  // Register service worker for PWA functionality with auto-update
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          console.log('SW registered: ', registration);
          
          // Check for updates immediately and every 5 minutes
          registration.update();
          setInterval(() => registration.update(), 5 * 60 * 1000);
          
          // Handle new service worker installation
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New version available, reloading...');
                  // Force the new service worker to activate
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
          
          // Reload when new service worker takes control
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('New service worker activated, reloading page...');
            window.location.reload();
          });
        })
        .catch((registrationError) => {
          console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

// Start the app
initApp();
